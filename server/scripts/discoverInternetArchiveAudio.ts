/**
 * Finds reviewable direct-audio candidates from Internet Archive for tunes that
 * are currently held without player-ready audio. This script never updates the
 * catalog: a human must turn only verified candidates into an audio manifest.
 *
 * Candidates require an exact title or stored-alias match against an individual
 * file name/title, an attributed creator, declared rights/license metadata, and
 * a bounded playable-audio verification. Collection titles are context, not
 * title evidence: many lawful archival items contain multiple tunes.
 *
 * Usage:
 *   npx tsx server/scripts/discoverInternetArchiveAudio.ts --from=2026-03-13 \
 *     --limit=25 --write-report=server/seedData/ia-audio-review.json
 *   npx tsx server/scripts/discoverInternetArchiveAudio.ts --catalog-wide \
 *     --limit=25 --write-report=server/seedData/ia-audio-review-catalog.json
 */

import { writeFileSync } from "fs";
import { pool } from "../db";
import { verifyPlayableAudio } from "./audioManifest";

const FROM_ARG = process.argv.find((arg) => arg.startsWith("--from="));
const FROM = FROM_ARG?.split("=").slice(1).join("=") || "2026-03-13";
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : 25;
const SKIP_ARG = process.argv.find((arg) => arg.startsWith("--skip="));
const SKIP = SKIP_ARG ? parseInt(SKIP_ARG.split("=")[1], 10) : 0;
const WRITE_ARG = process.argv.find((arg) => arg.startsWith("--write-report="));
const WRITE_PATH = WRITE_ARG?.split("=").slice(1).join("=");
const CATALOG_WIDE = process.argv.includes("--catalog-wide");
const UA = { "User-Agent": "TuneVault/1.0 (audio discovery; review only)" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function plainText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function namedPerformer(description: unknown): string | null {
  const match = plainText(description).match(/\bperformed by\s+(.+?)(?:[.;]|$)/i);
  return match?.[1]?.trim() || null;
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function fileTitleMatch(title: string, aliases: string, candidate: unknown): string | null {
  if (typeof candidate !== "string") return null;
  const canonical = (value: string) => value
    .replace(/\.[A-Za-z0-9]{2,5}$/i, "")
    .replace(/^\s*\d{1,3}[\s._-]+/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const candidateName = canonical(candidate);
  const names = [title, ...aliases.split(",")].map(canonical).filter(Boolean);
  return names.includes(candidateName) ? candidate : null;
}

function audioFileUrl(
  identifier: string,
  files: unknown,
  tuneTitle: string,
  aliases: string,
): { url: string; fileName: string; fileTitle: string | null; matchedTitle: string } | null {
  if (!Array.isArray(files)) return null;
  const file = files.find((value) => {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    const format = typeof item.format === "string" ? item.format : "";
    const fileTitle = typeof item.title === "string" ? item.title : "";
    return /\.(mp3|m4a|ogg|opus|wav|flac)$/i.test(name)
      && /(mp3|mpeg|m4a|ogg|opus|wave|flac)/i.test(format || name)
      && !/(spectrogram|_vbr_)/i.test(name)
      && Boolean(fileTitleMatch(tuneTitle, aliases, fileTitle) || fileTitleMatch(tuneTitle, aliases, name));
  }) as Record<string, unknown> | undefined;
  if (!file || typeof file.name !== "string") return null;
  const encodedName = file.name.split("/").map(encodeURIComponent).join("/");
  const fileTitle = typeof file.title === "string" ? file.title : null;
  const matchedTitle = fileTitleMatch(tuneTitle, aliases, fileTitle)
    || fileTitleMatch(tuneTitle, aliases, file.name);
  if (!matchedTitle) return null;
  return {
    url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedName}`,
    fileName: file.name,
    fileTitle,
    matchedTitle,
  };
}

async function main() {
  if (!Number.isInteger(LIMIT) || LIMIT < 1 || !Number.isInteger(SKIP) || SKIP < 0) {
    throw new Error("--limit must be a positive integer");
  }
  const client = await pool.connect();
  const candidates: unknown[] = [];
  let searched = 0;
  let noExactItem = 0;
  let withheldForRights = 0;
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
      const query = `title:"${tune.title.replace(/"/g, "")}" AND mediatype:audio`;
      const searchUrl = `https://archive.org/advancedsearch.php?${new URLSearchParams({
        q: query,
        "fl[]": "identifier,title,creator,licenseurl,rights",
        rows: "10",
        output: "json",
      })}`;
      const search = await fetchJson(searchUrl);
      const documents = Array.isArray(search?.response?.docs) ? search.response.docs : [];
       if (documents.length === 0) {
        noExactItem++;
        await sleep(250);
        continue;
      }

      let found = false;
       for (const item of documents) {
         if (typeof item?.identifier !== "string") continue;
         const metadata = await fetchJson(`https://archive.org/metadata/${encodeURIComponent(item.identifier)}`);
         const itemMetadata = metadata?.metadata || {};
         const rights = typeof itemMetadata.rights === "string" ? itemMetadata.rights.trim() : "";
         const licenseUrl = typeof itemMetadata.licenseurl === "string" ? itemMetadata.licenseurl.trim() : "";
         const creator = itemMetadata.creator;
         const attribution = typeof creator === "string"
           ? creator.trim()
           : Array.isArray(creator) && typeof creator[0] === "string"
             ? creator[0].trim()
             : "";
         if (!rights && !licenseUrl) {
           withheldForRights++;
           continue;
         }
         if (!attribution) continue;
        const file = audioFileUrl(item.identifier, metadata.files, tune.title, tune.alternative_titles || "");
        if (!file) {
          noPlayableFile++;
          continue;
        }
         const verification = await verifyPlayableAudio({
           audioUrl: file.url,
           audioSource: "Internet Archive",
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
            audioUrl: file.url,
            audioSource: "Internet Archive",
            audioAttribution: attribution,
            rights: rights || null,
            licenseUrl: licenseUrl || null,
            collectionIdentifier: item.identifier,
            collectionTitle: typeof itemMetadata.title === "string" ? itemMetadata.title : null,
            sourcePageUrl: `https://archive.org/details/${encodeURIComponent(item.identifier)}`,
            sourceFiddler: namedPerformer(itemMetadata.description),
            collectionContext: plainText(itemMetadata.description) || null,
            matchedTitle: file.matchedTitle,
            verifiedFileName: file.fileName,
            verifiedFileTitle: file.fileTitle,
            contentType: verification.contentType,
          },
          status: "review required before apply",
        });
        found = true;
        break;
      }
      await sleep(350);
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
    noExactItem,
    withheldForRights,
    noPlayableFile,
    candidates,
  };
  console.log(JSON.stringify({
    searched,
    reviewCandidates: candidates.length,
    noExactItem,
    withheldForRights,
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