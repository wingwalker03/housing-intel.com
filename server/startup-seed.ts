import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { db } from "./db";
import { storage } from "./storage";
import { countyRentalStats, housingStats } from "@shared/schema";
import { sql, count as drizzleCount } from "drizzle-orm";
import { type InsertHousingStat, type InsertMetroStat } from "@shared/schema";

const STATE_CODE_MAP: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  "District of Columbia": "DC"
};

function normalizeCountyName(name: string): string {
  return name
    .replace(/\s+(County|Parish|Borough|City|Census Area|Municipality)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function calcYoY(data: any[], i: number, getValue: (r: any) => number): number {
  const current = data[i];
  const currentDate = new Date(current.date);
  const targetYear = currentDate.getFullYear() - 1;
  const targetMonth = currentDate.getMonth();
  const prev = data.find((d: any) => {
    const dd = new Date(d.date);
    return dd.getFullYear() === targetYear && dd.getMonth() === targetMonth;
  });
  if (!prev) return 0;
  const val = getValue(current);
  const prevVal = getValue(prev);
  if (isNaN(val) || isNaN(prevVal) || prevVal === 0) return 0;
  return parseFloat(((val - prevVal) / prevVal * 100).toFixed(2));
}

async function seedStateData(cwd: string) {
  const csvFile = path.resolve(cwd, "attached_assets/state_zhvi_LONG_copy_paste.csv.csv");
  if (!fs.existsSync(csvFile)) {
    console.log("[seed] State CSV not found, skipping state data.");
    return;
  }

  const content = fs.readFileSync(csvFile, "utf-8");
  const records = parse(content, { columns: ['state', 'date', 'value'], skip_empty_lines: true, trim: true, delimiter: '\t' });

  const stateGroups: Record<string, any[]> = {};
  for (const r of records) {
    const name = r.state;
    if (!stateGroups[name]) stateGroups[name] = [];
    stateGroups[name].push(r);
  }

  const rows: InsertHousingStat[] = [];
  for (const [stateName, data] of Object.entries(stateGroups)) {
    const stateCode = STATE_CODE_MAP[stateName] || (stateName === "United States" ? "US" : null);
    if (!stateCode) continue;
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (let i = 0; i < data.length; i++) {
      const val = parseFloat(data[i].value);
      if (isNaN(val)) continue;
      rows.push({ stateCode, stateName, date: data[i].date, medianHomeValue: Math.round(val), yoyChange: calcYoY(data, i, r => parseFloat(r.value)) });
    }
  }

  console.log(`[seed] Inserting ${rows.length} state housing rows...`);
  await storage.seedHousingData(rows);
}

async function seedMetroData(cwd: string) {
  const csvFile = path.resolve(cwd, "attached_assets/metro_zhvi_LONG_1767920463349.csv");
  if (!fs.existsSync(csvFile)) {
    console.log("[seed] Metro CSV not found, skipping metro data.");
    return;
  }

  const content = fs.readFileSync(csvFile, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

  const metroGroups: Record<string, any[]> = {};
  for (const r of records) {
    const name = r.metro;
    if (!metroGroups[name]) metroGroups[name] = [];
    metroGroups[name].push(r);
  }

  const rows: InsertMetroStat[] = [];
  for (const [metroName, data] of Object.entries(metroGroups)) {
    const stateMatch = metroName.match(/,\s*([A-Z]{2})$/);
    const stateCode = stateMatch ? stateMatch[1] : 'XX';
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (let i = 0; i < data.length; i++) {
      const val = parseFloat(data[i].value);
      if (isNaN(val)) continue;
      rows.push({ metroName, stateCode, date: data[i].date, medianHomeValue: Math.round(val), yoyChange: calcYoY(data, i, r => parseFloat(r.value)) });
    }
  }

  console.log(`[seed] Inserting ${rows.length} metro housing rows...`);
  await storage.clearMetroData();
  await storage.seedMetroData(rows);

  // Fix corrupted special characters in metro names (e.g. "Cañon City, CO" stored with garbled bytes)
  await db.execute(sql`
    UPDATE metro_stats
    SET metro_name = 'Cañon City, CO'
    WHERE state_code = 'CO' AND metro_name LIKE '%on City%' AND metro_name <> 'Cañon City, CO'
  `);
  console.log("[seed] Applied metro name cleanup.");
}

async function seedCountyRentalData(cwd: string) {
  const csvFile = path.resolve(cwd, "attached_assets/County_zori_LONG_1771525899502.csv");
  if (!fs.existsSync(csvFile)) {
    console.log("[seed] County ZORI CSV not found, skipping.");
    return;
  }

  const content = fs.readFileSync(csvFile, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`[seed] Importing ${records.length} county rental rows...`);

  const BATCH = 1000;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH).map((r: any) => ({
      regionId: parseInt(r.RegionID),
      countyName: r.RegionName,
      normalizedName: normalizeCountyName(r.RegionName),
      stateCode: r.State,
      stateName: r.StateName,
      metro: r.Metro || null,
      date: r.date,
      zori: parseFloat(r.zori),
    })).filter((r: any) => !isNaN(r.zori));

    await db.insert(countyRentalStats).values(batch);
    if ((i + BATCH) % 20000 === 0 || i + BATCH >= records.length) {
      console.log(`[seed] County rental: ${Math.min(i + BATCH, records.length)}/${records.length}`);
    }
  }
}

export async function seedIfEmpty() {
  try {
    const result = await db.select({ count: drizzleCount() }).from(housingStats);
    const rowCount = Number(result[0]?.count ?? 0);

    if (rowCount > 0) {
      console.log(`[seed] Database already has ${rowCount} housing rows, skipping seed.`);
      return;
    }

    console.log("[seed] Empty database detected — seeding all data from CSV files...");
    const cwd = process.cwd();

    await seedStateData(cwd);
    await seedMetroData(cwd);
    await seedCountyRentalData(cwd);

    console.log("[seed] All data seeded successfully.");
  } catch (err) {
    console.error("[seed] Startup seed failed:", err);
  }
}
