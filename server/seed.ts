import fs from "fs";
import { parse } from "csv-parse/sync";
import { storage } from "./storage";
import { type InsertHousingStat } from "@shared/schema";
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

async function seed() {
  console.log("Starting database seeding...");
  
  const csvFile = path.resolve(process.cwd(), "attached_assets/State_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month_CLEAN_ROUNDE_1767828691735.csv");
  
  if (!fs.existsSync(csvFile)) {
    console.error("CSV file not found at " + csvFile);
    return;
  }

  const content = fs.readFileSync(csvFile, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  const housingStats: InsertHousingStat[] = [];
  
  // Clear existing data first
  await (storage as any).clearHousingData();

  for (const record of records) {
    const stateName = record.RegionName;
    const stateCode = STATE_CODE_MAP[stateName];
    
    if (!stateCode) continue;

    // Get all date columns (YYYY-MM-DD)
    const dateColumns = Object.keys(record).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    
    const stateData: {date: string, value: number}[] = [];

    for (const dateStr of dateColumns) {
      const value = parseFloat(record[dateStr]);
      if (!isNaN(value)) {
        stateData.push({ date: dateStr, value });
      }
    }

    // Sort by date to calculate YoY
    stateData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = 0; i < stateData.length; i++) {
      const current = stateData[i];
      let yoyChange = 0;

      // Find value from 12 months ago
      const currentMonth = new Date(current.date);
      const targetMonth = new Date(currentMonth);
      targetMonth.setFullYear(targetMonth.getFullYear() - 1);

      const previousYearData = stateData.find(d => {
        const dDate = new Date(d.date);
        return dDate.getFullYear() === targetMonth.getFullYear() && dDate.getMonth() === targetMonth.getMonth();
      });

      if (previousYearData) {
        yoyChange = ((current.value - previousYearData.value) / previousYearData.value) * 100;
      }

      housingStats.push({
        stateCode,
        stateName,
        date: current.date,
        medianHomeValue: Math.round(current.value),
        yoyChange: parseFloat(yoyChange.toFixed(2))
      });
    }
  }

  console.log(`Inserting ${housingStats.length} records...`);
  await storage.seedHousingData(housingStats);
  console.log("Seeding completed successfully.");
}

seed().catch(console.error);
