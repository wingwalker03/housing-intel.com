import OpenAI from "openai";
import { db } from "./db";
import { 
  weeklyMarketBriefs, 
  newsCache, 
  housingStats, 
  metroStats,
  type InsertWeeklyMarketBrief 
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { batchProcess } from "./replit_integrations/batch";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface NewsSource {
  title: string;
  publisher: string;
  date: string;
  url: string;
}

interface MarketData {
  name: string;
  slug: string;
  type: "state" | "metro";
  latestValue?: number;
  yoyChange?: number;
}

function getWeekBounds(date: Date = new Date()): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: sunday.toISOString().split("T")[0],
  };
}

async function getMarketData(marketType: "state" | "metro", slug: string): Promise<MarketData | null> {
  if (marketType === "state") {
    const stateName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const [latest] = await db
      .select()
      .from(housingStats)
      .where(eq(housingStats.stateName, stateName))
      .orderBy(desc(housingStats.date))
      .limit(1);
    
    if (!latest) return null;
    return {
      name: stateName,
      slug,
      type: "state",
      latestValue: latest.medianHomeValue,
      yoyChange: latest.yoyChange,
    };
  } else {
    const rows = await db.selectDistinct({ name: metroStats.metroName }).from(metroStats);
    const metroName = rows.find(r => {
      const s = r.name
        .toLowerCase()
        .replace(/,\s*/g, "-")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      return s === slug;
    })?.name;
    
    if (!metroName) return null;
    
    const [latest] = await db
      .select()
      .from(metroStats)
      .where(eq(metroStats.metroName, metroName))
      .orderBy(desc(metroStats.date))
      .limit(1);
    
    if (!latest) return null;
    return {
      name: metroName,
      slug,
      type: "metro",
      latestValue: latest.medianHomeValue,
      yoyChange: latest.yoyChange,
    };
  }
}

async function fetchNewsWithWebSearch(marketName: string, marketType: "state" | "metro"): Promise<NewsSource[]> {
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "web_search" as any }],
      input: `Search for the latest housing and real estate news from the past 7 days for ${marketName}. Return a list of 3-5 recent news articles with their titles, publishers, dates, and URLs. Focus on housing market trends, home prices, inventory, mortgage rates, and real estate developments specific to ${marketName}.`,
    });

    let textContent = "";
    for (const item of response.output) {
      if (item.type === "message" && "content" in item) {
        for (const c of (item as any).content || []) {
          if (c.type === "output_text" && c.text) {
            textContent += c.text;
          }
        }
      }
    }
    
    const sources: NewsSource[] = [];
    const urlPattern = /https?:\/\/[^\s\)\"\']+/g;
    const urls = textContent.match(urlPattern) || [];
    
    for (const url of urls.slice(0, 5)) {
      sources.push({
        title: "Recent Housing News",
        publisher: new URL(url).hostname.replace("www.", ""),
        date: new Date().toISOString().split("T")[0],
        url: url,
      });
    }
    
    return sources;
  } catch (error) {
    console.error("Web search error:", error);
    return [];
  }
}

