/**
 * Exports the tunes table back into server/seedData/tunes.json so the seed
 * file stays the source of truth. Required after any DB-side enrichment:
 * autoSeed's sync upsert overwrites description, abc_notation,
 * alternative_titles, source_fiddler, audio_attribution, the_session_id and
 * more from the JSON whenever the seed hash changes — DB-only edits would be
 * silently reverted on the next seed change without this export.
 *
 * Writes a timestamped backup of the previous JSON next to it first.
 *
 * Run:  npx tsx server/scripts/exportTunesToSeed.ts [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../db";

const DRY_RUN = process.argv.includes("--dry-run");
const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, "..", "seedData", "tunes.json");
const RECORDINGS_PATH = join(__dirname, "..", "seedData", "recordings.json");

// Exact column order autoSeed reads (is_embeddable is intentionally excluded —
// it is DB-only and never part of the seed).
const FIELDS = [
  "id", "title", "alternative_titles", "key", "tune_type", "region",
  "difficulty", "description", "source_fiddler", "era", "youtube_url",
  "youtube_video_id", "audio_url", "abc_notation", "transcript_url",
  "loc_url", "loc_item_id", "folkways_url", "tater_joe_url",
  "the_session_id", "popularity", "tags", "notes", "audio_source",
  "audio_attribution", "created_at",
] as const;

const RECORDING_FIELDS = [
  "id", "tune_id", "audio_url", "loc_item_id", "youtube_video_id", "audio_source",
  "audio_attribution", "source_fiddler", "collection", "era", "key", "tuning",
  "notes", "slippery_hill_slug", "created_at",
] as const;

// Validation gate: refuse to export descriptions containing AI/web-research
// meta-language — that content violates the site's zero-invented-facts policy
// and must be cleaned (see cleanDescriptionArtifacts.ts) before export.
const META_LANGUAGE_RE =
  /search results|web research compiled|the searches\b|search turned up|wasn'?t able to (find|retrieve)|unable to (find|retrieve)|as an AI\b/i;

async function main() {
  const { rows } = await pool.query(`SELECT ${FIELDS.join(", ")} FROM tunes ORDER BY id ASC`);
  const { rows: recordingRows } = await pool.query(
    `SELECT ${RECORDING_FIELDS.join(", ")} FROM recordings ORDER BY id ASC`,
  );

  const contaminated = rows.filter((r: any) => r.description && META_LANGUAGE_RE.test(r.description));
  if (contaminated.length > 0) {
    console.error(`REFUSING to export: ${contaminated.length} description(s) contain unverifiable meta-language:`);
    for (const r of contaminated.slice(0, 20)) console.error(`  #${r.id} ${r.title}`);
    console.error("Run: npx tsx server/scripts/cleanDescriptionArtifacts.ts");
    process.exit(1);
  }
  const out = rows.map((r: any) => {
    const o: Record<string, unknown> = {};
    for (const f of FIELDS) {
      o[f] = f === "created_at" && r[f] instanceof Date ? r[f].toISOString() : r[f];
    }
    return o;
  });
  const recordingsOut = recordingRows.map((recording: any) => {
    const out: Record<string, unknown> = {};
    for (const field of RECORDING_FIELDS) {
      out[field] = field === "created_at" && recording[field] instanceof Date
        ? recording[field].toISOString()
        : recording[field];
    }
    return out;
  });

  const prev = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  const previousRecordings = JSON.parse(readFileSync(RECORDINGS_PATH, "utf8"));
  console.log(`DB tunes: ${out.length}, current seed JSON: ${prev.length}`);
  console.log(`DB recordings: ${recordingsOut.length}, current recording seed JSON: ${previousRecordings.length}`);

  if (DRY_RUN) {
    console.log("Dry run — not writing.");
  } else {
    const backup = SEED_PATH.replace(/\.json$/, `.backup-${new Date().toISOString().slice(0, 10)}.json`);
    const recordingsBackup = RECORDINGS_PATH.replace(/\.json$/, `.backup-${new Date().toISOString().slice(0, 10)}.json`);
    copyFileSync(SEED_PATH, backup);
    copyFileSync(RECORDINGS_PATH, recordingsBackup);
    writeFileSync(SEED_PATH, JSON.stringify(out, null, 2) + "\n");
    writeFileSync(RECORDINGS_PATH, JSON.stringify(recordingsOut, null, 2) + "\n");
    console.log(`Wrote ${out.length} tunes to ${SEED_PATH}`);
    console.log(`Wrote ${recordingsOut.length} recordings to ${RECORDINGS_PATH}`);
    console.log(`Backup of previous seed at ${backup}`);
    console.log(`Backup of previous recording seed at ${recordingsBackup}`);
    console.log("Note: seed hash will change; next restart re-syncs once (values identical to DB, so it's a no-op sync).");
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
