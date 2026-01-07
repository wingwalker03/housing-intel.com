import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertHousingStatSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse";
import fs from "fs";
import path from "path";

const upload = multer({ storage: multer.memoryStorage() });

async function processZillowCsv(buffer: Buffer) {
  const records: any[] = [];
  const parser = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  for await (const row of parser) {
    const regionName = row.RegionName;
    const stateName = row.StateName || regionName; // Some rows might have state in RegionName
    
    // Zillow CSV has dates as column headers starting from index 5
    // Format: YYYY-MM-DD
    const dateColumns = Object.keys(row).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    
    for (const dateStr of dateColumns) {
      const value = parseFloat(row[dateStr]);
      if (isNaN(value)) continue;

      // We don't have YoY change in the raw CSV easily, 
      // but we can calculate it or just set to 0 for now as it's a derived metric
      // For this specific task, I'll focus on the values.
      
      records.push({
        stateCode: row.StateName || regionName.substring(0, 2).toUpperCase(), // Fallback mapping might be needed
        stateName: regionName,
        date: dateStr,
        medianHomeValue: Math.round(value),
        yoyChange: 0 
      });
    }
  }
  return records;
}

async function seedFromAttachedCsv() {
  const filePath = "attached_assets/State_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month_1767652185379.csv";
  if (fs.existsSync(filePath)) {
    console.log("Found attached Zillow CSV. Processing...");
    const buffer = fs.readFileSync(filePath);
    const records = await processZillowCsv(buffer);
    
    if (records.length > 0) {
      await storage.clearHousingData();
      await storage.seedHousingData(records);
      console.log(`Successfully seeded ${records.length} records from Zillow CSV.`);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.housing.list.path, async (req, res) => {
    const input = api.housing.list.input.parse(req.query);
    const data = await storage.getHousingStats(
      input?.stateCode,
      input?.startDate,
      input?.endDate
    );

    if (!input?.stateCode && data.length > 0) {
      // Aggregate data by date to calculate national average
      const dateMap = new Map<string, { sum: number, count: number }>();
      
      data.forEach(stat => {
        const dateStr = typeof stat.date === 'string' ? stat.date : stat.date.toISOString().split('T')[0];
        const current = dateMap.get(dateStr) || { sum: 0, count: 0 };
        dateMap.set(dateStr, {
          sum: current.sum + stat.medianHomeValue,
          count: current.count + 1
        });
      });

      const aggregatedData = Array.from(dateMap.entries()).map(([date, { sum, count }]) => ({
        id: 0,
        stateCode: "US",
        stateName: "United States",
        date,
        medianHomeValue: Math.round(sum / count),
        yoyChange: 0 // Will be calculated on frontend or via another pass
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate YoY for aggregated data
      for (let i = 0; i < aggregatedData.length; i++) {
        const current = aggregatedData[i];
        const currentMonth = new Date(current.date);
        const targetMonth = new Date(currentMonth);
        targetMonth.setFullYear(targetMonth.getFullYear() - 1);

        const prevYear = aggregatedData.find(d => {
          const dDate = new Date(d.date);
          return dDate.getFullYear() === targetMonth.getFullYear() && dDate.getMonth() === targetMonth.getMonth();
        });

        if (prevYear) {
          current.yoyChange = parseFloat(((current.medianHomeValue - prevYear.medianHomeValue) / prevYear.medianHomeValue * 100).toFixed(2));
        }
      }
      
      return res.json(aggregatedData);
    }

    res.json(data);
  });

  app.get(api.housing.states.path, async (req, res) => {
    const states = await storage.getAllStates();
    res.json(states);
  });

  app.post(api.housing.uploadCsv.path, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const records = await processZillowCsv(req.file.buffer);

      if (records.length > 0) {
        await storage.clearHousingData();
        await storage.seedHousingData(records);
      }

      res.json({ message: "CSV uploaded and processed successfully", count: records.length });
    } catch (err: any) {
      console.error('CSV Processing Error:', err);
      res.status(400).json({ message: err.message || "Failed to process CSV" });
    }
  });

  // Try to seed from the specific attached file
  seedFromAttachedCsv().catch(console.error);

  return httpServer;
}
