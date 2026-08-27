import {
  hasExactManifestTitleMatch,
  loadAudioManifest,
  normalizeTuneTitle,
  verifyPlayableAudio,
  type AudioManifestEntry,
} from "./audioManifest";
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
import type { AudioIngestionTune } from "./audioIngestionLedger";

const UA = { "User-Agent": "TuneVault/1.0 (durable audio ingestion)" };
const SLIPPERY_HILL_BASE = "https://www.slippery-hill.com/system/files/recordings/";

export type VerifiedAudioCandidate = {
  audioUrl: string;
  audioSource: string;
  audioAttribution: string;
  sourceFiddler?: string | null;
  locItemId?: string | null;
  locUrl?: string | null;
  details?: Record<string, unknown>;
};

export type AdapterOutcome =
  | { status: "candidate"; candidate: VerifiedAudioCandidate }
  | { status: "no-match"; details?: Record<string, unknown> }
  | { status: "rejected"; reason: string; details?: Record<string, unknown> }
  | { status: "failed"; reason: string; retryAfterMs?: number };

export type AudioSourceAdapter = {
  name: string;
  version: string;
  minimumDelayMs: number;
  includeArchivalReferences?: boolean;
  discover(tune: AudioIngestionTune): Promise<AdapterOutcome>;
};

function tuneNames(tune: AudioIngestionTune): string[] {
  return [tune.title, ...(tune.alternative_titles || "").split(",")]
    .map((name) => name.trim())
    .filter(Boolean);
}

