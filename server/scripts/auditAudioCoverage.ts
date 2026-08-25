/**
 * Reports audio-player coverage for recent additions without changing any tune.
 * Use --write-report to preserve the hold list for the next sourcing pass.
 *
 * Usage:
 *   npx tsx server/scripts/auditAudioCoverage.ts --from=2026-03-13
 *   npx tsx server/scripts/auditAudioCoverage.ts --from=2026-03-13 \
 *     --write-report=server/seedData/audio-gap-report.json
 */

import { writeFileSync } from "fs";
import { pool } from "../db";

const FROM_ARG = process.argv.find((arg) => arg.startsWith("--from="));
const FROM = FROM_ARG?.split("=").slice(1).join("=") || "2026-03-13";
const WRITE_ARG = process.argv.find((arg) => arg.startsWith("--write-report="));
const WRITE_PATH = WRITE_ARG?.split("=").slice(1).join("=");

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      id: number;
      title: string;
      tune_type: string | null;
      the_session_id: string | null;
      created_at: Date;
      audio_url: string | null;
      loc_item_id: string | null;
      audio_source: string | null;
    }>(
      `SELECT id, title, tune_type, the_session_id, created_at, audio_url, loc_item_id, audio_source
       FROM tunes
       WHERE created_at >= $1
       ORDER BY created_at ASC, id ASC`,
      [FROM],
    );
    const audioReady = rows.filter((tune) => Boolean(tune.audio_url || tune.loc_item_id));
    const held = rows.filter((tune) => !tune.audio_url && !tune.loc_item_id);
    const byType = held.reduce<Record<string, number>>((counts, tune) => {
      const type = tune.tune_type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    const report = {
      generatedAt: new Date().toISOString(),
      from: FROM,
      totalRecentTunes: rows.length,
      audioPlayerReady: audioReady.length,
      heldForVerifiedAudio: held.length,
      heldByTuneType: Object.fromEntries(Object.entries(byType).sort((a, b) => b[1] - a[1])),
      heldTunes: held.map((tune) => ({
        id: tune.id,
        title: tune.title,
        tuneType: tune.tune_type,
        theSessionId: tune.the_session_id,
        createdAt: tune.created_at instanceof Date ? tune.created_at.toISOString() : tune.created_at,
        status: "audio sought, none verified",
      })),
    };

    console.log(JSON.stringify({
      from: report.from,
      totalRecentTunes: report.totalRecentTunes,
      audioPlayerReady: report.audioPlayerReady,
      heldForVerifiedAudio: report.heldForVerifiedAudio,
      heldByTuneType: report.heldByTuneType,
    }, null, 2));
    if (WRITE_PATH) {
      writeFileSync(WRITE_PATH, JSON.stringify(report, null, 2) + "\n");
      console.log(`Wrote hold list to ${WRITE_PATH}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});