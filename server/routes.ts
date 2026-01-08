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

async function seedFromAttachedCsv() {
  // Application now uses the long-format state ZHVI dataset as the single source of truth.
  // The seeding logic is now handled by seed.ts for clarity.
  return;
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
