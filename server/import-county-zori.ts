import { db } from "./db";
import { countyRentalStats } from "@shared/schema";
import * as fs from "fs";
import { parse } from "csv-parse/sync";

function normalizeCountyName(name: string): string {
  let normalized = name
    .replace(/\s+(County|Parish|Borough|City|Census Area|Municipality)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  return normalized;
}

async function importCountyZori() {
  const csvPath = "attached_assets/County_zori_LONG_1771525899502.csv";
  console.log("Reading CSV file...");
  const content = fs.readFileSync(csvPath, "utf-8");

  console.log("Parsing CSV...");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Parsed ${records.length} records`);

  const BATCH_SIZE = 1000;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE).map((r: any) => ({
      regionId: parseInt(r.RegionID),
      countyName: r.RegionName,
      normalizedName: normalizeCountyName(r.RegionName),
      stateCode: r.State,
      stateName: r.StateName,
      metro: r.Metro || null,
      date: r.date,
      zori: parseFloat(r.zori),
    }));

    await db.insert(countyRentalStats).values(batch);
    inserted += batch.length;
    if (inserted % 10000 === 0 || inserted === records.length) {
      console.log(`Inserted ${inserted}/${records.length} records`);
    }
  }

  console.log("Import complete!");
  process.exit(0);
}

importCountyZori().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