function canonicalTitle(value: string): string {
  return value
    .replace(/\[(?:in\s+)?[A-G][b#]?(?:\s+(?:major|minor))?\]/gi, " ")
    .replace(/\.[A-Za-z0-9]{2,5}$/i, "")
    .replace(/^\s*\d{1,3}[\s._-]+/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function locItemId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.match(/\/item\/([^/]+)\/?$/)?.[1] || null;
}

function locAudioGroups(resources: unknown): Array<Record<string, any>[]> {
  if (!Array.isArray(resources)) return [];
  const groups: Array<Record<string, any>[]> = [];
  for (const resource of resources) {
    if (!resource || typeof resource !== "object" || !Array.isArray((resource as any).files)) continue;
    for (const group of (resource as any).files) {
      if (Array.isArray(group)) groups.push(group);
    }
  }
  return groups;
}

async function locCandidateFromItem(
  itemId: string,
  names: string[],
): Promise<AdapterOutcome> {
  const response = await fetchJson(`https://www.loc.gov/item/${encodeURIComponent(itemId)}/?fo=json`);
  if (!response.ok) return { status: "failed", reason: response.reason, retryAfterMs: response.retryAfterMs };
  const item = response.data?.item || {};
  const itemNames = [
    typeof item.title === "string" ? item.title : "",
    ...(Array.isArray(item.other_title) ? item.other_title : []),
  ].filter(Boolean);
  if (!itemNames.some((name) => exactTitleMatch(String(name), names))) {
    return { status: "rejected", reason: "LOC item title does not exactly match title or alias" };
  }
  const subjects = Array.isArray(item.subject) ? item.subject.map((value: unknown) => String(value).toLowerCase()) : [];
  if (!subjects.includes("fiddle tunes") || !subjects.includes("instrumental music")) {
    return { status: "rejected", reason: "LOC item lacks fiddle-tune and instrumental context" };
  }
  const rightsText = Array.isArray(item.rights) ? item.rights.join(" ") : String(item.rights || "");
  const partOf = Array.isArray(item.partof)
    ? item.partof.map((value: any) => String(value?.title || value).toLowerCase())
    : [];
  const henryReedCollection = partOf.some((value: string) =>
    value.includes("fiddle tunes of the old frontier") && value.includes("henry reed"));
  if (!henryReedCollection
      && !/(not aware of any[^.]{0,80}copyright|public domain)/i.test(rightsText.replace(/<[^>]*>/g, " "))) {
    return { status: "rejected", reason: "LOC item lacks an approved no-known-copyright or public-domain statement" };
  }
  const contributors = Array.isArray(item.contributor_names)
    ? item.contributor_names.map((value: unknown) => String(value))
    : [];
  const performer = contributors.find((value: string) => /\(performer\)/i.test(value)) || "";
  if (!performer) return { status: "rejected", reason: "LOC item has no named performer" };
  const attribution = `${performer.replace(/\s*\(performer\)\s*/i, "").trim()}; American Folklife Center, Library of Congress`;

  for (const group of locAudioGroups(response.data?.resources)) {
    const info = group.find((file) => file?.mediaType === "A" || file?.mimetype === "application/x-audio");
    const audio = group.find((file) =>
      typeof file?.url === "string" && /^audio\/(?:mpeg|mp3)$/i.test(String(file.mimetype || "")));
    const audioUrl = typeof audio?.url === "string"
      ? audio.url
      : typeof info?.download === "string"
        ? info.download
        : "";
    const shortName = typeof info?.shortName === "string" ? info.shortName : String(item.title || "");
    if (!audioUrl || !exactTitleMatch(shortName, names)) continue;
    const verification = await verifyPlayableAudio({
      audioUrl,
      audioSource: "Library of Congress",
      audioAttribution: attribution,
    });
    if (!verification.ok) return { status: "rejected", reason: verification.reason };
    return {
      status: "candidate",
      candidate: {
        audioUrl,
        audioSource: "Library of Congress",
        audioAttribution: attribution,
        sourceFiddler: performer.replace(/\s*\(performer\)\s*/i, "").trim(),
        locItemId: itemId,
        locUrl: `https://www.loc.gov/item/${encodeURIComponent(itemId)}/`,
        details: {
          itemTitle: item.title,
          shortName,
          locItemId: itemId,
          locUrl: `https://www.loc.gov/item/${encodeURIComponent(itemId)}/`,
          sourceFiddler: performer.replace(/\s*\(performer\)\s*/i, "").trim(),
          rights: henryReedCollection
            ? "Library of Congress Henry Reed collection rights statement: no known U.S. copyright protection, subject to stated privacy/publicity considerations."
            : rightsText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
          contentType: verification.contentType,
        },
      },
    };
  }
  return { status: "rejected", reason: "LOC item has no exact verified MP3 resource" };
}

export function createLibraryOfCongressAdapter(): AudioSourceAdapter {
  return {
    name: "library-of-congress",
    version: "3",
    minimumDelayMs: 250,
    includeArchivalReferences: true,
    async discover(tune) {
      const names = tuneNames(tune);
      if (tune.loc_item_id) return locCandidateFromItem(tune.loc_item_id, names);
      const search = await fetchJson(`https://www.loc.gov/audio/?${new URLSearchParams({
        fo: "json",
        c: "20",
        q: `${tune.title} fiddle`,
      })}`);
      if (!search.ok) return { status: "failed", reason: search.reason, retryAfterMs: search.retryAfterMs };
      const results = Array.isArray(search.data?.results) ? search.data.results : [];
      const exactItems = results.filter((item: any) => {
        const candidates = [
          typeof item?.title === "string" ? item.title : "",
          ...(Array.isArray(item?.other_title) ? item.other_title : []),
        ];
        const subjects = Array.isArray(item?.subject)
          ? item.subject.map((value: unknown) => String(value).toLowerCase())
          : [];
        return candidates.some((name) => exactTitleMatch(name, names))
          && subjects.includes("fiddle tunes")
          && subjects.includes("instrumental music");
      });
      for (const item of exactItems) {
        const id = locItemId(item?.id);
        if (!id) continue;
        const outcome = await locCandidateFromItem(id, names);
        if (outcome.status === "candidate") return outcome;
        if (outcome.status === "failed") return outcome;
      }
      return { status: "no-match", details: { searchedResults: results.length, exactItems: exactItems.length } };
    },
  };
}

function exactTitleMatch(value: string, names: string[]): boolean {
  const candidate = canonicalTitle(value);
  return Boolean(candidate && names.some((name) => canonicalTitle(name) === candidate));
}

async function fetchJson(url: string): Promise<
  { ok: true; data: any } | { ok: false; reason: string; retryAfterMs?: number }
> {
  let lastReason = "request failed";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
      if (!response.ok) {
        const retryAfter = Number(response.headers.get("retry-after") || 0);
        lastReason = `HTTP ${response.status}`;
        if (attempt < 3 && (response.status === 429 || response.status >= 500)) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : attempt * 1000));
          continue;
        }
        return {
          ok: false,
          reason: lastReason,
          retryAfterMs: retryAfter > 0 ? retryAfter * 1000 : undefined,
        };
      }
      return { ok: true, data: await response.json() };
    } catch (error: any) {
      lastReason = error?.message || "request failed";
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
    }
  }
  return { ok: false, reason: lastReason, retryAfterMs: 15 * 60 * 1000 };
}

