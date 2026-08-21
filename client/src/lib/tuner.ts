export type TunerStatus = "in-tune" | "flat" | "sharp" | "no-target";
export type TunerInstrument = "fiddle" | "banjo" | "guitar";

export interface TuningString {
  id: string;
  label: string;
  note: string;
  midi: number;
}

export interface TuningPreset {
  id: string;
  instrument: TunerInstrument;
  label: string;
  description: string;
  strings: TuningString[];
}

export interface PitchReading {
  frequency: number;
  note: string;
  midi: number;
  cents: number | null;
  status: TunerStatus;
  target: TuningString | null;
}

export const FIDDLE_TUNINGS: TuningPreset[] = [
  {
    id: "standard",
    instrument: "fiddle",
    label: "Standard · GDAE",
    description: "The everyday fiddle tuning",
    strings: [
      { id: "g", label: "G", note: "G", midi: 55 },
      { id: "d", label: "D", note: "D", midi: 62 },
      { id: "a", label: "A", note: "A", midi: 69 },
      { id: "e", label: "E", note: "E", midi: 76 },
    ],
  },
  {
    id: "aeae",
    instrument: "fiddle",
    label: "AEAE",
    description: "Cross-tuned for a bright A sound",
    strings: [
      { id: "a-low", label: "A", note: "A", midi: 57 },
      { id: "e-low", label: "E", note: "E", midi: 64 },
      { id: "a-high", label: "A", note: "A", midi: 69 },
      { id: "e-high", label: "E", note: "E", midi: 76 },
    ],
  },
  {
    id: "adae",
    instrument: "fiddle",
    label: "ADAE",
    description: "A modal cross-tuning",
    strings: [
      { id: "a-low", label: "A", note: "A", midi: 57 },
      { id: "d-low", label: "D", note: "D", midi: 62 },
      { id: "a-high", label: "A", note: "A", midi: 69 },
      { id: "e", label: "E", note: "E", midi: 76 },
    ],
  },
  {
    id: "ddad",
    instrument: "fiddle",
    label: "DDAD",
    description: "A deep D cross-tuning",
    strings: [
      { id: "d-low", label: "D", note: "D", midi: 50 },
      { id: "d-high", label: "D", note: "D", midi: 62 },
      { id: "a", label: "A", note: "A", midi: 69 },
      { id: "d-top", label: "D", note: "D", midi: 74 },
    ],
  },
  {
    id: "gdgd",
    instrument: "fiddle",
    label: "GDGD",
    description: "A driving G cross-tuning",
    strings: [
      { id: "g-low", label: "G", note: "G", midi: 55 },
      { id: "d-low", label: "D", note: "D", midi: 62 },
      { id: "g-high", label: "G", note: "G", midi: 67 },
      { id: "d-high", label: "D", note: "D", midi: 74 },
    ],
  },
  {
    id: "calico",
    instrument: "fiddle",
    label: "Calico · AEAC#",
    description: "The Calico tuning",
    strings: [
      { id: "a-low", label: "A", note: "A", midi: 57 },
      { id: "e", label: "E", note: "E", midi: 64 },
      { id: "a-high", label: "A", note: "A", midi: 69 },
      { id: "c-sharp", label: "C♯", note: "C♯", midi: 73 },
    ],
  },
];

