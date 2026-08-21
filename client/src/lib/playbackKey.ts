const NOTE_NAMES = ["A", "A#/Bb", "B", "C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab"];

export type PlaybackKeySource = "recording" | "tune";

export interface PlaybackKeyDetails {
  label: "Playback key" | "Recording key" | "Tune key";
  sourceKey: string;
  display: string;
  catalogKey: string | null;
}

function normalizeRoot(root: string): string {
  return root.replace("♭", "b").replace("♯", "#");
}

function transposeRoot(root: string, semitones: number): string | null {
  const normalizedRoot = normalizeRoot(root);
  const index = NOTE_NAMES.findIndex(
    (name) => name === normalizedRoot || name.split("/").includes(normalizedRoot),
  );

  if (index === -1) return null;

  const nextIndex = ((index + semitones) % 12 + 12) % 12;
  return NOTE_NAMES[nextIndex].split("/")[0];
}

export function transposeKey(key: string, semitones: number): string | null {
  if (!semitones) return key;

  const match = key.trim().match(/^([A-G](?:#|b|♭|♯)?)(m)?(?:\s+(Dorian|Mixolydian|Modal))?$/i);
  if (!match) return null;

  const [, root, minorSuffix = "", mode = ""] = match;
  const transposedRoot = transposeRoot(root, semitones);
  if (!transposedRoot) return null;

  return `${transposedRoot}${minorSuffix}${mode ? ` ${mode}` : ""}`;
}

export function getPlaybackKeyDetails({
  sourceKey,
  catalogKey,
  source,
  semitones,
}: {
  sourceKey?: string | null;
  catalogKey?: string | null;
  source?: PlaybackKeySource;
  semitones: number;
}): PlaybackKeyDetails {
  const normalizedSourceKey = sourceKey?.trim() || "—";
  const normalizedCatalogKey = catalogKey?.trim() || null;
  const transposedKey = normalizedSourceKey === "—" ? null : transposeKey(normalizedSourceKey, semitones);
  const isPitchShifted = semitones !== 0;

  let display = normalizedSourceKey;
  if (isPitchShifted) {
    const sign = semitones > 0 ? "+" : "";
    display = transposedKey
      ? `${normalizedSourceKey} → ${transposedKey} (${sign}${semitones})`
      : `${normalizedSourceKey} (${sign}${semitones} semitones)`;
  }

  return {
    label: isPitchShifted ? "Playback key" : source === "recording" ? "Recording key" : "Tune key",
    sourceKey: normalizedSourceKey,
    display,
    catalogKey: normalizedCatalogKey && normalizedCatalogKey !== normalizedSourceKey ? normalizedCatalogKey : null,
  };
}