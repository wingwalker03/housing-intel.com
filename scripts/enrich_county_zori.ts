import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const DATA_DIR = path.resolve(process.cwd(), "client", "public", "data");
const INPUT_CSV = path.resolve(process.cwd(), "attached_assets", "County_zori_latest_month_LONG_1772682434263.csv");
const OUTPUT_CSV = path.join(DATA_DIR, "County_zori_latest_month_LONG_geoid.csv");
const TOPO_JSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

const STATE_NAME_TO_FIPS: Record<string, string> = {
  "Alabama": "01", "Alaska": "02", "Arizona": "04", "Arkansas": "05", "California": "06",
  "Colorado": "08", "Connecticut": "09", "Delaware": "10", "District of Columbia": "11",
  "Florida": "12", "Georgia": "13", "Hawaii": "15", "Idaho": "16", "Illinois": "17",
  "Indiana": "18", "Iowa": "19", "Kansas": "20", "Kentucky": "21", "Louisiana": "22",
  "Maine": "23", "Maryland": "24", "Massachusetts": "25", "Michigan": "26", "Minnesota": "27",
  "Mississippi": "28", "Missouri": "29", "Montana": "30", "Nebraska": "31", "Nevada": "32",
  "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
  "North Carolina": "37", "North Dakota": "38", "Ohio": "39", "Oklahoma": "40", "Oregon": "41",
  "Pennsylvania": "42", "Rhode Island": "44", "South Carolina": "45", "South Dakota": "46",
  "Tennessee": "47", "Texas": "48", "Utah": "49", "Vermont": "50", "Virginia": "51",
  "Washington": "53", "West Virginia": "54", "Wisconsin": "55", "Wyoming": "56"
};

function normalizeName(name: string) {
  return name.toLowerCase()
    .replace(/\s+(county|parish|borough|city|census area|municipality)$/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function run() {
  console.log("Building GEOID lookup for county rental data...");
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const response = await fetch(TOPO_JSON_URL);
  const topoData = await response.json();
  const counties = (topoData as any).objects.counties.geometries;
  
  const lookup: Record<string, string> = {};
  for (const c of counties) {
    const geoid = c.id.padStart(5, "0");
    const name = normalizeName(c.properties.name);
    const stateFips = geoid.slice(0, 2);
    lookup[`\${stateFips}|\${name}`] = geoid;
  }

  const inputContent = fs.readFileSync(INPUT_CSV, "utf-8");
  const records = parse(inputContent, { columns: true, skip_empty_lines: true });

  const headers = [...Object.keys(records[0]), "geoid"];
  const csvLines = [headers.join(",")];

  records.forEach((r: any) => {
    const stateFips = STATE_NAME_TO_FIPS[r.StateName];
    const countyNorm = normalizeName(r.RegionName);
    const geoid = lookup[`\${stateFips}|\${countyNorm}`] || "";
    const values = headers.map(h => {
      const val = h === "geoid" ? geoid : r[h];
      const str = String(val || "");
      return str.includes(",") ? `"\${str}"` : str;
    });
    csvLines.push(values.join(","));
  });

  fs.writeFileSync(OUTPUT_CSV, csvLines.join("\n"));
  console.log(`Saved enriched CSV to \${OUTPUT_CSV}`);
}

run().catch(console.error);
