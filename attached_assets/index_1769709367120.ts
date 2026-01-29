// server/index.ts (template)
// Purpose: ensure Vite production assets + public files (sitemap/robots/favicon/data) are served correctly.
import express from "express";
import path from "path";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());

// IMPORTANT: serve client/dist (Vite build output) at "/"
const clientDist = process.env.CLIENT_DIST_DIR || path.join(process.cwd(), "client", "dist");
app.use(express.static(clientDist, { index: false }));

// Serve public files (if you keep them separate)
// If your build copies public into dist, you can omit this.
const clientPublic = path.join(process.cwd(), "client", "public");
app.use(express.static(clientPublic, { index: false }));

const httpServer = createServer(app);

registerRoutes(httpServer, app).then(() => {
  // SPA fallback for routes not handled by SSR/API
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  const port = Number(process.env.PORT || 3000);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on ${port}`);
  });
});
