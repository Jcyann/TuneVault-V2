/**
 * Build the most complete tune pages available from the existing catalog.
 *
 * Each tune is enriched as one unit: TheSession metadata, direct audio-file
 * sources, and a YouTube player-performance search run concurrently. Valid
 * results are merged into one transactional update. A YouTube video is never
 * written to audio_url or counted as direct audio.
 *
 * The script is resumable. It only fills missing fields and never replaces
 * existing primary audio, archival references, or player videos.
 *
 * Usage:
 *   npx tsx server/scripts/buildCompleteTunePages.ts --limit=25
 *   npx tsx server/scripts/buildCompleteTunePages.ts --limit=25 --dry-run
 *   npx tsx server/scripts/buildCompleteTunePages.ts --limit=25 --concurrency=4 \
 *     --write-report=server/seedData/tune-page-build-latest.json
 */

import { writeFileSync } from "fs";
import { pool } from "../db";
import { normalizeTuneTitle, verifyPlayableAudio } from "./audioManifest";
import { disqualifyByGenre } from "./internetArchiveGenreGuard";
import {
  COMMONS_AUDIO_EXTENSIONS,
  commonsAttribution,
  commonsLicenseSummary,
  disqualifyCommonsCandidate,
  fetchCommonsImageInfo,
  isCommonsAudioUrl,
  isExactCommonsTitleMatch,
} from "./wikimediaCommonsReview";

const LIMIT = parsePositiveArg("--limit=", 25);
const OFFSET = parseNonNegativeArg("--offset=", 0);
const CONCURRENCY = parsePositiveArg("--concurrency=", 4);
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_YOUTUBE = process.argv.includes("--skip-youtube");
const WRITE_ARG = process.argv.find((arg) => arg.startsWith("--write-report="));
const WRITE_PATH = WRITE_ARG?.split("=").slice(1).join("=");
const API_KEY = process.env.YOUTUBE_API_KEY || "";
const UA = { "User-Agent": "TuneVault/1.0 (complete tune page builder)" };
const SLIPPERY_HILL_BASE = "https://www.slippery-hill.com/system/files/recordings/";
const MAX_COMMONS_TITLES = 50;

let youtubeQuotaStopped = false;

function parsePositiveArg(prefix: string, fallback: number): number {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  const value = arg ? Number(arg.slice(prefix.length)) : fallback;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${prefix.slice(0, -1)} must be a positive integer`);
  }
  return value;
}

function parseNonNegativeArg(prefix: string, fallback: number): number {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  const value = arg ? Number(arg.slice(prefix.length)) : fallback;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${prefix.slice(0, -1)} must be a non-negative integer`);
  }
  return value;
}

class YoutubeQuotaExceeded extends Error {
  constructor() {
    super("YouTube Search API quota exceeded");
    this.name = "YoutubeQuotaExceeded";
  }
}

type TuneRow = {
  id: number;
  title: string;
  alternative_titles: string | null;
  key: string;
  tune_type: string | null;
  description: string | null;
  source_fiddler: string | null;
  abc_notation: string | null;
  transcript_url: string | null;
  the_session_id: string | null;
  audio_url: string | null;
  loc_item_id: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
  is_embeddable: boolean | null;
  popularity: number | null;
};

type FieldUpdate = {
  abc_notation?: string;
  alternative_titles?: string;
  audio_url?: string;
  audio_source?: string;
  audio_attribution?: string;
  source_fiddler?: string;
  youtube_url?: string;
  youtube_video_id?: string;
  is_embeddable?: boolean;
  tags?: null;
};

type DirectAudio = {
  audioUrl: string;
  audioSource: string;
  audioAttribution: string;
  sourceFiddler?: string | null;
};

type PlayerVideo = {
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string;
  channel: string | null;
};

type SessionEnrichment = {
  abcNotation?: string;
  alternativeTitles?: string;
};

type BuildResult = {
  id: number;
  title: string;
  applied: string[];
  pageBefore: PageStatus;
  pageAfter: PageStatus;
  sources: {
    session: "matched" | "missing" | "conflict" | "not-requested";
    audio: string;
    video: "matched" | "no-match" | "quota-stopped" | "not-requested";
  };
  errors: string[];
};

