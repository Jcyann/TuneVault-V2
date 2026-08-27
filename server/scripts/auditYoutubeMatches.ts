/**
 * One-off audit: re-checks YouTube matches already written to the catalog
 * against the stricter (>=2 word) match rule now enforced by
 * discoverYoutubeAudio.ts, and reverts any that only passed on a
 * single-word title/alias (the false-positive pattern found in manual
 * review, e.g. "Reel Madrid" matching a Real Madrid anthem via the alias
 * "The Madrid").
 *
 * Usage:
 *   npx tsx server/scripts/auditYoutubeMatches.ts --tune-ids=1,2,3 [--apply]
 */
import { pool } from "../db";
import { normalizeTuneTitle } from "./audioManifest";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("YOUTUBE_API_KEY env var not set");
  process.exit(1);
}
const IDS_ARG = process.argv.find((arg) => arg.startsWith("--tune-ids="));
const IDS = IDS_ARG ? IDS_ARG.split("=").slice(1).join("=").split(",").map(Number) : [];
const APPLY = process.argv.includes("--apply");

function titleContainsWholeWords(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}
function decodeEntities(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      id: number; title: string; alternative_titles: string | null; youtube_video_id: string | null;
    }>(`SELECT id, title, alternative_titles, youtube_video_id FROM tunes WHERE id = ANY($1)`, [IDS]);

    const videoIds = rows.map((r) => r.youtube_video_id).filter(Boolean) as string[];
    const titleMap = new Map<string, string>();
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const url = `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
        id: batch.join(","), part: "snippet", key: API_KEY!,
      })}`;
      const res = await fetch(url);
      const data = await res.json();
      for (const item of data.items ?? []) {
        if (item?.id && item?.snippet?.title) titleMap.set(item.id, item.snippet.title);
      }
    }

    let ok = 0, reverted = 0;
    for (const tune of rows) {
      if (!tune.youtube_video_id) continue;
      const videoTitle = titleMap.get(tune.youtube_video_id);
      if (!videoTitle) {
        console.log(`[Tune#${tune.id}] ${tune.title}: video gone/private -> REVERT`);
        reverted++;
        if (APPLY) {
          await client.query(`UPDATE tunes SET youtube_url=NULL, youtube_video_id=NULL, is_embeddable=NULL WHERE id=$1`, [tune.id]);
        }
        continue;
      }
      const normalizedVideoTitle = normalizeTuneTitle(decodeEntities(videoTitle));
      const names = [tune.title, ...(tune.alternative_titles || "").split(",")]
        .map((n) => n.trim()).filter(Boolean).map(normalizeTuneTitle)
        .filter((n) => n.split(" ").filter(Boolean).length >= 2);
      const strictMatch = names.some((name) => titleContainsWholeWords(normalizedVideoTitle, name));
      if (strictMatch) {
        ok++;
      } else {
        console.log(`[Tune#${tune.id}] ${tune.title} -> "${videoTitle}" FAILS strict check -> REVERT`);
        reverted++;
        if (APPLY) {
          await client.query(
            `UPDATE tunes SET youtube_url=NULL, youtube_video_id=NULL, is_embeddable=NULL WHERE id=$1`,
            [tune.id],
          );
        }
      }
    }
    console.log(`\nOK: ${ok}  Reverted: ${reverted}  (apply=${APPLY})`);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
