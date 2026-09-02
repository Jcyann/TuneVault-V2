import type { PoolClient } from "pg";

export type AudioIngestionRun = {
  id: number;
  source: string;
  adapter_version: string;
  status: string;
  cursor_id: number;
  requested_limit: number | null;
  processed_count: number;
  added_count: number;
  candidate_count: number;
  failure_count: number;
  pause_reason: string | null;
  started_at: Date;
  updated_at: Date;
  finished_at: Date | null;
};

export type AudioIngestionTune = {
  id: number;
  title: string;
  alternative_titles: string | null;
  the_session_id: string | null;
  audio_url: string | null;
  loc_item_id: string | null;
};

export type AudioAttemptStatus =
  | "applied"
  | "candidate"
  | "no-match"
  | "rejected"
  | "skipped-existing"
  | "failed";

export type AttemptRecord = {
  runId: number;
  source: string;
  adapterVersion: string;
  tuneId: number;
  status: AudioAttemptStatus;
  candidateUrl?: string | null;
  candidateSource?: string | null;
  candidateAttribution?: string | null;
  details?: unknown;
  failureReason?: string | null;
  nextRetryAt?: Date | null;
};

export async function ensureAudioIngestionTables(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS audio_ingestion_runs (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      adapter_version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      cursor_id INTEGER NOT NULL DEFAULT 0,
      requested_limit INTEGER,
      processed_count INTEGER NOT NULL DEFAULT 0,
      added_count INTEGER NOT NULL DEFAULT 0,
      candidate_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      pause_reason TEXT,
      started_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      finished_at TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS audio_ingestion_runs_source_status_idx
      ON audio_ingestion_runs (source, status, updated_at DESC);
    CREATE TABLE IF NOT EXISTS audio_ingestion_attempts (
      id SERIAL PRIMARY KEY,
      run_id INTEGER,
      source TEXT NOT NULL,
      adapter_version TEXT NOT NULL,
      tune_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 1,
      candidate_url TEXT,
      candidate_source TEXT,
      candidate_attribution TEXT,
      details TEXT,
      failure_reason TEXT,
      next_retry_at TIMESTAMP,
      first_attempt_at TIMESTAMP NOT NULL DEFAULT now(),
      last_attempt_at TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE (source, adapter_version, tune_id)
    );
    ALTER TABLE audio_ingestion_attempts ADD COLUMN IF NOT EXISTS run_id INTEGER;
    CREATE INDEX IF NOT EXISTS audio_ingestion_attempts_retry_idx
      ON audio_ingestion_attempts (source, adapter_version, status, next_retry_at);
    CREATE INDEX IF NOT EXISTS audio_ingestion_attempts_tune_idx
      ON audio_ingestion_attempts (tune_id);
  `);
}

export async function openAudioIngestionRun(
  client: PoolClient,
  options: {
    source: string;
    adapterVersion: string;
    requestedLimit: number;
    resumeRunId?: number | null;
  },
): Promise<AudioIngestionRun> {
  if (options.resumeRunId) {
    const resumed = await client.query<AudioIngestionRun>(
      `UPDATE audio_ingestion_runs
       SET status = 'running', pause_reason = NULL, updated_at = now(), finished_at = NULL
       WHERE id = $1 AND source = $2 AND adapter_version = $3
         AND status IN ('running', 'paused', 'failed', 'completed')
       RETURNING *`,
      [options.resumeRunId, options.source, options.adapterVersion],
    );
    if (!resumed.rows[0]) {
      throw new Error(`Run ${options.resumeRunId} is not resumable for ${options.source}@${options.adapterVersion}`);
    }
    return resumed.rows[0];
  }

  const created = await client.query<AudioIngestionRun>(
    `INSERT INTO audio_ingestion_runs
       (source, adapter_version, status, requested_limit)
     VALUES ($1, $2, 'running', $3)
     RETURNING *`,
    [options.source, options.adapterVersion, options.requestedLimit],
  );
  return created.rows[0];
}

export async function rewindRunToPendingCandidate(
  client: PoolClient,
  run: AudioIngestionRun,
): Promise<AudioIngestionRun> {
  const result = await client.query<AudioIngestionRun>(
    `UPDATE audio_ingestion_runs r
     SET cursor_id = LEAST(
           r.cursor_id,
           COALESCE((
             SELECT MIN(a.tune_id) - 1
             FROM audio_ingestion_attempts a
             WHERE a.source = r.source
               AND a.adapter_version = r.adapter_version
               AND a.status = 'candidate'
           ), r.cursor_id)
         ),
         updated_at = now()
     WHERE r.id = $1
     RETURNING r.*`,
    [run.id],
  );
  return result.rows[0];
}

export async function nextAudioIngestionTune(
  client: PoolClient,
  run: AudioIngestionRun,
  includeArchivalReferences = false,
): Promise<AudioIngestionTune | null> {
  const result = await client.query<AudioIngestionTune>(
    `SELECT t.id, t.title, t.alternative_titles, t.the_session_id, t.audio_url, t.loc_item_id
     FROM tunes t
     WHERE t.id > $1
       AND (t.audio_url IS NULL OR btrim(t.audio_url) = '')
       AND ($4::boolean OR t.loc_item_id IS NULL OR btrim(t.loc_item_id) = '')
       AND NOT EXISTS (
         SELECT 1
         FROM audio_ingestion_attempts a
         WHERE a.source = $2
           AND a.adapter_version = $3
           AND a.tune_id = t.id
           AND a.status IN ('applied', 'no-match', 'rejected', 'skipped-existing')
       )
     ORDER BY t.id ASC
     LIMIT 1`,
    [run.cursor_id, run.source, run.adapter_version, includeArchivalReferences],
  );
  return result.rows[0] || null;
}

export async function audioIngestionRetryBlock(
  client: PoolClient,
  run: AudioIngestionRun,
): Promise<{ tuneId: number; nextRetryAt: Date } | null> {
  const result = await client.query<{ tune_id: number; next_retry_at: Date }>(
    `SELECT tune_id, next_retry_at
     FROM audio_ingestion_attempts
     WHERE source = $1
       AND adapter_version = $2
       AND status = 'failed'
       AND tune_id >= $3
       AND next_retry_at IS NOT NULL
       AND next_retry_at > now()
     ORDER BY tune_id ASC
     LIMIT 1`,
    [run.source, run.adapter_version, run.cursor_id],
  );
  return result.rows[0]
    ? { tuneId: result.rows[0].tune_id, nextRetryAt: result.rows[0].next_retry_at }
    : null;
}

export async function acquireAudioIngestionSourceLock(
  client: PoolClient,
  source: string,
  adapterVersion: string,
): Promise<boolean> {
  const result = await client.query<{ acquired: boolean }>(
    `SELECT pg_try_advisory_lock(hashtext($1)) AS acquired`,
    [`audio-ingestion:${source}@${adapterVersion}`],
  );
  return result.rows[0]?.acquired === true;
}

export async function releaseAudioIngestionSourceLock(
  client: PoolClient,
  source: string,
  adapterVersion: string,
): Promise<void> {
  await client.query(
    `SELECT pg_advisory_unlock(hashtext($1))`,
    [`audio-ingestion:${source}@${adapterVersion}`],
  );
}

export async function recordAudioIngestionAttempt(
  client: PoolClient,
  record: AttemptRecord,
): Promise<void> {
  await client.query(
    `INSERT INTO audio_ingestion_attempts
       (run_id, source, adapter_version, tune_id, status, candidate_url,
        candidate_source, candidate_attribution, details, failure_reason, next_retry_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (source, adapter_version, tune_id) DO UPDATE SET
       run_id = EXCLUDED.run_id,
       status = CASE
         WHEN audio_ingestion_attempts.status = 'applied' THEN 'applied'
         ELSE EXCLUDED.status
       END,
       attempts = audio_ingestion_attempts.attempts + 1,
       candidate_url = COALESCE(EXCLUDED.candidate_url, audio_ingestion_attempts.candidate_url),
       candidate_source = COALESCE(EXCLUDED.candidate_source, audio_ingestion_attempts.candidate_source),
       candidate_attribution = COALESCE(EXCLUDED.candidate_attribution, audio_ingestion_attempts.candidate_attribution),
       details = COALESCE(EXCLUDED.details, audio_ingestion_attempts.details),
       failure_reason = EXCLUDED.failure_reason,
       next_retry_at = EXCLUDED.next_retry_at,
       last_attempt_at = now()`,
    [
      record.runId,
      record.source,
      record.adapterVersion,
      record.tuneId,
      record.status,
      record.candidateUrl || null,
      record.candidateSource || null,
      record.candidateAttribution || null,
      record.details === undefined ? null : JSON.stringify(record.details),
      record.failureReason || null,
      record.nextRetryAt || null,
    ],
  );
}

export async function advanceAudioIngestionRun(
  client: PoolClient,
  options: {
    runId: number;
    cursorId: number;
    added?: boolean;
    candidate?: boolean;
    failed?: boolean;
  },
): Promise<AudioIngestionRun> {
  const result = await client.query<AudioIngestionRun>(
    `UPDATE audio_ingestion_runs
     SET cursor_id = GREATEST(cursor_id, $2),
         processed_count = processed_count + 1,
         added_count = added_count + $3,
         candidate_count = candidate_count + $4,
         failure_count = failure_count + $5,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      options.runId,
      options.cursorId,
      options.added ? 1 : 0,
      options.candidate ? 1 : 0,
      options.failed ? 1 : 0,
    ],
  );
  return result.rows[0];
}

