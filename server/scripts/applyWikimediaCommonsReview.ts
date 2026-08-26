/**
 * Applies reviewed Wikimedia Commons candidates produced by
 * discoverWikimediaCommonsAudio.ts. The review report is treated as
 * untrusted: title/alias evidence, license, attribution, and playable audio
 * are all rechecked live immediately before a transactional update. Existing
 * primary audio and Library of Congress references are never replaced.
 *
 * Usage:
 *   npx tsx server/scripts/applyWikimediaCommonsReview.ts \
 *     --review=server/seedData/wikimedia-commons-audio-review.json --dry-run
 */

import { readFileSync } from "fs";
import { pool } from "../db";
import { verifyPlayableAudio } from "./audioManifest";
import {
  commonsAttribution,
  commonsLicenseSummary,
  disqualifyCommonsCandidate,
  fetchCommonsImageInfo,
  isCommonsAudioUrl,
  isExactCommonsTitleMatch,
} from "./wikimediaCommonsReview";

const REVIEW_ARG = process.argv.find((arg) => arg.startsWith("--review="));
const REVIEW_PATH = REVIEW_ARG?.split("=").slice(1).join("=");
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;

type ReviewCandidate = {
  tune: { id: number; title: string };
  recording: {
    audioUrl: string;
    audioSource: string;
    audioAttribution: string;
    license: string;
    licenseUrl?: string | null;
    sourcePageUrl?: string | null;
    matchedTitle: string;
    verifiedPageTitle: string;
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
      const recording = candidate.recording;
      if (!candidate.tune?.id || !candidate.tune?.title || !recording?.audioUrl
        || !recording.verifiedPageTitle || !recording.matchedTitle) {
        rejected++;
        console.log("rejected (incomplete review candidate)");
        continue;
      }
      if (recording.audioSource !== "Wikimedia Commons" || !isCommonsAudioUrl(recording.audioUrl)) {
        rejected++;
        console.log("rejected (URL is not an approved Wikimedia Commons file)");
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
      if (!tune) {
        rejected++;
        console.log("rejected (tune no longer exists)");
        continue;
      }
      const tuneNames = [tune.title, ...(tune.alternative_titles || "").split(",")]
        .map((name) => name.trim())
        .filter(Boolean);
      if (!isExactCommonsTitleMatch(candidate.tune.title, tuneNames)
        || !isExactCommonsTitleMatch(recording.verifiedPageTitle, tuneNames)) {
        rejected++;
        console.log("rejected (review title/alias evidence no longer matches)");
        continue;
      }
      if (tune.audio_url || tune.loc_item_id) {
        skipped++;
        console.log("skipped (trusted primary audio or archival reference already exists)");
        continue;
      }

      const pages = await fetchCommonsImageInfo([recording.verifiedPageTitle]);
      const page = pages[recording.verifiedPageTitle];
      if (!page || page.missing || !page.imageinfo) {
        rejected++;
        console.log("rejected (Commons file no longer exists)");
        continue;
      }
      const liveUrl = typeof page.imageinfo.url === "string" ? page.imageinfo.url : "";
      if (liveUrl !== recording.audioUrl) {
        rejected++;
        console.log("rejected (Commons file URL changed since review)");
        continue;
      }
      const license = commonsLicenseSummary(page.imageinfo.extmetadata);
      if (!license.ok) {
        rejected++;
        console.log(`rejected (${license.reason})`);
        continue;
      }
      const attribution = commonsAttribution(page.imageinfo.extmetadata);
      if (!attribution) {
        rejected++;
        console.log("rejected (no named artist/credit on the Commons file)");
        continue;
      }
      const genreDisqualification = disqualifyCommonsCandidate(page.imageinfo.extmetadata);
      if (genreDisqualification) {
        rejected++;
        console.log(`rejected (${genreDisqualification})`);
        continue;
      }

      const verification = await verifyPlayableAudio({
        audioUrl: recording.audioUrl,
        audioSource: "Wikimedia Commons",
        audioAttribution: attribution,
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
          [recording.audioUrl, "Wikimedia Commons", `${attribution} (${license.license})`, tune.id],
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
Wikimedia Commons review apply complete
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
