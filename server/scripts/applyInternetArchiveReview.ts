/**
 * Applies reviewed Internet Archive candidates produced by
 * discoverInternetArchiveAudio.ts. The review report is treated as untrusted:
 * title/alias evidence, collection metadata, rights, creator, file identity,
 * and playable audio are all rechecked immediately before a transactional
 * update. Existing primary audio and Library of Congress references are never
 * replaced.
 *
 * There is no manual per-tune editorial gate: exact title/alias match, a
 * declared rights/license, a named creator, and a verified playable audio
 * file are the bar for auto-attaching. This intentionally does not judge
 * whether a recording is a "genuine old-time edition" — only whether it is
 * lawfully attributable, exactly matched, and technically playable.
 *
 * Usage:
 *   npx tsx server/scripts/applyInternetArchiveReview.ts \
 *     --review=server/seedData/ia-audio-review-catalog.json --dry-run
 */

import { readFileSync } from "fs";
import { pool } from "../db";
import { verifyPlayableAudio } from "./audioManifest";
import { disqualifyByGenre } from "./internetArchiveGenreGuard";

const REVIEW_ARG = process.argv.find((arg) => arg.startsWith("--review="));
const REVIEW_PATH = REVIEW_ARG?.split("=").slice(1).join("=");
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;
const TUNE_IDS_ARG = process.argv.find((arg) => arg.startsWith("--tune-ids="));
const TUNE_IDS = TUNE_IDS_ARG
  ? new Set(TUNE_IDS_ARG.split("=").slice(1).join("=").split(",").map(Number).filter(Number.isInteger))
  : null;

type ReviewCandidate = {
  tune: { id: number; title: string };
  recording: {
    audioUrl: string;
    audioSource: string;
    audioAttribution: string;
    collectionIdentifier: string;
    collectionTitle?: string | null;
    sourceFiddler?: string | null;
    collectionContext?: string | null;
    matchedTitle: string;
    verifiedFileName: string;
    verifiedFileTitle?: string | null;
    rights?: string | null;
    licenseUrl?: string | null;
  };
};

