/**
 * Imports only audio-ready, high-demand tunes from TheSession.org.
 *
 * A tune is not eligible until it appears in an audio manifest with a direct,
 * attributed recording. The recording is verified before any secondary
 * enrichment is processed, so the audio player remains the foundation of a
 * new tune page.
 *
 * Usage:
 *   npx tsx server/scripts/importFromTheSession.ts \
 *     --audio-manifest=server/seedData/audio-first-manifest.json --dry-run
 *
 * Options:
 *   --audio-manifest=PATH  Required curated manifest of exact source matches.
 *   --dry-run              Preview inserts; write nothing.
 *   --limit=N              Stop after N ready tunes.
 *   --min-settings=N       TheSession setting count used as a popularity proxy
 *                          (default 10).
 */

import { pool } from "../db";
import {
  hasExactManifestTitleMatch,
  loadAudioManifest,
  normalizeTuneTitle,
  verifyPlayableAudio,
  type AudioManifestEntry,
  type AudioVariation,
} from "./audioManifest";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const INSERT_LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;
const MIN_SETTINGS_ARG = process.argv.find((arg) => arg.startsWith("--min-settings="));
const MIN_SETTINGS = MIN_SETTINGS_ARG ? parseInt(MIN_SETTINGS_ARG.split("=")[1], 10) : 10;
const MANIFEST_ARG = process.argv.find((arg) => arg.startsWith("--audio-manifest="));
const MANIFEST_PATH = MANIFEST_ARG?.split("=").slice(1).join("=");

const UA = { "User-Agent": "TuneVault/1.0 (tunevault.org; audio-first tune import)" };
const DELAY_MS = 900;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const METER_BY_TYPE: Record<string, string> = {
  reel: "4/4", breakdown: "4/4", hornpipe: "4/4", march: "4/4",
  jig: "6/8", "slip jig": "9/8", waltz: "3/4", polka: "2/4",
  barndance: "4/4", strathspey: "4/4", "three-two": "3/2", mazurka: "3/4",
};

async function fetchJson(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    return response.ok ? await response.json() : null;
  } catch (error: any) {
    console.warn(`  ⚠ fetch failed ${url}: ${error?.message || "unknown error"}`);
    return null;
  }
}

