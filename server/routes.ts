import type { Express } from "express";
import { type Server } from "http";
import { db } from "./db";
import { tunes } from "@shared/schema";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/tunes", async (req, res) => {
    try {
      const { key, search, region, difficulty } = req.query;
      const conditions: any[] = [];

      if (key && typeof key === "string") conditions.push(eq(tunes.key, key));
      if (region && typeof region === "string") conditions.push(eq(tunes.region, region));
      if (difficulty && typeof difficulty === "string") conditions.push(eq(tunes.difficulty, difficulty));
      if (search && typeof search === "string") {
        conditions.push(
          or(
            ilike(tunes.title, `%${search}%`),
            ilike(tunes.sourceFiddler, `%${search}%`),
            ilike(tunes.alternativeTitles, `%${search}%`)
          )
        );
      }

      const query = conditions.length > 0
        ? db.select().from(tunes).where(and(...conditions)).orderBy(desc(tunes.popularity), tunes.title)
        : db.select().from(tunes).orderBy(desc(tunes.popularity), tunes.title);

      const results = await query;
      res.json(results);
    } catch (err) {
      console.error("Error fetching tunes:", err);
      res.status(500).json({ error: "Failed to fetch tunes" });
    }
  });

  app.get("/api/tunes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [tune] = await db.select().from(tunes).where(eq(tunes.id, id));
      if (!tune) return res.status(404).json({ error: "Tune not found" });
      res.json(tune);
    } catch (err) {
      console.error("Error fetching tune:", err);
      res.status(500).json({ error: "Failed to fetch tune" });
    }
  });

  app.get("/api/keys", async (_req, res) => {
    try {
      const results = await db
        .select({ key: tunes.key, count: sql<number>`count(*)` })
        .from(tunes)
        .groupBy(tunes.key)
        .orderBy(tunes.key);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch keys" });
    }
  });

  app.get("/api/regions", async (_req, res) => {
    try {
      const results = await db
        .select({ region: tunes.region, count: sql<number>`count(*)` })
        .from(tunes)
        .groupBy(tunes.region)
        .orderBy(tunes.region);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const [stats] = await db
        .select({
          total: sql<number>`count(*)`,
          withVideo: sql<number>`count(*) filter (where youtube_video_id is not null)`,
          withAbc: sql<number>`count(*) filter (where abc_notation is not null)`,
        })
        .from(tunes);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
