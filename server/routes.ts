import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { parse } from "csv-parse";
import { insertHousingStatSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

// Seed data helper
const STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

function generateTrend(startValue: number, volatility: number, trend: number, months: number) {
  const data = [];
  let currentValue = startValue;
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 20); // 20 years ago

  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    
    // Random walk with trend
    const change = (Math.random() - 0.5) * volatility + trend;
    currentValue = currentValue * (1 + change);
    
    // Seasonality
    const month = date.getMonth();
    const seasonality = Math.sin((month / 12) * Math.PI * 2) * 0.005; // 0.5% seasonal swing
    const finalValue = Math.round(currentValue * (1 + seasonality));

    data.push({
      date: date.toISOString().split('T')[0],
      value: finalValue
    });
  }
  return data;
}

async function seedData() {
  const existing = await storage.getAllStates();
  if (existing.length > 0) return;

  console.log('Seeding housing data...');
  const allData = [];
  
  for (const state of STATES) {
    // Generate distinct profiles for different states
    let startPrice = 150000;
    let trend = 0.003; // Monthly appreciation
    let volatility = 0.02;

    if (['CA', 'NY', 'MA', 'HI'].includes(state.code)) {
      startPrice = 350000;
      trend = 0.004;
      volatility = 0.03;
    } else if (['TX', 'FL', 'AZ'].includes(state.code)) {
      startPrice = 120000;
      trend = 0.0035;
      volatility = 0.04; // Boom/bust
    }

    const series = generateTrend(startPrice, volatility, trend, 240); // 20 years * 12 months
    
    for (let i = 0; i < series.length; i++) {
      const current = series[i];
      const prev = i > 12 ? series[i - 12] : null;
      const yoyChange = prev ? ((current.value - prev.value) / prev.value) * 100 : 0;

      allData.push({
        stateCode: state.code,
        stateName: state.name,
        date: current.date,
        medianHomeValue: current.value,
        yoyChange: Number(yoyChange.toFixed(2))
      });
    }
  }

  await storage.seedHousingData(allData);
  console.log('Seeding complete.');
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
      const records: any[] = [];
      const parser = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      for await (const record of parser) {
        // Validate record
        const validated = insertHousingStatSchema.parse({
          stateCode: record.stateCode || record.state_code,
          stateName: record.stateName || record.state_name,
          date: record.date,
          medianHomeValue: parseInt(record.medianHomeValue || record.median_home_value),
          yoyChange: parseFloat(record.yoyChange || record.yoy_change)
        });
        records.push(validated);
      }

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

  // Start seeding in background
  seedData().catch(console.error);

  return httpServer;
}
