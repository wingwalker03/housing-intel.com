import express, { type Express } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log } from "./index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  const distPathAlt = path.resolve(__dirname, "..", "dist", "public");
  const finalDistPath = fs.existsSync(distPath) ? distPath : distPathAlt;
  
  log(`Checking for static assets at: ${finalDistPath}`);
  if (!fs.existsSync(finalDistPath)) {
    log(`Static assets directory not found at: ${finalDistPath}`, "warn");
    return;
  }

  // Serve static assets with long-term caching
  app.use("/assets", express.static(path.join(finalDistPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Serve other static files
  app.use(express.static(finalDistPath, { index: false }));

  // Fallback for SPA routes
  app.get("*", (req, res, next) => {
    // Skip if it looks like an API or file request
    if (req.path.startsWith("/api") || req.path.includes(".")) {
      return next();
    }
    const indexHtml = path.join(finalDistPath, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      next();
    }
  });
}
