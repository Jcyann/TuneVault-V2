/**
 * Server-side wrapper around the shared key-detection engine.
 *
 * Decoding: MP3/audio URLs (oldtimefiddletunes.net, Internet Archive, the LOC
 * proxy) are decoded to mono float PCM with ffmpeg, which is already available
 * in the Nix environment. essentia.js (WASM) then runs KeyExtractor.
 */

import { execFile } from "child_process";
import { extractKey, type KeyDetectionResult } from "@shared/keyDetection";

/** Sample rate we decode everything to; matches KeyExtractor's analysis defaults. */
export const ANALYSIS_SAMPLE_RATE = 44100;

let essentiaPromise: Promise<any> | null = null;

async function getEssentia(): Promise<any> {
  if (!essentiaPromise) {
    essentiaPromise = (async () => {
      const mod: any = await import("essentia.js");
      const wasm = mod.EssentiaWASM?.EssentiaWASM ?? mod.EssentiaWASM;
      return new mod.Essentia(wasm);
    })();
  }
  return essentiaPromise;
}

/**
 * Decode an audio URL (or local path) to mono Float32 PCM via ffmpeg.
 * @param maxSeconds optionally cap the decoded duration (key is stable over a
 *   tune, so analyzing the first ~90s is plenty and keeps memory bounded).
 */
export function decodeAudioToPcm(
  input: string,
  maxSeconds = 0,
): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const args = ["-v", "error"];
    if (maxSeconds > 0) args.push("-t", String(maxSeconds));
    args.push(
      "-i", input,
      "-ac", "1",
      "-ar", String(ANALYSIS_SAMPLE_RATE),
      "-f", "f32le",
      "-acodec", "pcm_f32le",
      "pipe:1",
    );
    execFile(
      "ffmpeg",
      args,
      { maxBuffer: 1024 * 1024 * 400, encoding: "buffer", timeout: 60_000 },
      (err, stdout) => {
        if (err) return reject(err);
        const buf = stdout as Buffer;
        if (!buf || buf.length < 4) return reject(new Error("ffmpeg produced no audio"));
        const f32 = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
        // Copy out of the shared Buffer so it survives GC of `buf`.
        resolve(new Float32Array(f32));
      },
    );
  });
}

/**
 * Run KeyExtractor on already-decoded PCM. The essentia WASM instance is a
 * single shared heap and is NOT reentrant, so concurrent calls are serialized
 * through a promise chain. This lets callers decode many files in parallel
 * (the slow, download-bound step) while analysis stays safe and sequential.
 */
let analyzeChain: Promise<unknown> = Promise.resolve();
export function analyzePcm(samples: Float32Array): Promise<KeyDetectionResult> {
  const run = analyzeChain.then(async () => {
    if (samples.length < ANALYSIS_SAMPLE_RATE * 2) {
      throw new Error("audio too short to analyze");
    }
    const essentia = await getEssentia();
    return extractKey(essentia, samples, ANALYSIS_SAMPLE_RATE);
  });
  // Keep the chain alive regardless of individual success/failure.
  analyzeChain = run.catch(() => undefined);
  return run;
}

/** Decode an audio URL/path and detect its key. */
export async function detectKeyFromUrl(
  url: string,
  maxSeconds = 90,
): Promise<KeyDetectionResult> {
  const samples = await decodeAudioToPcm(url, maxSeconds);
  return analyzePcm(samples);
}
