import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fetchTuneForMeta, injectTuneMeta } from "./seoMeta";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  const indexPath = path.resolve(distPath, "index.html");

  app.get("/tune/:id", async (req, res, next) => {
    try {
      const tune = await fetchTuneForMeta(req.params.id);
      let html = fs.readFileSync(indexPath, "utf-8");
      if (tune) html = injectTuneMeta(html, tune);
      res.set("Content-Type", "text/html").send(html);
    } catch {
      next();
    }
  });

  app.use("/{*path}", (_req, res) => {
    res.sendFile(indexPath);
  });
}
