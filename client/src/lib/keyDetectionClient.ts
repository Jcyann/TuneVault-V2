/**
 * Browser-side key detection. essentia.js' WASM (~2MB) is loaded from a CDN at
 * runtime rather than bundled by Vite. Audio (mic recording or uploaded file)
 * is decoded to mono PCM with the Web Audio API, then the shared extractKey()
 * runs essentia's KeyExtractor — the exact same logic the server uses.
 */

import { extractKey, type KeyDetectionResult } from "@shared/keyDetection";

const WASM_URL = "https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.web.js";
const CORE_URL = "https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-core.js";

let scriptPromise: Promise<void> | null = null;
let essentiaPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

/** Load the essentia CDN scripts (once) and instantiate the Essentia engine. */
export async function getEssentia(): Promise<any> {
  if (!essentiaPromise) {
    essentiaPromise = (async () => {
      if (!scriptPromise) {
        scriptPromise = (async () => {
          await loadScript(WASM_URL);
          await loadScript(CORE_URL);
        })();
      }
      await scriptPromise;
      const w = window as any;
      if (!w.EssentiaWASM || !w.Essentia) {
        throw new Error("essentia.js failed to load from CDN");
      }
      // EssentiaWASM is an Emscripten module factory returning a promise.
      const wasmModule = typeof w.EssentiaWASM === "function" ? await w.EssentiaWASM() : w.EssentiaWASM;
      return new w.Essentia(wasmModule);
    })();
  }
  return essentiaPromise;
}

/** Decode an audio Blob/ArrayBuffer to mono Float32 samples + its sample rate. */
export async function decodeBlobToPcm(data: ArrayBuffer): Promise<{ samples: Float32Array; sampleRate: number }> {
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const buffer: AudioBuffer = await ctx.decodeAudioData(data.slice(0));
    const sampleRate = buffer.sampleRate;
    if (buffer.numberOfChannels === 1) {
      return { samples: buffer.getChannelData(0).slice(), sampleRate };
    }
    // Downmix to mono by averaging channels.
    const len = buffer.length;
    const mono = new Float32Array(len);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < len; i++) mono[i] += data[i];
    }
    for (let i = 0; i < len; i++) mono[i] /= buffer.numberOfChannels;
    return { samples: mono, sampleRate };
  } finally {
    ctx.close();
  }
}

/** Full pipeline: load engine, decode audio, detect key. */
export async function detectKeyFromBlob(data: ArrayBuffer): Promise<KeyDetectionResult> {
  const [essentia, { samples, sampleRate }] = await Promise.all([
    getEssentia(),
    decodeBlobToPcm(data),
  ]);
  if (samples.length < sampleRate * 2) {
    throw new Error("Audio is too short — record or upload at least a couple of seconds.");
  }
  return extractKey(essentia, samples, sampleRate);
}
