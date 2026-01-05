import { db } from "./db";
import { housingStats, type HousingStat, type InsertHousingStat } from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  getHousingStats(stateCode?: string, startDate?: string, endDate?: string): Promise<HousingStat[]>;
  getAllStates(): Promise<{ code: string, name: string }[]>;
  seedHousingData(data: InsertHousingStat[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getHousingStats(stateCode?: string, startDate?: string, endDate?: string): Promise<HousingStat[]> {
    let conditions = [];
    if (stateCode) conditions.push(eq(housingStats.stateCode, stateCode));
    if (startDate) conditions.push(gte(housingStats.date, startDate));
    if (endDate) conditions.push(lte(housingStats.date, endDate));

    return await db.select()
      .from(housingStats)
      .where(and(...conditions))
      .orderBy(desc(housingStats.date));
  }

  async getAllStates(): Promise<{ code: string, name: string }[]> {
    const result = await db.selectDistinct({
      code: housingStats.stateCode,
      name: housingStats.stateName
    }).from(housingStats);
    return result;
  }

  async seedHousingData(data: InsertHousingStat[]): Promise<void> {
    if (data.length === 0) return;
    // Batch insert for performance
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      await db.insert(housingStats).values(data.slice(i, i + batchSize));
    }
  }
}

export const storage = new DatabaseStorage();
