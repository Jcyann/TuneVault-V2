/**
 * Exercise the actual startup-sync SQL with a manual override inside a rolled
 * back transaction. No test text is committed or visible on public pages.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pool } from "../db";

async function main() {
  const source = readFileSync("server/autoSeed.ts", "utf8");
  const syncSection = source.slice(source.indexOf("// Database exists — sync"));
  const queryStart = syncSection.indexOf("`INSERT INTO tunes");
  const queryEnd = syncSection.indexOf("`", queryStart + 1);
  assert.ok(queryStart >= 0 && queryEnd > queryStart);
  const syncSql = syncSection.slice(queryStart + 1, queryEnd);
  const tune = JSON.parse(readFileSync("server/seedData/tunes.json", "utf8"))[0];
  const fields = [
    "id", "title", "alternative_titles", "key", "tune_type", "region", "difficulty",
    "description", "source_fiddler", "era", "youtube_url", "youtube_video_id",
    "audio_url", "abc_notation", "transcript_url", "loc_url", "loc_item_id",
    "folkways_url", "tater_joe_url", "the_session_id", "popularity", "tags",
    "notes", "audio_source", "audio_attribution", "created_at",
  ];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM tunes WHERE id=$1 FOR UPDATE", [tune.id]);
    await client.query(
      `INSERT INTO tune_copy_overrides (tune_id, description, notes) VALUES ($1,$2,$3)
       ON CONFLICT (tune_id) DO UPDATE SET description=EXCLUDED.description, notes=EXCLUDED.notes`,
      [tune.id, "Owner description fixture", null],
    );
    await client.query(syncSql, fields.map(f => tune[f]));
    const { rows } = await client.query("SELECT description, notes FROM tunes WHERE id=$1", [tune.id]);
    assert.deepEqual(rows[0], { description: "Owner description fixture", notes: null });
    console.log("PASS: actual startup upsert preserves manual description and intentional null notes.");
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
