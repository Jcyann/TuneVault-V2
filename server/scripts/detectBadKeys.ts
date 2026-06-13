/**
 * Batch key-detection for the placeholder "B"-key tunes. Each tune's MP3 is
 * decoded + analyzed, and the result (detected key, confidence, audio link) is
 * written to the key_reviews table for human approval in the admin Key Review
 * tab. Nothing is written to the tunes table — approval happens in the UI.
 *
 * Run:   npx tsx server/scripts/detectBadKeys.ts
 * Opts:  --limit=N      only process N tunes (default all)
 *        --reset        clear existing PENDING reviews before re-detecting
 *        --key=B        which placeholder key to target (default "B")
 */

import { pool } from "../db";
import { decodeAudioToPcm, analyzePcm } from "../keyDetectionEngine";

// Self-contained table guard (mirrors ensureRuntimeTables in autoSeed.ts).
// We avoid importing from autoSeed because it pulls in server/index.ts, which
// calls app.listen() on import and collides with the running dev server.
async function ensureRuntimeTables(): Promise<void> {
  await pool.query(`
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
}

const KEY_ARG = process.argv.find((a) => a.startsWith("--key="));
const TARGET_KEY = KEY_ARG ? KEY_ARG.split("=")[1] : "B";
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : Infinity;
const RESET = process.argv.includes("--reset");
const CONC_ARG = process.argv.find((a) => a.startsWith("--concurrency="));
const CONCURRENCY = Math.max(1, CONC_ARG ? parseInt(CONC_ARG.split("=")[1]) : 5);

async function main() {
  await ensureRuntimeTables();
  const client = await pool.connect();
  try {
    if (RESET) {
      await client.query(`DELETE FROM key_reviews WHERE status = 'pending'`);
      console.log("Cleared existing pending key reviews.");
    }

    // Skip tunes that already have a non-rejected review queued/applied.
    const { rows } = await client.query<{ id: number; title: string; key: string; audio_url: string }>(
      `SELECT t.id, t.title, t.key, t.audio_url
         FROM tunes t
         WHERE t.key = $1 AND t.audio_url IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM key_reviews kr
             WHERE kr.tune_id = t.id AND kr.status IN ('pending','applied')
           )
         ORDER BY t.popularity DESC, t.title ASC`,
      [TARGET_KEY],
    );
    const todo = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);

    console.log(`\nBatch Key Detection (placeholder key "${TARGET_KEY}")`);
    console.log(`==============================================`);
    console.log(`Tunes to analyze: ${todo.length}  (concurrency ${CONCURRENCY})\n`);

    let ok = 0, errors = 0, done = 0;
    let next = 0;
    // Worker pool: each worker downloads+decodes its tune in parallel (the slow,
    // download-bound step). analyzePcm serializes the non-reentrant essentia WASM
    // analysis internally. Inserts are sequential on the single pg client.
    async function worker() {
      while (next < todo.length) {
        const i = next++;
        const t = todo[i];
        done++;
        try {
          const samples = await decodeAudioToPcm(t.audio_url, 45);
          const det = await analyzePcm(samples);
          await client.query(
            `INSERT INTO key_reviews
               (tune_id, current_key, detected_key, detected_tonic, detected_scale, confidence, audio_url, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
            [t.id, t.key, det.key, det.tonic, det.scale, det.confidence, t.audio_url],
          );
          ok++;
          console.log(`[${done}/${todo.length}] ${t.title} → ${det.key} (${det.confidence.toFixed(2)})`);
        } catch (err: any) {
          errors++;
          console.log(`[${done}/${todo.length}] ${t.title} → ⚠ ${err.message}`);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));

    console.log(`\n==============================================`);
    console.log(`Queued for review: ${ok}   Errors: ${errors}`);
    console.log(`Review them in the admin "Key Review" tab.\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
