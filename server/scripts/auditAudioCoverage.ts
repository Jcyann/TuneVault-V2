/**
 * Reports audio coverage without changing any tune.
 *
 * By default this keeps the existing recent-additions report. Pass
 * --catalog-wide to produce a source-by-source view of the whole catalog that
 * separates direct player-ready URLs from trusted Library of Congress
 * references and unresolved gaps.
 *
 * Usage:
 *   npx tsx server/scripts/auditAudioCoverage.ts --from=2026-03-13
 *   npx tsx server/scripts/auditAudioCoverage.ts --from=2026-03-13 \
 *     --write-report=server/seedData/audio-gap-report.json
 *   npx tsx server/scripts/auditAudioCoverage.ts --catalog-wide \
 *     --write-report=server/seedData/catalog-audio-coverage.json
 */

import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";
import { pool } from "../db";

const FROM_ARG = process.argv.find((arg) => arg.startsWith("--from="));
const FROM = FROM_ARG?.split("=").slice(1).join("=") || "2026-03-13";
const WRITE_ARG = process.argv.find((arg) => arg.startsWith("--write-report="));
const WRITE_PATH = WRITE_ARG?.split("=").slice(1).join("=");
const CATALOG_WIDE = process.argv.includes("--catalog-wide");
const REVIEW_PATHS = process.argv
  .filter((arg) => arg.startsWith("--review-report="))
  .map((arg) => arg.split("=").slice(1).join("="))
  .filter(Boolean);

type CoverageClass =
  | "direct_playable_url"
  | "direct_url_and_loc_reference"
  | "loc_reference_only"
  | "youtube_only"
  | "unresolved";

function sourceFamily(audioUrl: string | null, locItemId: string | null): string {
  if (locItemId && !audioUrl) return "Library of Congress";
  if (!audioUrl) return "none";
  try {
    const hostname = new URL(audioUrl).hostname.toLowerCase();
    if (hostname === "archive.org" || hostname.endsWith(".archive.org")) return "Internet Archive";
    if (hostname === "www.slippery-hill.com" || hostname.endsWith(".slippery-hill.com")) return "Slippery Hill";
    if (hostname === "www.loc.gov" || hostname.endsWith(".loc.gov")) return "Library of Congress";
    if (hostname === "www.stringband.mossyroof.com" || hostname.endsWith(".mossyroof.com")) return "Mossyroof";
    if (hostname === "upload.wikimedia.org") return "Wikimedia Commons";
    return "other direct";
  } catch {
    return "other direct";
  }
}

