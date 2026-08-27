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
  advanceAudioIngestionRun,
  audioIngestionRetryBlock,
  applyVerifiedAudio,
  closeAudioIngestionRun,
  ensureAudioIngestionTables,
  nextAudioIngestionTune,
  openAudioIngestionRun,
  recordAudioIngestionAttempt,
  type AudioIngestionRun,
} from "./audioIngestionLedger";
import { verifyPlayableAudio } from "./audioManifest";
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

async function promotePersistedCandidates(
  client: Awaited<ReturnType<typeof pool.connect>>,
  run: AudioIngestionRun,
): Promise<{ processed: number; candidates: number; added: number }> {
  if (DRY_RUN) return { processed: 0, candidates: 0, added: 0 };
  const result = await client.query<{
    tune_id: number;
    loc_item_id: string | null;
    candidate_url: string;
    candidate_source: string;
    candidate_attribution: string;
    details: string | null;
  }>(
    `SELECT a.tune_id, t.loc_item_id, a.candidate_url, a.candidate_source,
            a.candidate_attribution, a.details
     FROM audio_ingestion_attempts a
     JOIN tunes t ON t.id = a.tune_id
     WHERE a.source = $1
       AND a.adapter_version = $2
       AND a.status = 'candidate'
       AND a.candidate_url IS NOT NULL
       AND a.candidate_source IS NOT NULL
       AND a.candidate_attribution IS NOT NULL
       AND (t.audio_url IS NULL OR btrim(t.audio_url) = '')
     ORDER BY a.tune_id`,
    [run.source, run.adapter_version],
  );
  let processed = 0;
  let candidates = 0;
  let added = 0;
  for (const row of result.rows) {
    const details = row.details ? JSON.parse(row.details) : {};
    const locReference = row.loc_item_id || details.locItemId || null;
    if (row.candidate_source === "Library of Congress" && !locReference) continue;
    const verification = await verifyPlayableAudio({
      audioUrl: row.candidate_url,
      audioSource: row.candidate_source,
      audioAttribution: row.candidate_attribution,
    });
    if (!verification.ok) {
      await recordAudioIngestionAttempt(client, {
        runId: run.id,
        source: run.source,
        adapterVersion: run.adapter_version,
        tuneId: row.tune_id,
        status: "rejected",
        failureReason: `persisted candidate revalidation failed: ${verification.reason}`,
      });
      processed++;
      continue;
    }
    const applied = await applyVerifiedAudio(client, row.tune_id, {
      audioUrl: row.candidate_url,
      audioSource: row.candidate_source,
      audioAttribution: row.candidate_attribution,
      sourceFiddler: details.sourceFiddler
        || row.candidate_attribution.split(";")[0]?.trim()
        || null,
      locItemId: locReference,
      locUrl: details.locUrl || (locReference ? `https://www.loc.gov/item/${encodeURIComponent(locReference)}/` : null),
    });
    await recordAudioIngestionAttempt(client, {
      runId: run.id,
      source: run.source,
      adapterVersion: run.adapter_version,
      tuneId: row.tune_id,
      status: applied ? "applied" : "skipped-existing",
      candidateUrl: row.candidate_url,
      candidateSource: row.candidate_source,
      candidateAttribution: row.candidate_attribution,
      details,
    });
    processed++;
    candidates++;
    if (applied) added++;
  }
  if (processed > 0) {
    await client.query(
      `UPDATE audio_ingestion_runs
       SET processed_count = processed_count + $2,
           candidate_count = candidate_count + $3,
           added_count = added_count + $4,
           updated_at = now()
       WHERE id = $1`,
      [run.id, processed, candidates, added],
    );
  }
  return { processed, candidates, added };
}

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
  try {
    await ensureAudioIngestionTables(client);
    const adapterVersion = VERSION_OVERRIDE || adapter.version;
    run = await openAudioIngestionRun(client, {
      source: adapter.name,
      adapterVersion,
      requestedLimit: LIMIT,
      resumeRunId: RUN_ID,
    });
    const promoted = await promotePersistedCandidates(client, run);
    let processedThisBatch = promoted.processed;
    let candidatesThisBatch = promoted.candidates;
    let addedThisBatch = promoted.added;
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
      if (retryBlock?.tuneId === tune.id) {
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
    evaluatedSources: sourcePolicy.sources.map((source: any) => ({
      name: source.name,
      status: source.status,
      context: source.context,
    })),
    shortfall: coverage.remainingToTarget === 0
      ? null
      : {
          filesNeeded: coverage.remainingToTarget,
          explanation: "Approved adapters exhausted or still processing the unresolved catalog; no unverified, rights-unclear, or video-only media is counted.",
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
  }
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});