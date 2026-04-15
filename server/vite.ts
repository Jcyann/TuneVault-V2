import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { fetchTuneForMeta, injectTuneMeta } from "./seoMeta";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");

  async function serveHtml(url: string, html: string, res: any) {
    html = html.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
    const page = await vite.transformIndexHtml(url, html);
    res.status(200).set({ "Content-Type": "text/html" }).end(page);
  }

  app.get("/tune/:id", async (req, res, next) => {
    try {
      const tune = await fetchTuneForMeta(req.params.id);
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      if (tune) template = injectTuneMeta(template, tune);
      await serveHtml(req.originalUrl, template, res);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.use("/{*path}", async (req, res, next) => {
    try {
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      await serveHtml(req.originalUrl, template, res);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
