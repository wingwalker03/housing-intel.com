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
import { metroStats, weeklyMarketBriefs } from "@shared/schema";
import { 
  generateBriefForMarket, 
  runWeeklyBriefs, 
  getBriefByWeek, 
  getBriefArchive 
} from "./newsbriefs";

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
  <sitemap>
    <loc>https://housing-market-stats.replit.app/sitemap-news.xml</loc>
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

  // Admin endpoints for weekly news briefs
  app.post("/api/admin/newsbriefs/run-weekly", async (req, res) => {
    const adminToken = req.headers["x-admin-token"];
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const result = await runWeeklyBriefs();
      res.json(result);
    } catch (err: any) {
      console.error("Weekly briefs error:", err);
      res.status(500).json({ error: err.message || "Failed to run weekly briefs" });
    }
  });

  app.post("/api/admin/newsbriefs/run-one", async (req, res) => {
    const adminToken = req.headers["x-admin-token"];
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { marketType, marketSlug } = req.body;
    
    // Validate marketType
    if (!marketType || !["state", "metro"].includes(marketType)) {
      return res.status(400).json({ error: "marketType must be 'state' or 'metro'" });
    }
    
    // Validate marketSlug format (alphanumeric with hyphens only)
    if (!marketSlug || !/^[a-z0-9-]+$/.test(marketSlug)) {
      return res.status(400).json({ error: "marketSlug must be lowercase alphanumeric with hyphens" });
    }

    try {
      const result = await generateBriefForMarket(marketType, marketSlug);
      res.json(result);
    } catch (err: any) {
      console.error("Single brief error:", err);
      res.status(500).json({ error: err.message || "Failed to generate brief" });
    }
  });

  // Public endpoints for news briefs
  app.get("/news/:marketType/:slug/week/:weekStart", async (req, res) => {
    const { marketType, slug, weekStart } = req.params;
    
    // Validate params to prevent invalid queries
    if (!["state", "metro"].includes(marketType)) {
      return res.status(400).send("Invalid market type");
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).send("Invalid market slug");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return res.status(400).send("Invalid week format");
    }
    
    const brief = await getBriefByWeek(marketType, slug, weekStart);
    
    if (!brief) {
      return res.status(404).json({ error: "Brief not found" });
    }

    const rawSources = JSON.parse(brief.sources || "[]");
    // Sanitize source URLs - only allow http/https
    const sources = rawSources.filter((s: any) => {
      try {
        const url = new URL(s.url);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }).map((s: any) => ({
      ...s,
      title: String(s.title || "").replace(/[<>"'&]/g, ""),
      publisher: String(s.publisher || "").replace(/[<>"'&]/g, ""),
    }));
    
    const baseUrl = process.env.SITE_BASE_URL || "https://housing-market-stats.replit.app";
    const marketUrl = marketType === "state" ? `${baseUrl}/state/${slug}` : `${baseUrl}/metro/${slug}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brief.title}</title>
  <meta name="description" content="${brief.metaDescription}">
  <meta property="og:title" content="${brief.title}">
  <meta property="og:description" content="${brief.metaDescription}">
  <link rel="canonical" href="${baseUrl}/news/${marketType}/${slug}/week/${weekStart}">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1a1a1a; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .sources { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    .sources h3 { font-size: 1em; color: #333; }
    .sources ul { padding-left: 20px; }
    .sources li { margin-bottom: 8px; }
    .sources a { color: #0066cc; }
    .back-link { margin-top: 30px; }
    .back-link a { color: #0066cc; }
  </style>
</head>
<body>
  <article>
    <h1>${brief.title}</h1>
    <p class="meta">Week of ${brief.weekStart} to ${brief.weekEnd}</p>
    ${brief.briefHtml}
    <div class="sources">
      <h3>Sources</h3>
      <ul>
        ${sources.map((s: any) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a> - ${s.publisher} (${s.date})</li>`).join("")}
      </ul>
    </div>
    <div class="back-link">
      <a href="${marketUrl}">View full ${marketType === "state" ? "state" : "metro"} market data</a>
    </div>
  </article>
</body>
</html>`;

    res.header("Content-Type", "text/html");
    res.send(html);
  });

  app.get("/news/:marketType/:slug", async (req, res) => {
    const { marketType, slug } = req.params;
    
    // Validate params
    if (!["state", "metro"].includes(marketType)) {
      return res.status(400).send("Invalid market type");
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).send("Invalid market slug");
    }
    
    const briefs = await getBriefArchive(marketType, slug);
    
    const baseUrl = process.env.SITE_BASE_URL || "https://housing-market-stats.replit.app";
    const marketUrl = marketType === "state" ? `${baseUrl}/state/${slug}` : `${baseUrl}/metro/${slug}`;
    const displayName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayName} Housing News Archive | Housing Intel</title>
  <meta name="description" content="Weekly housing market news briefs for ${displayName}. Stay updated on real estate trends, home prices, and market conditions.">
  <link rel="canonical" href="${baseUrl}/news/${marketType}/${slug}">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1a1a1a; }
    .brief-list { list-style: none; padding: 0; }
    .brief-list li { padding: 15px; border-bottom: 1px solid #eee; }
    .brief-list a { color: #0066cc; font-weight: 500; text-decoration: none; }
    .brief-list a:hover { text-decoration: underline; }
    .brief-date { color: #666; font-size: 0.9em; margin-top: 5px; }
    .back-link { margin-top: 30px; }
    .back-link a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>${displayName} Housing News Archive</h1>
  ${briefs.length === 0 ? "<p>No news briefs available yet.</p>" : `
  <ul class="brief-list">
    ${briefs.map(b => `
      <li>
        <a href="/news/${marketType}/${slug}/week/${b.weekStart}">${b.title}</a>
        <div class="brief-date">Week of ${b.weekStart}</div>
      </li>
    `).join("")}
  </ul>`}
  <div class="back-link">
    <a href="${marketUrl}">View full ${marketType === "state" ? "state" : "metro"} market data</a>
  </div>
</body>
</html>`;

    res.header("Content-Type", "text/html");
    res.send(html);
  });

  // Sitemap for news briefs
  app.get("/sitemap-news.xml", async (req, res) => {
    const briefs = await db.select().from(weeklyMarketBriefs);
    const baseUrl = process.env.SITE_BASE_URL || "https://housing-market-stats.replit.app";
    
    const urls = briefs.map(b => `  <url>
    <loc>${baseUrl}/news/${b.marketType}/${b.marketSlug}/week/${b.weekStart}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`).join("\n");

    res.header("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  });

  return httpServer;
}
