/**
 * Shared validation helpers for the Wikimedia Commons audio lane, used by
 * both discoverWikimediaCommonsAudio.ts and applyWikimediaCommonsReview.ts so
 * the two scripts can never silently drift apart on what counts as an exact
 * match or a lawful license.
 */

import { normalizeTuneTitle } from "./audioManifest";

export const COMMONS_AUDIO_EXTENSIONS = ["ogg", "oga", "flac", "wav", "mp3"];
export const COMMONS_UPLOAD_HOST_RE = /^upload\.wikimedia\.org$/i;

export interface CommonsExtMetadata {
  LicenseShortName?: { value?: unknown };
  UsageTerms?: { value?: unknown };
  LicenseUrl?: { value?: unknown };
  Artist?: { value?: unknown };
  Credit?: { value?: unknown };
  Restrictions?: { value?: unknown };
  Categories?: { value?: unknown };
  ImageDescription?: { value?: unknown };
  ObjectName?: { value?: unknown };
}

export interface CommonsImageInfo {
  url?: unknown;
  descriptionurl?: unknown;
  mime?: unknown;
  extmetadata?: CommonsExtMetadata;
}

function plainText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim()
    : "";
}

/** File:Some Title.ogg -> "Some Title" canonical stem, matched against tune title/aliases. */
export function commonsFileStem(pageTitle: string): string {
  return normalizeTuneTitle(
    pageTitle.replace(/^File:/i, "").replace(/\.[A-Za-z0-9]{2,5}$/i, ""),
  );
}

export function isExactCommonsTitleMatch(pageTitle: string, tuneNames: string[]): boolean {
  const stem = commonsFileStem(pageTitle);
  if (!stem) return false;
  return tuneNames.map(normalizeTuneTitle).filter(Boolean).some((name) => name === stem);
}

const DISQUALIFYING_LICENSE_TERMS = /non-?free|fair use|all rights reserved|copyright(?:ed)?\s+only/i;

/**
 * Commons only hosts freely licensed or public-domain media, but individual
 * pages can still declare fair-use or otherwise restricted terms. Require an
 * explicit license/usage-terms string and reject anything that reads as
 * restricted.
 */
export function commonsLicenseSummary(extmetadata: CommonsExtMetadata | undefined):
  | { ok: true; license: string; licenseUrl: string | null }
  | { ok: false; reason: string } {
  const license = plainText(extmetadata?.LicenseShortName?.value) || plainText(extmetadata?.UsageTerms?.value);
  const restrictions = plainText(extmetadata?.Restrictions?.value);
  if (!license) {
    return { ok: false, reason: "no declared license or usage terms" };
  }
  if (DISQUALIFYING_LICENSE_TERMS.test(license) || DISQUALIFYING_LICENSE_TERMS.test(restrictions)) {
    return { ok: false, reason: "license/restrictions read as non-free" };
  }
  const licenseUrl = plainText(extmetadata?.LicenseUrl?.value) || null;
  return { ok: true, license, licenseUrl };
}

export function commonsAttribution(extmetadata: CommonsExtMetadata | undefined): string | null {
  const artist = plainText(extmetadata?.Artist?.value);
  if (artist) return artist;
  const credit = plainText(extmetadata?.Credit?.value);
  return credit || null;
}

// Commons hosts tens of millions of files for every purpose, so an exact
// title/alias string match (e.g. "Dundee", "Canon") can just as easily land
// on a place-name pronunciation clip or a synthesizer test tone as on a real
// tune recording. Require the page's own categories/description to read as
// traditional/folk music, and explicitly reject known non-music content.
const NON_MUSIC_RE =
  /\bpronunciation(?:s)?\b|\bsynthesizer music\b|\bspeech synthesis\b|\bspoken word\b|\btext-to-speech\b|\bsound effects?\b|\bwhite noise\b|\bcomputer-generated\b|\bsine wave\b|\baudio (?:test|sample|demo)\b/i;
const TRADITIONAL_MUSIC_RE =
  /\bfiddle\b|\btraditional music\b|\bfolk music\b|\bceltic\b|\birish traditional\b|\bscottish traditional\b|\bappalachian\b|\bold-?time\b|\bbluegrass\b|\breels?\b|\bjigs?\b|\bhornpipes?\b|\bwaltzes?\b|\bpolkas?\b|\bmarches?\b|\bbreakdowns?\b|\bhoedowns?\b|\bviolin\b|\bbanjo\b|\bmandolin\b|\bconcertina\b|\baccordion\b|\bbagpipes?\b|\bfolk songs?\b/i;

export function disqualifyCommonsCandidate(extmetadata: CommonsExtMetadata | undefined): string | null {
  // ObjectName is typically just the file's own title/stem — the same
  // string the exact title/alias match already selected on. It is not
  // independent evidence, so (mirroring the Internet Archive guard) it may
  // still contribute to a *disqualifying* signal but must never be used to
  // satisfy the positive traditional/folk-music requirement below.
  const context = [
    plainText(extmetadata?.Categories?.value),
    plainText(extmetadata?.ImageDescription?.value),
  ].join(" ").toLowerCase();
  const blob = `${context} ${plainText(extmetadata?.ObjectName?.value).toLowerCase()}`;
  if (NON_MUSIC_RE.test(blob)) {
    return "categories/description indicate non-music content (pronunciation, synthesized test audio, etc.)";
  }
  if (!TRADITIONAL_MUSIC_RE.test(context)) {
    return "no traditional/folk music evidence in Commons categories or description";
  }
  return null;
}

export function isCommonsAudioUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:"
      && COMMONS_UPLOAD_HOST_RE.test(parsed.hostname)
      && new RegExp(`\\.(${COMMONS_AUDIO_EXTENSIONS.join("|")})$`, "i").test(parsed.pathname);
  } catch {
    return false;
  }
}

export async function fetchCommonsImageInfo(pageTitles: string[]): Promise<Record<string, {
  title: string;
  missing: boolean;
  imageinfo: CommonsImageInfo | null;
}>> {
  const result: Record<string, { title: string; missing: boolean; imageinfo: CommonsImageInfo | null }> = {};
  if (pageTitles.length === 0) return result;
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", pageTitles.join("|"));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|extmetadata");
  url.searchParams.set("format", "json");
  const response = await fetch(url, {
    headers: { "User-Agent": "TuneVault/1.0 (audio discovery; review only)" },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) return result;
  const data = await response.json().catch(() => null);
  const pages = data?.query?.pages;
  if (!pages || typeof pages !== "object") return result;
  for (const page of Object.values(pages) as any[]) {
    const title = typeof page?.title === "string" ? page.title : null;
    if (!title) continue;
    const missing = page.missing !== undefined;
    const imageinfo = Array.isArray(page.imageinfo) ? page.imageinfo[0] || null : null;
    result[title] = { title, missing, imageinfo };
  }
  return result;
}