export async function closeAudioIngestionRun(
  client: PoolClient,
  runId: number,
  status: "completed" | "paused" | "failed",
  reason: string | null = null,
): Promise<AudioIngestionRun> {
  const result = await client.query<AudioIngestionRun>(
    `UPDATE audio_ingestion_runs
     SET status = $2, pause_reason = $3, updated_at = now(),
         finished_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END
     WHERE id = $1
     RETURNING *`,
    [runId, status, reason],
  );
  return result.rows[0];
}

export async function applyVerifiedAudio(
  client: PoolClient,
  tuneId: number,
  candidate: {
    audioUrl: string;
    audioSource: string;
    audioAttribution: string;
    sourceFiddler?: string | null;
    locItemId?: string | null;
    locUrl?: string | null;
  },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE tunes
     SET audio_url = $1,
         audio_source = $2,
         audio_attribution = $3,
         source_fiddler = CASE
           WHEN source_fiddler IS NULL OR btrim(source_fiddler) = ''
             THEN COALESCE($4::text, source_fiddler)
           ELSE source_fiddler
         END,
         loc_item_id = COALESCE(NULLIF(btrim(loc_item_id), ''), $5::text),
         loc_url = COALESCE(NULLIF(btrim(loc_url), ''), $6::text),
         tags = CASE WHEN tags = 'audio-needed' THEN NULL ELSE tags END
     WHERE id = $7
       AND (audio_url IS NULL OR btrim(audio_url) = '')
       AND (
         loc_item_id IS NULL OR btrim(loc_item_id) = ''
         OR ($5::text IS NOT NULL AND loc_item_id = $5::text)
       )
     RETURNING id`,
    [
      candidate.audioUrl,
      candidate.audioSource,
      candidate.audioAttribution,
      candidate.sourceFiddler || null,
      candidate.locItemId || null,
      candidate.locUrl || null,
      tuneId,
    ],
  );
  return result.rowCount === 1;
}