function canonicalFileTitle(value: string): string {
  return value
    .replace(/\.[A-Za-z0-9]{2,5}$/i, "")
    .replace(/^\s*\d{1,3}[\s._-]+/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function namedPerformer(description: unknown): string | null {
  const match = plainText(description).match(/\bperformed by\s+(.+?)(?:[.;]|$)/i);
  return match?.[1]?.trim() || null;
}

function isExactTitleOrAlias(value: string, tuneNames: string[]): boolean {
  const title = canonicalFileTitle(value);
  return Boolean(title) && tuneNames.map(canonicalFileTitle).some((name) => name === title);
}

function expectedAudioUrl(identifier: string, fileName: string): string {
  const encodedFile = fileName.split("/").map(encodeURIComponent).join("/");
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedFile}`;
}

function loadCandidates(): ReviewCandidate[] {
  if (!REVIEW_PATH) throw new Error("--review=PATH is required");
  const report = JSON.parse(readFileSync(REVIEW_PATH, "utf8")) as { candidates?: ReviewCandidate[] };
  if (!Array.isArray(report.candidates)) throw new Error("Review report has no candidates array");
  const selected = TUNE_IDS
    ? report.candidates.filter((candidate) => TUNE_IDS.has(candidate.tune?.id))
    : report.candidates;
  return selected.slice(0, LIMIT);
}

async function fetchMetadata(identifier: string): Promise<any | null> {
  try {
    const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
      headers: { "User-Agent": "TuneVault/1.0 (audio review apply)" },
      signal: AbortSignal.timeout(25000),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
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
        || !recording.collectionIdentifier || !recording.verifiedFileName || !recording.matchedTitle) {
        rejected++;
        console.log("rejected (incomplete review candidate)");
        continue;
      }
      if (recording.audioSource !== "Internet Archive"
        || recording.audioUrl !== expectedAudioUrl(recording.collectionIdentifier, recording.verifiedFileName)) {
        rejected++;
        console.log("rejected (source URL and collection/file evidence do not agree)");
        continue;
      }

      const { rows } = await client.query<{
        id: number;
        title: string;
        alternative_titles: string | null;
        audio_url: string | null;
        audio_source: string | null;
        source_fiddler: string | null;
        loc_item_id: string | null;
      }>(
        `SELECT id, title, alternative_titles, audio_url, audio_source, source_fiddler, loc_item_id
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
      if (!isExactTitleOrAlias(candidate.tune.title, tuneNames)
        || !isExactTitleOrAlias(recording.matchedTitle, tuneNames)) {
        rejected++;
        console.log("rejected (review title/alias evidence no longer matches)");
        continue;
      }
      const needsPerformerCorrection = Boolean(
        recording.sourceFiddler
          && tune.audio_url === recording.audioUrl
          && tune.audio_source === "Internet Archive"
          && !tune.loc_item_id
          && tune.source_fiddler !== recording.sourceFiddler,
      );
      if ((tune.audio_url || tune.loc_item_id) && !needsPerformerCorrection) {
        skipped++;
        console.log("skipped (trusted primary audio or archival reference already exists)");
        continue;
      }

      const metadata = await fetchMetadata(recording.collectionIdentifier);
      const itemMetadata = metadata?.metadata || {};
      const rights = typeof itemMetadata.rights === "string" ? itemMetadata.rights.trim() : "";
      const licenseUrl = typeof itemMetadata.licenseurl === "string" ? itemMetadata.licenseurl.trim() : "";
      const creator = itemMetadata.creator;
      const creatorName = typeof creator === "string"
        ? creator.trim()
        : Array.isArray(creator) && typeof creator[0] === "string"
          ? creator[0].trim()
          : "";
      const performer = namedPerformer(itemMetadata.description);
      const file = Array.isArray(metadata?.files)
        ? metadata.files.find((item: any) => item?.name === recording.verifiedFileName)
        : null;
      const fileTitle = typeof file?.title === "string" ? file.title : null;
      const exactFileMatch = isExactTitleOrAlias(recording.verifiedFileName, tuneNames)
        || (fileTitle ? isExactTitleOrAlias(fileTitle, tuneNames) : false);
      if (!rights && !licenseUrl) {
        rejected++;
        console.log("rejected (collection no longer declares rights or a license)");
        continue;
      }
      if (!creatorName || creatorName !== recording.audioAttribution || !file || !exactFileMatch) {
        rejected++;
        console.log("rejected (collection creator or exact file evidence changed)");
        continue;
      }
      const genreDisqualification = disqualifyByGenre(itemMetadata);
      if (genreDisqualification) {
        rejected++;
        console.log(`rejected (${genreDisqualification})`);
        continue;
      }
      if (recording.sourceFiddler && recording.sourceFiddler !== performer) {
        rejected++;
        console.log("rejected (named performer no longer matches the source description)");
        continue;
      }

      const verification = await verifyPlayableAudio({
        audioUrl: recording.audioUrl,
        audioSource: "Internet Archive",
        audioAttribution: creatorName,
      });
      if (!verification.ok) {
        rejected++;
        console.log(`rejected (${verification.reason})`);
        continue;
      }
      if (DRY_RUN) {
        applied++;
        console.log(needsPerformerCorrection ? "DRY attribution correction ready" : "DRY ready");
        continue;
      }

      try {
        await client.query("BEGIN");
        if (needsPerformerCorrection) {
          const repair = await client.query(
            `UPDATE tunes
             SET source_fiddler = $1
             WHERE id = $2 AND audio_url = $3 AND audio_source = 'Internet Archive'
               AND loc_item_id IS NULL
             RETURNING id`,
            [recording.sourceFiddler, tune.id, recording.audioUrl],
          );
          if (repair.rowCount === 0) {
            await client.query("ROLLBACK");
            skipped++;
            console.log("skipped (audio changed before attribution correction)");
            continue;
          }
          await client.query("COMMIT");
          applied++;
          console.log("✓ corrected performer attribution");
          continue;
        }
        const update = await client.query(
          `UPDATE tunes
           SET audio_url = $1, audio_source = $2, audio_attribution = $3,
               source_fiddler = COALESCE($4::text, source_fiddler),
               tags = CASE WHEN tags = 'audio-needed' THEN NULL ELSE tags END
           WHERE id = $5 AND audio_url IS NULL AND loc_item_id IS NULL
           RETURNING id`,
          [recording.audioUrl, "Internet Archive", creatorName, recording.sourceFiddler || null, tune.id],
        );
        if (update.rowCount === 0) {
          await client.query("ROLLBACK");
          skipped++;
          console.log("skipped (trusted audio was added concurrently)");
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
Internet Archive review apply complete
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