/**
 * Imports useful, high-demand tunes from TheSession.org in two ordered lanes:
 *
 *   1. Audio-ready manifest entries first. Direct audio is verified before any
 *      secondary enrichment and multiple verified versions are preserved.
 *   2. High-demand tunes without audio next. These are still useful additions,
 *      but receive an "audio-needed" tag so the gap is visible and can be
 *      prioritized in the next sourcing pass.
 *
 * No-audio tunes are not given synthetic or guessed recordings. A manifest is
 * optional because audio is a priority, not an absolute admission gate.
 *
 * Usage:
 *   npx tsx server/scripts/importFromTheSession.ts --dry-run
 *   npx tsx server/scripts/importFromTheSession.ts \
 *     --audio-manifest=server/seedData/audio-first-manifest.json --limit=20
 *
 * Options:
 *   --audio-manifest=PATH  Optional reviewed manifest of exact audio matches.
 *   --dry-run              Preview inserts; write nothing.
 *   --limit=N              Stop after inserting N new tunes.
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

const UA = { "User-Agent": "TuneVault/1.0 (tune import; audio-priority)" };
const DELAY_MS = 900;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Broad enough to discover useful tunes, while the setting-count gate keeps
// obscure one-off entries out of the catalog. Manifest IDs always run first.
const SEARCH_QUERIES = [
  "reel", "jig", "polka", "hornpipe", "waltz", "march", "breakdown",
  "the", "old", "little", "lady", "irish", "scotch", "mountain", "river",
  "creek", "road", "fiddle", "barn", "green", "black", "white",
];

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

function popularityFromSettings(settingCount: number, audioReady: boolean): number {
  const base = Math.min(9, Math.max(5, 3 + Math.floor(Math.log2(settingCount))));
  return Math.min(9, base + (audioReady ? 1 : 0));
}

function buildAbc(detail: any, sessionId: string, setting: any, tuneType: string): string | null {
  const body = String(setting.abc || "")
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
    `K:${sessionKeyToAbcKey(setting.key || "Dmajor")}`,
    body,
    `% Source: TheSession.org tune #${sessionId} (CC BY-SA)`,
  ].join("\n");
}

async function verifyEntryAudio(entry: AudioManifestEntry): Promise<{
  variations: AudioVariation[];
  rejected: number;
}> {
  const verified: AudioVariation[] = [];
  let rejected = 0;
  for (const variation of [entry, ...(entry.variations || [])]) {
    const result = await verifyPlayableAudio(variation);
    if (result.ok) verified.push(variation);
    else {
      rejected++;
      console.warn(`  ⚠ audio rejected (${variation.audioUrl}): ${result.reason}`);
    }
  }
  return { variations: verified, rejected };
}

async function main() {
  if (!(INSERT_LIMIT === Infinity || (Number.isInteger(INSERT_LIMIT) && INSERT_LIMIT >= 1))) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isInteger(MIN_SETTINGS) || MIN_SETTINGS < 1) {
    throw new Error("--min-settings must be a positive integer");
  }

  const manifest = MANIFEST_PATH ? loadAudioManifest(MANIFEST_PATH) : [];
  const manifestById = new Map(manifest.map((entry) => [entry.theSessionId, entry]));
  const client = await pool.connect();
  const stats = {
    inserted: 0,
    audioBacked: 0,
    audioNeeded: 0,
    extraVariations: 0,
    skippedExisting: 0,
    skippedNoData: 0,
    skippedUnpopular: 0,
    skippedNameMismatch: 0,
    audioUnavailable: 0,
    audioRejected: 0,
    searched: 0,
  };

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

    console.log(`\nAudio-priority TheSession import — manifest: ${manifest.length}, min settings: ${MIN_SETTINGS}, dry-run: ${DRY_RUN}\n`);

    const processCandidate = async (sessionId: string, manifestEntry?: AudioManifestEntry) => {
      if (stats.inserted >= INSERT_LIMIT || existingIds.has(sessionId)) {
        if (existingIds.has(sessionId)) stats.skippedExisting++;
        return;
      }
      stats.searched++;
      process.stdout.write(`[TS#${sessionId}] ${manifestEntry?.title || "candidate"} … `);

      let audioVariations: AudioVariation[] = [];
      if (manifestEntry) {
        const audio = await verifyEntryAudio(manifestEntry);
        stats.audioRejected += audio.rejected;
        audioVariations = audio.variations;
        if (audioVariations.length === 0) {
          stats.audioUnavailable++;
          console.log("held (reviewed audio was not playable)");
          return;
        }
      }

      const detail = await fetchJson(`https://thesession.org/tunes/${sessionId}?format=json`);
      await sleep(DELAY_MS);
      if (!detail?.name) {
        stats.skippedNoData++;
        console.log("held (no TheSession detail)");
        return;
      }

      const aliases = (Array.isArray(detail.aliases) ? detail.aliases : [])
        .filter((alias: unknown): alias is string => typeof alias === "string")
        .filter((alias: string) => normalizeTuneTitle(alias) !== normalizeTuneTitle(detail.name))
        .slice(0, 8);
      const allNames = [detail.name, ...aliases];
      if (manifestEntry && !hasExactManifestTitleMatch(manifestEntry, allNames)) {
        stats.skippedNameMismatch++;
        console.log(`held (manifest title does not exactly match "${detail.name}")`);
        return;
      }
      if (allNames.some((name) => existingNames.has(normalizeTuneTitle(name)))) {
        stats.skippedExisting++;
        console.log("skipped (matching title already exists)");
        return;
      }

      const settings = Array.isArray(detail.settings) ? detail.settings : [];
      if (settings.length < MIN_SETTINGS) {
        stats.skippedUnpopular++;
        console.log(`held (${settings.length} settings; needs ${MIN_SETTINGS})`);
        return;
      }

      const setting = settings[0];
      const keyRaw: string = setting.key || "Dmajor";
      const tuneType = String(detail.type || "").toLowerCase();
      const abcNotation = buildAbc(detail, sessionId, setting, tuneType);
      const alternativeTitles = aliases.length > 0 ? aliases.join(", ") : null;
      const [primary, ...additionalVariations] = audioVariations;
      const audioReady = Boolean(primary);
      const tags = audioReady ? null : "audio-needed";
      const description = manifestEntry?.description
        ? `${manifestEntry.description}${manifestEntry.descriptionSource ? `\n\nSource: ${manifestEntry.descriptionSource}` : ""}`
        : null;
      const key = sessionKeyToSimple(keyRaw);

      if (DRY_RUN) {
        stats.inserted++;
        if (audioReady) stats.audioBacked++;
        else stats.audioNeeded++;
        console.log(`DRY ${audioReady ? "audio-ready" : "audio-needed"} (${settings.length} settings${abcNotation ? ", +notation" : ""})`);
        return;
      }

      try {
        await client.query("BEGIN");
        const result = await client.query<{ id: number }>(
          `INSERT INTO tunes
             (title, alternative_titles, key, tune_type, region, difficulty, description,
              source_fiddler, youtube_url, youtube_video_id, audio_url, abc_notation,
              the_session_id, popularity, tags, notes, audio_source, audio_attribution)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           RETURNING id`,
          [
            detail.name, alternativeTitles, key, tuneType || null, "Unknown", null, description,
            primary?.sourceFiddler || null, manifestEntry?.video?.youtubeUrl || null,
            manifestEntry?.video?.youtubeVideoId || null, primary?.audioUrl || null,
            abcNotation, sessionId, popularityFromSettings(settings.length, audioReady), tags,
            manifestEntry?.playingNotes || null, primary?.audioSource || null,
            primary?.audioAttribution || null,
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
        }
        await client.query("COMMIT");
        existingIds.add(sessionId);
        for (const name of allNames) existingNames.add(normalizeTuneTitle(name));
        stats.inserted++;
        if (audioReady) stats.audioBacked++;
        else stats.audioNeeded++;
        stats.extraVariations += additionalVariations.length;
        console.log(`✓ inserted (${audioReady ? "audio-ready" : "audio-needed"}${additionalVariations.length ? `, ${additionalVariations.length + 1} recordings` : ""})`);
      } catch (error: any) {
        await client.query("ROLLBACK").catch(() => {});
        console.log(`✗ insert failed: ${error?.message || "unknown error"}`);
      }
    };

    // Priority lane: process every reviewed audio candidate before searching
    // TheSession. This ordering is intentional even when a no-audio candidate
    // would otherwise appear earlier in a search result.
    for (const entry of manifest) {
      if (stats.inserted >= INSERT_LIMIT) break;
      await processCandidate(entry.theSessionId, entry);
    }

    // Coverage lane: useful high-demand tunes can still enter without audio.
    // Search results are deduped and filtered by the setting-count gate.
    const seenSearchIds = new Set<string>(manifest.map((entry) => entry.theSessionId));
    for (const query of SEARCH_QUERIES) {
      if (stats.inserted >= INSERT_LIMIT) break;
      const search = await fetchJson(
        `https://thesession.org/tunes/search?q=${encodeURIComponent(query)}&format=json&perpage=50&page=1`,
      );
      await sleep(DELAY_MS);
      if (!Array.isArray(search?.tunes)) continue;
      for (const result of search.tunes) {
        if (stats.inserted >= INSERT_LIMIT) break;
        const sessionId = String(result.id);
        if (seenSearchIds.has(sessionId)) continue;
        seenSearchIds.add(sessionId);
        await processCandidate(sessionId, manifestById.get(sessionId));
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`
Audio-priority import complete
  New tunes inserted       : ${stats.inserted}
    Audio-ready             : ${stats.audioBacked}
    Audio needed             : ${stats.audioNeeded}
  Extra variations saved   : ${stats.extraVariations}
  Already in catalog       : ${stats.skippedExisting}
  No source detail         : ${stats.skippedNoData}
  Below popularity gate    : ${stats.skippedUnpopular}
  Title mismatch held      : ${stats.skippedNameMismatch}
  Audio unavailable        : ${stats.audioUnavailable}
  Audio candidates rejected: ${stats.audioRejected}
  Candidates inspected     : ${stats.searched}
  Dry-run mode             : ${DRY_RUN}
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});