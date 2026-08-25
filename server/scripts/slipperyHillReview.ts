import { normalizeTuneTitle } from "./audioManifest";

function canonicalPageText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&#0*39;|&#x27;|&apos;/gi, "'")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasExactSlipperyHillFilenameEvidence(
  audioUrl: string,
  tuneNames: string[],
  filenameEvidence: string,
): boolean {
  try {
    const filename = decodeURIComponent(new URL(audioUrl).pathname.split("/").pop() || "");
    if (!filename || filename !== filenameEvidence || !/\.mp3$/i.test(filename)) return false;
    const compactFilename = normalizeTuneTitle(filename.replace(/\.mp3$/i, "")).replace(/[^a-z0-9]/g, "");
    return tuneNames
      .map(normalizeTuneTitle)
      .filter(Boolean)
      .some((name) => compactFilename === name.replace(/[^a-z0-9]/g, ""));
  } catch {
    return false;
  }
}

export function hasExactSlipperyHillPageEvidence(
  sourcePageUrl: string,
  sourcePageTitle: string,
  tuneNames: string[],
): boolean {
  try {
    const url = new URL(sourcePageUrl);
    if (url.protocol !== "https:" || url.hostname !== "www.slippery-hill.com") return false;
    const segment = url.pathname.split("/").filter(Boolean);
    if (segment.length !== 2 || segment[0] !== "content") return false;
    const slug = segment[1].replace(/-\d+$/, "");
    const normalizedNames = tuneNames.map(canonicalPageText).filter(Boolean);
    const titleMatch = normalizedNames.includes(canonicalPageText(sourcePageTitle));
    const normalizedSlug = canonicalPageText(slug.replace(/-/g, " "));
    const withoutStopWords = (value: string) =>
      value.split(" ").filter((word) => !["a", "an", "the", "of", "on", "in", "at", "to", "for", "from", "by", "with"].includes(word)).join(" ");
    const slugMatch = normalizedNames.some((name) =>
      normalizedSlug === name || withoutStopWords(normalizedSlug) === withoutStopWords(name),
    );
    return titleMatch && slugMatch;
  } catch {
    return false;
  }
}

export async function verifySlipperyHillPageEvidence(
  sourcePageUrl: string,
  sourcePageTitle: string,
  audioUrl: string,
  tuneNames: string[],
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!hasExactSlipperyHillPageEvidence(sourcePageUrl, sourcePageTitle, tuneNames)) {
    return { ok: false, reason: "reviewed source page does not match the tune title/alias" };
  }
  try {
    const response = await fetch(sourcePageUrl, {
      headers: { "User-Agent": "TuneVault/1.0 (audio page verification)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { ok: false, reason: `source page returned HTTP ${response.status}` };
    const html = await response.text();
    const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&(?:amp|#38);/gi, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (!heading || canonicalPageText(heading) !== canonicalPageText(sourcePageTitle)) {
      return { ok: false, reason: "source page heading does not match the reviewed title" };
    }
    const audioPath = new URL(audioUrl).pathname;
    if (!html.includes(audioUrl) && !html.includes(audioPath)) {
      return { ok: false, reason: "source page does not link the reviewed audio file" };
    }
    return { ok: true };
  } catch (error: any) {
    return { ok: false, reason: error?.message || "could not verify source page" };
  }
}

export function hasTrustedPrimaryAudio(audioUrl: string | null, locItemId: string | null): boolean {
  return Boolean(audioUrl || locItemId);
}