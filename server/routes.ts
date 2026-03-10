import type { Express } from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertLeadEmailSchema, insertContactMessageSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse";
import { renderHomepage, renderStatePage, renderMetroPage, renderStatesPage, renderMetrosPage, renderCrawlHubPage, renderEmbedInfoPage, renderSitemap, getSEOData } from "./ssr";
import { getLatestSentiment, getAllLatestSentiments } from "./newsbriefs";
import { createUser, loginUser, confirmEmail, getUserById, getUserByEmail, updateUserStripeInfo, requireAuth } from "./auth";
import { sendContactFormEmail } from "./emailService";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { users, contactMessages } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage() });

const STATE_CODE_MAP: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  "District of Columbia": "DC"
};

async function processZillowCsv(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const content = buffer.toString("utf-8");
    const records: any[] = [];
    parse(content, { columns: true, skip_empty_lines: true, trim: true })
      .on("data", (record: any) => {
        const stateName = record.state || record.RegionName;
        const stateCode = STATE_CODE_MAP[stateName] || (stateName === "United States" ? "US" : null);
        if (stateCode) {
          records.push({
            stateCode,
            stateName,
            date: record.date,
            medianHomeValue: Math.round(parseFloat(record.value)),
            yoyChange: 0,
          });
        }
      })
      .on("end", () => resolve(records))
      .on("error", (err: Error) => reject(err));
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ── AUTH ROUTES ──
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const user = await createUser(firstName, lastName, email, password, baseUrl);
      req.session.userId = user.id;
      res.json({ user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, emailConfirmed: user.emailConfirmed } });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await loginUser(email, password);
      req.session.userId = user.id;
      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          emailConfirmed: user.emailConfirmed,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionStatus: user.subscriptionStatus,
        }
      });
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json({ user: null });
    }
    const user = await getUserById(req.session.userId);
    if (!user) {
      return res.json({ user: null });
    }
    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailConfirmed: user.emailConfirmed,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
      }
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ success: true });
    });
  });

  app.get("/api/auth/confirm/:token", async (req, res) => {
    const success = await confirmEmail(req.params.token);
    if (success) {
      res.redirect("/login?confirmed=true");
    } else {
      res.redirect("/login?confirmed=false");
    }
  });

  // ── CONTACT FORM ──
  app.post("/api/contact", async (req, res) => {
    try {
      const data = insertContactMessageSchema.parse(req.body);
      await db.insert(contactMessages).values(data);
      sendContactFormEmail(data.name, data.email, data.message).catch(console.error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── STRIPE SUBSCRIPTION ROUTES ──
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      res.status(500).json({ message: "Failed to get Stripe key" });
    }
  });

  app.post("/api/subscriptions/create-checkout", requireAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      if (!["api", "embed", "both"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      const user = await getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: { userId: String(user.id) },
        });
        customerId = customer.id;
        await updateUserStripeInfo(user.id, { stripeCustomerId: customerId });
      }

      const priceAmounts: Record<string, number> = { api: 1499, embed: 2499, both: 2999 };
      const planNames: Record<string, string> = { api: "API Access", embed: "Embed Widgets", both: "API + Embed Bundle" };

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: planNames[plan] },
            unit_amount: priceAmounts[plan],
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: `${req.protocol}://${req.get("host")}/account?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get("host")}/subscribe`,
        metadata: { userId: String(user.id), plan },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/subscriptions/verify-session", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: "Session ID required" });

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid" && session.metadata?.userId) {
        const userId = parseInt(session.metadata.userId);
        if (userId !== req.session.userId) {
          return res.status(403).json({ message: "Session does not belong to this user" });
        }
        const plan = session.metadata.plan || "api";
        const subscriptionId = session.subscription as string;

        await updateUserStripeInfo(userId, {
          subscriptionPlan: plan,
          subscriptionStatus: "active",
          stripeSubscriptionId: subscriptionId,
        });

        const user = await getUserById(userId);
        res.json({ success: true, user: {
          id: user!.id,
          firstName: user!.firstName,
          lastName: user!.lastName,
          email: user!.email,
          emailConfirmed: user!.emailConfirmed,
          subscriptionPlan: user!.subscriptionPlan,
          subscriptionStatus: user!.subscriptionStatus,
        }});
      } else {
        res.json({ success: false });
      }
    } catch (err: any) {
      console.error("Verify session error:", err);
      res.status(500).json({ message: "Failed to verify session" });
    }
  });

  app.post("/api/subscriptions/cancel", requireAuth, async (req, res) => {
    try {
      const user = await getUserById(req.session.userId!);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);

      await updateUserStripeInfo(user.id, {
        subscriptionPlan: null,
        subscriptionStatus: "canceled",
        stripeSubscriptionId: null,
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Cancel error:", err);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.get("/api/subscriptions/portal", requireAuth, async (req, res) => {
    try {
      const user = await getUserById(req.session.userId!);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer" });
      }

      const stripe = await getUncachableStripeClient();
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.protocol}://${req.get("host")}/account`,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("Portal error:", err);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  // ── SSR ROUTES ──
  app.get("/", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-SSR-Mode", "ssr");
      res.send(renderHomepage());
    } catch (err) { next(err); }
  });

  app.get("/state/:slug", (req, res, next) => {
    const { slug } = req.params;
    try {
      const html = renderStatePage(slug);
      if (!html) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-SSR-Mode", "ssr");
      res.send(html);
    } catch (err) { next(err); }
  });

  app.get("/states", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-SSR-Mode", "ssr");
      res.send(renderStatesPage());
    } catch (err) { next(err); }
  });

  app.get("/metros", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-SSR-Mode", "ssr");
      res.send(renderMetrosPage());
    } catch (err) { next(err); }
  });

  app.get("/metro/:slug", (req, res, next) => {
    try {
      const html = renderMetroPage(req.params.slug);
      if (!html) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-SSR-Mode", "ssr");
      res.send(html);
    } catch (err) { next(err); }
  });

  app.get("/crawl-hub", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-SSR-Mode", "ssr");
      res.send(renderCrawlHubPage());
    } catch (err) { next(err); }
  });

  app.get("/embed-info", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-SSR-Mode", "ssr");
      res.send(renderEmbedInfoPage());
    } catch (err) { next(err); }
  });

  app.get("/sitemap.xml", (req, res, next) => {
    try {
      res.setHeader("Content-Type", "application/xml");
      res.send(renderSitemap());
    } catch (err) { next(err); }
  });

  app.get("/api/embed/email", async (req, res) => {
    try {
      const stateCode = (req.query.state as string || "").toUpperCase();
      const metroName = req.query.metro as string;
      res.send(`<table><tr><td>Housing Data for ${metroName || stateCode || 'US'}</td></tr></table>`);
    } catch (err) { res.status(500).send("Error"); }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const data = insertLeadEmailSchema.parse(req.body);
      const lead = await storage.saveLeadEmail(data);
      res.json(lead);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.get(api.housing.list.path, async (req, res) => {
    const input = api.housing.list.input.parse(req.query);
    const data = await storage.getHousingStats(input?.stateCode, input?.startDate, input?.endDate);
    res.json(data);
  });

  app.get(api.housing.states.path, async (_req, res) => {
    res.json(await storage.getAllStates());
  });

  app.get(api.metro.list.path, async (req, res) => {
    const input = api.metro.list.input.parse(req.query);
    const data = await storage.getMetroStats(input?.stateCode, input?.metroName, input?.startDate, input?.endDate);
    res.json(data);
  });

  app.get(api.countyRental.list.path, async (req, res) => {
    const input = api.countyRental.list.input.parse(req.query);
    const data = await storage.getCountyRentalStats(input?.stateCode, input?.startDate, input?.endDate);
    res.json(data);
  });

  app.get(api.countyRental.latest.path, async (req, res) => {
    const input = api.countyRental.latest.input.parse(req.query);
    const data = await storage.getLatestCountyRentals(input?.stateCode);
    res.json(data);
  });

  app.get(api.countyRental.trend.path, async (req, res) => {
    const input = api.countyRental.trend.input.parse(req.query);
    const data = await storage.getCountyRentalTrend(input?.stateCode, input?.metro);
    res.json(data);
  });

  app.get('/api/summary', async (_req, res) => {
    try {
      const seoData = getSEOData();
      const states = Object.values(seoData.states).map((s: any) => ({
        code: s.code, name: s.name, latestValue: s.latestValue, latestDate: s.latestDate
      }));
      const topMetros = Object.values(seoData.metros)
        .sort((a: any, b: any) => b.latestValue - a.latestValue)
        .slice(0, 50)
        .map((m: any) => ({ name: m.name, stateCode: m.stateCode, latestValue: m.latestValue, latestDate: m.latestDate }));
      res.json({
        national: {
          medianHomeValue: seoData.national.latestValue,
          latestDate: seoData.national.latestDate,
          totalStates: seoData.national.totalStates,
          totalMetros: seoData.national.totalMetros,
        },
        states, topMetros
      });
    } catch (err) {
      console.error("Summary API Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/health", async (_req, res) => {
    try {
      const seoData = await storage.getAllStates();
      const distPath = path.resolve(process.cwd(), "dist", "public");
      const distExists = fs.existsSync(distPath);
      res.setHeader("X-SSR-Mode", "ssr");
      res.json({
        status: "ok", env: process.env.NODE_ENV,
        db: seoData.length > 0 ? "connected" : "empty",
        assets: distExists ? "present" : "missing",
        distPath, timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ status: "error", message: String(err) });
    }
  });

  app.get("/api/sentiment", async (_req, res) => {
    try {
      const sentiments = await getAllLatestSentiments();
      res.json(sentiments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch sentiments" });
    }
  });

  app.get("/api/sentiment/:marketType/:marketSlug", async (req, res) => {
    try {
      const { marketType, marketSlug } = req.params;
      const sentiment = await getLatestSentiment(marketType, marketSlug);
      if (!sentiment) return res.status(404).json({ message: "No sentiment data found" });
      res.json(sentiment);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch sentiment" });
    }
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) {
      res.setHeader("X-SSR-Mode", "ssr");
    }
    next();
  });

  // ── PUBLIC API V1 ──
  app.get("/api/v1/public/states/:stateCode", async (req, res) => {
    try {
      const { stateCode } = req.params;
      const { startDate, endDate } = req.query;
      if (!stateCode || stateCode.length !== 2) {
        return res.status(400).json({ error: "Invalid state code (e.g., TX, CA)" });
      }
      const data = await storage.getHousingStats(stateCode.toUpperCase(), startDate as string, endDate as string);
      res.header("Access-Control-Allow-Origin", "*");
      res.json({ meta: { source: "Housing Intel", license: "CC-BY-SA" }, data });
    } catch (err) {
      console.error("Public API Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/v1/public/rent/:stateCode/:countyName", async (req, res) => {
    try {
      const { stateCode, countyName } = req.params;
      const allCounties = await storage.getCountyRentalStats(stateCode.toUpperCase());
      const specificCounty = allCounties.filter(c =>
        c.countyName.toLowerCase().includes(countyName.toLowerCase())
      );
      res.header("Access-Control-Allow-Origin", "*");
      res.json({ meta: { source: "Housing Intel", region: `${countyName}, ${stateCode}` }, data: specificCounty });
    } catch (err) {
      res.status(500).json({ error: "Server Error" });
    }
  });

  app.get("/api/v1/widget.js", (req, res) => {
    const { state, metro, theme = "light" } = req.query;
    const targetUrl = `https://housing-intel.com/embed?state=${state || ''}&metro=${metro || ''}&theme=${theme}`;
    const scriptContent = `
      (function() {
        var container = document.createElement('div');
        container.id = 'housing-intel-widget-' + Math.random().toString(36).substring(2, 9);
        container.style.width = '100%';
        container.style.height = '400px';
        container.style.border = '1px solid #e2e8f0';
        container.style.borderRadius = '8px';
        container.style.overflow = 'hidden';
        var iframe = document.createElement('iframe');
        iframe.src = '${targetUrl}';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        container.appendChild(iframe);
        document.write(container.outerHTML);
      })();
    `;
    res.setHeader("Content-Type", "application/javascript");
    res.send(scriptContent);
  });

  return httpServer;
}