export const BANJO_TUNINGS: TuningPreset[] = [
  {
    id: "banjo-open-g",
    instrument: "banjo",
    label: "Open G · gDGBD",
    description: "The classic five-string banjo tuning",
    strings: [
      { id: "fourth", label: "D", note: "D", midi: 50 },
      { id: "third", label: "G", note: "G", midi: 55 },
      { id: "second", label: "B", note: "B", midi: 59 },
      { id: "first", label: "D", note: "D", midi: 62 },
      { id: "fifth", label: "g", note: "G", midi: 67 },
    ],
  },
  {
    id: "banjo-double-d",
    instrument: "banjo",
    label: "Double D · aDADE",
    description: "A bright old-time D tuning",
    strings: [
      { id: "fourth", label: "D", note: "D", midi: 50 },
      { id: "third", label: "A", note: "A", midi: 57 },
      { id: "second", label: "C", note: "C", midi: 60 },
      { id: "first", label: "D", note: "D", midi: 62 },
      { id: "fifth", label: "a", note: "A", midi: 69 },
    ],
  },
  {
    id: "banjo-open-c",
    instrument: "banjo",
    label: "Open C · gCGCE",
    description: "A full-sounding banjo tuning",
    strings: [
      { id: "fourth", label: "C", note: "C", midi: 48 },
      { id: "third", label: "G", note: "G", midi: 55 },
      { id: "second", label: "C", note: "C", midi: 60 },
      { id: "first", label: "E", note: "E", midi: 64 },
      { id: "fifth", label: "g", note: "G", midi: 67 },
    ],
  },
  {
    id: "banjo-open-d",
    instrument: "banjo",
    label: "Open D · f#DF#AD",
    description: "A bright, ringing banjo tuning",
    strings: [
      { id: "fourth", label: "D", note: "D", midi: 50 },
      { id: "third", label: "F♯", note: "F♯", midi: 54 },
      { id: "second", label: "A", note: "A", midi: 57 },
      { id: "first", label: "D", note: "D", midi: 62 },
      { id: "fifth", label: "f♯", note: "F♯", midi: 66 },
    ],
  },
  {
    id: "banjo-open-a",
    instrument: "banjo",
    label: "Open A · aEAC♯E",
    description: "Open A for playing in the key of A",
    strings: [
      { id: "fourth", label: "E", note: "E", midi: 52 },
      { id: "third", label: "A", note: "A", midi: 57 },
      { id: "second", label: "C♯", note: "C♯", midi: 61 },
      { id: "first", label: "E", note: "E", midi: 64 },
      { id: "fifth", label: "a", note: "A", midi: 69 },
    ],
  },
];

export const GUITAR_TUNINGS: TuningPreset[] = [
  {
    id: "guitar-standard",
    instrument: "guitar",
    label: "Standard · EADGBE",
    description: "The everyday guitar tuning",
    strings: [
      { id: "sixth", label: "E", note: "E", midi: 40 },
      { id: "fifth", label: "A", note: "A", midi: 45 },
      { id: "fourth", label: "D", note: "D", midi: 50 },
      { id: "third", label: "G", note: "G", midi: 55 },
      { id: "second", label: "B", note: "B", midi: 59 },
      { id: "first", label: "E", note: "E", midi: 64 },
    ],
  },
  {
    id: "guitar-dadgad",
    instrument: "guitar",
    label: "DADGAD",
    description: "An open, ringing folk tuning",
    strings: [
      { id: "sixth", label: "D", note: "D", midi: 38 },
      { id: "fifth", label: "A", note: "A", midi: 45 },
      { id: "fourth", label: "D", note: "D", midi: 50 },
      { id: "third", label: "G", note: "G", midi: 55 },
      { id: "second", label: "A", note: "A", midi: 57 },
      { id: "first", label: "D", note: "D", midi: 62 },
    ],
  },
];

export const TUNING_PRESETS = [...FIDDLE_TUNINGS, ...BANJO_TUNINGS, ...GUITAR_TUNINGS];

export const TUNER_INSTRUMENTS: { id: TunerInstrument; label: string }[] = [
  { id: "fiddle", label: "Fiddle" },
  { id: "banjo", label: "Banjo" },
  { id: "guitar", label: "Guitar" },
];

