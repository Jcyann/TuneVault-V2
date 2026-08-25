/**
 * Safely backfills direct audio from an audio-first manifest into existing tunes.
 * It never replaces an existing primary audio URL. Run exportTunesToSeed afterward
 * so the update survives the next seed synchronization.
 *
 * Usage:
 *   npx tsx server/scripts/applyAudioManifest.ts \
 *     --audio-manifest=server/seedData/audio-first-manifest.json --dry-run
 */

import { pool } from "../db";
import {
  hasExactManifestTitleMatch,
  loadAudioManifest,
  verifyPlayableAudio,
  type AudioVariation,
} from "./audioManifest";

const DRY_RUN = process.argv.includes("--dry-run");
const MANIFEST_ARG = process.argv.find((arg) => arg.startsWith("--audio-manifest="));
const MANIFEST_PATH = MANIFEST_ARG?.split("=").slice(1).join("=");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;

async function verifyAll(variations: AudioVariation[]) {
  const accepted: AudioVariation[] = [];
  let rejected = 0;
  for (const variation of variations) {
    const result = await verifyPlayableAudio(variation);
    if (result.ok) accepted.push(variation);
    else {
      rejected++;
      console.warn(`  ⚠ rejected ${variation.audioUrl}: ${result.reason}`);
    }
  }
  return { accepted, rejected };
}

async function main() {
  if (!MANIFEST_PATH) {
    throw new Error("Refusing backfill: --audio-manifest=PATH is required.");
  }
  if (!(LIMIT === Infinity || (Number.isInteger(LIMIT) && LIMIT >= 1))) {
    throw new Error("--limit must be a positive integer");
  }

  const entries = loadAudioManifest(MANIFEST_PATH);
  const client = await pool.connect();
  let applied = 0;
  let skippedMissingTune = 0;
  let skippedExistingAudio = 0;
  let skippedNameMismatch = 0;
  let skippedUnavailable = 0;
  let rejected = 0;
  let variationsSaved = 0;
  let failed = 0;

  try {
    for (const entry of entries.slice(0, LIMIT)) {
      process.stdout.write(`[TS#${entry.theSessionId}] ${entry.title} … `);
      const { rows } = await client.query<{
        id: number;
        title: string;
        alternative_titles: string | null;
        audio_url: string | null;
      }>(
        `SELECT id, title, alternative_titles, audio_url
         FROM tunes WHERE the_session_id = $1`,
        [entry.theSessionId],
      );
      const tune = rows[0];
      if (!tune) {
        skippedMissingTune++;
        console.log("held (not in catalog)");
        continue;
      }
      if (!hasExactManifestTitleMatch(entry, [tune.title, ...String(tune.alternative_titles || "").split(",")])) {
        skippedNameMismatch++;
        console.log("held (title/alias mismatch)");
        continue;
      }
      if (tune.audio_url) {
        skippedExistingAudio++;
        console.log("skipped (trusted primary audio already exists)");
        continue;
      }

      const verification = await verifyAll([entry, ...(entry.variations || [])]);
      rejected += verification.rejected;
      if (verification.accepted.length === 0) {
        skippedUnavailable++;
        console.log("held (no playable verified audio)");
        continue;
      }
      const [primary, ...additional] = verification.accepted;

      if (DRY_RUN) {
        applied++;
        console.log(`DRY ready (${verification.accepted.length} verified recording${verification.accepted.length === 1 ? "" : "s"})`);
        continue;
      }

      try {
        await client.query("BEGIN");
        const update = await client.query(
          `UPDATE tunes
           SET audio_url = $1, audio_source = $2, audio_attribution = $3,
               source_fiddler = COALESCE(source_fiddler, $4)
           WHERE id = $5 AND audio_url IS NULL
           RETURNING id`,
          [primary.audioUrl, primary.audioSource, primary.audioAttribution, primary.sourceFiddler || null, tune.id],
        );
        if (update.rowCount === 0) {
          await client.query("ROLLBACK");
          skippedExistingAudio++;
          console.log("skipped (trusted primary audio was added concurrently)");
          continue;
        }
        for (const variation of additional) {
          await client.query(
            `INSERT INTO recordings
               (tune_id, audio_url, audio_source, audio_attribution, source_fiddler,
                collection, era, key, tuning, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              tune.id, variation.audioUrl, variation.audioSource, variation.audioAttribution,
              variation.sourceFiddler || null, variation.collection || null, variation.era || null,
              variation.key || null, variation.tuning || null, variation.notes || null,
            ],
          );
        }
        await client.query("COMMIT");
        variationsSaved += additional.length;
        applied++;
        console.log(`✓ backfilled (${verification.accepted.length} recording${verification.accepted.length === 1 ? "" : "s"})`);
      } catch (error: any) {
        await client.query("ROLLBACK").catch(() => {});
        failed++;
        console.log(`✗ backfill failed: ${error?.message || "unknown error"}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`
Audio-first backfill complete
  Tunes backfilled     : ${applied}
  Extra variations     : ${variationsSaved}
  Missing from catalog : ${skippedMissingTune}
  Existing primary kept: ${skippedExistingAudio}
  Title mismatch held  : ${skippedNameMismatch}
  Audio unavailable    : ${skippedUnavailable}
  Candidates rejected  : ${rejected}
  Transaction failures  : ${failed}
  Dry-run mode         : ${DRY_RUN}
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});