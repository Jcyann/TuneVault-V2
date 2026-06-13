/**
 * Shared key-detection logic used by both the server (Node batch) and the
 * browser ("Identify the Key" page). The heavy lifting is done by essentia.js'
 * KeyExtractor algorithm; this module owns the environment-agnostic pieces:
 *   - running the extractor against decoded audio samples
 *   - mapping essentia's (tonic + scale) output to TuneVault's simple key format
 *   - the confidence threshold used to auto-trust a detection
 *
 * essentia must be instantiated per environment (it carries a WASM module), so
 * callers pass their own `essentia` instance into `extractKey`.
 */

/** Confidence (KeyExtractor "strength") at/above which a detection is *labeled*
 *  high-confidence in the review UI. NOTE: calibration over the known-key set
 *  shows strength does NOT reliably predict correctness for solo fiddle (open-
 *  string drones cause dominant/fifth confusion), so this is an advisory label
 *  only — every detection still requires human approval before it is written. */
export const KEY_CONFIDENCE_THRESHOLD = 0.8;

/** essentia KeyExtractor pitch-profile. "temperley" scored best on the known-key
 *  calibration set for this acoustic fiddle repertoire (vs. the default "bgate",
 *  which targets electronic music). Still only ~46% exact / ~58% tonic — the
 *  engine assists human review, it does not replace it. */
export const DEFAULT_KEY_PROFILE = "temperley";

export interface KeyDetectionResult {
  /** TuneVault key format, e.g. "D", "A", "Am", "Bb". */
  key: string;
  /** Raw tonic from essentia, e.g. "C", "F#". */
  tonic: string;
  /** "major" | "minor". */
  scale: string;
  /** 0..1 strength reported by KeyExtractor. */
  confidence: number;
}

/**
 * Map essentia's accidental spelling to the spelling old-time fiddlers use.
 * Fiddle repertoire favors flats for Bb/Eb/Ab and sharps for C#/F#.
 */
const ACCIDENTAL_MAP: Record<string, string> = {
  "A#": "Bb",
  "D#": "Eb",
  "G#": "Ab",
  "C#": "C#",
  "F#": "F#",
};

/**
 * Convert essentia (tonic, scale) into TuneVault's key format.
 * Major keys are the bare tonic ("D"); minor keys get an "m" suffix ("Am").
 */
export function toTuneVaultKey(tonic: string, scale: string): string {
  const t = ACCIDENTAL_MAP[tonic] ?? tonic;
  return scale.toLowerCase() === "minor" ? `${t}m` : t;
}

/**
 * Run essentia's KeyExtractor against decoded mono audio samples.
 * @param essentia an instantiated essentia.js `Essentia` object
 * @param samples mono PCM float samples in [-1, 1]
 * @param sampleRate sample rate of `samples` in Hz
 */
export function extractKey(
  essentia: any,
  samples: Float32Array,
  sampleRate: number,
  profileType: string = DEFAULT_KEY_PROFILE,
): KeyDetectionResult {
  const vector = essentia.arrayToVector(samples);
  try {
    // Defaults mirror essentia's recommended KeyExtractor settings; we only
    // override sampleRate so analysis matches the decoded audio.
    const r = essentia.KeyExtractor(
      vector,
      true,    // averageDetuningCorrection
      4096,    // frameSize
      4096,    // hopSize
      12,      // hpcpSize
      3500,    // maxFrequency
      60,      // maximumSpectralPeaks
      25,      // minFrequency
      0.2,     // pcpThreshold
      profileType,
      sampleRate,
      0.0001,  // spectralPeaksThreshold
      440,     // tuningFrequency
      "cosine",// weightType
      "hann",  // windowType
    );
    const tonic = String(r.key);
    const scale = String(r.scale);
    return {
      key: toTuneVaultKey(tonic, scale),
      tonic,
      scale,
      confidence: Number(r.strength),
    };
  } finally {
    if (typeof vector.delete === "function") vector.delete();
  }
}
