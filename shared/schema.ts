import { pgTable, text, serial, integer, real, timestamp, date, boolean } from "drizzle-orm/pg-core";
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

export const countyRentalStats = pgTable("county_rental_stats", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").notNull(),
  countyName: text("county_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  stateCode: text("state_code").notNull(),
  stateName: text("state_name").notNull(),
  metro: text("metro"),
  date: date("date").notNull(),
  zori: real("zori").notNull(),
});

export const insertHousingStatSchema = createInsertSchema(housingStats).omit({ id: true });
export const insertMetroStatSchema = createInsertSchema(metroStats).omit({ id: true });
export const insertLeadEmailSchema = createInsertSchema(leadEmails).omit({ id: true, createdAt: true });
export const insertCountyRentalStatSchema = createInsertSchema(countyRentalStats).omit({ id: true });

export type HousingStat = typeof housingStats.$inferSelect;
export type InsertHousingStat = z.infer<typeof insertHousingStatSchema>;
export type MetroStat = typeof metroStats.$inferSelect;
export type InsertMetroStat = z.infer<typeof insertMetroStatSchema>;
export type LeadEmail = typeof leadEmails.$inferSelect;
export type InsertLeadEmail = z.infer<typeof insertLeadEmailSchema>;
export type CountyRentalStat = typeof countyRentalStats.$inferSelect;
export type InsertCountyRentalStat = z.infer<typeof insertCountyRentalStatSchema>;

export * from "./models/chat";

// Weekly Market Briefs
export const weeklyMarketBriefs = pgTable("weekly_market_briefs", {
  id: serial("id").primaryKey(),
  marketType: text("market_type").notNull(), // 'state' | 'metro'
  marketSlug: text("market_slug").notNull(),
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  title: text("title").notNull(),
  metaDescription: text("meta_description").notNull(),
  briefHtml: text("brief_html").notNull(),
  sources: text("sources").notNull(), // JSON string array of sources
  sentiment: text("sentiment"), // 'bullish' | 'bearish' | 'neutral'
  sentimentScore: real("sentiment_score"), // -1 to 1 scale
  sentimentSummary: text("sentiment_summary"), // Brief explanation
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const newsCache = pgTable("news_cache", {
  id: serial("id").primaryKey(),
  marketType: text("market_type").notNull(),
  marketSlug: text("market_slug").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  sources: text("sources").notNull(), // JSON string array
});

export const insertWeeklyMarketBriefSchema = createInsertSchema(weeklyMarketBriefs).omit({ id: true, createdAt: true });
export const insertNewsCacheSchema = createInsertSchema(newsCache).omit({ id: true, fetchedAt: true });

export type WeeklyMarketBrief = typeof weeklyMarketBriefs.$inferSelect;
export type InsertWeeklyMarketBrief = z.infer<typeof insertWeeklyMarketBriefSchema>;
export type NewsCache = typeof newsCache.$inferSelect;
export type InsertNewsCache = z.infer<typeof insertNewsCacheSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailConfirmed: boolean("email_confirmed").default(false).notNull(),
  confirmToken: text("confirm_token"),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionPlan: text("subscription_plan"),
  subscriptionStatus: text("subscription_status"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
