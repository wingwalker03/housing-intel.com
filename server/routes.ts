import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertLeadEmailSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse";
import { renderHomepage, renderStatePage } from "./ssr";

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
  // SSR routes (served even in CSR mode for SEO crawlers)
  app.get("/", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderHomepage());
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
      res.send(html);
    } catch (err) {
      next(err);
    }
  });

  // Email embed API - returns static HTML table for email clients
  app.get("/api/embed/email", async (req, res) => {
    function escapeHtml(str: string): string {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    try {
      const rawState = (req.query.state as string || "").replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 2) || undefined;
      const rawMetro = (req.query.metro as string || "").substring(0, 100) || undefined;
      const stateCode = rawState;
      const metroName = rawMetro;

      let title = "US National Housing Market";
      let stats: any[] = [];

      if (metroName) {
        title = `${escapeHtml(metroName)} Housing Market`;
        stats = await storage.getMetroStats(undefined, metroName);
      } else if (stateCode) {
        const stateNames: Record<string, string> = {
          "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
          "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
          "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
          "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
          "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
          "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
          "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
          "NC": "North Carolina", "ND": "North Dakota", "OH": "OH", "OK": "Oklahoma", "OR": "Oregon",
          "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
          "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia",
          "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
        };
        title = `${stateNames[stateCode] || stateCode} Housing Market`;
        stats = await storage.getHousingStats(stateCode);
      } else {
        stats = await storage.getHousingStats();
      }

      if (!stats.length) {
        return res.status(404).json({ message: "No data found" });
      }

      const sorted = [...stats].sort((a: any, b: any) => {
        const dateA = typeof a.date === "string" ? a.date : new Date(a.date).toISOString();
        const dateB = typeof b.date === "string" ? b.date : new Date(b.date).toISOString();
        return dateB.localeCompare(dateA);
      });

      const latest = sorted[0] as any;
      const latestValue = latest.medianHomeValue || latest.value || 0;
      const latestDate = typeof latest.date === "string" ? latest.date : new Date(latest.date).toISOString().split("T")[0];

      let yoyChange = latest.yoyChange || 0;
      if (!yoyChange && sorted.length > 12) {
        const prev = sorted[12] as any;
        const prevValue = prev.medianHomeValue || prev.value || 0;
        if (prevValue > 0) yoyChange = ((latestValue - prevValue) / prevValue) * 100;
      }

      const formattedValue = new Intl.NumberFormat("en-US", {
        style: "currency", currency: "USD", maximumFractionDigits: 0
      }).format(latestValue);

      const formattedYoY = `${yoyChange >= 0 ? "+" : ""}${yoyChange.toFixed(1)}%`;
      const yoyColor = yoyChange >= 0 ? "#059669" : "#dc2626";

      const formattedDate = new Date(latestDate).toLocaleDateString("en-US", {
        month: "long", year: "numeric"
      });

      const linkUrl = metroName
        ? `https://housing-intel.com/metro/${metroName.toLowerCase().replace(/,\s*/g, '-').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
        : stateCode
          ? `https://housing-intel.com/state/${(title.replace(" Housing Market", "")).toLowerCase().replace(/\s+/g, '-')}`
          : "https://housing-intel.com";

      const html = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;font-family:Arial,Helvetica,sans-serif;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr>
    <td style="background-color:#1f2937;padding:16px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="color:#f9fafb;font-size:18px;font-weight:700;">${title}</td>
          <td align="right" style="color:#9ca3af;font-size:12px;">Data as of ${formattedDate}</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px;background-color:#111827;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="50%" style="padding:12px;background-color:#1f2937;border-radius:6px;">
            <div style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Median Home Value</div>
            <div style="color:#f9fafb;font-size:28px;font-weight:700;">${formattedValue}</div>
          </td>
          <td width="8"></td>
          <td width="50%" style="padding:12px;background-color:#1f2937;border-radius:6px;">
            <div style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Year-over-Year Change</div>
            <div style="color:${yoyColor};font-size:28px;font-weight:700;">${formattedYoY}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 20px;background-color:#111827;text-align:center;">
      <a href="${linkUrl}" style="display:inline-block;padding:10px 24px;background-color:#3b82f6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">View Full Dashboard</a>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 20px;background-color:#111827;text-align:center;">
      <a href="https://housing-intel.com" style="color:#6b7280;font-size:11px;text-decoration:none;">Powered by Housing Intel</a>
    </td>
  </tr>
</table>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(html);
    } catch (err: any) {
      console.error("Email embed error:", err);
      res.status(500).json({ message: err.message || "Failed to generate email embed" });
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
