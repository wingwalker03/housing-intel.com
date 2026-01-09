import { db } from "./db";
import { housingStats, metroStats, type HousingStat, type InsertHousingStat, type MetroStat, type InsertMetroStat } from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  getHousingStats(stateCode?: string, startDate?: string, endDate?: string): Promise<HousingStat[]>;
  getAllStates(): Promise<{ code: string, name: string }[]>;
  seedHousingData(data: InsertHousingStat[]): Promise<void>;
  getMetroStats(stateCode?: string, metroName?: string, startDate?: string, endDate?: string): Promise<MetroStat[]>;
  getMetrosByState(stateCode: string): Promise<{ name: string }[]>;
  seedMetroData(data: InsertMetroStat[]): Promise<void>;
  clearMetroData(): Promise<void>;
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
      .orderBy(housingStats.date);
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
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      await db.insert(housingStats).values(data.slice(i, i + batchSize));
    }
  }

  async clearHousingData(): Promise<void> {
    await db.delete(housingStats);
  }

  async getMetroStats(stateCode?: string, metroName?: string, startDate?: string, endDate?: string): Promise<MetroStat[]> {
    let conditions = [];
    if (stateCode) conditions.push(eq(metroStats.stateCode, stateCode));
    if (metroName) conditions.push(eq(metroStats.metroName, metroName));
    if (startDate) conditions.push(gte(metroStats.date, startDate));
    if (endDate) conditions.push(lte(metroStats.date, endDate));

    return await db.select()
      .from(metroStats)
      .where(and(...conditions))
      .orderBy(metroStats.date);
  }

  async getMetrosByState(stateCode: string): Promise<{ name: string }[]> {
    const result = await db.selectDistinct({
      name: metroStats.metroName
    }).from(metroStats).where(eq(metroStats.stateCode, stateCode));
    return result;
  }

  async seedMetroData(data: InsertMetroStat[]): Promise<void> {
    if (data.length === 0) return;
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      await db.insert(metroStats).values(data.slice(i, i + batchSize));
    }
  }

  async clearMetroData(): Promise<void> {
    await db.delete(metroStats);
  }
}

export const storage = new DatabaseStorage();
