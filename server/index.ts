import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// IMPORTANT: serve client/dist (Vite build output) at "/"
const clientDist = process.env.CLIENT_DIST_DIR || path.join(process.cwd(), "client", "dist");
app.use(express.static(clientDist, { index: false }));

// Serve public files (if you keep them separate)
const clientPublic = path.join(process.cwd(), "client", "public");
app.use(express.static(clientPublic, { index: false }));

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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // SPA fallback for routes not handled by SSR/API
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

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
