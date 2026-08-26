/**
 * Finds reviewable direct-audio candidates from Wikimedia Commons for tunes
 * that are currently held without player-ready audio. This is read-only: it
 * never updates the catalog.
 *
 * A candidate requires an exact title or stored-alias match against a
 * Commons audio file's page title, an explicit declared license/usage-terms
 * entry on that file (Commons only hosts freely licensed or public-domain
 * media, but individual pages can still read as restricted), and a bounded
 * playable-audio verification.
 *
 * By default this processes the full unresolved backlog in one pass. Pass
 * --limit to cap a run, e.g. for a quick smoke test.
 *
 * Usage:
 *   npx tsx server/scripts/discoverWikimediaCommonsAudio.ts --catalog-wide \
 *     --write-report=server/seedData/wikimedia-commons-audio-review.json
 */

import { writeFileSync } from "fs";
import { pool } from "../db";
import { verifyPlayableAudio } from "./audioManifest";
import {
  COMMONS_AUDIO_EXTENSIONS,
  commonsAttribution,
  commonsLicenseSummary,
  disqualifyCommonsCandidate,
  fetchCommonsImageInfo,
  isCommonsAudioUrl,
  isExactCommonsTitleMatch,
} from "./wikimediaCommonsReview";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// MediaWiki accepts many titles per query; keep well under its limit for
// unauthenticated clients while covering every name/extension combination.
const MAX_TITLES_PER_REQUEST = 50;

function candidateTitles(names: string[]): string[] {
  const titles: string[] = [];
  for (const name of names) {
    for (const ext of COMMONS_AUDIO_EXTENSIONS) {
      titles.push(`File:${name}.${ext}`);
    }
  }
  return titles.slice(0, MAX_TITLES_PER_REQUEST);
}

async function main() {
  if (!Number.isInteger(LIMIT) || LIMIT < 1 || !Number.isInteger(SKIP) || SKIP < 0) {
    throw new Error("--limit must be a positive integer");
  }

  const client = await pool.connect();
  const candidates: unknown[] = [];
  let searched = 0;
  let noFileFound = 0;
  let withheldForLicense = 0;
  let withheldForGenre = 0;
  let noPlayableFile = 0;

  try {
    const { rows } = await client.query<{
      id: number;
      title: string;
      alternative_titles: string | null;
      the_session_id: string | null;
    }>(
      CATALOG_WIDE
        ? `SELECT id, title, alternative_titles, the_session_id
           FROM tunes
           WHERE audio_url IS NULL AND loc_item_id IS NULL
           ORDER BY popularity DESC NULLS LAST, id ASC
           LIMIT $1 OFFSET $2`
        : `SELECT id, title, alternative_titles, the_session_id
           FROM tunes
           WHERE created_at >= $1 AND audio_url IS NULL AND loc_item_id IS NULL
           ORDER BY popularity DESC NULLS LAST, id ASC
           LIMIT $2 OFFSET $3`,
      CATALOG_WIDE ? [LIMIT, SKIP] : [FROM, LIMIT, SKIP],
    );

    for (const tune of rows) {
      searched++;
      const names = [tune.title, ...(tune.alternative_titles || "").split(",")]
        .map((name) => name.trim())
        .filter(Boolean);
      const titles = candidateTitles(names);
      if (titles.length === 0) {
        await sleep(50);
        continue;
      }

      const pages = await fetchCommonsImageInfo(titles);
      let found = false;

      for (const pageTitle of titles) {
        const page = pages[pageTitle] || pages[pageTitle.replace(/_/g, " ")];
        if (!page || page.missing || !page.imageinfo) continue;
        if (!isExactCommonsTitleMatch(page.title, names)) continue;

        const url = typeof page.imageinfo.url === "string" ? page.imageinfo.url : "";
        if (!isCommonsAudioUrl(url)) continue;

        const license = commonsLicenseSummary(page.imageinfo.extmetadata);
        if (!license.ok) {
          withheldForLicense++;
          continue;
        }
        const attribution = commonsAttribution(page.imageinfo.extmetadata);
        if (!attribution) continue;

        const genreDisqualification = disqualifyCommonsCandidate(page.imageinfo.extmetadata);
        if (genreDisqualification) {
          withheldForGenre++;
          continue;
        }

        const verification = await verifyPlayableAudio({
          audioUrl: url,
          audioSource: "Wikimedia Commons",
          audioAttribution: attribution,
        });
        if (!verification.ok) {
          noPlayableFile++;
          continue;
        }

        candidates.push({
          tune: {
            id: tune.id,
            title: tune.title,
            theSessionId: tune.the_session_id,
          },
          recording: {
            audioUrl: url,
            audioSource: "Wikimedia Commons",
            audioAttribution: attribution,
            license: license.license,
            licenseUrl: license.licenseUrl,
            sourcePageUrl: typeof page.imageinfo.descriptionurl === "string" ? page.imageinfo.descriptionurl : null,
            matchedTitle: page.title.replace(/^File:/i, "").replace(/\.[A-Za-z0-9]{2,5}$/i, ""),
            verifiedPageTitle: page.title,
            contentType: verification.contentType,
          },
          status: "review required before apply",
        });
        found = true;
        break;
      }

      if (!found) noFileFound++;
      await sleep(150);
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
    reviewCandidates: candidates.length,
    noFileFound,
    withheldForLicense,
    withheldForGenre,
    noPlayableFile,
    candidates,
  };
  console.log(JSON.stringify({
    searched,
    reviewCandidates: candidates.length,
    noFileFound,
    withheldForLicense,
    withheldForGenre,
    noPlayableFile,
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
