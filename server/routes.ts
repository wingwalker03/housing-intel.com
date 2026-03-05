import type { Express } from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertLeadEmailSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse";
import { renderHomepage, renderStatePage, renderMetroPage, renderStatesPage, renderMetrosPage, renderCrawlHubPage, renderEmbedInfoPage, renderSitemap, getSEOData } from "./ssr";
import { getLatestSentiment, getAllLatestSentiments } from "./newsbriefs";

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
    const data = await storage.getCountyRentalTrend(input?.stateCode);
    res.json(data);
  });

  app.get('/api/summary', async (_req, res) => {
    try {
      const seoData = getSEOData();
      
      const states = Object.values(seoData.states).map(s => ({
        code: s.code,
        name: s.name,
        latestValue: s.latestValue,
        latestDate: s.latestDate
      }));

      const topMetros = Object.values(seoData.metros)
        .sort((a, b) => b.latestValue - a.latestValue)
        .slice(0, 50)
        .map(m => ({
          name: m.name,
          stateCode: m.stateCode,
          latestValue: m.latestValue,
          latestDate: m.latestDate
        }));

      res.json({
        national: {
          medianHomeValue: seoData.national.latestValue,
          latestDate: seoData.national.latestDate,
          totalStates: seoData.national.totalStates,
          totalMetros: seoData.national.totalMetros,
        },
        states,
        topMetros
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
        status: "ok",
        env: process.env.NODE_ENV,
        db: seoData.length > 0 ? "connected" : "empty",
        assets: distExists ? "present" : "missing",
        distPath,
        timestamp: new Date().toISOString()
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

  // --- PUBLIC API V1 (For External Developers & Widgets) ---                                                                                             

  // 1. Get State Data (JSON)                                                                                                                              
  app.get("/api/v1/public/states/:stateCode", async (req, res) => {                                                                                        
    try {                                                                                                                                                  
      const { stateCode } = req.params;                                                                                                                    
      const { startDate, endDate } = req.query;                                                                                                            

      // Basic Validation                                                                                                                                  
      if (!stateCode || stateCode.length !== 2) {                                                                                                          
        return res.status(400).json({ error: "Invalid state code (e.g., TX, CA)" });                                                                       
      }                                                                                                                                                    

      // Fetch Data                                                                                                                                        
      const data = await storage.getHousingStats(stateCode.toUpperCase(), startDate as string, endDate as string);                                        

      // Add CORS for public access                                                                                                                        
      res.header("Access-Control-Allow-Origin", "*");                                                                                                     
      res.json({                                                                                                                                           
        meta: { source: "Housing Intel", license: "CC-BY-SA" },                                                                                            
        data                                                                                                                                               
      });                                                                                                                                                  
    } catch (err) {                                                                                                                                        
      console.error("Public API Error:", err);                                                                                                             
      res.status(500).json({ error: "Internal Server Error" });                                                                                            
    }                                                                                                                                                      
  });                                                                                                                                                      

  // 2. Get Rental Data for a County (JSON)                                                                                                                
  app.get("/api/v1/public/rent/:stateCode/:countyName", async (req, res) => {                                                                              
    try {                                                                                                                                                  
      const { stateCode, countyName } = req.params;                                                                                                        

      // Fetch Data (You might need to adjust storage method to filter by county name if not exists)                                                       
      // Assuming getCountyRentalStats filters by state, we filter locally for now:                                                                        
      const allCounties = await storage.getCountyRentalStats(stateCode.toUpperCase());                                                                    
      const specificCounty = allCounties.filter(c =>                                                                                                       
        c.countyName.toLowerCase().includes(countyName.toLowerCase())                                                                                     
      );                                                                                                                                                   

      res.header("Access-Control-Allow-Origin", "*");                                                                                                     
      res.json({                                                                                                                                           
        meta: { source: "Housing Intel", region: `${countyName}, ${stateCode}` },                                                                          
        data: specificCounty                                                                                                                               
      });                                                                                                                                                  
    } catch (err) {                                                                                                                                        
      res.status(500).json({ error: "Server Error" });                                                                                                     
    }                                                                                                                                                      
  });                              
  // --- EMBED WIDGET GENERATOR ---                                                                                                                        
  // Usage: <script src="https://housing-intel.com/api/v1/widget.js?state=TX"></script>                                                                    

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
