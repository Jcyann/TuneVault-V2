import { normalizeTuneTitle } from "./audioManifest";

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

export function hasTrustedPrimaryAudio(audioUrl: string | null, locItemId: string | null): boolean {
  return Boolean(audioUrl || locItemId);
}