function sessionKeyToSimple(key: string): string {
  const match = key.match(/^([A-G][b#]?)(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|ionian)?$/i);
  if (!match) return key.charAt(0).toUpperCase() + key.slice(1, 3);
  return ["minor", "dorian", "phrygian", "aeolian"].includes((match[2] || "major").toLowerCase())
    ? `${match[1]}m`
    : match[1];
}

function sessionKeyToAbcKey(key: string): string {
  const match = key.match(/^([A-G][b#]?)(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|ionian)?$/i);
  return match ? `${match[1]}${(match[2] || "major").toLowerCase().slice(0, 3)}` : key;
}

function popularityFromSettings(settingCount: number): number {
  return Math.min(9, Math.max(6, 3 + Math.floor(Math.log2(settingCount))));
}

function buildAbc(detail: any, sessionId: string, firstSetting: any, tuneType: string): string | null {
  const body = String(firstSetting.abc || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/! ?/g, "\n")
    .trim();
  const meter = METER_BY_TYPE[tuneType];
  if (body.length <= 20 || !meter) return null;

  return [
    "X:1",
    `T:${detail.name}`,
    `R:${detail.type || tuneType}`,
    `M:${meter}`,
    "L:1/8",
    `K:${sessionKeyToAbcKey(firstSetting.key || "Dmajor")}`,
    body,
    `% Source: TheSession.org tune #${sessionId} (CC BY-SA)`,
  ].join("\n");
}

async function verifyEntryAudio(entry: AudioManifestEntry): Promise<{ variations: AudioVariation[]; rejected: number }> {
  const verified: AudioVariation[] = [];
  let rejected = 0;
  for (const variation of [entry, ...(entry.variations || [])]) {
    const result = await verifyPlayableAudio(variation);
    if (result.ok) {
      verified.push(variation);
    } else {
      rejected++;
      console.warn(`  ⚠ audio rejected (${variation.audioUrl}): ${result.reason}`);
    }
  }
  return { variations: verified, rejected };
}

async function main() {
  if (!MANIFEST_PATH) {
    throw new Error("Refusing import: --audio-manifest=PATH is required. See server/seedData/audio-first-manifest.example.json.");
  }
  if (!Number.isInteger(MIN_SETTINGS) || MIN_SETTINGS < 1) {
    throw new Error("--min-settings must be a positive integer");
  }
  if (!Number.isFinite(INSERT_LIMIT) || INSERT_LIMIT < 1) {
    throw new Error("--limit must be a positive integer");
  }

  const manifest = loadAudioManifest(MANIFEST_PATH);
  const client = await pool.connect();
  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoData = 0;
  let skippedUnpopular = 0;
  let skippedNameMismatch = 0;
  let skippedAudioUnavailable = 0;
  let audioRejected = 0;
  let variationsSaved = 0;

  try {
    const { rows: existing } = await client.query(
      "SELECT title, alternative_titles, the_session_id FROM tunes",
    );
    const existingIds = new Set(existing.map((row) => String(row.the_session_id || "")).filter(Boolean));
    const existingNames = new Set<string>();
    for (const row of existing) {
      existingNames.add(normalizeTuneTitle(row.title || ""));
      for (const alias of String(row.alternative_titles || "").split(",")) {
        const normalized = normalizeTuneTitle(alias);
        if (normalized) existingNames.add(normalized);
      }
    }

    console.log(`\nAudio-first TheSession import — ${manifest.length} manifest entries, min settings: ${MIN_SETTINGS}, dry-run: ${DRY_RUN}\n`);

    for (const entry of manifest) {
      if (inserted >= INSERT_LIMIT) break;
      const sessionId = entry.theSessionId;
      process.stdout.write(`[TS#${sessionId}] ${entry.title} … `);

      if (existingIds.has(sessionId)) {
        skippedExisting++;
        console.log("skipped (already imported)");
        continue;
      }

      // Audio is verified before TheSession metadata or notation is processed.
      const audio = await verifyEntryAudio(entry);
      audioRejected += audio.rejected;
      if (audio.variations.length === 0) {
        skippedAudioUnavailable++;
        console.log("held (no playable verified audio)");
        continue;
      }
      const detail = await fetchJson(`https://thesession.org/tunes/${sessionId}?format=json`);
      await sleep(DELAY_MS);
      if (!detail?.name) {
        skippedNoData++;
        console.log("held (no TheSession detail)");
        continue;
      }

      const aliases = (Array.isArray(detail.aliases) ? detail.aliases : [])
        .filter((alias: unknown): alias is string => typeof alias === "string")
        .filter((alias: string) => normalizeTuneTitle(alias) !== normalizeTuneTitle(detail.name))
        .slice(0, 8);
      const allNames = [detail.name, ...aliases];
      if (!hasExactManifestTitleMatch(entry, allNames)) {
        skippedNameMismatch++;
        console.log(`held (manifest title does not exactly match "${detail.name}")`);
        continue;
      }
      if (allNames.some((name) => existingNames.has(normalizeTuneTitle(name)))) {
        skippedExisting++;
        console.log("skipped (matching title already exists)");
        continue;
      }

      const settings = Array.isArray(detail.settings) ? detail.settings : [];
      if (settings.length < MIN_SETTINGS) {
        skippedUnpopular++;
        console.log(`held (${settings.length} settings; needs ${MIN_SETTINGS})`);
        continue;
      }

      const firstSetting = settings[0];
      const keyRaw: string = firstSetting.key || "Dmajor";
      const tuneType = String(detail.type || "").toLowerCase();
      const abcNotation = buildAbc(detail, sessionId, firstSetting, tuneType);
      const alternativeTitles = aliases.length > 0 ? aliases.join(", ") : null;
      const [primary, ...additionalVariations] = audio.variations;
      const key = sessionKeyToSimple(keyRaw);

      if (DRY_RUN) {
        console.log(`DRY ready (${audio.variations.length} verified recording${audio.variations.length === 1 ? "" : "s"}, ${settings.length} settings${abcNotation ? ", +notation" : ""})`);
        inserted++;
        continue;
      }

      try {
        const result = await client.query<{ id: number }>(
          `INSERT INTO tunes
             (title, alternative_titles, key, tune_type, region, difficulty, description,
              source_fiddler, youtube_url, youtube_video_id, audio_url, abc_notation,
              the_session_id, popularity, notes, audio_source, audio_attribution)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           RETURNING id`,
          [
            detail.name, alternativeTitles, key, tuneType || null, "Unknown", null,
            entry.description
              ? `${entry.description}${entry.descriptionSource ? `\n\nSource: ${entry.descriptionSource}` : ""}`
              : null,
            primary.sourceFiddler || null, entry.video?.youtubeUrl || null,
            entry.video?.youtubeVideoId || null, primary.audioUrl, abcNotation, sessionId,
            popularityFromSettings(settings.length), entry.playingNotes || null,
            primary.audioSource, primary.audioAttribution,
          ],
        );
        const tuneId = result.rows[0].id;
        for (const variation of additionalVariations) {
          await client.query(
            `INSERT INTO recordings
              (tune_id, audio_url, audio_source, audio_attribution, source_fiddler,
               collection, era, key, tuning, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              tuneId, variation.audioUrl, variation.audioSource, variation.audioAttribution,
              variation.sourceFiddler || null, variation.collection || null, variation.era || null,
              variation.key || null, variation.tuning || null, variation.notes || null,
            ],
          );
          variationsSaved++;
        }
        existingIds.add(sessionId);
        for (const name of allNames) existingNames.add(normalizeTuneTitle(name));
        inserted++;
        console.log(`✓ inserted (${audio.variations.length} recording${audio.variations.length === 1 ? "" : "s"})`);
      } catch (error: any) {
        console.log(`✗ insert failed: ${error?.message || "unknown error"}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`
Audio-first import complete
  Ready tunes inserted : ${inserted}
  Extra variations saved: ${variationsSaved}
  Already in catalog   : ${skippedExisting}
  No source detail     : ${skippedNoData}
  Below popularity gate: ${skippedUnpopular}
  Title mismatch held  : ${skippedNameMismatch}
  Audio unavailable    : ${skippedAudioUnavailable}
  Audio candidates rejected: ${audioRejected}
  Dry-run mode         : ${DRY_RUN}
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});