function internetArchiveFile(
  identifier: string,
  files: unknown,
  names: string[],
): { url: string; name: string; title: string | null } | null {
  if (!Array.isArray(files)) return null;
  const file = files.find((value) => {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    const title = typeof item.title === "string" ? item.title : "";
    const format = typeof item.format === "string" ? item.format : "";
    return /\.(mp3|m4a|ogg|opus|wav|flac)$/i.test(name)
      && /(mp3|mpeg|m4a|ogg|opus|wave|flac)/i.test(format || name)
      && !/(spectrogram|_vbr_)/i.test(name)
      && (exactTitleMatch(name, names) || exactTitleMatch(title, names));
  }) as Record<string, unknown> | undefined;
  if (!file || typeof file.name !== "string") return null;
  return {
    url: `https://archive.org/download/${encodeURIComponent(identifier)}/${file.name.split("/").map(encodeURIComponent).join("/")}`,
    name: file.name,
    title: typeof file.title === "string" ? file.title : null,
  };
}

export function createInternetArchiveAdapter(): AudioSourceAdapter {
  return {
    name: "internet-archive",
    version: "2",
    minimumDelayMs: 350,
    async discover(tune) {
      const search = await fetchJson(`https://archive.org/advancedsearch.php?${new URLSearchParams({
        q: `title:"${tune.title.replace(/"/g, "")}" AND mediatype:audio`,
        "fl[]": "identifier,title,creator,licenseurl,rights",
        rows: "10",
        output: "json",
      })}`);
      if (!search.ok) return { status: "failed", reason: search.reason, retryAfterMs: search.retryAfterMs };
      const documents = Array.isArray(search.data?.response?.docs) ? search.data.response.docs : [];
      const names = tuneNames(tune);
      let sawRightsFailure = false;
      let sawGenreFailure = false;
      let sawFileFailure = false;

      for (const item of documents) {
        if (typeof item?.identifier !== "string") continue;
        const searchRights = typeof item.rights === "string" ? item.rights.trim() : "";
        const searchLicense = typeof item.licenseurl === "string" ? item.licenseurl.trim() : "";
        if (!searchRights && !searchLicense) {
          sawRightsFailure = true;
          continue;
        }
        const metadata = await fetchJson(`https://archive.org/metadata/${encodeURIComponent(item.identifier)}`);
        if (!metadata.ok) return { status: "failed", reason: metadata.reason, retryAfterMs: metadata.retryAfterMs };
        const meta = metadata.data?.metadata || {};
        const rights = typeof meta.rights === "string" ? meta.rights.trim() : "";
        const licenseUrl = typeof meta.licenseurl === "string" ? meta.licenseurl.trim() : "";
        const creator = typeof meta.creator === "string"
          ? meta.creator.trim()
          : Array.isArray(meta.creator) && typeof meta.creator[0] === "string"
            ? meta.creator[0].trim()
            : "";
        if ((!rights && !licenseUrl) || !creator) {
          sawRightsFailure = true;
          continue;
        }
        if (disqualifyByGenre(meta)) {
          sawGenreFailure = true;
          continue;
        }
        const file = internetArchiveFile(item.identifier, metadata.data?.files, names);
        if (!file) {
          sawFileFailure = true;
          continue;
        }
        const verification = await verifyPlayableAudio({
          audioUrl: file.url,
          audioSource: "Internet Archive",
          audioAttribution: creator,
        });
        if (!verification.ok) {
          sawFileFailure = true;
          continue;
        }
        const description = typeof meta.description === "string" ? meta.description.replace(/<[^>]*>/g, " ") : "";
        const performer = description.match(/\bperformed by\s+(.+?)(?:[.;]|$)/i)?.[1]?.trim() || null;
        return {
          status: "candidate",
          candidate: {
            audioUrl: file.url,
            audioSource: "Internet Archive",
            audioAttribution: creator,
            sourceFiddler: performer,
            details: {
              collectionIdentifier: item.identifier,
              collectionTitle: typeof meta.title === "string" ? meta.title : null,
              verifiedFileName: file.name,
              verifiedFileTitle: file.title,
              rights: rights || null,
              licenseUrl: licenseUrl || null,
              contentType: verification.contentType,
            },
          },
        };
      }
      return {
        status: documents.length === 0 ? "no-match" : "rejected",
        ...(documents.length === 0
          ? { details: { documents: 0 } }
          : {
              reason: sawRightsFailure
                ? "matching archive items lacked current rights or attribution"
                : sawGenreFailure
                  ? "matching items failed the genre/context guard"
                  : sawFileFailure
                    ? "no exact playable file remained"
                    : "no eligible individual file",
            }),
      } as AdapterOutcome;
    },
  };
}

