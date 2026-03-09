import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { serveStatic } from "./static";
import { seedIfEmpty } from "./startup-seed";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

log(`Environment: ${process.env.NODE_ENV}`);
log(`Base URL: ${process.env.SITE_BASE_URL || "https://housing-intel.com"}`);

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed database from CSV files if empty (handles fresh production deploys)
  await seedIfEmpty();

  // Register API and SSR routes first
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // In development, use Vite middleware for HMR and serving client files
  // In production, serve static files from client/dist
  if (process.env.NODE_ENV === "development") {
    await setupVite(httpServer, app);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
