import { readFileSync } from "fs";

export interface AudioVariation {
  audioUrl: string;
  audioSource: string;
  audioAttribution: string;
  sourceFiddler?: string | null;
  collection?: string | null;
  era?: string | null;
  key?: string | null;
  tuning?: string | null;
  notes?: string | null;
}

export interface VideoReference {
  youtubeUrl: string;
  youtubeVideoId: string;
}

export interface AudioManifestEntry extends AudioVariation {
  theSessionId: string;
  title: string;
  description?: string | null;
  descriptionSource?: string | null;
  playingNotes?: string | null;
  video?: VideoReference | null;
  variations?: AudioVariation[];
}

type AudioManifestFile = AudioManifestEntry[] | { entries: AudioManifestEntry[] };

export function normalizeTuneTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/^(the|a|an|ye)\s+/g, "")
    .replace(/['’`]/g, "")
    .replace(/[".,!?()\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function requireText(value: unknown, label: string, index: number): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Audio manifest entry ${index + 1} needs ${label}`);
  }
  return value.trim();
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function validateVariation(value: unknown, index: number, label: string): AudioVariation {
  if (!value || typeof value !== "object") {
    throw new Error(`Audio manifest entry ${index + 1} has an invalid ${label}`);
  }

  const item = value as Record<string, unknown>;
  const audioUrl = requireText(item.audioUrl, `${label}.audioUrl`, index);
  try {
    const url = new URL(audioUrl);
    if (url.protocol !== "https:") {
      throw new Error("not https");
    }
  } catch {
    throw new Error(`Audio manifest entry ${index + 1} needs an HTTPS ${label}.audioUrl`);
  }

  return {
    audioUrl,
    audioSource: requireText(item.audioSource, `${label}.audioSource`, index),
    audioAttribution: requireText(item.audioAttribution, `${label}.audioAttribution`, index),
    sourceFiddler: typeof item.sourceFiddler === "string" ? item.sourceFiddler.trim() || null : null,
    collection: typeof item.collection === "string" ? item.collection.trim() || null : null,
    era: typeof item.era === "string" ? item.era.trim() || null : null,
    key: typeof item.key === "string" ? item.key.trim() || null : null,
    tuning: typeof item.tuning === "string" ? item.tuning.trim() || null : null,
    notes: typeof item.notes === "string" ? item.notes.trim() || null : null,
  };
}

export function loadAudioManifest(filePath: string): AudioManifestEntry[] {
  const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8")) as AudioManifestFile;
  const rawEntries = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? (parsed as { entries?: unknown }).entries
      : undefined;
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    throw new Error("Audio manifest must contain at least one entry");
  }

  const seenIds = new Set<string>();
  return rawEntries.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`Audio manifest entry ${index + 1} is invalid`);
    }
    const entry = raw as Record<string, unknown>;
    const theSessionId = requireText(entry.theSessionId, "theSessionId", index);
    if (seenIds.has(theSessionId)) {
      throw new Error(`Audio manifest repeats TheSession ID ${theSessionId}`);
    }
    seenIds.add(theSessionId);

    const primary = validateVariation(entry, index, "primary recording");
    const variations = entry.variations === undefined
      ? []
      : Array.isArray(entry.variations)
        ? entry.variations.map((variation, variationIndex) =>
          validateVariation(variation, index, `variation ${variationIndex + 1}`),
        )
        : (() => { throw new Error(`Audio manifest entry ${index + 1} variations must be an array`); })();

    let video: VideoReference | null = null;
    if (entry.video !== undefined && entry.video !== null) {
      if (typeof entry.video !== "object") {
        throw new Error(`Audio manifest entry ${index + 1} video must be an object`);
      }
      const rawVideo = entry.video as Record<string, unknown>;
      const youtubeUrl = requireText(rawVideo.youtubeUrl, "video.youtubeUrl", index);
      const youtubeVideoId = requireText(rawVideo.youtubeVideoId, "video.youtubeVideoId", index);
      if (!/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=/i.test(youtubeUrl)
        || !/^[A-Za-z0-9_-]{11}$/.test(youtubeVideoId)) {
        throw new Error(`Audio manifest entry ${index + 1} needs a verified YouTube watch URL and video ID`);
      }
      video = { youtubeUrl, youtubeVideoId };
    }

    return {
      ...primary,
      theSessionId,
      title: requireText(entry.title, "title", index),
      description: optionalText(entry.description),
      descriptionSource: optionalText(entry.descriptionSource),
      playingNotes: optionalText(entry.playingNotes),
      video,
      variations,
    };
  });
}

export function hasExactManifestTitleMatch(entry: AudioManifestEntry, tuneNames: string[]): boolean {
  const manifestTitle = normalizeTuneTitle(entry.title);
  return tuneNames
    .map((name) => normalizeTuneTitle(name))
    .filter(Boolean)
    .some((name) => name === manifestTitle);
}

export function hasAudioSignature(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  const hasText = (offset: number, text: string) =>
    text.split("").every((char, index) => data[offset + index] === char.charCodeAt(0));
  const isMp3Frame = data[0] === 0xff && (data[1] & 0xe0) === 0xe0;

  return hasText(0, "ID3")
    || isMp3Frame
    || hasText(0, "OggS")
    || (hasText(0, "RIFF") && hasText(8, "WAVE"))
    || hasText(0, "fLaC")
    || hasText(4, "ftyp");
}

async function readAudioPrefix(response: Response, maxBytes = 16): Promise<Uint8Array | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (length < maxBytes) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      const remaining = maxBytes - length;
      chunks.push(value.slice(0, remaining));
      length += Math.min(value.length, remaining);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (length === 0) return null;
  const prefix = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    prefix.set(chunk, offset);
    offset += chunk.length;
  }
  return prefix;
}

export async function verifyPlayableAudio(variation: AudioVariation): Promise<{ ok: true; contentType: string | null } | { ok: false; reason: string }> {
  try {
    const response = await fetch(variation.audioUrl, {
      headers: {
        Range: "bytes=0-1023",
        "User-Agent": "TuneVault/1.0 (audio verification)",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type");
    if (!response.url.startsWith("https://")) {
      return { ok: false, reason: "redirected to a non-HTTPS URL" };
    }
    const normalizedContentType = contentType?.toLowerCase() || "";
    const isAudioContentType = normalizedContentType.startsWith("audio/")
      // Wikimedia Commons serves .ogg/.oga audio under this generic container type.
      || normalizedContentType.startsWith("application/ogg");
    if (!isAudioContentType) {
      return { ok: false, reason: `unexpected content type ${contentType || "unknown"}` };
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (response.status === 200 && contentLength > 1_000_000) {
      return { ok: false, reason: "server ignored range request for an oversized audio file" };
    }
    const sample = await readAudioPrefix(response);
    if (!sample) {
      return { ok: false, reason: "audio response has no readable content" };
    }
    if (!hasAudioSignature(sample)) {
      return { ok: false, reason: "response is not a recognizable audio file" };
    }
    return { ok: true, contentType };
  } catch (error: any) {
    return { ok: false, reason: error?.message || "request failed" };
  }
}