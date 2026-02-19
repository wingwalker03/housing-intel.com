import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertLeadEmailSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse";
import { 
  renderHomepage, 
  renderStatePage, 
  renderMetroPage, 
  renderStatesPage, 
  renderMetrosPage, 
  renderCrawlHubPage, 
  renderEmbedInfoPage, 
  renderSitemap 
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
    parse(content, { columns: true, skip_empty_lines: true, trim: true })
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
  app.get("/", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderHomepage());
    } catch (err) { next(err); }
  });

  app.get("/state/:slug", (req, res, next) => {
    const { slug } = req.params;
    try {
      const html = renderStatePage(slug);
      if (!html) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err) { next(err); }
  });

  app.get("/states", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderStatesPage());
    } catch (err) { next(err); }
  });

  app.get("/metros", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderMetrosPage());
    } catch (err) { next(err); }
  });

  app.get("/metro/:slug", (req, res, next) => {
    try {
      const html = renderMetroPage(req.params.slug);
      if (!html) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err) { next(err); }
  });

  app.get("/crawl-hub", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderCrawlHubPage());
    } catch (err) { next(err); }
  });

  app.get("/embed-info", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderEmbedInfoPage());
    } catch (err) { next(err); }
  });

  app.get("/sitemap.xml", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "application/xml");
      res.send(renderSitemap());
    } catch (err) { next(err); }
  });

  app.get("/api/embed/email", async (req, res) => {
    try {
      const stateCode = (req.query.state as string || "").toUpperCase();
      const metroName = req.query.metro as string;
      res.send(`<table><tr><td>Housing Data for ${metroName || stateCode || 'US'}</td></tr></table>`);
    } catch (err) { res.status(500).send("Error"); }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const data = insertLeadEmailSchema.parse(req.body);
      const lead = await storage.saveLeadEmail(data);
      res.json(lead);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.get(api.housing.list.path, async (req, res) => {
    const input = api.housing.list.input.parse(req.query);
    const data = await storage.getHousingStats(input?.stateCode, input?.startDate, input?.endDate);
    res.json(data);
  });

  app.get(api.housing.states.path, async (_req, res) => {
    res.json(await storage.getAllStates());
  });

  app.get(api.metro.list.path, async (req, res) => {
    const input = api.metro.list.input.parse(req.query);
    const data = await storage.getMetroStats(input?.stateCode, input?.metroName, input?.startDate, input?.endDate);
    res.json(data);
  });

  app.get(api.countyRental.list.path, async (req, res) => {
    const input = api.countyRental.list.input.parse(req.query);
    const data = await storage.getCountyRentalStats(input?.stateCode, input?.startDate, input?.endDate);
    res.json(data);
  });

  app.get(api.countyRental.latest.path, async (req, res) => {
    const input = api.countyRental.latest.input.parse(req.query);
    const data = await storage.getLatestCountyRentals(input?.stateCode);
    res.json(data);
  });

  return httpServer;
}
