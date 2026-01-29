import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertLeadEmailSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse";

import {
  renderHomepage,
  renderStatesPage,
  renderStatePage,
  renderMetrosPage,
  renderMetroPage,
  renderCrawlHubPage,
} from "./ssr";

const upload = multer({ storage: multer.memoryStorage() });

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

async function processZillowCsv(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const content = buffer.toString("utf-8");
    const records: any[] = [];

    parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
      .on("data", (record: any) => {
        const stateName = record.state || record.RegionName;
        const stateCode = STATE_CODE_MAP[stateName] || (stateName === "United States" ? "US" : null);

        if (stateCode) {
          records.push({
            stateCode,
            stateName,
            date: record.date,
            medianHomeValue: Math.round(parseFloat(record.value)),
            yoyChange: 0,
          });
        }
      })
      .on("end", () => resolve(records))
      .on("error", (err: Error) => reject(err));
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // SSR routes (served to everyone).
  // The SSR HTML includes client asset tags so React can hydrate/replace it.
  // This avoids bot-only SSR issues and ensures Google sees meaningful HTML.

  app.get("/", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Vary", "Accept-Encoding");
      res.send(renderHomepage());
    } catch (err) {
      next(err);
    }
  });

  app.get("/states", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Vary", "Accept-Encoding");
      res.send(renderStatesPage());
    } catch (err) {
      next(err);
    }
  });

  app.get("/state/:slug", (req, res, next) => {
    const { slug } = req.params;
    if (!/^[a-z-]+$/.test(slug)) return res.status(400).send("Invalid state slug");
    try {
      const html = renderStatePage(slug);
      if (!html) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Vary", "Accept-Encoding");
      res.send(html);
    } catch (err) {
      next(err);
    }
  });

  app.get("/metros", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Vary", "Accept-Encoding");
      res.send(renderMetrosPage());
    } catch (err) {
      next(err);
    }
  });

  app.get("/metro/:slug", (req, res, next) => {
    const { slug } = req.params;
    if (!/^[a-z0-9-]+$/.test(slug)) return res.status(400).send("Invalid metro slug");
    try {
      const html = renderMetroPage(slug);
      if (!html) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Vary", "Accept-Encoding");
      res.send(html);
    } catch (err) {
      next(err);
    }
  });

  app.get("/crawl-hub", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Vary", "Accept-Encoding");
      res.send(renderCrawlHubPage());
    } catch (err) {
      next(err);
    }
  });

  // Leads capture
  app.post("/api/leads", async (req, res) => {
    try {
      const data = insertLeadEmailSchema.parse(req.body);
      const lead = await storage.saveLeadEmail(data);
      res.json(lead);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to save lead" });
    }
  });

  // Housing stats
  app.get(api.housing.list.path, async (req, res) => {
    const input = api.housing.list.input.parse(req.query);
    const data = await storage.getHousingStats(
      input?.stateCode,
      input?.startDate,
      input?.endDate
    );

    // Aggregate national series if no stateCode passed
    if (!input?.stateCode && data.length > 0) {
      const dateMap = new Map<string, { sum: number; count: number }>();

      data.forEach((stat: any) => {
        const dateStr =
          typeof stat.date === "string"
            ? stat.date
            : new Date(stat.date).toISOString().split("T")[0];
        const current = dateMap.get(dateStr) || { sum: 0, count: 0 };
        dateMap.set(dateStr, { sum: current.sum + stat.medianHomeValue, count: current.count + 1 });
      });

      const aggregatedData = Array.from(dateMap.entries())
        .map(([date, { sum, count }]) => ({
          id: 0,
          stateCode: "US",
          stateName: "United States",
          date,
          medianHomeValue: Math.round(sum / count),
          yoyChange: 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      for (let i = 0; i < aggregatedData.length; i++) {
        const current = aggregatedData[i];
        const currentMonth = new Date(current.date);
        const targetMonth = new Date(currentMonth);
        targetMonth.setFullYear(targetMonth.getFullYear() - 1);

        const prevYear = aggregatedData.find((d) => {
          const dDate = new Date(d.date);
          return (
            dDate.getFullYear() === targetMonth.getFullYear() &&
            dDate.getMonth() === targetMonth.getMonth()
          );
        });

        if (prevYear) {
          current.yoyChange = parseFloat(
            (((current.medianHomeValue - prevYear.medianHomeValue) / prevYear.medianHomeValue) * 100).toFixed(2)
          );
        }
      }

      return res.json(aggregatedData);
    }

    res.json(data);
  });

  app.get(api.housing.states.path, async (_req, res) => {
    const states = await storage.getAllStates();
    res.json(states);
  });

  app.get(api.metro.list.path, async (req, res) => {
    const input = api.metro.list.input.parse(req.query);
    const data = await storage.getMetroStats(
      input?.stateCode,
      input?.metroName,
      input?.startDate,
      input?.endDate
    );
    res.json(data);
  });

  app.get(api.metro.byState.path, async (req, res) => {
    const input = api.metro.byState.input.parse(req.query);
    const metros = await storage.getMetrosByState(input.stateCode);
    res.json(metros);
  });

  app.post(api.housing.uploadCsv.path, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const records = await processZillowCsv(req.file.buffer);

      if (records.length > 0) {
        await storage.clearHousingData();
        await storage.seedHousingData(records);
      }

      res.json({ message: "CSV uploaded and processed successfully", count: records.length });
    } catch (err: any) {
      console.error("CSV Processing Error:", err);
      res.status(400).json({ message: err.message || "Failed to process CSV" });
    }
  });

  return httpServer;
}
