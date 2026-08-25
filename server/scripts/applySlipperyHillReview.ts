/**
 * Applies only candidates produced by discoverSlipperyHillAudio.ts.
 *
 * This command is intentionally separate from discovery so the report can be
 * inspected before it changes data. Every candidate is checked again for its
 * tune ID/title, approved Slippery Hill URL shape, playable audio, and missing
 * existing primary audio. The tune update is transactional.
 *
 * Usage:
 *   npx tsx server/scripts/applySlipperyHillReview.ts \
 *     --review=server/seedData/slippery-hill-audio-review-latest.json --dry-run
 */

import { readFileSync } from "fs";
import { pool } from "../db";
import { normalizeTuneTitle, verifyPlayableAudio } from "./audioManifest";
import { hasExactSlipperyHillFilenameEvidence, hasTrustedPrimaryAudio } from "./slipperyHillReview";

const REVIEW_ARG = process.argv.find((arg) => arg.startsWith("--review="));
const REVIEW_PATH = REVIEW_ARG?.split("=").slice(1).join("=");
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;
const SLIPPERY_HILL_AUDIO_RE = /^https:\/\/www\.slippery-hill\.com\/system\/files\/recordings\/[A-Za-z0-9_-]+\.mp3$/i;

type ReviewCandidate = {
  tune: { id: number; title: string };
  recording: {
    audioUrl: string;
    audioSource: string;
    audioAttribution: string;
    matchedTitle: string;
    filenameEvidence: string;
  };
};

function loadCandidates(): ReviewCandidate[] {
  if (!REVIEW_PATH) throw new Error("--review=PATH is required");
  const report = JSON.parse(readFileSync(REVIEW_PATH, "utf8")) as { candidates?: ReviewCandidate[] };
  if (!Array.isArray(report.candidates)) throw new Error("Review report has no candidates array");
  return report.candidates.slice(0, LIMIT);
}

async function main() {
  if (!(LIMIT === Infinity || (Number.isInteger(LIMIT) && LIMIT >= 1))) {
    throw new Error("--limit must be a positive integer");
  }
  const candidates = loadCandidates();
  const client = await pool.connect();
  let applied = 0;
  let skipped = 0;
  let rejected = 0;
  let failed = 0;

  try {
    for (const candidate of candidates) {
      process.stdout.write(`[Tune#${candidate.tune?.id}] ${candidate.tune?.title} … `);
      if (!candidate.tune?.id || !candidate.tune?.title || !candidate.recording?.audioUrl) {
        rejected++;
        console.log("rejected (incomplete review candidate)");
        continue;
      }
      if (!SLIPPERY_HILL_AUDIO_RE.test(candidate.recording.audioUrl)) {
        rejected++;
        console.log("rejected (URL is not an approved Slippery Hill recording)");
        continue;
      }

      const { rows } = await client.query<{
        id: number;
        title: string;
        alternative_titles: string | null;
        audio_url: string | null;
        loc_item_id: string | null;
      }>(
        `SELECT id, title, alternative_titles, audio_url, loc_item_id
         FROM tunes WHERE id = $1`,
        [candidate.tune.id],
      );
      const tune = rows[0];
      const names = [tune?.title, ...(tune?.alternative_titles || "").split(",")]
        .filter(Boolean)
        .map((name) => normalizeTuneTitle(name));
      if (!tune || !names.includes(normalizeTuneTitle(candidate.tune.title))
        || !names.includes(normalizeTuneTitle(candidate.recording.matchedTitle))
        || !hasExactSlipperyHillFilenameEvidence(
          candidate.recording.audioUrl,
          [tune.title, ...(tune.alternative_titles || "").split(",")],
          candidate.recording.filenameEvidence,
        )) {
        rejected++;
        console.log("rejected (review title/alias or filename evidence no longer matches)");
        continue;
      }
      if (hasTrustedPrimaryAudio(tune.audio_url, tune.loc_item_id)) {
        skipped++;
        console.log("skipped (trusted primary audio already exists)");
        continue;
      }

      const verification = await verifyPlayableAudio({
        audioUrl: candidate.recording.audioUrl,
        audioSource: "Slippery Hill",
        audioAttribution: "slippery-hill.com",
      });
      if (!verification.ok) {
        rejected++;
        console.log(`rejected (${verification.reason})`);
        continue;
      }
      if (DRY_RUN) {
        applied++;
        console.log("DRY ready");
        continue;
      }

      try {
        await client.query("BEGIN");
        const update = await client.query(
          `UPDATE tunes
           SET audio_url = $1, audio_source = $2, audio_attribution = $3,
               tags = CASE WHEN tags = 'audio-needed' THEN NULL ELSE tags END
           WHERE id = $4 AND audio_url IS NULL AND loc_item_id IS NULL
           RETURNING id`,
          [
            candidate.recording.audioUrl,
            "Slippery Hill",
            "slippery-hill.com",
            tune.id,
          ],
        );
        if (update.rowCount === 0) {
          await client.query("ROLLBACK");
          skipped++;
          console.log("skipped (trusted primary audio was added concurrently)");
          continue;
        }
        await client.query("COMMIT");
        applied++;
        console.log("✓ applied");
      } catch (error: any) {
        await client.query("ROLLBACK").catch(() => {});
        failed++;
        console.log(`✗ transaction failed: ${error?.message || "unknown error"}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`
Slippery Hill review apply complete
  Applied       : ${applied}
  Skipped       : ${skipped}
  Rejected      : ${rejected}
  Failed        : ${failed}
  Dry-run mode  : ${DRY_RUN}
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});