import { pool } from "./db";
import { log } from "./index";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

// Resolve seed data directory without import.meta.url (unsafe in CJS bundles)
// In production: dist/seedData/ | In development: server/seedData/
const prodPath = join(process.cwd(), "dist", "seedData");
const devPath = join(process.cwd(), "server", "seedData");
const SEED_DIR = existsSync(prodPath) ? prodPath : devPath;

interface TuneRow {
  id: number;
  title: string;
  alternative_titles: string | null;
  key: string;
  tune_type: string;
  region: string | null;
  difficulty: string | null;
  description: string | null;
  source_fiddler: string | null;
  era: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
  audio_url: string | null;
  abc_notation: string | null;
  transcript_url: string | null;
  loc_url: string | null;
  loc_item_id: string | null;
  folkways_url: string | null;
  tater_joe_url: string | null;
  the_session_id: string | null;
  popularity: number;
  tags: string | null;
  notes: string | null;
  created_at: string;
  audio_source: string | null;
  audio_attribution: string | null;
}

interface RecordingRow {
  id: number;
  tune_id: number;
  audio_url: string | null;
  loc_item_id: string | null;
  youtube_video_id: string | null;
  audio_source: string | null;
  audio_attribution: string | null;
  source_fiddler: string | null;
  collection: string | null;
  era: string | null;
  key: string | null;
  tuning: string | null;
  notes: string | null;
  slippery_hill_slug: string | null;
  created_at: string;
}

interface BlogPostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  author: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
}