type PageStatus = {
  descriptor: boolean;
  notation: boolean;
  audioFile: boolean;
  playerVideo: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function tuneNames(tune: TuneRow): string[] {
  return [tune.title, ...(tune.alternative_titles || "").split(",")]
    .map((name) => name.trim())
    .filter(Boolean);
}

function pageStatus(tune: TuneRow, updates: FieldUpdate = {}): PageStatus {
  return {
    descriptor: hasText(tune.description),
    notation: hasText(updates.abc_notation ?? tune.abc_notation)
      || hasText(tune.transcript_url),
    audioFile: hasText(updates.audio_url ?? tune.audio_url),
    playerVideo: hasText(updates.youtube_video_id ?? tune.youtube_video_id),
  };
}

function normaliseForExactMatch(value: string): string {
  return normalizeTuneTitle(value).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function exactNameMatch(value: string, names: string[]): boolean {
  const normalized = normaliseForExactMatch(value);
  return Boolean(normalized && names.some((name) => normaliseForExactMatch(name) === normalized));
}

async function fetchJson(url: string, headers = UA): Promise<any | null> {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function meterForType(type: string | null): string | null {
  const meters: Record<string, string> = {
    reel: "4/4",
    breakdown: "4/4",
    hornpipe: "4/4",
    march: "4/4",
    jig: "6/8",
    "slip jig": "9/8",
    waltz: "3/4",
    polka: "2/4",
    barndance: "4/4",
    strathspey: "4/4",
    "three-two": "3/2",
    slide: "12/8",
    mazurka: "3/4",
  };
  return type ? meters[type.toLowerCase()] || null : null;
}

function sessionKeyToAbc(value: string): string {
  const match = value.match(/^([A-G][b#]?)(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|ionian)?$/i);
  if (!match) return value;
  return `${match[1]}${(match[2] || "major").toLowerCase().slice(0, 3)}`;
}

async function findSessionEnrichment(tune: TuneRow): Promise<{
  result: SessionEnrichment | null;
  status: BuildResult["sources"]["session"];
}> {
  if (!tune.the_session_id) return { result: null, status: "not-requested" };
  const data = await fetchJson(`https://thesession.org/tunes/${encodeURIComponent(tune.the_session_id)}?format=json`);
  if (!data?.name) return { result: null, status: "missing" };

  const names = tuneNames(tune);
  const theirNames = [data.name, ...(Array.isArray(data.aliases) ? data.aliases : [])];
  if (!theirNames.some((name) => exactNameMatch(String(name), names))) {
    return { result: null, status: "conflict" };
  }

  const result: SessionEnrichment = {};
  if (!hasText(tune.abc_notation) && Array.isArray(data.settings) && data.settings.length > 0) {
    const tonic = tune.key.replace(/m$/i, "").toUpperCase();
    const setting = data.settings.find((item: any) =>
      String(item?.key || "").toUpperCase().startsWith(tonic),
    ) || data.settings[0];
    const body = String(setting?.abc || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/! ?/g, "\n")
      .trim();
    const meter = meterForType(data.type || tune.tune_type);
    if (body.length > 20 && meter) {
      result.abcNotation = [
        "X:1",
        `T:${data.name}`,
        `R:${data.type || tune.tune_type || ""}`,
        `M:${meter}`,
        "L:1/8",
        `K:${sessionKeyToAbc(String(setting.key || tune.key))}`,
        body,
        `% Source: TheSession.org setting ${setting.url || `https://thesession.org/tunes/${tune.the_session_id}`} (CC BY-SA)`,
      ].join("\n");
    }
  }

  if (Array.isArray(data.aliases) && data.aliases.length > 0) {
    const existing = (tune.alternative_titles || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const seen = new Set([...existing, tune.title].map((name) => name.toLowerCase()));
    const fresh = data.aliases
      .map((name: unknown) => String(name).trim())
      .filter((name: string) => name && !seen.has(name.toLowerCase()))
      .slice(0, Math.max(0, 8 - existing.length));
    if (fresh.length > 0) result.alternativeTitles = [...existing, ...fresh].join(", ");
  }

  return {
    result: Object.keys(result).length > 0 ? result : null,
    status: "matched",
  };
}

async function verifyAudio(audioUrl: string, source: string, attribution: string): Promise<boolean> {
  const result = await verifyPlayableAudio({
    audioUrl,
    audioSource: source,
    audioAttribution: attribution,
  });
  return result.ok;
}

function archiveFileMatch(
  identifier: string,
  files: unknown,
  names: string[],
): { url: string; fileName: string; fileTitle: string | null } | null {
  if (!Array.isArray(files)) return null;
  const canonical = (value: string) => value
    .replace(/\.[A-Za-z0-9]{2,5}$/i, "")
    .replace(/^\s*\d{1,3}[\s._-]+/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedNames = names.map(canonical);
  const file = files.find((value) => {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    const format = typeof item.format === "string" ? item.format : "";
    const title = typeof item.title === "string" ? item.title : "";
    return /\.(mp3|m4a|ogg|opus|wav|flac)$/i.test(name)
      && /(mp3|mpeg|m4a|ogg|opus|wave|flac)/i.test(format || name)
      && !/(spectrogram|_vbr_)/i.test(name)
      && (normalizedNames.includes(canonical(name)) || normalizedNames.includes(canonical(title)));
  }) as Record<string, unknown> | undefined;
  if (!file || typeof file.name !== "string") return null;
  const encodedName = file.name.split("/").map(encodeURIComponent).join("/");
  return {
    url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedName}`,
    fileName: file.name,
    fileTitle: typeof file.title === "string" ? file.title : null,
  };
}

async function findInternetArchiveAudio(tune: TuneRow): Promise<DirectAudio | null> {
  const searchUrl = `https://archive.org/advancedsearch.php?${new URLSearchParams({
    q: `title:"${tune.title.replace(/"/g, "")}" AND mediatype:audio`,
    "fl[]": "identifier,title,creator,licenseurl,rights",
    rows: "10",
    output: "json",
  })}`;
  const search = await fetchJson(searchUrl);
  const documents = Array.isArray(search?.response?.docs) ? search.response.docs : [];
  const names = tuneNames(tune);

  for (const item of documents) {
    if (typeof item?.identifier !== "string") continue;
    const metadata = await fetchJson(`https://archive.org/metadata/${encodeURIComponent(item.identifier)}`);
    const itemMetadata = metadata?.metadata || {};
    const rights = typeof itemMetadata.rights === "string" ? itemMetadata.rights.trim() : "";
    const licenseUrl = typeof itemMetadata.licenseurl === "string" ? itemMetadata.licenseurl.trim() : "";
    if (!rights && !licenseUrl) continue;

    const creator = typeof itemMetadata.creator === "string"
      ? itemMetadata.creator.trim()
      : Array.isArray(itemMetadata.creator) && typeof itemMetadata.creator[0] === "string"
        ? itemMetadata.creator[0].trim()
        : "";
    if (!creator || disqualifyByGenre(itemMetadata)) continue;

    const file = archiveFileMatch(item.identifier, metadata.files, names);
    if (!file || !(await verifyAudio(file.url, "Internet Archive", creator))) continue;
    return {
      audioUrl: file.url,
      audioSource: "Internet Archive",
      audioAttribution: creator,
      sourceFiddler: typeof itemMetadata.description === "string"
        ? itemMetadata.description.match(/\bperformed by\s+(.+?)(?:[.;]|$)/i)?.[1]?.trim() || null
        : null,
    };
  }
  return null;
}

function slipperyFilenameForms(name: string): string[] {
  const words = normalizeTuneTitle(name).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  return Array.from(new Set([
    words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(""),
    words.join("").toLowerCase(),
    words.join("-").toLowerCase(),
    words.join("_").toLowerCase(),
  ]));
}

async function headExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: UA,
      signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function findSlipperyHillAudio(tune: TuneRow): Promise<DirectAudio | null> {
  const forms = Array.from(new Set(tuneNames(tune).flatMap(slipperyFilenameForms)));
  const checks = await Promise.all(forms.map(async (form) => ({
    form,
    exists: await headExists(`${SLIPPERY_HILL_BASE}${encodeURIComponent(form)}.mp3`),
  })));
  for (const { form, exists } of checks) {
    if (!exists) continue;
    const url = `${SLIPPERY_HILL_BASE}${encodeURIComponent(form)}.mp3`;
    if (await verifyAudio(url, "Slippery Hill", "slippery-hill.com")) {
      return {
        audioUrl: url,
        audioSource: "Slippery Hill",
        audioAttribution: "slippery-hill.com",
      };
    }
  }
  return null;
}

function commonsTitles(names: string[]): string[] {
  return names
    .flatMap((name) => COMMONS_AUDIO_EXTENSIONS.map((ext) => `File:${name}.${ext}`))
    .slice(0, MAX_COMMONS_TITLES);
}

async function findCommonsAudio(tune: TuneRow): Promise<DirectAudio | null> {
  const names = tuneNames(tune);
  const titles = commonsTitles(names);
  const pages = await fetchCommonsImageInfo(titles);
  for (const requestedTitle of titles) {
    const page = pages[requestedTitle] || pages[requestedTitle.replace(/_/g, " ")];
    if (!page || page.missing || !page.imageinfo) continue;
    if (!isExactCommonsTitleMatch(page.title, names)) continue;
    const url = typeof page.imageinfo.url === "string" ? page.imageinfo.url : "";
    if (!isCommonsAudioUrl(url)) continue;
    const license = commonsLicenseSummary(page.imageinfo.extmetadata);
    const attribution = commonsAttribution(page.imageinfo.extmetadata);
    if (!license.ok || !attribution || disqualifyCommonsCandidate(page.imageinfo.extmetadata)) continue;
    if (!(await verifyAudio(url, "Wikimedia Commons", attribution))) continue;
    return {
      audioUrl: url,
      audioSource: "Wikimedia Commons",
      audioAttribution: `${attribution} (${license.license})`,
    };
  }
  return null;
}

async function findDirectAudio(tune: TuneRow): Promise<{ result: DirectAudio | null; source: string }> {
  if (hasText(tune.audio_url) || hasText(tune.loc_item_id)) {
    return { result: null, source: "not-requested" };
  }
  const results = await Promise.allSettled([
    findInternetArchiveAudio(tune),
    findSlipperyHillAudio(tune),
    findCommonsAudio(tune),
  ]);
  const sourceNames = ["Internet Archive", "Slippery Hill", "Wikimedia Commons"];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled" && result.value) {
      return { result: result.value, source: result.value.audioSource };
    }
    if (result.status === "rejected") {
      console.warn(`[Tune#${tune.id}] ${sourceNames[i]} failed: ${String(result.reason)}`);
    }
  }
  return { result: null, source: "no-match" };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function titleContainsWholeWords(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

async function findYoutubePerformance(tune: TuneRow): Promise<{
  result: PlayerVideo | null;
  status: BuildResult["sources"]["video"];
}> {
  if (hasText(tune.youtube_video_id) || hasText(tune.youtube_url)) {
    return { result: null, status: "not-requested" };
  }
  if (SKIP_YOUTUBE) return { result: null, status: "not-requested" };
  if (!API_KEY || youtubeQuotaStopped) {
    return { result: null, status: youtubeQuotaStopped ? "quota-stopped" : "no-match" };
  }

  const names = tuneNames(tune)
    .map(normaliseForExactMatch)
    .filter((name) => name.split(" ").filter(Boolean).length >= 2);
  if (names.length === 0) return { result: null, status: "no-match" };

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({
    part: "snippet",
    q: `${tune.title} old time fiddle`,
    type: "video",
    maxResults: "5",
    videoCategoryId: "10",
    videoEmbeddable: "true",
    key: API_KEY,
  })}`;
  let searchResponse: Response;
  try {
    searchResponse = await fetch(searchUrl, { headers: UA, signal: AbortSignal.timeout(20000) });
  } catch {
    return { result: null, status: "no-match" };
  }
  if (!searchResponse.ok) {
    const body = await searchResponse.text();
    if (searchResponse.status === 403 || searchResponse.status === 429) {
      if (/quota/i.test(body)) {
        youtubeQuotaStopped = true;
        throw new YoutubeQuotaExceeded();
      }
    }
    return { result: null, status: "no-match" };
  }

  const data = await searchResponse.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const candidate = items.find((item: any) => {
    const rawTitle = typeof item?.snippet?.title === "string" ? decodeEntities(item.snippet.title) : "";
    const normalizedTitle = normaliseForExactMatch(rawTitle);
    return typeof item?.id?.videoId === "string"
      && names.some((name) => titleContainsWholeWords(normalizedTitle, name));
  });
  if (!candidate?.id?.videoId) return { result: null, status: "no-match" };

  const verifyUrl = `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
    id: candidate.id.videoId,
    part: "status",
    key: API_KEY,
  })}`;
  const verifyResponse = await fetch(verifyUrl, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!verifyResponse.ok) return { result: null, status: "no-match" };
  const verifyData = await verifyResponse.json();
  const video = verifyData.items?.[0];
  if (video?.status?.embeddable !== true || video?.status?.privacyStatus !== "public") {
    return { result: null, status: "no-match" };
  }
  return {
    result: {
      youtubeVideoId: candidate.id.videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${candidate.id.videoId}`,
      title: decodeEntities(candidate.snippet.title),
      channel: candidate.snippet.channelTitle || null,
    },
    status: "matched",
  };
}

