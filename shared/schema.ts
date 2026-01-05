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

export const insertHousingStatSchema = createInsertSchema(housingStats).omit({ id: true });

export type HousingStat = typeof housingStats.$inferSelect;
export type InsertHousingStat = z.infer<typeof insertHousingStatSchema>;
