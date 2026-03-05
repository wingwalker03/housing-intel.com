import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const DATA_DIR = path.resolve(process.cwd(), "client", "public", "data");
const INPUT_CSV = path.resolve(process.cwd(), "attached_assets", "County_zori_latest_month_LONG_1772682434263.csv");
const OUTPUT_CSV = path.join(DATA_DIR, "County_zori_latest_month_LONG_geoid.csv");
const TOPO_JSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

// Mapping of state abbreviations (Zillow) to FIPS
const STATE_ABBR_TO_FIPS: Record<string, string> = {
  "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06",
  "CO": "08", "CT": "09", "DE": "10", "DC": "11",
  "FL": "12", "GA": "13", "HI": "15", "ID": "16", "IL": "17",
  "IN": "18", "IA": "19", "KS": "20", "KY": "21", "LA": "22",
  "ME": "23", "MD": "24", "MA": "25", "MI": "26", "MN": "27",
  "MS": "28", "MO": "29", "MT": "30", "NE": "31", "NV": "32",
  "NH": "33", "NJ": "34", "NM": "35", "NY": "36",
  "NC": "37", "ND": "38", "OH": "39", "OK": "40", "OR": "41",
  "PA": "42", "RI": "44", "SC": "45", "SD": "46",
  "TN": "47", "TX": "48", "UT": "49", "VT": "50", "VA": "51",
  "WA": "53", "WV": "54", "WI": "55", "WY": "56"
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
    const geoid = String(c.id).padStart(5, "0");
    const name = normalizeName(c.properties.name);
    const stateFips = geoid.slice(0, 2);
    lookup[stateFips + "|" + name] = geoid;
  }

  const inputContent = fs.readFileSync(INPUT_CSV, "utf-8");
  const records = parse(inputContent, { columns: true, skip_empty_lines: true });

  const headers = [...Object.keys(records[0]), "geoid"];
  const csvLines = [headers.join(",")];

  let matchedCount = 0;
  records.forEach((r: any) => {
    // Zillow CSV column 'State' is abbreviation (e.g., 'ID')
    const stateAbbr = (r.State || "").trim();
    const stateFips = STATE_ABBR_TO_FIPS[stateAbbr];
    const countyName = (r.RegionName || "").trim();
    const countyNorm = normalizeName(countyName);
    
    let geoid = lookup[stateFips + "|" + countyNorm] || "";
    
    if (geoid) matchedCount++;
    
    const values = headers.map(h => {
      const val = h === "geoid" ? geoid : r[h];
      const str = String(val || "");
      // Simple CSV escaping
      if (str.includes(",") || str.includes("\"")) {
        return "\"" + str.replace(/"/g, "\"\"") + "\"";
      }
      return str;
    });
    csvLines.push(values.join(","));
  });

  fs.writeFileSync(OUTPUT_CSV, csvLines.join("\n"));
  console.log("Saved enriched CSV to " + OUTPUT_CSV);
  console.log("Matched " + matchedCount + " of " + records.length + " records");
}

run().catch(console.error);