function slipperyForms(name: string): string[] {
  const words = normalizeTuneTitle(name).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  return Array.from(new Set([
    words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(""),
    words.join("").toLowerCase(),
    words.join("-").toLowerCase(),
    words.join("_").toLowerCase(),
  ]));
}

async function urlExists(url: string): Promise<
  { ok: true; exists: boolean } | { ok: false; reason: string }
> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: UA,
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) return { ok: true, exists: false };
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    return { ok: true, exists: true };
  } catch (error: any) {
    return { ok: false, reason: error?.message || "request failed" };
  }
}

export function createSlipperyHillAdapter(): AudioSourceAdapter {
  return {
    name: "slippery-hill",
    version: "2",
    minimumDelayMs: 100,
    async discover(tune) {
      const forms = Array.from(new Set(tuneNames(tune).flatMap(slipperyForms)));
      for (const form of forms) {
        const url = `${SLIPPERY_HILL_BASE}${encodeURIComponent(form)}.mp3`;
        const existence = await urlExists(url);
        if (!existence.ok) return { status: "failed", reason: existence.reason, retryAfterMs: 15 * 60 * 1000 };
        if (!existence.exists) continue;
        const exact = tuneNames(tune).some((name) =>
          normalizeTuneTitle(name).replace(/[^a-z0-9]/g, "")
            === normalizeTuneTitle(form).replace(/[^a-z0-9]/g, ""));
        if (!exact) continue;
        const verification = await verifyPlayableAudio({
          audioUrl: url,
          audioSource: "Slippery Hill",
          audioAttribution: "slippery-hill.com",
        });
        if (!verification.ok) return { status: "rejected", reason: verification.reason };
        return {
          status: "candidate",
          candidate: {
            audioUrl: url,
            audioSource: "Slippery Hill",
            audioAttribution: "slippery-hill.com",
            details: { filenameEvidence: `${form}.mp3`, contentType: verification.contentType },
          },
        };
      }
      return { status: "no-match", details: { checkedForms: forms.length } };
    },
  };
}