export async function seedBlogPosts(): Promise<void> {
  const blogPath = join(SEED_DIR, "blog-posts.json");
  if (!existsSync(blogPath)) return;

  const client = await pool.connect();
  try {
    const posts: BlogPostRow[] = JSON.parse(readFileSync(blogPath, "utf8"));
    let inserted = 0;
    for (const p of posts) {
      const result = await client.query(
        `INSERT INTO blog_posts (slug, title, excerpt, content, author, cover_image_url, published, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [p.slug, p.title, p.excerpt, p.content, p.author, p.cover_image_url, p.published, p.published_at]
      );
      if (result.rowCount && result.rowCount > 0) inserted++;
    }
    if (inserted > 0) log(`Seeded ${inserted} blog post(s)`, "autoSeed");
  } catch (err) {
    log(`Blog seed failed: ${err}`, "autoSeed");
  } finally {
    client.release();
  }
}

/**
 * Create DB-only tables that are NOT part of the seed JSON and must never be
 * dropped by `db:push`. Mirrors the seed_meta pattern (CREATE TABLE IF NOT
 * EXISTS at startup) so the schema exists in every environment without a push.
 */
export async function ensureRuntimeTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS key_reviews (
        id SERIAL PRIMARY KEY,
        tune_id INTEGER NOT NULL,
        current_key TEXT,
        detected_key TEXT,
        detected_tonic TEXT,
        detected_scale TEXT,
        confidence REAL,
        audio_url TEXT,
        reviewed_key TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    log(`ensureRuntimeTables failed: ${err}`, "autoSeed");
  } finally {
    client.release();
  }
}

export async function autoSeed(): Promise<void> {
  const client = await pool.connect();
  try {
    const tunesPath = join(SEED_DIR, "tunes.json");
    const recordingsPath = join(SEED_DIR, "recordings.json");

    const tunesRaw = readFileSync(tunesPath, "utf8");
    const recordingsRaw = readFileSync(recordingsPath, "utf8");
    const currentHash = createHash("sha1")
      .update(tunesRaw)
      .update(recordingsRaw)
      .digest("hex");

    // Ensure seed_meta table exists
    await client.query(`CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT)`);

    const countResult = await client.query("SELECT COUNT(*) FROM tunes");
    const count = parseInt(countResult.rows[0].count, 10);

    // Skip sync if DB is populated and hash hasn't changed
    if (count > 0) {
      const hashRow = await client.query("SELECT value FROM seed_meta WHERE key = 'tunes_hash'");
      if (hashRow.rows[0]?.value === currentHash) {
        log(`Seed unchanged (hash match) — skipping sync`, "autoSeed");
        return;
      }
    }

    const tunes: TuneRow[] = JSON.parse(tunesRaw);
    const recordings: RecordingRow[] = JSON.parse(recordingsRaw);

    if (count === 0) {
      // Fresh database — full seed
      log(`Database is empty — seeding ${tunes.length} tunes...`, "autoSeed");
      await client.query("BEGIN");

      const BATCH = 50;
      for (let i = 0; i < tunes.length; i += BATCH) {
        const batch = tunes.slice(i, i + BATCH);
        const values: unknown[] = [];
        const placeholders = batch.map((t, idx) => {
          const base = idx * 26;
          values.push(
            t.id, t.title, t.alternative_titles, t.key, t.tune_type,
            t.region, t.difficulty, t.description, t.source_fiddler, t.era,
            t.youtube_url, t.youtube_video_id, t.audio_url, t.abc_notation,
            t.transcript_url, t.loc_url, t.loc_item_id, t.folkways_url,
            t.tater_joe_url, t.the_session_id, t.popularity, t.tags,
            t.notes, t.audio_source, t.audio_attribution, t.created_at
          );
          const p = (n: number) => `$${base + n}`;
          return `(${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},${p(6)},${p(7)},${p(8)},${p(9)},${p(10)},${p(11)},${p(12)},${p(13)},${p(14)},${p(15)},${p(16)},${p(17)},${p(18)},${p(19)},${p(20)},${p(21)},${p(22)},${p(23)},${p(24)},${p(25)},${p(26)})`;
        }).join(",");

        await client.query(
          `INSERT INTO tunes (id,title,alternative_titles,key,tune_type,region,difficulty,description,source_fiddler,era,youtube_url,youtube_video_id,audio_url,abc_notation,transcript_url,loc_url,loc_item_id,folkways_url,tater_joe_url,the_session_id,popularity,tags,notes,audio_source,audio_attribution,created_at)
           VALUES ${placeholders}
           ON CONFLICT (id) DO NOTHING`,
          values
        );
      }

      for (const r of recordings) {
        await client.query(
          `INSERT INTO recordings (id,tune_id,audio_url,loc_item_id,youtube_video_id,audio_source,audio_attribution,source_fiddler,collection,era,key,tuning,notes,slippery_hill_slug,created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (id) DO NOTHING`,
          [r.id, r.tune_id, r.audio_url, r.loc_item_id, r.youtube_video_id, r.audio_source, r.audio_attribution, r.source_fiddler, r.collection, r.era, r.key, r.tuning, r.notes, r.slippery_hill_slug, r.created_at]
        );
      }

      await client.query("SELECT setval('tunes_id_seq', (SELECT MAX(id) FROM tunes))");
      await client.query("SELECT setval('recordings_id_seq', (SELECT MAX(id) FROM recordings))");
      await client.query(
        `INSERT INTO seed_meta (key, value) VALUES ('tunes_hash', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [currentHash]
      );
      await client.query("COMMIT");
      log(`Seeded ${tunes.length} tunes and ${recordings.length} recordings`, "autoSeed");
    } else {
      // Database exists — sync any new or updated tunes from the seed file
      log(`Syncing ${tunes.length} tunes into existing database (${count} current)...`, "autoSeed");
      await client.query("BEGIN");

      const BATCH = 50;
      let inserted = 0;
      let updated = 0;

      for (let i = 0; i < tunes.length; i += BATCH) {
        const batch = tunes.slice(i, i + BATCH);
        for (const t of batch) {
          const result = await client.query(
            `INSERT INTO tunes (id,title,alternative_titles,key,tune_type,region,difficulty,description,
              source_fiddler,era,youtube_url,youtube_video_id,audio_url,abc_notation,transcript_url,
              loc_url,loc_item_id,folkways_url,tater_joe_url,the_session_id,popularity,tags,notes,
              audio_source,audio_attribution,created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               alternative_titles = EXCLUDED.alternative_titles,
               key = EXCLUDED.key,
               tune_type = EXCLUDED.tune_type,
               region = EXCLUDED.region,
               difficulty = EXCLUDED.difficulty,
               description = EXCLUDED.description,
               source_fiddler = EXCLUDED.source_fiddler,
               era = EXCLUDED.era,
               youtube_video_id = EXCLUDED.youtube_video_id,
               audio_url = EXCLUDED.audio_url,
               abc_notation = EXCLUDED.abc_notation,
               transcript_url = EXCLUDED.transcript_url,
               loc_url = EXCLUDED.loc_url,
               loc_item_id = EXCLUDED.loc_item_id,
               folkways_url = EXCLUDED.folkways_url,
               tater_joe_url = EXCLUDED.tater_joe_url,
               the_session_id = EXCLUDED.the_session_id,
               popularity = EXCLUDED.popularity,
               tags = EXCLUDED.tags,
               notes = EXCLUDED.notes,
               audio_source = EXCLUDED.audio_source,
               audio_attribution = EXCLUDED.audio_attribution
             RETURNING (xmax = 0) AS inserted`,
            [
              t.id, t.title, t.alternative_titles, t.key, t.tune_type,
              t.region, t.difficulty, t.description, t.source_fiddler, t.era,
              t.youtube_url, t.youtube_video_id, t.audio_url, t.abc_notation,
              t.transcript_url, t.loc_url, t.loc_item_id, t.folkways_url,
              t.tater_joe_url, t.the_session_id, t.popularity, t.tags,
              t.notes, t.audio_source, t.audio_attribution, t.created_at
            ]
          );
          if (result.rows[0]?.inserted) inserted++;
          else updated++;
        }
      }

      await client.query("SELECT setval('tunes_id_seq', (SELECT MAX(id) FROM tunes))");
      await client.query(
        `INSERT INTO seed_meta (key, value) VALUES ('tunes_hash', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [currentHash]
      );
      await client.query("COMMIT");
      log(`Sync complete: ${inserted} new, ${updated} updated (${tunes.length} total)`, "autoSeed");
    }
  } catch (err) {
    await client.query("ROLLBACK");
    log(`Seed failed: ${err}`, "autoSeed");
    throw err;
  } finally {
    client.release();
  }
}
