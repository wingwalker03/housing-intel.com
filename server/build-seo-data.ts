/**
 * Build script to precompute JSON index of states/metros with latest stats.
 * Run: npx tsx server/build-seo-data.ts
 * Output: server/seo-data.json
 */
import { db } from "./db";
import { housingStats, metroStats } from "@shared/schema";
import { desc, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StateData {
  code: string;
  name: string;
  slug: string;
  latestValue: number;
  latestDate: string;
  yoyChange: number;
  metros: string[];
}

interface MetroData {
  name: string;
  slug: string;
  stateCode: string;
  stateName: string;
  stateSlug: string;
  latestValue: number;
  latestDate: string;
  yoyChange: number;
  relatedMetros: string[];
}

interface SEOData {
  generatedAt: string;
  national: {
    latestValue: number;
    latestDate: string;
    yoyChange: number;
    totalStates: number;
    totalMetros: number;
  };
  states: Record<string, StateData>;
  metros: Record<string, MetroData>;
  statesBySlug: Record<string, string>;
  metrosBySlug: Record<string, string>;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/,\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const STATE_CODE_TO_NAME: Record<string, string> = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
  "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
  "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
  "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
  "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
  "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
  "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
  "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
  "DC": "District of Columbia"
};

async function buildSEOData(): Promise<void> {
  console.log("Building SEO data index...");

  // Get all state data with latest values
  const stateRows = await db
    .select({
      stateCode: housingStats.stateCode,
      stateName: housingStats.stateName,
      date: housingStats.date,
      medianHomeValue: housingStats.medianHomeValue,
      yoyChange: housingStats.yoyChange,
    })
    .from(housingStats)
    .orderBy(desc(housingStats.date));

  // Get all metro data with latest values
  const metroRows = await db
    .select({
      metroName: metroStats.metroName,
      stateCode: metroStats.stateCode,
      date: metroStats.date,
      medianHomeValue: metroStats.medianHomeValue,
      yoyChange: metroStats.yoyChange,
    })
    .from(metroStats)
    .orderBy(desc(metroStats.date));

  // Process states - keep only latest per state
  const statesMap: Record<string, StateData> = {};
  const statesBySlug: Record<string, string> = {};
  
  for (const row of stateRows) {
    if (!statesMap[row.stateCode]) {
      const slug = slugify(row.stateName);
      statesMap[row.stateCode] = {
        code: row.stateCode,
        name: row.stateName,
        slug,
        latestValue: row.medianHomeValue,
        latestDate: String(row.date),
        yoyChange: row.yoyChange,
        metros: [],
      };
      statesBySlug[slug] = row.stateCode;
    }
  }

  // Process metros - keep only latest per metro
  const metrosMap: Record<string, MetroData> = {};
  const metrosBySlug: Record<string, string> = {};
  
  for (const row of metroRows) {
    if (!metrosMap[row.metroName]) {
      const slug = slugify(row.metroName);
      const stateName = STATE_CODE_TO_NAME[row.stateCode] || row.stateCode;
      const stateSlug = slugify(stateName);
      
      metrosMap[row.metroName] = {
        name: row.metroName,
        slug,
        stateCode: row.stateCode,
        stateName,
        stateSlug,
        latestValue: row.medianHomeValue,
        latestDate: String(row.date),
        yoyChange: row.yoyChange,
        relatedMetros: [],
      };
      metrosBySlug[slug] = row.metroName;

      // Add metro to its state
      if (statesMap[row.stateCode]) {
        statesMap[row.stateCode].metros.push(row.metroName);
      }
    }
  }

  // Add related metros (same state)
  for (const metroName in metrosMap) {
    const metro = metrosMap[metroName];
    const stateMetros = statesMap[metro.stateCode]?.metros || [];
    metro.relatedMetros = stateMetros
      .filter(m => m !== metroName)
      .slice(0, 5); // Top 5 related metros
  }

  // Calculate national averages
  const latestStates = Object.values(statesMap);
  const latestDate = latestStates[0]?.latestDate || new Date().toISOString().split('T')[0];
  const avgValue = latestStates.length > 0
    ? Math.round(latestStates.reduce((sum, s) => sum + s.latestValue, 0) / latestStates.length)
    : 0;
  const avgYoy = latestStates.length > 0
    ? parseFloat((latestStates.reduce((sum, s) => sum + s.yoyChange, 0) / latestStates.length).toFixed(2))
    : 0;

  const seoData: SEOData = {
    generatedAt: new Date().toISOString(),
    national: {
      latestValue: avgValue,
      latestDate,
      yoyChange: avgYoy,
      totalStates: Object.keys(statesMap).length,
      totalMetros: Object.keys(metrosMap).length,
    },
    states: statesMap,
    metros: metrosMap,
    statesBySlug,
    metrosBySlug,
  };

  const outputPath = path.join(__dirname, "seo-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(seoData, null, 2));
  console.log(`SEO data written to ${outputPath}`);
  console.log(`  States: ${Object.keys(statesMap).length}`);
  console.log(`  Metros: ${Object.keys(metrosMap).length}`);
}

buildSEOData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to build SEO data:", err);
    process.exit(1);
  });
