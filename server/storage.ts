import { db } from "./db";
import { 
  housingStats, 
  metroStats, 
  leadEmails,
  countyRentalStats,
  type HousingStat, 
  type InsertHousingStat, 
  type MetroStat, 
  type InsertMetroStat,
  type LeadEmail,
  type InsertLeadEmail,
  type CountyRentalStat,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  getHousingStats(stateCode?: string, startDate?: string, endDate?: string): Promise<HousingStat[]>;
  getAllStates(): Promise<{ code: string, name: string }[]>;
  seedHousingData(data: InsertHousingStat[]): Promise<void>;
  getMetroStats(stateCode?: string, metroName?: string, startDate?: string, endDate?: string): Promise<MetroStat[]>;
  getMetrosByState(stateCode: string): Promise<{ name: string }[]>;
  seedMetroData(data: InsertMetroStat[]): Promise<void>;
  clearMetroData(): Promise<void>;
  saveLeadEmail(data: InsertLeadEmail): Promise<LeadEmail>;
  getCountyRentalStats(stateCode?: string, startDate?: string, endDate?: string): Promise<CountyRentalStat[]>;
  getLatestCountyRentals(stateCode?: string): Promise<{ countyName: string, normalizedName: string, stateCode: string, stateName: string, zori: number, date: string }[]>;
  getCountyRentalTrend(stateCode?: string): Promise<{ date: string, avgZori: number, count: number }[]>;
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

  async saveLeadEmail(data: InsertLeadEmail): Promise<LeadEmail> {
    const [result] = await db.insert(leadEmails).values(data).returning();
    return result;
  }

  async getCountyRentalStats(stateCode?: string, startDate?: string, endDate?: string): Promise<CountyRentalStat[]> {
    let conditions = [];
    if (stateCode) conditions.push(eq(countyRentalStats.stateCode, stateCode));
    if (startDate) conditions.push(gte(countyRentalStats.date, startDate));
    if (endDate) conditions.push(lte(countyRentalStats.date, endDate));

    return await db.select()
      .from(countyRentalStats)
      .where(and(...conditions))
      .orderBy(countyRentalStats.date);
  }

  async getLatestCountyRentals(stateCode?: string): Promise<{ countyName: string, normalizedName: string, stateCode: string, stateName: string, zori: number, date: string }[]> {
    const latestDateSubquery = db
      .select({ maxDate: sql<string>`MAX(${countyRentalStats.date})` })
      .from(countyRentalStats);

    let conditions = [eq(countyRentalStats.date, sql`(${latestDateSubquery})`)];
    if (stateCode) conditions.push(eq(countyRentalStats.stateCode, stateCode));

    const results = await db.select({
      countyName: countyRentalStats.countyName,
      normalizedName: countyRentalStats.normalizedName,
      stateCode: countyRentalStats.stateCode,
      stateName: countyRentalStats.stateName,
      zori: countyRentalStats.zori,
      date: countyRentalStats.date,
    })
      .from(countyRentalStats)
      .where(and(...conditions));

    return results.map(r => ({ ...r, date: String(r.date) }));
  }
  async getCountyRentalTrend(stateCode?: string): Promise<{ date: string, avgZori: number, count: number }[]> {
    let conditions = [];
    if (stateCode) conditions.push(eq(countyRentalStats.stateCode, stateCode));

    const results = await db.select({
      date: countyRentalStats.date,
      avgZori: sql<number>`AVG(${countyRentalStats.zori})`,
      count: sql<number>`COUNT(*)`,
    })
      .from(countyRentalStats)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(countyRentalStats.date)
      .orderBy(countyRentalStats.date);

    return results.map(r => ({
      date: String(r.date),
      avgZori: Number(r.avgZori),
      count: Number(r.count),
    }));
  }
}

export const storage = new DatabaseStorage();
