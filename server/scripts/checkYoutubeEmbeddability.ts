/**
 * Batch-checks all YouTube video IDs in the database for embed permission
 * and writes the result back to the is_embeddable column.
 *
 * Run with:  npx tsx server/scripts/checkYoutubeEmbeddability.ts
 */

import { pool } from "../db";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("YOUTUBE_API_KEY env var not set");
  process.exit(1);
}

const BATCH = 50; // YouTube allows up to 50 IDs per request

async function checkBatch(ids: string[]): Promise<Map<string, boolean>> {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${ids.join(",")}&part=status&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const result = new Map<string, boolean>();
  for (const item of data.items ?? []) {
    const embeddable = item.status?.embeddable === true && item.status?.privacyStatus === "public";
    result.set(item.id, embeddable);
  }
  // IDs not in the response are deleted/private → not embeddable
  for (const id of ids) {
    if (!result.has(id)) result.set(id, false);
  }
  return result;
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ id: number; youtube_video_id: string }>(
      `SELECT id, youtube_video_id FROM tunes WHERE youtube_video_id IS NOT NULL AND youtube_video_id != ''`
    );
    console.log(`Found ${rows.length} tunes with YouTube video IDs`);

    let updated = 0;
    let embeddable = 0;
    let blocked = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const ids = batch.map((r) => r.youtube_video_id);
      console.log(`Checking batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rows.length / BATCH)} (${ids.length} videos)…`);

      const resultMap = await checkBatch(ids);

      for (const row of batch) {
        const canEmbed = resultMap.get(row.youtube_video_id) ?? false;
        await client.query(
          `UPDATE tunes SET is_embeddable = $1 WHERE id = $2`,
          [canEmbed, row.id]
        );
        updated++;
        if (canEmbed) embeddable++;
        else blocked++;
      }

      // Respect YouTube quota — small pause between batches
      if (i + BATCH < rows.length) await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`\nDone! ${updated} tunes updated:`);
    console.log(`  ✓ Embeddable: ${embeddable}`);
    console.log(`  ✗ Blocked/deleted: ${blocked}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
