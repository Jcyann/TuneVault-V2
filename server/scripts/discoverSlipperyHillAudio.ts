/**
 * Finds reviewable direct-audio candidates from Slippery Hill.
 *
 * This is deliberately read-only. It does not attach audio to tunes. A match
 * must use an exact title or stored alias as the filename evidence and must
 * pass the shared HTTPS/MIME/signature playback check.
 *
 * By default this processes the full unresolved backlog in one pass. Pass
 * --limit to cap a run, e.g. for a quick smoke test.
 *
 * Usage:
 *   npx tsx server/scripts/discoverSlipperyHillAudio.ts \
 *     --from=2026-03-13 \
 *     --write-report=server/seedData/slippery-hill-audio-review-latest.json
 */

import { writeFileSync } from "fs";
import { pool } from "../db";
import { normalizeTuneTitle, verifyPlayableAudio } from "./audioManifest";

const FROM_ARG = process.argv.find((arg) => arg.startsWith("--from="));
const FROM = FROM_ARG?.split("=").slice(1).join("=") || "2026-03-13";
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
// Default is large enough to cover the full unresolved backlog in one pass.
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : 50000;
const SKIP_ARG = process.argv.find((arg) => arg.startsWith("--skip="));
const SKIP = SKIP_ARG ? parseInt(SKIP_ARG.split("=")[1], 10) : 0;
const WRITE_ARG = process.argv.find((arg) => arg.startsWith("--write-report="));
const WRITE_PATH = WRITE_ARG?.split("=").slice(1).join("=");
const CATALOG_WIDE = process.argv.includes("--catalog-wide");
const BASE_URL = "https://www.slippery-hill.com/system/files/recordings/";
const UA = { "User-Agent": "TuneVault/1.0 (audio discovery; review only)" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function filenameForms(title: string): string[] {
  const words = normalizeTuneTitle(title).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const camel = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  const lower = words.join("").toLowerCase();
  const hyphen = words.join("-").toLowerCase();
  const underscore = words.join("_").toLowerCase();
  const pascal = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  return Array.from(new Set([camel, lower, hyphen, underscore, pascal]));
}

function exactFilenameEvidence(filename: string, tuneTitle: string, aliases: string): string | null {
  const stem = filename.replace(/\.(mp3)$/i, "");
  const compactStem = normalizeTuneTitle(stem).replace(/[^a-z0-9]/g, "");
  const names = [tuneTitle, ...aliases.split(",")].map(normalizeTuneTitle).filter(Boolean);
  return names.find((name) => compactStem === name.replace(/[^a-z0-9]/g, "")) || null;
}

async function headExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: UA,
      signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  if (!Number.isInteger(LIMIT) || LIMIT < 1 || !Number.isInteger(SKIP) || SKIP < 0) {
    throw new Error("--limit must be a positive integer");
  }

  const client = await pool.connect();
  const candidates: unknown[] = [];
  let searched = 0;
  let checkedFiles = 0;
  let noFilenameMatch = 0;
  let unavailable = 0;
  let rejected = 0;

  try {
    const { rows } = await client.query<{
      id: number;
      title: string;
      alternative_titles: string | null;
      the_session_id: string | null;
      popularity: number | null;
      created_at: string;
    }>(
      CATALOG_WIDE
        ? `SELECT id, title, alternative_titles, the_session_id, popularity, created_at
           FROM tunes
           WHERE audio_url IS NULL AND loc_item_id IS NULL
           ORDER BY popularity DESC NULLS LAST, created_at DESC, id DESC
           LIMIT $1 OFFSET $2`
        : `SELECT id, title, alternative_titles, the_session_id, popularity, created_at
           FROM tunes
           WHERE created_at >= $1 AND audio_url IS NULL AND loc_item_id IS NULL
           ORDER BY popularity DESC NULLS LAST, created_at DESC, id DESC
           LIMIT $2 OFFSET $3`,
      CATALOG_WIDE ? [LIMIT, SKIP] : [FROM, LIMIT, SKIP],
    );

    for (const tune of rows) {
      searched++;
      const aliases = tune.alternative_titles || "";
      const names = [tune.title, ...aliases.split(",")].map((name) => name.trim()).filter(Boolean);
      const forms = Array.from(new Set(names.flatMap(filenameForms)));
      let found = false;

      // Filename forms for one tune are independent guesses against the same
      // host; checking existence concurrently instead of one-by-one is what
      // makes a full-backlog pass tractable.
      checkedFiles += forms.length;
      const existence = await Promise.all(forms.map((form) => headExists(`${BASE_URL}${encodeURIComponent(form)}.mp3`)));

      for (let i = 0; i < forms.length; i++) {
        if (!existence[i]) continue;
        const form = forms[i];
        const url = `${BASE_URL}${encodeURIComponent(form)}.mp3`;

        const matchedTitle = exactFilenameEvidence(`${form}.mp3`, tune.title, aliases);
        if (!matchedTitle) {
          noFilenameMatch++;
          continue;
        }
        const verification = await verifyPlayableAudio({
          audioUrl: url,
          audioSource: "Slippery Hill",
          audioAttribution: "slippery-hill.com",
        });
        if (!verification.ok) {
          rejected++;
          continue;
        }

        candidates.push({
          tune: {
            id: tune.id,
            title: tune.title,
            theSessionId: tune.the_session_id,
            popularity: tune.popularity,
            createdAt: tune.created_at,
          },
          recording: {
            audioUrl: url,
            audioSource: "Slippery Hill",
            audioAttribution: "slippery-hill.com",
            matchedTitle,
            filenameEvidence: `${form}.mp3`,
            contentType: verification.contentType,
          },
          status: "reviewed candidate; add to manifest before applying",
        });
        found = true;
        break;
      }

      if (!found && forms.length > 0) unavailable++;
      await sleep(80);
    }
  } finally {
    client.release();
    await pool.end();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope: CATALOG_WIDE ? "catalog-wide" : "recent additions",
    from: CATALOG_WIDE ? null : FROM,
    searched,
    checkedFiles,
    reviewCandidates: candidates.length,
    noFilenameMatch,
    unavailable,
    rejected,
    candidates,
  };
  console.log(JSON.stringify({
    searched,
    checkedFiles,
    reviewCandidates: candidates.length,
    noFilenameMatch,
    unavailable,
    rejected,
  }, null, 2));
  if (WRITE_PATH) {
    writeFileSync(WRITE_PATH, JSON.stringify(report, null, 2) + "\n");
    console.log(`Wrote review candidates to ${WRITE_PATH}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});