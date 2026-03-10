import type { Express } from "express";
import { type Server } from "http";
import { db } from "./db";
import { tunes, recordings, lessonInquiries, insertLessonInquirySchema, suggestions, insertSuggestionSchema, recordingSubmissions, insertRecordingSubmissionSchema } from "@shared/schema";
import { storage } from "./storage";
import { sendNotificationEmail, lessonInquiryEmail, suggestionEmail } from "./email";
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

  app.post("/api/lesson-inquiry", async (req, res) => {
    try {
      const parsed = insertLessonInquirySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid form data", details: parsed.error.issues });
      }
      const [row] = await db.insert(lessonInquiries).values(parsed.data).returning();
      sendNotificationEmail(
        `New Lesson Inquiry — ${parsed.data.name} (${parsed.data.instrument})`,
        lessonInquiryEmail(parsed.data)
      ).catch(() => {});
      res.json({ ok: true, id: row.id });
    } catch (err) {
      res.status(500).json({ error: "Failed to save inquiry" });
    }
  });

  app.post("/api/suggestion", async (req, res) => {
    try {
      const parsed = insertSuggestionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid form data", details: parsed.error.issues });
      }
      const [row] = await db.insert(suggestions).values(parsed.data).returning();
      sendNotificationEmail(
        `New Suggestion — TuneVault${parsed.data.name ? ` from ${parsed.data.name}` : ""}`,
        suggestionEmail(parsed.data)
      ).catch(() => {});
      res.json({ ok: true, id: row.id });
    } catch (err) {
      res.status(500).json({ error: "Failed to save suggestion" });
    }
  });

  app.get("/api/admin/lesson-inquiries", async (_req, res) => {
    try {
      const rows = await db.select().from(lessonInquiries).orderBy(desc(lessonInquiries.createdAt));
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });

  app.get("/api/admin/suggestions", async (_req, res) => {
    try {
      const rows = await db.select().from(suggestions).orderBy(desc(suggestions.createdAt));
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  // ── Recording Submissions ──────────────────────────────────────
  function extractYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /\/shorts\/([a-zA-Z0-9_-]{11})/,
      /\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const m = url.match(pattern);
      if (m) return m[1];
    }
    return null;
  }

  app.post("/api/recording-submission", async (req, res) => {
    try {
      const parsed = insertRecordingSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid submission data", details: parsed.error.issues });
      }
      if (!parsed.data.youtubeUrl && !parsed.data.audioUrl) {
        return res.status(400).json({ error: "Please provide a YouTube URL or audio URL." });
      }
      if (!parsed.data.releaseGranted) {
        return res.status(400).json({ error: "You must agree to the rights release to submit." });
      }
      const sub = await storage.createRecordingSubmission(parsed.data);
      const tuneRow = await db.select({ title: tunes.title }).from(tunes).where(eq(tunes.id, sub.tuneId)).limit(1);
      const tuneTitle = tuneRow[0]?.title ?? `Tune #${sub.tuneId}`;
      const body = `New recording submission for "${tuneTitle}"\n\nFrom: ${sub.submitterName} <${sub.submitterEmail}>\nInstrument: ${sub.instrument}\nCredit as: ${sub.attributionName || sub.submitterName}\n${sub.youtubeUrl ? `YouTube: ${sub.youtubeUrl}\n` : ""}${sub.audioUrl ? `Audio: ${sub.audioUrl}\n` : ""}`;
      await sendNotificationEmail("New Recording Submission — TuneVault", body).catch(() => {});
      res.status(201).json(sub);
    } catch (err) {
      console.error("Recording submission error:", err);
      res.status(500).json({ error: "Failed to save submission" });
    }
  });

  app.get("/api/admin/recording-submissions", async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const rows = await storage.getRecordingSubmissions(status);
      const enriched = await Promise.all(rows.map(async (row) => {
        const tuneRow = await db.select({ title: tunes.title }).from(tunes).where(eq(tunes.id, row.tuneId)).limit(1);
        return { ...row, tuneTitle: tuneRow[0]?.title ?? `Tune #${row.tuneId}` };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.patch("/api/admin/recording-submissions/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [sub] = await db.select().from(recordingSubmissions).where(eq(recordingSubmissions.id, id)).limit(1);
      if (!sub) return res.status(404).json({ error: "Submission not found" });
      const youtubeVideoId = sub.youtubeUrl ? extractYoutubeVideoId(sub.youtubeUrl) : null;
      await storage.createRecording({
        tuneId: sub.tuneId,
        youtubeVideoId: youtubeVideoId ?? undefined,
        audioUrl: sub.audioUrl ?? undefined,
        audioSource: sub.submitterName,
        audioAttribution: sub.attributionName || sub.submitterName,
        sourceFiddler: sub.submitterName,
        notes: `Submitted via TuneVault community submissions. Instrument: ${sub.instrument}.`,
      });
      const updated = await storage.updateRecordingSubmissionStatus(id, "approved");
      res.json(updated);
    } catch (err) {
      console.error("Approve submission error:", err);
      res.status(500).json({ error: "Failed to approve submission" });
    }
  });

  app.patch("/api/admin/recording-submissions/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const adminNotes = typeof req.body.adminNotes === "string" ? req.body.adminNotes : undefined;
      const updated = await storage.updateRecordingSubmissionStatus(id, "rejected", adminNotes);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to reject submission" });
    }
  });

  // ── YouTube Sync ──────────────────────────────────────────────
  function normalizeTitle(t: string): string {
    return t
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/[-–—_#'`]/g, " ")
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const YT_STOP = new Set([
    "the","and","with","for","from","old","new","some","this","that",
    "its","our","her","his","your","my","at","by","in","on","of","to",
    "up","as","an","a","tune","fiddle","old-time","oldtime","otaf",
    "appalachian","time","playing","straight","style","duo","duet",
  ]);

  function keyWords(norm: string): string[] {
    return norm.split(" ").filter(w => w.length >= 3 && !YT_STOP.has(w));
  }

  function wordPrefixMatch(a: string, b: string): boolean {
    // handles eye/eyed, reel/reels, fiddle/fiddler, hunter/hunters etc.
    return a === b || a.startsWith(b) || b.startsWith(a);
  }

  function matchScore(videoNorm: string, tuneNorm: string): number {
    const tuneKW = keyWords(tuneNorm);
    if (tuneKW.length === 0) return 0;
    const videoKW = keyWords(videoNorm);
    const hits = tuneKW.filter(tw => videoKW.some(vw => wordPrefixMatch(tw, vw))).length;
    return hits / tuneKW.length;
  }

  function isFuzzyMatch(videoNorm: string, tuneNorm: string): boolean {
    const tuneKW = keyWords(tuneNorm);
    const score = matchScore(videoNorm, tuneNorm);
    // 1-2 key words: need all; 3+ key words: need 70%
    const threshold = tuneKW.length <= 2 ? 1.0 : 0.70;
    return score >= threshold;
  }

  async function ytFetch(url: string) {
    const r = await fetch(url, {
      headers: {
        "Referer": "https://tunevault.org/",
        "Origin": "https://tunevault.org",
      },
    });
    if (!r.ok) throw new Error(`YouTube API error ${r.status}: ${await r.text()}`);
    return r.json() as Promise<any>;
  }

  async function fetchChannelVideos(apiKey: string, handle: string): Promise<{ videoId: string; title: string }[]> {
    const chanData = await ytFetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
    );
    const uploadsId = chanData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) throw new Error("Could not find uploads playlist for channel");

    const videos: { videoId: string; title: string }[] = [];
    let pageToken = "";
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const data = await ytFetch(url);
      for (const item of data.items ?? []) {
        const videoId = item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title;
        if (videoId && title) videos.push({ videoId, title });
      }
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);

    return videos;
  }

  // GET /api/admin/youtube-key — returns the key for client-side YouTube API calls
  app.get("/api/admin/youtube-key", (_req, res) => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
    res.json({ key });
  });

  // GET /api/admin/tune-titles — returns all tune titles+ids for client-side matching
  app.get("/api/admin/tune-titles", async (_req, res) => {
    try {
      const rows = await db.select({ id: tunes.id, title: tunes.title, altTitles: tunes.alternativeTitles, hasVideo: tunes.youtubeVideoId }).from(tunes);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET /api/admin/youtube-sync — scan Jason's channel, return matches (no writes)
  app.get("/api/admin/youtube-sync", async (_req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });

      const videos = await fetchChannelVideos(apiKey, "jasonnchinchen");
      const allTunes = await db.select({ id: tunes.id, title: tunes.title, altTitles: tunes.alternativeTitles, hasVideo: tunes.youtubeVideoId }).from(tunes);

      const tuneMap = new Map<string, { id: number; title: string; hasVideo: boolean }>();
      for (const t of allTunes) {
        tuneMap.set(normalizeTitle(t.title), { id: t.id, title: t.title, hasVideo: !!t.hasVideo });
        if (t.altTitles) {
          for (const alt of t.altTitles.split(/[,;|]/)) {
            const n = normalizeTitle(alt.trim());
            if (n) tuneMap.set(n, { id: t.id, title: t.title, hasVideo: !!t.hasVideo });
          }
        }
      }

      const matched: any[] = [];
      const unmatched: any[] = [];

      for (const v of videos) {
        const normVideo = normalizeTitle(v.title);
        let found: { id: number; title: string; hasVideo: boolean } | undefined;

        // 1. Exact normalized match
        found = tuneMap.get(normVideo);

        // 2. Video title contains the full tune key (substring)
        if (!found) {
          for (const [key, tune] of tuneMap) {
            if (key.length >= 4 && normVideo.includes(key)) { found = tune; break; }
          }
        }

        // 3. Fuzzy: prefix-based word overlap (catches eye/eyed, plural-s, etc.)
        //    Requires ≥2 key words in the tune so single-word tunes don't over-match
        if (!found) {
          let bestScore = 0;
          let bestTune: typeof found;
          for (const [key, tune] of tuneMap) {
            if (key.length < 4) continue;
            const tuneKW = keyWords(key);
            if (tuneKW.length < 2) continue;  // single-word titles rely on substring only
            const score = matchScore(normVideo, key);
            const threshold = tuneKW.length <= 2 ? 1.0 : 0.70;
            if (score >= threshold && score > bestScore) {
              bestScore = score;
              bestTune = tune;
            }
          }
          found = bestTune;
        }

        if (found) {
          matched.push({ videoId: v.videoId, videoTitle: v.title, tuneId: found.id, tuneTitle: found.title, alreadyHasVideo: found.hasVideo });
        } else {
          unmatched.push({ videoId: v.videoId, videoTitle: v.title });
        }
      }

      res.json({ total: videos.length, matched, unmatched });
    } catch (err: any) {
      console.error("YouTube sync error:", err);
      res.status(500).json({ error: err.message ?? "YouTube sync failed" });
    }
  });

  // POST /api/admin/youtube-apply — apply confirmed channel matches to DB
  app.post("/api/admin/youtube-apply", async (req, res) => {
    try {
      const matches: { videoId: string; tuneId: number; alreadyHasVideo: boolean }[] = req.body.matches ?? [];
      let updated = 0; let addedRecording = 0;

      for (const m of matches) {
        const ytUrl = `https://www.youtube.com/watch?v=${m.videoId}`;
        if (!m.alreadyHasVideo) {
          await db.update(tunes).set({ youtubeVideoId: m.videoId, youtubeUrl: ytUrl }).where(eq(tunes.id, m.tuneId));
          updated++;
        } else {
          // Check if this recording already exists
          const existing = await db.select({ id: recordings.id }).from(recordings)
            .where(and(eq(recordings.tuneId, m.tuneId), eq(recordings.youtubeVideoId, m.videoId))).limit(1);
          if (!existing.length) {
            await storage.createRecording({ tuneId: m.tuneId, youtubeVideoId: m.videoId, audioSource: "Jason Chinchen", audioAttribution: "Jason Chinchen (@jasonnchinchen)" });
            addedRecording++;
          }
        }
      }
      res.json({ updated, addedRecording });
    } catch (err: any) {
      console.error("YouTube apply error:", err);
      res.status(500).json({ error: err.message ?? "Apply failed" });
    }
  });

  // GET /api/admin/youtube-search?q=TuneTitle — search YouTube for a single tune
  app.get("/api/admin/youtube-search", async (req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
      const q = typeof req.query.q === "string" ? req.query.q : "";
      if (!q) return res.status(400).json({ error: "q required" });

      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(q + " old time fiddle")}&key=${apiKey}`;
      const data = await ytFetch(url);
      const results = (data.items ?? []).map((item: any) => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        channel: item.snippet?.channelTitle,
        thumbnail: item.snippet?.thumbnails?.default?.url,
      })).filter((i: any) => i.videoId);
      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: err.message ?? "Search failed" });
    }
  });

  // POST /api/admin/youtube-bulk-search — search YouTube for all tunes missing videos (batched, returns preview)
  app.post("/api/admin/youtube-bulk-search", async (req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });

      const limit = Math.min(parseInt(req.body.limit as string) || 50, 200);
      const missing = await db
        .select({ id: tunes.id, title: tunes.title })
        .from(tunes)
        .where(sql`youtube_video_id IS NULL`)
        .limit(limit);

      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      const results: any[] = [];

      for (const tune of missing) {
        try {
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(tune.title + " old time fiddle")}&key=${apiKey}`;
          const data = await ytFetch(url);
          const top = data.items?.[0];
          if (top?.id?.videoId) {
            results.push({
              tuneId: tune.id,
              tuneTitle: tune.title,
              videoId: top.id.videoId,
              videoTitle: top.snippet?.title,
              channel: top.snippet?.channelTitle,
              thumbnail: top.snippet?.thumbnails?.default?.url,
            });
          }
        } catch {}
        await delay(120);
      }

      res.json({ searched: missing.length, found: results.length, results });
    } catch (err: any) {
      console.error("Bulk search error:", err);
      res.status(500).json({ error: err.message ?? "Bulk search failed" });
    }
  });

  // POST /api/admin/youtube-bulk-apply — apply bulk search results
  app.post("/api/admin/youtube-bulk-apply", async (req, res) => {
    try {
      const matches: { tuneId: number; videoId: string }[] = req.body.matches ?? [];
      let count = 0;
      for (const m of matches) {
        await db.update(tunes)
          .set({ youtubeVideoId: m.videoId, youtubeUrl: `https://www.youtube.com/watch?v=${m.videoId}` })
          .where(and(eq(tunes.id, m.tuneId), sql`youtube_video_id IS NULL`));
        count++;
      }
      res.json({ applied: count });
    } catch (err: any) {
      res.status(500).json({ error: err.message ?? "Apply failed" });
    }
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
      "User-agent: *\nAllow: /\nSitemap: https://tunevault.org/sitemap.xml\n"
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const rows = await db.select({ id: tunes.id, title: tunes.title }).from(tunes);
      const base = "https://tunevault.org";
      const staticUrls = [
        { loc: base, priority: "1.0", changefreq: "weekly" },
        { loc: `${base}/tune-of-the-day`, priority: "0.8", changefreq: "daily" },
        { loc: `${base}/about`, priority: "0.6", changefreq: "monthly" },
        { loc: `${base}/book-a-lesson`, priority: "0.7", changefreq: "monthly" },
      ];
      const tuneUrls = rows.map((t) => ({
        loc: `${base}/tunes/${t.id}`,
        priority: "0.5",
        changefreq: "monthly",
      }));
      const urlElements = [...staticUrls, ...tuneUrls]
        .map(
          ({ loc, priority, changefreq }) =>
            `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
        )
        .join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlElements}\n</urlset>`;
      res.type("application/xml").send(xml);
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/api/admin/slippery-hill-match", async (_req, res) => {
    try {
      const missing = await db.select({ id: tunes.id, title: tunes.title })
        .from(tunes)
        .where(sql`audio_url IS NULL`);

      const normalize = (title: string): string[] => {
        const clean = title
          .replace(/['']/g, "")
          .replace(/[^a-zA-Z0-9\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const words = clean.split(" ");
        const camel = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
        const lower = words.join("").toLowerCase();
        const hyphen = words.map(w => w.toLowerCase()).join("-");
        const underscore = words.map(w => w.toLowerCase()).join("_");
        const pascal = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
        return [...new Set([camel, lower, hyphen, underscore, pascal])];
      };

      const base = "https://www.slippery-hill.com/system/files/recordings/";
      let checked = 0;
      let matched = 0;
      const results: { title: string; url: string }[] = [];

      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      for (const tune of missing) {
        const variants = normalize(tune.title);
        let found = false;
        for (const variant of variants) {
          if (found) break;
          const url = `${base}${variant}.mp3`;
          try {
            const resp = await fetch(url, { method: "HEAD" });
            if (resp.status === 200) {
              await db.update(tunes)
                .set({ audioUrl: url, audioSource: "Slippery Hill", audioAttribution: "slippery-hill.com" })
                .where(eq(tunes.id, tune.id));
              results.push({ title: tune.title, url });
              matched++;
              found = true;
            }
          } catch {}
          await delay(150);
        }
        checked++;
      }

      res.json({ checked, matched, results });
    } catch (err) {
      console.error("Slippery Hill matcher error:", err);
      res.status(500).json({ error: "Matcher failed" });
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
