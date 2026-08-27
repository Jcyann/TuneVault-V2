/**
 * Removes exactly 500 of the least-popular tunes that have no verified
 * playable or archival reference anywhere in the catalog.
 *
 * The selected tune rows and any related rows are exported before deletion.
 * The export is intentionally dated and never overwritten, so the operation
 * can be reversed from that file if needed.
 *
 * Run:
 *   npx tsx server/scripts/removeLowAudioTunes.ts --dry-run
 *   npx tsx server/scripts/removeLowAudioTunes.ts
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { pool } from "../db";

const DRY_RUN = process.argv.includes("--dry-run");
const TODAY = new Date().toISOString().slice(0, 10);
const BACKUP_PATH = join(
  process.cwd(),
  "server",
  "seedData",
  `removed-low-audio-tunes-${TODAY}.json`,
);
const SEED_PATH = join(process.cwd(), "server", "seedData", "tunes.json");

const TUNE_FIELDS = [
  "id", "title", "alternative_titles", "key", "tune_type", "region",
  "difficulty", "description", "source_fiddler", "era", "youtube_url",
  "youtube_video_id", "audio_url", "abc_notation", "transcript_url",
  "loc_url", "loc_item_id", "folkways_url", "tater_joe_url",
  "the_session_id", "popularity", "tags", "notes", "audio_source",
  "audio_attribution", "created_at",
];

const RECORDING_FIELDS = [
  "id", "tune_id", "audio_url", "loc_item_id", "youtube_video_id",
  "audio_source", "audio_attribution", "source_fiddler", "collection",
  "era", "key", "tuning", "notes", "slippery_hill_slug", "created_at",
];

const ELIGIBLE_WHERE = `
  (t.audio_url IS NULL OR btrim(t.audio_url) = '')
  AND (t.loc_item_id IS NULL OR btrim(t.loc_item_id) = '')
  AND (t.loc_url IS NULL OR btrim(t.loc_url) = '')
  AND (t.youtube_url IS NULL OR btrim(t.youtube_url) = '')
  AND (t.youtube_video_id IS NULL OR btrim(t.youtube_video_id) = '')
  AND NOT EXISTS (
    SELECT 1
    FROM recordings r
    WHERE r.tune_id = t.id
      AND (
        (r.audio_url IS NOT NULL AND btrim(r.audio_url) <> '')
        OR (r.loc_item_id IS NOT NULL AND btrim(r.loc_item_id) <> '')
        OR (r.youtube_video_id IS NOT NULL AND btrim(r.youtube_video_id) <> '')
      )
  )
`;

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function protectedTuneIdsFromSeed(): number[] {
  const tunes = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  return tunes
    .filter((tune: any) =>
      hasValue(tune.audio_url)
      || hasValue(tune.loc_item_id)
      || hasValue(tune.loc_url)
      || hasValue(tune.youtube_url)
      || hasValue(tune.youtube_video_id),
    )
    .map((tune: any) => tune.id);
}

function assertSelectedRowsAreEligible(rows: any[], protectedSeedIds: Set<number>): void {
  if (rows.length !== 500) {
    throw new Error(`Expected exactly 500 eligible tunes, found ${rows.length}`);
  }

  const invalid = rows.filter((tune) =>
    hasValue(tune.audio_url)
    || hasValue(tune.loc_item_id)
    || hasValue(tune.loc_url)
    || hasValue(tune.youtube_url)
    || hasValue(tune.youtube_video_id)
    || protectedSeedIds.has(tune.id),
  );
  if (invalid.length > 0) {
    throw new Error(`Selection contained ${invalid.length} tune(s) with protected references`);
  }
}

async function main() {
  if (!DRY_RUN && existsSync(BACKUP_PATH)) {
    throw new Error(`Refusing to overwrite existing backup: ${BACKUP_PATH}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const protectedSeedIds = protectedTuneIdsFromSeed();

    const { rows: tunes } = await client.query(
      `SELECT ${TUNE_FIELDS.join(", ")}
       FROM tunes t
       WHERE ${ELIGIBLE_WHERE}
         AND NOT (t.id = ANY($1::int[]))
       ORDER BY t.popularity ASC NULLS LAST, t.id ASC
       LIMIT 500
       FOR UPDATE`,
      [protectedSeedIds],
    );
    assertSelectedRowsAreEligible(tunes, new Set(protectedSeedIds));

    const tuneIds = tunes.map((tune: any) => tune.id);
    const { rows: recordings } = await client.query(
      `SELECT ${RECORDING_FIELDS.join(", ")}
       FROM recordings
       WHERE tune_id = ANY($1::int[])
       ORDER BY id ASC`,
      [tuneIds],
    );

    const { rows: dependentCounts } = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM key_reviews WHERE tune_id = ANY($1::int[])) AS key_reviews,
         (SELECT COUNT(*)::int FROM recording_submissions WHERE tune_id = ANY($1::int[])) AS recording_submissions,
         (SELECT COUNT(*)::int FROM suggestions WHERE tune_id = ANY($1::int[])) AS suggestions`,
      [tuneIds],
    );
    if (
      dependentCounts[0].key_reviews > 0
      || dependentCounts[0].recording_submissions > 0
    ) {
      throw new Error(
        "Refusing cull: selected tunes have key reviews or recording submissions that must be reviewed first",
      );
    }

    const backup = {
      generatedAt: new Date().toISOString(),
      selectionRule: {
        count: 500,
        order: "popularity ASC NULLS LAST, id ASC",
        protectedReferences: [
          "tunes.audio_url",
          "tunes.loc_item_id",
          "tunes.loc_url",
          "tunes.youtube_url",
          "tunes.youtube_video_id",
          "recordings.audio_url",
          "recordings.loc_item_id",
          "recordings.youtube_video_id",
          "protected references present in the pre-operation tune seed",
        ],
      },
      tuneIds,
      tunes,
      recordings,
      dependentCounts: dependentCounts[0],
    };

    if (DRY_RUN) {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({
        dryRun: true,
        backupPath: BACKUP_PATH,
        selectedTunes: tunes.length,
        firstSelected: { id: tunes[0].id, title: tunes[0].title, popularity: tunes[0].popularity },
        lastSelected: {
          id: tunes[tunes.length - 1].id,
          title: tunes[tunes.length - 1].title,
          popularity: tunes[tunes.length - 1].popularity,
        },
        relatedRecordings: recordings.length,
        dependentCounts: dependentCounts[0],
      }, null, 2));
      return;
    }

    // Write the reversible export while the selection is locked and before
    // changing any rows. If deletion fails, the transaction rolls back and
    // the export remains available for inspection.
    writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2) + "\n", {
      flag: "wx",
    });

    const deletedRecordings = await client.query(
      "DELETE FROM recordings WHERE tune_id = ANY($1::int[])",
      [tuneIds],
    );
    const detachedSuggestions = await client.query(
      "UPDATE suggestions SET tune_id = NULL WHERE tune_id = ANY($1::int[])",
      [tuneIds],
    );
    const deletedTunes = await client.query(
      "DELETE FROM tunes WHERE id = ANY($1::int[])",
      [tuneIds],
    );

    if (deletedTunes.rowCount !== 500) {
      throw new Error(`Expected to delete exactly 500 tunes, deleted ${deletedTunes.rowCount}`);
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({
      backupPath: BACKUP_PATH,
      deletedTunes: deletedTunes.rowCount,
      deletedRecordings: deletedRecordings.rowCount,
      detachedSuggestions: detachedSuggestions.rowCount,
    }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});