async function buildOneTune(tune: TuneRow, client: any): Promise<BuildResult> {
  const before = pageStatus(tune);
  const errors: string[] = [];
  const [session, audio, video] = await Promise.allSettled([
    findSessionEnrichment(tune),
    findDirectAudio(tune),
    findYoutubePerformance(tune),
  ]);

  const updates: FieldUpdate = {};
  let sessionStatus: BuildResult["sources"]["session"] = "missing";
  let audioSource = "no-match";
  let videoStatus: BuildResult["sources"]["video"] = "no-match";

  if (session.status === "fulfilled") {
    sessionStatus = session.value.status;
    if (session.value.result?.abcNotation && !hasText(tune.abc_notation)) {
      updates.abc_notation = session.value.result.abcNotation;
    }
    if (session.value.result?.alternativeTitles
      && session.value.result.alternativeTitles !== (tune.alternative_titles || "")) {
      updates.alternative_titles = session.value.result.alternativeTitles;
    }
  } else {
    errors.push(`TheSession: ${String(session.reason)}`);
  }

  if (audio.status === "fulfilled") {
    audioSource = audio.value.source;
    if (audio.value.result && !hasText(tune.audio_url) && !hasText(tune.loc_item_id)) {
      updates.audio_url = audio.value.result.audioUrl;
      updates.audio_source = audio.value.result.audioSource;
      updates.audio_attribution = audio.value.result.audioAttribution;
      if (audio.value.result.sourceFiddler && !hasText(tune.source_fiddler)) {
        updates.source_fiddler = audio.value.result.sourceFiddler;
      }
      updates.tags = null;
    }
  } else {
    errors.push(`Direct audio: ${String(audio.reason)}`);
  }

  if (video.status === "fulfilled") {
    videoStatus = video.value.status;
    if (video.value.result && !hasText(tune.youtube_video_id) && !hasText(tune.youtube_url)) {
      updates.youtube_url = video.value.result.youtubeUrl;
      updates.youtube_video_id = video.value.result.youtubeVideoId;
      updates.is_embeddable = true;
    }
  } else if (video.reason instanceof YoutubeQuotaExceeded) {
    videoStatus = "quota-stopped";
  } else {
    errors.push(`YouTube: ${String(video.reason)}`);
  }

  const applied = Object.keys(updates);
  if (!DRY_RUN && applied.length > 0) {
    const assignments: string[] = [];
    const values: unknown[] = [];
    for (const [field, value] of Object.entries(updates)) {
      assignments.push(`${field} = $${values.length + 1}`);
      values.push(value);
    }
    values.push(tune.id);
    const updated = await client.query(
      `UPDATE tunes SET ${assignments.join(", ")} WHERE id = $${values.length} RETURNING id`,
      values,
    );
    if (updated.rowCount !== 1) errors.push("Database update skipped because the tune changed concurrently");
  }

  const after = pageStatus(tune, updates);
  return {
    id: tune.id,
    title: tune.title,
    applied,
    pageBefore: before,
    pageAfter: after,
    sources: { session: sessionStatus, audio: audioSource, video: videoStatus },
    errors,
  };
}

