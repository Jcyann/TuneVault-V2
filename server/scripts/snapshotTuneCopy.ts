import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pool } from "../db";

const dir = "generated-artifacts/tune-copy";
mkdirSync(dir, { recursive: true });
async function main() {
 const client = await pool.connect();
 try {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const tunes = (await client.query("SELECT * FROM tunes ORDER BY id")).rows;
  const recordings = (await client.query("SELECT * FROM recordings ORDER BY id")).rows;
  const overrides = (await client.query("SELECT * FROM tune_copy_overrides ORDER BY tune_id")).rows;
  await client.query("COMMIT");
  const path = `${dir}/snapshot.json`;
  // Never replace the baseline during a resumed review.
  const { existsSync } = await import("node:fs");
  if (existsSync(path)) throw new Error(`Snapshot already exists: ${path}`);
  writeFileSync(path, JSON.stringify({
    capturedAt: new Date().toISOString(), tunes, recordings, overrides,
    seedTunes: JSON.parse(readFileSync("server/seedData/tunes.json", "utf8")),
    seedRecordings: JSON.parse(readFileSync("server/seedData/recordings.json", "utf8")),
  }, null, 2));
  console.log(JSON.stringify({
    tunes: tunes.length, descriptions: tunes.filter(t => t.description).length,
    performanceNotes: tunes.filter(t => t.notes).length,
    recordings: recordings.length, recordingNotes: recordings.filter(r => r.notes).length,
    overrides: overrides.length, snapshot: path,
  }));
 } finally {
  client.release();
  await pool.end();
 }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
