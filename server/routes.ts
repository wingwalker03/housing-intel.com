import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertHousingStatSchema, insertLeadEmailSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse";
import fs from "fs";
import path from "path";

import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { metroStats } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

async function seedFromAttachedCsv() {
  return;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/sitemap-national.xml", (req, res) => {
    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://housing-market-stats.replit.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  });

  app.get("/sitemap-states.xml", async (req, res) => {
    const states = await storage.getAllStates();
    const urls = states.map(s => {
      const slug = s.name.toLowerCase().replace(/\s+/g, '-');
      return `  <url>
    <loc>https://housing-market-stats.replit.app/state/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('\n');

    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  });

  app.get("/sitemap-metros.xml", async (req, res) => {
    const metros = await db.selectDistinct({ name: metroStats.metroName }).from(metroStats);
    const urls = metros.map(m => {
      const slug = m.name
        .toLowerCase()
        .replace(/,\s*/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return `  <url>
    <loc>https://housing-market-stats.replit.app/metro/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }).join('\n');

    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  });

  app.get("/sitemap.xml", (req, res) => {
    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://housing-market-stats.replit.app/sitemap-national.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://housing-market-stats.replit.app/sitemap-states.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://housing-market-stats.replit.app/sitemap-metros.xml</loc>
  </sitemap>
</sitemapindex>`);
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const data = insertLeadEmailSchema.parse(req.body);
      const lead = await storage.saveLeadEmail(data);
      res.json(lead);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to save lead" });
    }
  });

  app.get(api.housing.list.path, async (req, res) => {
    const input = api.housing.list.input.parse(req.query);
    const data = await storage.getHousingStats(
      input?.stateCode,
      input?.startDate,
      input?.endDate
    );

    if (!input?.stateCode && data.length > 0) {
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
        yoyChange: 0
      })).sort((a, b) => a.date.localeCompare(b.date));

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

  seedFromAttachedCsv().catch(console.error);

  return httpServer;
}
