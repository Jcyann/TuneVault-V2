/**
 * Finds reviewable direct-audio candidates from Internet Archive for tunes that
 * are currently held without player-ready audio. This script never updates the
 * catalog: a human must turn only verified candidates into an audio manifest.
 *
 * Candidates require an exact title or stored-alias match, an attributed creator,
 * a declared rights/license field, and an audio file in the item metadata.
 *
 * Usage:
 *   npx tsx server/scripts/discoverInternetArchiveAudio.ts --from=2026-03-13 \
 *     --limit=25 --write-report=server/seedData/ia-audio-review.json
 */

import { writeFileSync } from "fs";
import { pool } from "../db";
import { normalizeTuneTitle } from "./audioManifest";

const FROM_ARG = process.argv.find((arg) => arg.startsWith("--from="));
const FROM = FROM_ARG?.split("=").slice(1).join("=") || "2026-03-13";
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : 25;
const SKIP_ARG = process.argv.find((arg) => arg.startsWith("--skip="));
const SKIP = SKIP_ARG ? parseInt(SKIP_ARG.split("=")[1], 10) : 0;
const WRITE_ARG = process.argv.find((arg) => arg.startsWith("--write-report="));
const WRITE_PATH = WRITE_ARG?.split("=").slice(1).join("=");
const UA = { "User-Agent": "TuneVault/1.0 (audio discovery; review only)" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function exactTitleMatch(title: string, aliases: string, candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  const names = [title, ...aliases.split(",")].map(normalizeTuneTitle).filter(Boolean);
  return names.includes(normalizeTuneTitle(candidate));
}

function audioFileUrl(
  identifier: string,
  files: unknown,
  tuneTitle: string,
  aliases: string,
): { url: string; fileName: string; fileTitle: string | null } | null {
  if (!Array.isArray(files)) return null;
  const tuneNames = [tuneTitle, ...aliases.split(",")]
    .map(normalizeTuneTitle)
    .filter((name) => name.length >= 4);
  const file = files.find((value) => {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    const format = typeof item.format === "string" ? item.format : "";
    const fileTitle = typeof item.title === "string" ? item.title : "";
    const titleEvidence = normalizeTuneTitle(`${name} ${fileTitle}`);
    const matchesTune = tuneNames.some((tuneName) => titleEvidence.includes(tuneName));
    return /\.(mp3|m4a|ogg|opus|wav|flac)$/i.test(name)
      && /(mp3|mpeg|m4a|ogg|opus|wave|flac)/i.test(format || name)
      && !/(spectrogram|_vbr_)/i.test(name)
      && matchesTune;
  }) as Record<string, unknown> | undefined;
  if (!file || typeof file.name !== "string") return null;
  const encodedName = file.name.split("/").map(encodeURIComponent).join("/");
  return {
    url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedName}`,
    fileName: file.name,
    fileTitle: typeof file.title === "string" ? file.title : null,
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
      `SELECT id, title, alternative_titles, the_session_id
       FROM tunes
       WHERE created_at >= $1 AND audio_url IS NULL AND loc_item_id IS NULL
       ORDER BY popularity DESC, id ASC
       LIMIT $2 OFFSET $3`,
      [FROM, LIMIT, SKIP],
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
      const exact = documents.filter((item: any) =>
        exactTitleMatch(tune.title, tune.alternative_titles || "", item?.title),
      );
      if (exact.length === 0) {
        noExactItem++;
        await sleep(250);
        continue;
      }

      let found = false;
      for (const item of exact) {
        const rights = typeof item.rights === "string" ? item.rights.trim() : "";
        const licenseUrl = typeof item.licenseurl === "string" ? item.licenseurl.trim() : "";
        const attribution = typeof item.creator === "string"
          ? item.creator.trim()
          : Array.isArray(item.creator) && typeof item.creator[0] === "string"
            ? item.creator[0].trim()
            : "";
        if (!rights && !licenseUrl) {
          withheldForRights++;
          continue;
        }
        if (!attribution || typeof item.identifier !== "string") continue;

        const metadata = await fetchJson(`https://archive.org/metadata/${encodeURIComponent(item.identifier)}`);
        const itemTitle = metadata?.metadata?.title;
        if (!exactTitleMatch(tune.title, tune.alternative_titles || "", itemTitle)) continue;
        const file = audioFileUrl(item.identifier, metadata.files, tune.title, tune.alternative_titles || "");
        if (!file) {
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
            verifiedExactTitle: itemTitle,
            verifiedFileName: file.fileName,
            verifiedFileTitle: file.fileTitle,
          },
          status: "review required before manifest/apply",
        });
        found = true;
        break;
      }
      if (!found && exact.length > 0) noPlayableFile++;
      await sleep(350);
    }
  } finally {
    client.release();
    await pool.end();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    from: FROM,
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