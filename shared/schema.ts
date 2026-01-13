import { pgTable, text, serial, integer, real, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const housingStats = pgTable("housing_stats", {
  id: serial("id").primaryKey(),
  stateCode: text("state_code").notNull(), // e.g. 'CA'
  stateName: text("state_name").notNull(), // e.g. 'California'
  date: date("date").notNull(),
  medianHomeValue: integer("median_home_value").notNull(),
  yoyChange: real("yoy_change").notNull(), // Percentage, e.g. 5.2
});

export const metroStats = pgTable("metro_stats", {
  id: serial("id").primaryKey(),
  metroName: text("metro_name").notNull(), // e.g. 'New York, NY'
  stateCode: text("state_code").notNull(), // e.g. 'NY' (extracted from metro name)
  date: date("date").notNull(),
  medianHomeValue: integer("median_home_value").notNull(),
  yoyChange: real("yoy_change").notNull(),
});

export const leadEmails = pgTable("lead_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  metroName: text("metro_name").notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHousingStatSchema = createInsertSchema(housingStats).omit({ id: true });
export const insertMetroStatSchema = createInsertSchema(metroStats).omit({ id: true });
export const insertLeadEmailSchema = createInsertSchema(leadEmails).omit({ id: true, createdAt: true });

export type HousingStat = typeof housingStats.$inferSelect;
export type InsertHousingStat = z.infer<typeof insertHousingStatSchema>;
export type MetroStat = typeof metroStats.$inferSelect;
export type InsertMetroStat = z.infer<typeof insertMetroStatSchema>;
export type LeadEmail = typeof leadEmails.$inferSelect;
export type InsertLeadEmail = z.infer<typeof insertLeadEmailSchema>;