async function main() {
  const client = await pool.connect();
  const results: BuildResult[] = [];
  try {
    const { rows } = await client.query<TuneRow>(
      `SELECT id, title, alternative_titles, key, tune_type, description,
              source_fiddler, abc_notation, transcript_url, the_session_id,
              audio_url, loc_item_id, youtube_url, youtube_video_id,
              is_embeddable, popularity
       FROM tunes
       WHERE (audio_url IS NULL AND loc_item_id IS NULL)
          OR youtube_video_id IS NULL
          OR abc_notation IS NULL
          OR description IS NULL
       ORDER BY
         (
           CASE WHEN description IS NULL OR btrim(description) = '' THEN 1 ELSE 0 END
           + CASE WHEN abc_notation IS NULL OR btrim(abc_notation) = '' THEN 1 ELSE 0 END
           + CASE WHEN audio_url IS NULL AND loc_item_id IS NULL THEN 1 ELSE 0 END
           + CASE WHEN youtube_video_id IS NULL OR btrim(youtube_video_id) = '' THEN 1 ELSE 0 END
         ) DESC,
         popularity DESC NULLS LAST,
         id ASC
       LIMIT $1 OFFSET $2`,
      [LIMIT, OFFSET],
    );

    let cursor = 0;
    const worker = async () => {
      while (true) {
        const index = cursor++;
        if (index >= rows.length) return;
        const tune = rows[index];
        process.stdout.write(`[Tune#${tune.id}] ${tune.title} … `);
        try {
          const result = await buildOneTune(tune, client);
          results.push(result);
          console.log(result.applied.length > 0
            ? `✓ ${result.applied.join(", ")}`
            : "· no new fields");
        } catch (error: any) {
          const result: BuildResult = {
            id: tune.id,
            title: tune.title,
            applied: [],
            pageBefore: pageStatus(tune),
            pageAfter: pageStatus(tune),
            sources: { session: "missing", audio: "failed", video: "no-match" },
            errors: [error?.message || String(error)],
          };
          results.push(result);
          console.log(`✗ ${result.errors[0]}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, () => worker()));
  } finally {
    client.release();
    await pool.end();
  }

  const summary = {
    dryRun: DRY_RUN,
    requested: LIMIT,
    offset: OFFSET,
    concurrency: CONCURRENCY,
    skipYoutube: SKIP_YOUTUBE,
    processed: results.length,
    changedTunes: results.filter((result) => result.applied.length > 0).length,
    audioFilesAdded: results.filter((result) => result.applied.includes("audio_url")).length,
    playerVideosAdded: results.filter((result) => result.applied.includes("youtube_video_id")).length,
    notationAdded: results.filter((result) => result.applied.includes("abc_notation")).length,
    descriptorsAdded: results.filter((result) =>
      result.applied.includes("alternative_titles") || result.applied.includes("source_fiddler"),
    ).length,
    completePagesAfter: results.filter((result) =>
      result.pageAfter.notation && (result.pageAfter.audioFile || result.pageAfter.playerVideo),
    ).length,
    youtubeQuotaStopped,
    results,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (WRITE_PATH) writeFileSync(WRITE_PATH, JSON.stringify(summary, null, 2) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});