export function createWikimediaCommonsAdapter(): AudioSourceAdapter {
  return {
    name: "wikimedia-commons",
    version: "2",
    minimumDelayMs: 150,
    async discover(tune) {
      const names = tuneNames(tune);
      const titles = names
        .flatMap((name) => COMMONS_AUDIO_EXTENSIONS.map((extension) => `File:${name}.${extension}`))
        .slice(0, 50);
      let pages: Record<string, any>;
      try {
        pages = await fetchCommonsImageInfo(titles);
      } catch (error: any) {
        return { status: "failed", reason: error?.message || "Commons request failed", retryAfterMs: 15 * 60 * 1000 };
      }
      for (const requestedTitle of titles) {
        const page = pages[requestedTitle] || pages[requestedTitle.replace(/_/g, " ")];
        if (!page || page.missing || !page.imageinfo) continue;
        if (!isExactCommonsTitleMatch(page.title, names)) continue;
        const audioUrl = typeof page.imageinfo.url === "string" ? page.imageinfo.url : "";
        if (!isCommonsAudioUrl(audioUrl)) continue;
        const license = commonsLicenseSummary(page.imageinfo.extmetadata);
        const attribution = commonsAttribution(page.imageinfo.extmetadata);
        if (!license.ok || !attribution || disqualifyCommonsCandidate(page.imageinfo.extmetadata)) continue;
        const verification = await verifyPlayableAudio({
          audioUrl,
          audioSource: "Wikimedia Commons",
          audioAttribution: attribution,
        });
        if (!verification.ok) return { status: "rejected", reason: verification.reason };
        return {
          status: "candidate",
          candidate: {
            audioUrl,
            audioSource: "Wikimedia Commons",
            audioAttribution: `${attribution} (${license.license})`,
            details: {
              verifiedPageTitle: page.title,
              license: license.license,
              licenseUrl: license.licenseUrl,
              sourcePageUrl: page.imageinfo.descriptionurl || null,
              contentType: verification.contentType,
            },
          },
        };
      }
      return { status: "no-match", details: { checkedTitles: titles.length } };
    },
  };
}

export function createManifestAdapter(manifestPath: string): AudioSourceAdapter {
  const entries = loadAudioManifest(manifestPath);
  const bySessionId = new Map<string, AudioManifestEntry>(
    entries.map((entry) => [entry.theSessionId, entry]),
  );
  return {
    name: "manifest",
    version: "1",
    minimumDelayMs: 0,
    async discover(tune) {
      if (!tune.the_session_id) return { status: "no-match", details: { reason: "no TheSession ID" } };
      const entry = bySessionId.get(tune.the_session_id);
      if (!entry) return { status: "no-match" };
      if (!hasExactManifestTitleMatch(entry, tuneNames(tune))) {
        return { status: "rejected", reason: "manifest title does not exactly match title or alias" };
      }
      const verification = await verifyPlayableAudio(entry);
      if (!verification.ok) return { status: "rejected", reason: verification.reason };
      return {
        status: "candidate",
        candidate: {
          audioUrl: entry.audioUrl,
          audioSource: entry.audioSource,
          audioAttribution: entry.audioAttribution,
          sourceFiddler: entry.sourceFiddler || null,
          details: {
            manifestPath,
            collection: entry.collection || null,
            notes: entry.notes || null,
            contentType: verification.contentType,
          },
        },
      };
    },
  };
}

export function createAudioSourceAdapter(source: string, manifestPath?: string): AudioSourceAdapter {
  if (source === "library-of-congress") return createLibraryOfCongressAdapter();
  if (source === "internet-archive") return createInternetArchiveAdapter();
  if (source === "slippery-hill") return createSlipperyHillAdapter();
  if (source === "wikimedia-commons") return createWikimediaCommonsAdapter();
  if (source === "manifest" && manifestPath) return createManifestAdapter(manifestPath);
  throw new Error(
    source === "manifest"
      ? "--manifest=PATH is required for the manifest source"
      : `Unknown source ${source}`,
  );
}