function coverageClass(tune: {
  audio_url: string | null;
  loc_item_id: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
}): CoverageClass {
  if (tune.audio_url && tune.loc_item_id) return "direct_url_and_loc_reference";
  if (tune.audio_url) return "direct_playable_url";
  if (tune.loc_item_id) return "loc_reference_only";
  if (tune.youtube_url || tune.youtube_video_id) return "youtube_only";
  return "unresolved";
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce<Record<T, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

function pendingReviewSummary(existingAudioUrls: Set<string>) {
  const candidates: Array<{ audioUrl: string; audioSource: string }> = [];
  const reports: Array<{ report: string; candidates: number; pending: number }> = [];

  for (const path of REVIEW_PATHS) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as { candidates?: unknown[] };
      const entries = Array.isArray(parsed.candidates) ? parsed.candidates : [];
      const pendingEntries = entries.filter((entry) => {
        const audioUrl = (entry as any)?.recording?.audioUrl;
        return typeof audioUrl === "string" && !existingAudioUrls.has(audioUrl);
      });
      for (const entry of pendingEntries) {
        const recording = (entry as any).recording;
        candidates.push({
          audioUrl: recording.audioUrl,
          audioSource: typeof recording.audioSource === "string" ? recording.audioSource : "unknown",
        });
      }
      reports.push({ report: basename(path), candidates: entries.length, pending: pendingEntries.length });
    } catch (error: any) {
      console.warn(`Could not read review report ${path}: ${error?.message || "unknown error"}`);
    }
  }

  return {
    reviewCandidates: candidates.length,
    bySource: countBy(candidates.map((candidate) => candidate.audioSource)),
    reports,
  };
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      id: number;
      title: string;
      alternative_titles: string | null;
      tune_type: string | null;
      the_session_id: string | null;
      created_at: Date;
      audio_url: string | null;
      loc_item_id: string | null;
      loc_url: string | null;
      youtube_url: string | null;
      youtube_video_id: string | null;
      audio_source: string | null;
      audio_attribution: string | null;
      source_fiddler: string | null;
      popularity: number | null;
    }>(
      CATALOG_WIDE
        ? `SELECT id, title, alternative_titles, tune_type, the_session_id, created_at,
                  audio_url, loc_item_id, loc_url, youtube_url, youtube_video_id,
                  audio_source, audio_attribution, source_fiddler, popularity
           FROM tunes
           ORDER BY popularity DESC NULLS LAST, id ASC`
        : `SELECT id, title, alternative_titles, tune_type, the_session_id, created_at,
                  audio_url, loc_item_id, loc_url, youtube_url, youtube_video_id,
                  audio_source, audio_attribution, source_fiddler, popularity
           FROM tunes
           WHERE created_at >= $1
           ORDER BY popularity DESC NULLS LAST, id ASC`,
      CATALOG_WIDE ? [] : [FROM],
    );
    const rowsWithCoverage = rows.map((tune) => ({
      ...tune,
      coverageClass: coverageClass(tune),
      sourceFamily: sourceFamily(tune.audio_url, tune.loc_item_id),
    }));
    const directAudioReady = rowsWithCoverage.filter((tune) =>
      tune.coverageClass === "direct_playable_url" || tune.coverageClass === "direct_url_and_loc_reference",
    );
    const trustedArchivalReferences = rowsWithCoverage.filter((tune) =>
      tune.coverageClass === "loc_reference_only" || tune.coverageClass === "direct_url_and_loc_reference",
    );
    const playerReady = rowsWithCoverage.filter((tune) =>
      tune.coverageClass === "direct_playable_url"
        || tune.coverageClass === "direct_url_and_loc_reference"
        || tune.coverageClass === "loc_reference_only",
    );
    const held = rowsWithCoverage.filter((tune) => tune.coverageClass === "unresolved");
    const byType = held.reduce<Record<string, number>>((counts, tune) => {
      const type = tune.tune_type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    const coverageByClass = countBy(rowsWithCoverage.map((tune) => tune.coverageClass));
    const directAudioBySource = countBy(
      rowsWithCoverage
        .filter((tune) => tune.audio_url)
        .map((tune) => tune.sourceFamily),
    );
    const pendingReview = pendingReviewSummary(
      new Set(rowsWithCoverage.map((tune) => tune.audio_url).filter((url): url is string => Boolean(url))),
    );
    const report = {
      generatedAt: new Date().toISOString(),
      scope: CATALOG_WIDE ? "catalog-wide" : "recent additions",
      from: CATALOG_WIDE ? null : FROM,
      totalTunes: rows.length,
      totalRecentTunes: CATALOG_WIDE ? undefined : rows.length,
      audioPlayerReady: directAudioReady.length,
      directAudioReady: directAudioReady.length,
      trustedArchivalReferences: trustedArchivalReferences.length,
      archivalReferenceReady: playerReady.length,
      heldForVerifiedAudio: held.length,
      coverageByClass,
      directAudioBySource,
      pendingReview,
      heldByTuneType: Object.fromEntries(Object.entries(byType).sort((a, b) => b[1] - a[1])),
      heldTunes: held.map((tune) => ({
        id: tune.id,
        title: tune.title,
        alternativeTitles: tune.alternative_titles,
        tuneType: tune.tune_type,
        theSessionId: tune.the_session_id,
        popularity: tune.popularity,
        createdAt: tune.created_at instanceof Date ? tune.created_at.toISOString() : tune.created_at,
        status: "audio sought, none verified",
      })),
      topUnresolved: held.slice(0, 100).map((tune) => ({
        id: tune.id,
        title: tune.title,
        alternativeTitles: tune.alternative_titles,
        popularity: tune.popularity,
        tuneType: tune.tune_type,
        createdAt: tune.created_at instanceof Date ? tune.created_at.toISOString() : tune.created_at,
      })),
    };

    console.log(JSON.stringify({
      scope: report.scope,
      from: report.from,
      totalTunes: report.totalTunes,
      audioPlayerReady: report.audioPlayerReady,
      directAudioReady: report.directAudioReady,
      trustedArchivalReferences: report.trustedArchivalReferences,
      heldForVerifiedAudio: report.heldForVerifiedAudio,
      coverageByClass: report.coverageByClass,
      directAudioBySource: report.directAudioBySource,
      pendingReview: report.pendingReview,
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