const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export function midiToFrequency(midi: number, referencePitch = 440): number {
  return referencePitch * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToPitch(frequency: number, referencePitch = 440): { note: string; midi: number; cents: number } | null {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;
  const exactMidi = 69 + 12 * Math.log2(frequency / referencePitch);
  const midi = Math.round(exactMidi);
  return {
    note: NOTE_NAMES[((midi % 12) + 12) % 12],
    midi,
    cents: (exactMidi - midi) * 100,
  };
}

function centsFromTarget(frequency: number, targetMidi: number, referencePitch: number): number {
  return 1200 * Math.log2(frequency / midiToFrequency(targetMidi, referencePitch));
}

function findTargetString(
  frequency: number,
  tuning: TuningPreset,
  referencePitch: number,
  targetStringId?: string | null,
): TuningString | null {
  if (targetStringId) {
    return tuning.strings.find((string) => string.id === targetStringId) ?? null;
  }

  let closest: TuningString | null = null;
  let closestDistance = Infinity;
  for (const string of tuning.strings) {
    const distance = Math.abs(centsFromTarget(frequency, string.midi, referencePitch));
    if (distance < closestDistance) {
      closest = string;
      closestDistance = distance;
    }
  }
  return closestDistance <= 85 ? closest : null;
}

export function getPitchReading(
  frequency: number,
  tuning: TuningPreset,
  referencePitch = 440,
  targetStringId?: string | null,
): PitchReading | null {
  const pitch = frequencyToPitch(frequency, referencePitch);
  if (!pitch) return null;

  const target = findTargetString(frequency, tuning, referencePitch, targetStringId);
  if (!target) {
    return { frequency, ...pitch, cents: null, status: "no-target", target: null };
  }

  const cents = centsFromTarget(frequency, target.midi, referencePitch);
  const status: TunerStatus = Math.abs(cents) <= 5 ? "in-tune" : cents < 0 ? "flat" : "sharp";
  return { frequency, ...pitch, cents, status, target };
}

/**
 * Detect a single sustained pitch from a short time-domain microphone buffer.
 * This is intentionally monophonic: it is for one fiddle string, not a tune,
 * chord, or ensemble. YIN-style normalized difference is more stable than the
 * page's old raw autocorrelation for bowed notes and harmonics.
 */
export function detectMonophonicPitch(
  buffer: Float32Array,
  sampleRate: number,
  minFrequency = 70,
  maxFrequency = 1500,
): { frequency: number; confidence: number } | null {
  if (!buffer.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return null;

  let mean = 0;
  for (let i = 0; i < buffer.length; i++) mean += buffer[i];
  mean /= buffer.length;

  let energy = 0;
  for (let i = 0; i < buffer.length; i++) {
    const centered = buffer[i] - mean;
    energy += centered * centered;
  }
  const rms = Math.sqrt(energy / buffer.length);
  if (rms < 0.006) return null;

  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxLag = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(buffer.length / 2));
  if (maxLag <= minLag + 2) return null;

  const difference = new Float32Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    const limit = buffer.length - lag;
    for (let i = 0; i < limit; i++) {
      const delta = (buffer[i] - mean) - (buffer[i + lag] - mean);
      sum += delta * delta;
    }
    difference[lag] = sum / Math.max(1, limit);
  }

  // Cumulative mean normalized difference (CMND). Keep this separate from the
  // raw difference function: comparing a normalized lag with the next raw lag
  // accepts early harmonic troughs, especially for low strings.
  const normalizedDifference = new Float32Array(maxLag + 1);
  let cumulative = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    cumulative += difference[lag];
    normalizedDifference[lag] = cumulative > 0 ? difference[lag] * lag / cumulative : 1;
  }

  let bestLag = -1;
  for (let lag = minLag; lag < maxLag; lag++) {
    if (
      normalizedDifference[lag] < 0.18
      && normalizedDifference[lag] <= normalizedDifference[lag - 1]
      && normalizedDifference[lag] < normalizedDifference[lag + 1]
    ) {
      bestLag = lag;
      break;
    }
  }

  if (bestLag < 0) {
    let bestValue = Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (normalizedDifference[lag] < bestValue) {
        bestLag = lag;
        bestValue = normalizedDifference[lag];
      }
    }
  }

  const bestValue = bestLag >= 0 ? normalizedDifference[bestLag] : Infinity;
  if (bestLag < 0 || !Number.isFinite(bestValue) || bestValue > 0.75) return null;

  let refinedLag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const left = normalizedDifference[bestLag - 1];
    const center = normalizedDifference[bestLag];
    const right = normalizedDifference[bestLag + 1];
    const denominator = left - 2 * center + right;
    if (denominator) refinedLag += 0.5 * (left - right) / denominator;
  }

  const frequency = sampleRate / refinedLag;
  if (!Number.isFinite(frequency) || frequency < minFrequency || frequency > maxFrequency) return null;
  return { frequency, confidence: Math.max(0, Math.min(1, 1 - bestValue)) };
}