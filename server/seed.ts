import fs from "fs";
import { parse } from "csv-parse/sync";
import { storage } from "./storage";
import { type InsertHousingStat, type InsertMetroStat } from "@shared/schema";
import path from "path";

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

async function seedStateData() {
  console.log("Seeding state data...");
  
  const csvFile = path.resolve(process.cwd(), "attached_assets/state_zhvi_LONG_copy_paste.csv.csv");
  
  if (!fs.existsSync(csvFile)) {
    console.error("State CSV file not found at " + csvFile);
    return;
  }

  const content = fs.readFileSync(csvFile, "utf-8");
  const records = parse(content, {
    columns: ['state', 'date', 'value'],
    skip_empty_lines: true,
    trim: true,
    delimiter: '\t',
  });

  const housingStats: InsertHousingStat[] = [];
  
  await (storage as any).clearHousingData();

  const stateGroups: Record<string, any[]> = {};
  for (const record of records) {
    const stateName = record.state || record.RegionName;
    if (!stateGroups[stateName]) stateGroups[stateName] = [];
    stateGroups[stateName].push(record);
  }

  for (const [stateName, data] of Object.entries(stateGroups)) {
    const stateCode = STATE_CODE_MAP[stateName] || (stateName === "United States" ? "US" : null);
    if (!stateCode) {
      console.warn(`No mapping for state: ${stateName}`);
      continue;
    }

    data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      let yoyChange = 0;

      const currentMonth = new Date(current.date);
      const targetMonth = new Date(currentMonth);
      targetMonth.setFullYear(targetMonth.getFullYear() - 1);

      const previousYearData = data.find((d: any) => {
        const dDate = new Date(d.date);
        return dDate.getFullYear() === targetMonth.getFullYear() && dDate.getMonth() === targetMonth.getMonth();
      });

      if (previousYearData) {
        const val = parseFloat(current.value);
        const prevVal = parseFloat(previousYearData.value);
        if (!isNaN(val) && !isNaN(prevVal) && prevVal !== 0) {
          yoyChange = ((val - prevVal) / prevVal) * 100;
        }
      }

      housingStats.push({
        stateCode,
        stateName,
        date: current.date,
        medianHomeValue: Math.round(parseFloat(current.value)),
        yoyChange: parseFloat(yoyChange.toFixed(2))
      });
    }
  }

  console.log(`Inserting ${housingStats.length} state records...`);
  await storage.seedHousingData(housingStats);
}

async function seedMetroData() {
  console.log("Seeding metro data...");
  
  const csvFile = path.resolve(process.cwd(), "attached_assets/metro_zhvi_LONG_1767920463349.csv");
  
  if (!fs.existsSync(csvFile)) {
    console.error("Metro CSV file not found at " + csvFile);
    return;
  }

  const content = fs.readFileSync(csvFile, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const metroStats: InsertMetroStat[] = [];
  
  await storage.clearMetroData();

  const metroGroups: Record<string, any[]> = {};
  for (const record of records) {
    const metroName = record.metro;
    if (!metroGroups[metroName]) metroGroups[metroName] = [];
    metroGroups[metroName].push(record);
  }

  for (const [metroName, data] of Object.entries(metroGroups)) {
    const stateMatch = metroName.match(/,\s*([A-Z]{2})$/);
    const stateCode = stateMatch ? stateMatch[1] : 'XX';

    data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      let yoyChange = 0;

      const currentMonth = new Date(current.date);
      const targetMonth = new Date(currentMonth);
      targetMonth.setFullYear(targetMonth.getFullYear() - 1);

      const previousYearData = data.find((d: any) => {
        const dDate = new Date(d.date);
        return dDate.getFullYear() === targetMonth.getFullYear() && dDate.getMonth() === targetMonth.getMonth();
      });

      if (previousYearData) {
        const val = parseFloat(current.value);
        const prevVal = parseFloat(previousYearData.value);
        if (!isNaN(val) && !isNaN(prevVal) && prevVal !== 0) {
          yoyChange = ((val - prevVal) / prevVal) * 100;
        }
      }

      metroStats.push({
        metroName,
        stateCode,
        date: current.date,
        medianHomeValue: Math.round(parseFloat(current.value)),
        yoyChange: parseFloat(yoyChange.toFixed(2))
      });
    }
  }

  console.log(`Inserting ${metroStats.length} metro records...`);
  await storage.seedMetroData(metroStats);
}

async function seed() {
  console.log("Starting database seeding...");
  await seedStateData();
  await seedMetroData();
  console.log("Seeding completed successfully.");
}

seed().catch(console.error);
