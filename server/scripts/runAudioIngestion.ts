/**
 * Durable direct-audio ingestion.
 *
 * Every source/tune attempt is persisted in PostgreSQL. Permanent outcomes are
 * not repeated until the adapter version changes; transient failures pause the
 * run with a retry timestamp. Direct audio is field-guarded and YouTube is not
 * part of this pipeline.
 *
 * Examples:
 *   npx tsx server/scripts/runAudioIngestion.ts --source=all --limit=50 --dry-run
 *   npx tsx server/scripts/runAudioIngestion.ts --source=internet-archive --limit=100
 *   npx tsx server/scripts/runAudioIngestion.ts --source=internet-archive --run-id=12
 *   npx tsx server/scripts/runAudioIngestion.ts --source=manifest \
 *     --manifest=server/seedData/audio-first-manifest.json
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pool } from "../db";
import {
  acquireAudioIngestionSourceLock,
  advanceAudioIngestionRun,
  audioIngestionRetryBlock,
  applyVerifiedAudio,
  closeAudioIngestionRun,
  ensureAudioIngestionTables,
  nextAudioIngestionTune,
  openAudioIngestionRun,
  recordAudioIngestionAttempt,
  releaseAudioIngestionSourceLock,
  rewindRunToPendingCandidate,
  type AudioIngestionRun,
} from "./audioIngestionLedger";
import { createAudioSourceAdapter, type AudioSourceAdapter } from "./audioSourceAdapters";

const SOURCE_ARG = process.argv.find((arg) => arg.startsWith("--source="));
const SOURCE = SOURCE_ARG?.split("=").slice(1).join("=") || "all";
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 100;
const RUN_ID_ARG = process.argv.find((arg) => arg.startsWith("--run-id="));
const RUN_ID = RUN_ID_ARG ? Number(RUN_ID_ARG.split("=")[1]) : null;
const VERSION_ARG = process.argv.find((arg) => arg.startsWith("--adapter-version="));
const VERSION_OVERRIDE = VERSION_ARG?.split("=").slice(1).join("=") || null;
const MANIFEST_ARG = process.argv.find((arg) => arg.startsWith("--manifest="));
const MANIFEST_PATH = MANIFEST_ARG?.split("=").slice(1).join("=");
const REPORT_ARG = process.argv.find((arg) => arg.startsWith("--write-report="));
const REPORT_PATH = REPORT_ARG?.split("=").slice(1).join("=");
const TARGET_ARG = process.argv.find((arg) => arg.startsWith("--target="));
const TARGET = TARGET_ARG ? Number(TARGET_ARG.split("=")[1]) : 1200;
const DRY_RUN = process.argv.includes("--dry-run");
const NO_SEED_SYNC = process.argv.includes("--no-seed-sync");
const REPORT_ONLY = process.argv.includes("--report-only");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RunSummary = {
  runId: number;
  source: string;
  adapterVersion: string;
  status: string;
  pauseReason: string | null;
  cursorId: number;
  processedThisBatch: number;
  processedTotal: number;
  candidatesThisBatch: number;
  addedThisBatch: number;
  addedTotal: number;
  failuresThisBatch: number;
};

function validateArgs(): void {
  if (!Number.isInteger(LIMIT) || LIMIT < 1) throw new Error("--limit must be a positive integer");
  if (!Number.isInteger(TARGET) || TARGET < 1) throw new Error("--target must be a positive integer");
  if (RUN_ID !== null && (!Number.isInteger(RUN_ID) || RUN_ID < 1)) {
    throw new Error("--run-id must be a positive integer");
  }
  if (SOURCE === "all" && RUN_ID !== null) {
    throw new Error("--run-id can only resume one explicit --source");
  }
}

function sourcesToRun(): string[] {
  if (SOURCE !== "all") return [SOURCE];
  const sources = ["library-of-congress", "internet-archive", "slippery-hill", "wikimedia-commons"];
  if (MANIFEST_PATH) sources.unshift("manifest");
  return sources;
}

async function processAdapter(adapter: AudioSourceAdapter): Promise<RunSummary> {
  const client = await pool.connect();
  let run: AudioIngestionRun;
  let sourceLockAcquired = false;
  try {
    await ensureAudioIngestionTables(client);
    const adapterVersion = VERSION_OVERRIDE || adapter.version;
    sourceLockAcquired = await acquireAudioIngestionSourceLock(
      client,
      adapter.name,
      adapterVersion,
    );
    if (!sourceLockAcquired) {
      throw new Error(`Another ${adapter.name}@${adapterVersion} ingestion run is already active`);
    }
    run = await openAudioIngestionRun(client, {
      source: adapter.name,
      adapterVersion,
      requestedLimit: LIMIT,
      resumeRunId: RUN_ID,
    });
    if (!DRY_RUN && RUN_ID !== null) {
      run = await rewindRunToPendingCandidate(client, run);
    }
    let processedThisBatch = 0;
    let candidatesThisBatch = 0;
    let addedThisBatch = 0;
    let failuresThisBatch = 0;
    let status: "completed" | "paused" | "failed" = "paused";
    let pauseReason: string | null = "batch-limit";

    while (processedThisBatch < LIMIT) {
      const tune = await nextAudioIngestionTune(client, run, adapter.includeArchivalReferences === true);
      if (!tune) {
        status = "completed";
        pauseReason = null;
        break;
      }
      const retryBlock = await audioIngestionRetryBlock(client, run);
      if (retryBlock) {
        status = "paused";
        pauseReason = `waiting to retry tune ${retryBlock.tuneId} after ${retryBlock.nextRetryAt.toISOString()}`;
        break;
      }

      process.stdout.write(`[${adapter.name} run#${run.id} tune#${tune.id}] ${tune.title} … `);
      const outcome = await adapter.discover(tune);
      if (outcome.status === "failed") {
        failuresThisBatch++;
        processedThisBatch++;
        const retryAt = new Date(Date.now() + (outcome.retryAfterMs || 15 * 60 * 1000));
        await recordAudioIngestionAttempt(client, {
          runId: run.id,
          source: adapter.name,
          adapterVersion: run.adapter_version,
          tuneId: tune.id,
          status: "failed",
          failureReason: outcome.reason,
          nextRetryAt: retryAt,
        });
        run = await advanceAudioIngestionRun(client, {
          runId: run.id,
          cursorId: run.cursor_id,
          failed: true,
        });
        status = "paused";
        pauseReason = `source failure at tune ${tune.id}; retry after ${retryAt.toISOString()}`;
        console.log(`paused (${outcome.reason})`);
        break;
      }

      if (outcome.status === "no-match" || outcome.status === "rejected") {
        processedThisBatch++;
        await recordAudioIngestionAttempt(client, {
          runId: run.id,
          source: adapter.name,
          adapterVersion: run.adapter_version,
          tuneId: tune.id,
          status: outcome.status,
          details: outcome.details,
          failureReason: outcome.status === "rejected" ? outcome.reason : null,
        });
        run = await advanceAudioIngestionRun(client, {
          runId: run.id,
          cursorId: tune.id,
        });
        console.log(outcome.status === "no-match" ? "no match" : `rejected (${outcome.reason})`);
        if (adapter.minimumDelayMs > 0) await sleep(adapter.minimumDelayMs);
        continue;
      }

      candidatesThisBatch++;
      const candidate = outcome.candidate;
      let applied = false;
      if (!DRY_RUN) {
        applied = await applyVerifiedAudio(client, tune.id, candidate);
      }
      await recordAudioIngestionAttempt(client, {
        runId: run.id,
        source: adapter.name,
        adapterVersion: run.adapter_version,
        tuneId: tune.id,
        status: DRY_RUN ? "candidate" : applied ? "applied" : "skipped-existing",
        candidateUrl: candidate.audioUrl,
        candidateSource: candidate.audioSource,
        candidateAttribution: candidate.audioAttribution,
        details: candidate.details,
      });
      processedThisBatch++;
      if (applied) addedThisBatch++;
      run = await advanceAudioIngestionRun(client, {
        runId: run.id,
        cursorId: tune.id,
        candidate: true,
        added: applied,
      });
      console.log(DRY_RUN ? "candidate (dry run)" : applied ? "applied" : "skipped (audio added concurrently)");
      if (adapter.minimumDelayMs > 0) await sleep(adapter.minimumDelayMs);
    }

    run = await closeAudioIngestionRun(client, run.id, status, pauseReason);
    return {
      runId: run.id,
      source: adapter.name,
      adapterVersion: run.adapter_version,
      status: run.status,
      pauseReason: run.pause_reason,
      cursorId: run.cursor_id,
      processedThisBatch,
      processedTotal: run.processed_count,
      candidatesThisBatch,
      addedThisBatch,
      addedTotal: run.added_count,
      failuresThisBatch,
    };
  } catch (error: any) {
    if (typeof run!?.id === "number") {
      await closeAudioIngestionRun(client, run.id, "failed", error?.message || String(error)).catch(() => {});
    }
    throw error;
  } finally {
    if (sourceLockAcquired) {
      await releaseAudioIngestionSourceLock(
        client,
        adapter.name,
        VERSION_OVERRIDE || adapter.version,
      ).catch(() => {});
    }
    client.release();
  }
}

async function coverageAndSourceStatus() {
  const coverage = await pool.query<{
    total_tunes: string;
    direct_audio_files: string;
    unresolved_direct_audio: string;
  }>(
    `SELECT
       COUNT(*)::text AS total_tunes,
       COUNT(*) FILTER (WHERE NULLIF(btrim(audio_url), '') IS NOT NULL)::text AS direct_audio_files,
       COUNT(*) FILTER (
         WHERE NULLIF(btrim(audio_url), '') IS NULL
           AND NULLIF(btrim(loc_item_id), '') IS NULL
       )::text AS unresolved_direct_audio
     FROM tunes`,
  );
  const attempts = await pool.query<{
    source: string;
    status: string;
    count: string;
  }>(
    `SELECT source, status, COUNT(*)::text AS count
     FROM audio_ingestion_attempts
     GROUP BY source, status
     ORDER BY source, status`,
  );
  const sourceStatus: Record<string, Record<string, number>> = {};
  for (const row of attempts.rows) {
    sourceStatus[row.source] ||= {};
    sourceStatus[row.source][row.status] = Number(row.count);
  }
  const latestRuns = await pool.query<{
    source: string;
    id: number;
    adapter_version: string;
    status: string;
    cursor_id: number;
    processed_count: number;
    added_count: number;
    candidate_count: number;
    failure_count: number;
    pause_reason: string | null;
    updated_at: Date;
  }>(
    `SELECT DISTINCT ON (source)
       source, id, adapter_version, status, cursor_id, processed_count,
       added_count, candidate_count, failure_count, pause_reason, updated_at
     FROM audio_ingestion_runs
     ORDER BY source, updated_at DESC, id DESC`,
  );
  const audioSources = await pool.query<{ audio_source: string; count: string }>(
    `SELECT COALESCE(NULLIF(btrim(audio_source), ''), 'Unattributed') AS audio_source,
            COUNT(*)::text AS count
     FROM tunes
     WHERE NULLIF(btrim(audio_url), '') IS NOT NULL
     GROUP BY 1
     ORDER BY COUNT(*) DESC, 1`,
  );
  const directAudioFiles = Number(coverage.rows[0].direct_audio_files);
  return {
    totalTunes: Number(coverage.rows[0].total_tunes),
    directAudioFiles,
    target: TARGET,
    remainingToTarget: Math.max(0, TARGET - directAudioFiles),
    unresolvedDirectAudio: Number(coverage.rows[0].unresolved_direct_audio),
    sourceStatus,
    latestRuns: latestRuns.rows,
    currentDirectAudioBySource: Object.fromEntries(
      audioSources.rows.map((row) => [row.audio_source, Number(row.count)]),
    ),
  };
}

type DirectAudioSnapshotRow = {
  id: number;
  audio_url: string;
  audio_source: string | null;
  audio_attribution: string | null;
};

async function databaseDirectAudioSnapshot(): Promise<DirectAudioSnapshotRow[]> {
  const result = await pool.query<DirectAudioSnapshotRow>(
    `SELECT id, audio_url, audio_source, audio_attribution
     FROM tunes
     WHERE NULLIF(btrim(audio_url), '') IS NOT NULL
     ORDER BY id`,
  );
  return result.rows;
}

function verifySeedParity(databaseRows: DirectAudioSnapshotRow[]): void {
  const tunes = JSON.parse(readFileSync("server/seedData/tunes.json", "utf8"));
  if (!Array.isArray(tunes)) throw new Error("Seed parity check failed: tunes.json is not an array");
  const seedRows = tunes
    .filter((tune: any) => typeof tune?.audio_url === "string" && tune.audio_url.trim())
    .map((tune: any) => ({
      id: Number(tune.id),
      audio_url: tune.audio_url,
      audio_source: tune.audio_source || null,
      audio_attribution: tune.audio_attribution || null,
    }))
    .sort((a: DirectAudioSnapshotRow, b: DirectAudioSnapshotRow) => a.id - b.id);
  if (JSON.stringify(seedRows) !== JSON.stringify(databaseRows)) {
    throw new Error(
      `Seed parity check failed: database and seed differ in direct-audio URL/source/attribution by tune ID`,
    );
  }
  console.log(`Seed parity verified: ${databaseRows.length} direct audio records match by ID and attribution`);
}

async function approvedSourceLaneStatus() {
  const lanes = [
    { source: "library-of-congress", name: "Library of Congress", includeArchivalReferences: true },
    { source: "internet-archive", name: "Internet Archive", includeArchivalReferences: false },
    { source: "slippery-hill", name: "Slippery Hill", includeArchivalReferences: false },
    { source: "wikimedia-commons", name: "Wikimedia Commons", includeArchivalReferences: false },
  ];
  return Promise.all(lanes.map(async (lane) => {
    const version = createAudioSourceAdapter(lane.source).version;
    const latest = await pool.query<{
      id: number;
      status: string;
      cursor_id: number;
      pause_reason: string | null;
      updated_at: Date;
    }>(
      `SELECT id, status, cursor_id, pause_reason, updated_at
       FROM audio_ingestion_runs
       WHERE source = $1 AND adapter_version = $2
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [lane.source, version],
    );
    const attempts = await pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count
       FROM audio_ingestion_attempts
       WHERE source = $1 AND adapter_version = $2
       GROUP BY status`,
      [lane.source, version],
    );
    const counts = Object.fromEntries(
      attempts.rows.map((row) => [row.status, Number(row.count)]),
    );
    const remaining = await pool.query<{ remaining: string; unattempted: string }>(
      `SELECT
         COUNT(*) FILTER (
           WHERE NOT EXISTS (
             SELECT 1 FROM audio_ingestion_attempts a
             WHERE a.source = $1 AND a.adapter_version = $2 AND a.tune_id = t.id
               AND a.status IN ('applied', 'no-match', 'rejected', 'skipped-existing')
           )
         )::text AS remaining,
         COUNT(*) FILTER (
           WHERE NOT EXISTS (
             SELECT 1 FROM audio_ingestion_attempts a
             WHERE a.source = $1 AND a.adapter_version = $2 AND a.tune_id = t.id
           )
         )::text AS unattempted
       FROM tunes t
       WHERE NULLIF(btrim(t.audio_url), '') IS NULL
         AND ($3::boolean OR NULLIF(btrim(t.loc_item_id), '') IS NULL)`,
      [lane.source, version, lane.includeArchivalReferences],
    );
    const run = latest.rows[0] || null;
    return {
      source: lane.source,
      name: lane.name,
      adapterVersion: version,
      state: run?.status || "not-started",
      cursorId: run?.cursor_id || 0,
      pauseReason: run?.pause_reason || null,
      updatedAt: run?.updated_at || null,
      attempts: counts,
      additions: counts.applied || 0,
      pendingCandidates: counts.candidate || 0,
      pendingFailures: counts.failed || 0,
      remainingEligibleOrRetryable: Number(remaining.rows[0].remaining),
      unattempted: Number(remaining.rows[0].unattempted),
      determination: run?.status === "completed"
        ? "exhausted for the current adapter version"
        : run?.status === "paused"
          ? `paused: ${run.pause_reason || "manual resume required"}`
          : run?.status === "running"
            ? "still processing"
            : "current adapter version has not run",
    };
  }));
}

async function main() {
  validateArgs();
  const summaries: RunSummary[] = [];
  if (!REPORT_ONLY) {
    for (const source of sourcesToRun()) {
      const adapter = createAudioSourceAdapter(source, MANIFEST_PATH);
      summaries.push(await processAdapter(adapter));
    }
  }

  const coverage = await coverageAndSourceStatus();
  const sourceLanes = await approvedSourceLaneStatus();
  const databaseSnapshot = await databaseDirectAudioSnapshot();
  const sourcePolicy = JSON.parse(
    readFileSync("server/seedData/audio-source-policy.json", "utf8"),
  );
  const added = summaries.reduce((count, summary) => count + summary.addedThisBatch, 0);
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    requestedSource: SOURCE,
    requestedLimitPerSource: LIMIT,
    runs: summaries,
    coverage,
    approvedSourceLanes: sourceLanes,
    evaluatedSources: sourcePolicy.sources.map((source: any) => ({
      name: source.name,
      status: source.status,
      context: source.context,
    })),
    shortfall: coverage.remainingToTarget === 0
      ? null
      : {
          qualified: sourceLanes.every((lane) => lane.state === "completed"),
          filesNeeded: coverage.remainingToTarget,
          explanation: "The source records above quantify every approved lane as exhausted, paused, running, or not started. Rights-unclear, title-collision, blocked, and video-only media are not counted.",
          nextAction: "Resume paused runs, add a new approved source adapter, or ingest a rights-cleared manifest with exact tune identities.",
        },
  };
  console.log(JSON.stringify(report, null, 2));
  if (REPORT_PATH) writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

  await pool.end();
  if (!DRY_RUN && added > 0 && !NO_SEED_SYNC) {
    execFileSync("npx", ["tsx", "server/scripts/exportTunesToSeed.ts"], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    verifySeedParity(databaseSnapshot);
  }
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});