async function generateBriefContent(
  market: MarketData,
  sources: NewsSource[],
  weekStart: string,
  weekEnd: string
): Promise<{ title: string; metaDescription: string; briefHtml: string }> {
  const formatCurrency = (val: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
  const formatPercent = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;

  const dataSection = market.latestValue && market.yoyChange !== undefined
    ? `Current median home value: ${formatCurrency(market.latestValue)}. Year-over-year change: ${formatPercent(market.yoyChange)}. Trend: ${market.yoyChange > 2 ? "gaining momentum" : market.yoyChange < -2 ? "cooling" : "stabilizing"}.`
    : "Market data currently being updated.";

  const sourcesContext = sources.length > 0
    ? `Recent news sources to reference:\n${sources.map(s => `- ${s.title} (${s.publisher}, ${s.date}): ${s.url}`).join("\n")}`
    : "No recent news sources available. Focus on general market analysis.";

  const prompt = `Write a ~300 word weekly housing news brief for ${market.name} (${market.type === "state" ? "state" : "metro area"}) for the week of ${weekStart} to ${weekEnd}.

Housing Intel Data for ${market.name}:
${dataSection}

${sourcesContext}

Requirements:
1. Title: Create an engaging SEO-friendly title
2. Meta description: ~150 characters summarizing the brief
3. Brief content in HTML format with:
   - Opening paragraph summarizing the week's housing news
   - "What Housing Intel Data Shows" section with our metrics analysis
   - 2-4 bullet takeaways (use <ul><li>)
   - 1 "What to Watch" line about upcoming trends
   - Do NOT include the sources section - that will be added separately

Return JSON with this exact structure:
{
  "title": "...",
  "metaDescription": "...",
  "briefHtml": "..."
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

export async function generateBriefForMarket(
  marketType: "state" | "metro",
  marketSlug: string
): Promise<{ success: boolean; message: string }> {
  const { weekStart, weekEnd } = getWeekBounds();

  const existing = await db
    .select()
    .from(weeklyMarketBriefs)
    .where(
      and(
        eq(weeklyMarketBriefs.marketType, marketType),
        eq(weeklyMarketBriefs.marketSlug, marketSlug),
        eq(weeklyMarketBriefs.weekStart, weekStart)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { success: true, message: "Brief already exists for this week" };
  }

  const market = await getMarketData(marketType, marketSlug);
  if (!market) {
    return { success: false, message: `Market not found: ${marketType}/${marketSlug}` };
  }

  const sources = await fetchNewsWithWebSearch(market.name, marketType);

  await db.insert(newsCache).values({
    marketType,
    marketSlug,
    sources: JSON.stringify(sources),
  });

  const { title, metaDescription, briefHtml } = await generateBriefContent(market, sources, weekStart, weekEnd);

  const briefData: InsertWeeklyMarketBrief = {
    marketType,
    marketSlug,
    weekStart,
    weekEnd,
    title,
    metaDescription,
    briefHtml,
    sources: JSON.stringify(sources),
  };

  await db.insert(weeklyMarketBriefs).values(briefData);

  return { success: true, message: `Generated brief for ${market.name}` };
}

export async function runWeeklyBriefs(): Promise<{ processed: number; errors: number }> {
  const states = await db.selectDistinct({ name: housingStats.stateName }).from(housingStats);
  const metros = await db.selectDistinct({ name: metroStats.metroName }).from(metroStats);

  const allMarkets: { type: "state" | "metro"; slug: string }[] = [
    ...states.map(s => ({
      type: "state" as const,
      slug: s.name.toLowerCase().replace(/\s+/g, "-"),
    })),
    ...metros.map(m => ({
      type: "metro" as const,
      slug: m.name
        .toLowerCase()
        .replace(/,\s*/g, "-")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    })),
  ];

  let errors = 0;

  await batchProcess(
    allMarkets,
    async (market) => {
      const result = await generateBriefForMarket(market.type, market.slug);
      if (!result.success) {
        errors++;
        console.error(result.message);
      }
      return result;
    },
    { concurrency: 2, retries: 3 }
  );

  return { processed: allMarkets.length, errors };
}

export async function getBriefByWeek(
  marketType: string,
  marketSlug: string,
  weekStart: string
): Promise<typeof weeklyMarketBriefs.$inferSelect | null> {
  const [brief] = await db
    .select()
    .from(weeklyMarketBriefs)
    .where(
      and(
        eq(weeklyMarketBriefs.marketType, marketType),
        eq(weeklyMarketBriefs.marketSlug, marketSlug),
        eq(weeklyMarketBriefs.weekStart, weekStart)
      )
    )
    .limit(1);
  return brief || null;
}

export async function getBriefArchive(
  marketType: string,
  marketSlug: string
): Promise<(typeof weeklyMarketBriefs.$inferSelect)[]> {
  return db
    .select()
    .from(weeklyMarketBriefs)
    .where(
      and(
        eq(weeklyMarketBriefs.marketType, marketType),
        eq(weeklyMarketBriefs.marketSlug, marketSlug)
      )
    )
    .orderBy(desc(weeklyMarketBriefs.weekStart));
}
