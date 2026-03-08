import type { Express } from "express";
import { type Server } from "http";
import { db } from "./db";
import { tunes, recordings } from "@shared/schema";
import { eq, ilike, or, sql, desc, and, inArray } from "drizzle-orm";

const youtubeEmbedCache = new Map<string, boolean>();

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/tunes", async (req, res) => {
    try {
      const { key, search, region, difficulty, tuneType, page, limit, ids } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 48));
      const offset = (pageNum - 1) * limitNum;

      if (ids && typeof ids === "string") {
        const idList = ids.split(",").map(Number).filter((n) => !isNaN(n));
        if (idList.length === 0) return res.json({ tunes: [], total: 0, page: 1, totalPages: 1, limit: limitNum });
        const results = await db.select().from(tunes).where(inArray(tunes.id, idList)).orderBy(tunes.title);
        return res.json({ tunes: results, total: results.length, page: 1, totalPages: 1, limit: limitNum });
      }

      const conditions: any[] = [];
      if (key && typeof key === "string" && key !== "all") conditions.push(eq(tunes.key, key));
      if (region && typeof region === "string" && region !== "all") conditions.push(eq(tunes.region, region));
      if (difficulty && typeof difficulty === "string" && difficulty !== "all") conditions.push(eq(tunes.difficulty, difficulty));
      if (tuneType && typeof tuneType === "string" && tuneType !== "all") conditions.push(eq(tunes.tuneType, tuneType));
      if (search && typeof search === "string") {
        conditions.push(
          or(
            ilike(tunes.title, `%${search}%`),
            ilike(tunes.sourceFiddler, `%${search}%`),
            ilike(tunes.alternativeTitles, `%${search}%`),
            ilike(tunes.tags, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const hasFilter = conditions.length > 0;
      const orderBy = hasFilter ? [tunes.title] : [desc(tunes.popularity), tunes.title];

      const [countResult, results] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(tunes).where(whereClause),
        whereClause
          ? db.select().from(tunes).where(whereClause).orderBy(...orderBy).limit(limitNum).offset(offset)
          : db.select().from(tunes).orderBy(...orderBy).limit(limitNum).offset(offset),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      res.json({ tunes: results, total, page: pageNum, totalPages: Math.ceil(total / limitNum), limit: limitNum });
    } catch (err) {
      console.error("Error fetching tunes:", err);
      res.status(500).json({ error: "Failed to fetch tunes" });
    }
  });

  app.get("/api/tunes/playlist", async (req, res) => {
    try {
      const { key, search, region, difficulty, tuneType } = req.query;
      const conditions: any[] = [];
      if (key && typeof key === "string" && key !== "all") conditions.push(eq(tunes.key, key));
      if (region && typeof region === "string" && region !== "all") conditions.push(eq(tunes.region, region));
      if (difficulty && typeof difficulty === "string" && difficulty !== "all") conditions.push(eq(tunes.difficulty, difficulty));
      if (tuneType && typeof tuneType === "string" && tuneType !== "all") conditions.push(eq(tunes.tuneType, tuneType));
      if (search && typeof search === "string") {
        conditions.push(or(
          ilike(tunes.title, `%${search}%`),
          ilike(tunes.sourceFiddler, `%${search}%`),
          ilike(tunes.alternativeTitles, `%${search}%`),
          ilike(tunes.tags, `%${search}%`)
        ));
      }
      conditions.push(
        or(
          sql`audio_url is not null`,
          sql`loc_item_id is not null`
        )
      );
      const whereClause = and(...conditions);
      const results = await db
        .select({
          id: tunes.id,
          title: tunes.title,
          key: tunes.key,
          tuneType: tunes.tuneType,
          audioUrl: tunes.audioUrl,
          locItemId: tunes.locItemId,
          region: tunes.region,
          difficulty: tunes.difficulty,
          alternativeTitles: tunes.alternativeTitles,
          audioSource: tunes.audioSource,
          audioAttribution: tunes.audioAttribution,
          sourceFiddler: tunes.sourceFiddler,
          era: tunes.era,
          youtubeUrl: tunes.youtubeUrl,
          youtubeVideoId: tunes.youtubeVideoId,
          abcNotation: tunes.abcNotation,
          transcriptUrl: tunes.transcriptUrl,
          locUrl: tunes.locUrl,
          folkwaysUrl: tunes.folkwaysUrl,
          taterJoeUrl: tunes.taterJoeUrl,
          theSessionId: tunes.theSessionId,
          popularity: tunes.popularity,
          tags: tunes.tags,
          notes: tunes.notes,
          description: tunes.description,
          createdAt: tunes.createdAt,
        })
        .from(tunes)
        .where(whereClause)
        .orderBy(tunes.title)
        .limit(500);
      res.json(results);
    } catch (err) {
      console.error("Error fetching playlist:", err);
      res.status(500).json({ error: "Failed to fetch playlist" });
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

  app.get("/api/tunes/:id/recordings", async (req, res) => {
    try {
      const tuneId = parseInt(req.params.id);
      const results = await db.select().from(recordings).where(eq(recordings.tuneId, tuneId)).orderBy(recordings.id);
      res.json(results);
    } catch (err) {
      console.error("Error fetching recordings:", err);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  app.get("/api/youtube-check/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      if (youtubeEmbedCache.has(videoId)) {
        return res.json({ embeddable: youtubeEmbedCache.get(videoId) });
      }
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      const embeddable = response.ok;
      youtubeEmbedCache.set(videoId, embeddable);
      res.json({ embeddable });
    } catch {
      youtubeEmbedCache.set(req.params.videoId, false);
      res.json({ embeddable: false });
    }
  });

  app.get("/api/keys", async (_req, res) => {
    try {
      const results = await db.select({ key: tunes.key, count: sql<number>`count(*)` }).from(tunes).groupBy(tunes.key).orderBy(tunes.key);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch keys" });
    }
  });

  app.get("/api/regions", async (_req, res) => {
    try {
      const results = await db.select({ region: tunes.region, count: sql<number>`count(*)` }).from(tunes).groupBy(tunes.region).orderBy(tunes.region);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.get("/api/types", async (_req, res) => {
    try {
      const results = await db.select({ tuneType: tunes.tuneType, count: sql<number>`count(*)` }).from(tunes).where(sql`tune_type is not null`).groupBy(tunes.tuneType).orderBy(desc(sql<number>`count(*)`));
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch tune types" });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const [tuneStats] = await db.select({
        total: sql<number>`count(*)`,
        withVideo: sql<number>`count(*) filter (where youtube_video_id is not null)`,
        withAbc: sql<number>`count(*) filter (where abc_notation is not null)`,
        withAudio: sql<number>`count(*) filter (where audio_url is not null or loc_item_id is not null)`,
      }).from(tunes);
      const [recStats] = await db.select({ count: sql<number>`count(*)` }).from(recordings);
      res.json({ ...tuneStats, recordingsCount: Number(recStats?.count ?? 0) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/loc-audio/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const response = await fetch(`https://www.loc.gov/item/${itemId}/?fo=json`, {
        headers: { "Accept": "application/json" },
      });
      if (!response.ok) return res.status(404).json({ error: "LOC item not found" });
      const data = await response.json() as any;
      const audioUrl = data?.resources?.[0]?.audio ?? null;
      if (!audioUrl) return res.status(404).json({ error: "No audio found for this LOC item" });
      res.json({ audioUrl });
    } catch (err) {
      console.error("LOC audio proxy error:", err);
      res.status(500).json({ error: "Failed to fetch LOC audio" });
    }
  });

  return httpServer;
}
