/**
 * Finds and attaches YouTube performances for tunes that have no audio yet.
 * This is a lower-risk lane than direct-file hosting: it only embeds a
 * public YouTube video via YouTube's own player, it never downloads or
 * rehosts media. A candidate still needs real evidence before it is
 * attached: the video's own title must contain the tune's exact title (or a
 * stored alias) as a whole word sequence, and the video must be public and
 * embeddable (rechecked immediately before writing).
 *
 * The YouTube Data API's search endpoint is quota-expensive (100 units per
 * call against a default 10,000/day project quota, i.e. ~100 searches/day),
 * so this intentionally processes a bounded batch per run — rerun on
 * subsequent days/quota resets to keep working through the backlog.
 *
 * Usage:
 *   npx tsx server/scripts/discoverYoutubeAudio.ts --limit=80
 *   npx tsx server/scripts/discoverYoutubeAudio.ts --limit=80 --dry-run
 */

import { pool } from "../db";
import { normalizeTuneTitle } from "./audioManifest";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("YOUTUBE_API_KEY env var not set");
  process.exit(1);
}

const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : 80;
const DRY_RUN = process.argv.includes("--dry-run");
const UA = { "User-Agent": "TuneVault/1.0 (audio discovery; youtube)" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function titleContainsWholeWords(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function searchYoutube(query: string): Promise<any[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "5",
    videoCategoryId: "10",
    videoEmbeddable: "true",
    key: API_KEY!,
  })}`;
  try {
    const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        const body = await response.text();
        if (/quota/i.test(body)) throw new Error("QUOTA_EXCEEDED");
      }
      return [];
    }
    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (error: any) {
    if (error?.message === "QUOTA_EXCEEDED") throw error;
    return [];
  }
}

async function checkEmbeddable(videoIds: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (videoIds.length === 0) return result;
  const url = `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
    id: videoIds.join(","),
    part: "status",
    key: API_KEY!,
  })}`;
  const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!response.ok) return result;
  const data = await response.json();
  for (const item of data.items ?? []) {
    const embeddable = item.status?.embeddable === true && item.status?.privacyStatus === "public";
    result.set(item.id, embeddable);
  }
  return result;
}

async function main() {
  if (!Number.isInteger(LIMIT) || LIMIT < 1) throw new Error("--limit must be a positive integer");

  const client = await pool.connect();
  let searched = 0;
  let noMatch = 0;
  let notEmbeddable = 0;
  let applied = 0;
  let quotaStopped = false;

  try {
    const { rows } = await client.query<{
      id: number;
      title: string;
      alternative_titles: string | null;
    }>(
      `SELECT id, title, alternative_titles
       FROM tunes
       WHERE audio_url IS NULL AND loc_item_id IS NULL
         AND (youtube_video_id IS NULL OR youtube_video_id = '')
       ORDER BY popularity DESC NULLS LAST, id ASC
       LIMIT $1`,
      [LIMIT],
    );

    for (const tune of rows) {
      searched++;
      // A single-word title/alias (e.g. an alias reduced to "Madrid" or
      // "Pembroke" after stripping "The") is not distinctive enough evidence
      // on its own — it matches unrelated videos that happen to share a
      // place name or surname (e.g. "Reel Madrid" matched a Real Madrid
      // anthem, "Pembroke Reel" matched a fiddler's surname). Require at
      // least two words so the phrase itself is the evidence.
      const names = [tune.title, ...(tune.alternative_titles || "").split(",")]
        .map((name) => name.trim())
        .filter(Boolean)
        .map(normalizeTuneTitle)
        .filter((name) => name.split(" ").filter(Boolean).length >= 2);

      let items: any[];
      try {
        items = await searchYoutube(`${tune.title} old time fiddle`);
      } catch (error: any) {
        if (error?.message === "QUOTA_EXCEEDED") {
          quotaStopped = true;
          break;
        }
        throw error;
      }

      let matchedVideoId: string | null = null;
      let matchedTitle: string | null = null;
      let matchedChannel: string | null = null;
      for (const item of items) {
        const videoId = item?.id?.videoId;
        const rawTitle = item?.snippet?.title;
        if (typeof videoId !== "string" || typeof rawTitle !== "string") continue;
        const normalizedVideoTitle = normalizeTuneTitle(decodeEntities(rawTitle));
        const isMatch = names.some((name) => name && titleContainsWholeWords(normalizedVideoTitle, name));
        if (isMatch) {
          matchedVideoId = videoId;
          matchedTitle = decodeEntities(rawTitle);
          matchedChannel = item?.snippet?.channelTitle || null;
          break;
        }
      }

      if (!matchedVideoId) {
        noMatch++;
        await sleep(150);
        continue;
      }

      const embedMap = await checkEmbeddable([matchedVideoId]);
      if (!embedMap.get(matchedVideoId)) {
        notEmbeddable++;
        await sleep(150);
        continue;
      }

      process.stdout.write(`[Tune#${tune.id}] ${tune.title} -> "${matchedTitle}" (${matchedChannel}) `);
      if (DRY_RUN) {
        applied++;
        console.log("DRY ready");
        await sleep(150);
        continue;
      }

      const update = await client.query(
        `UPDATE tunes
         SET youtube_url = $1, youtube_video_id = $2, is_embeddable = true,
             tags = CASE WHEN tags = 'audio-needed' THEN NULL ELSE tags END
         WHERE id = $3 AND audio_url IS NULL AND loc_item_id IS NULL
           AND (youtube_video_id IS NULL OR youtube_video_id = '')
         RETURNING id`,
        [`https://www.youtube.com/watch?v=${matchedVideoId}`, matchedVideoId, tune.id],
      );
      if (update.rowCount && update.rowCount > 0) {
        applied++;
        console.log("✓ applied");
      } else {
        console.log("skipped (video was added concurrently)");
      }
      await sleep(150);
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`
YouTube discovery complete
  Searched        : ${searched}
  Applied         : ${applied}
  No title match  : ${noMatch}
  Not embeddable  : ${notEmbeddable}
  Quota stopped   : ${quotaStopped}
  Dry-run mode    : ${DRY_RUN}
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
