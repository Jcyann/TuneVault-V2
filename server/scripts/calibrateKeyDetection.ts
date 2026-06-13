/**
 * Calibrates the audio key-detection engine against tunes that ALREADY have a
 * known key + direct audio. Detected key is compared to the stored key, and
 * accuracy is reported overall and across a sweep of confidence thresholds so
 * we can pick a sensible bulk-approve cutoff before touching the bad-key tunes.
 *
 * Run:   npx tsx server/scripts/calibrateKeyDetection.ts
 * Opts:  --limit=N        sample only N tunes (default 150; random sample)
 *        --key=D          restrict to a single stored key (debugging)
 *        --all            analyze every eligible tune (slow)
 */

import { pool } from "../db";
import { detectKeyFromUrl } from "../keyDetectionEngine";

const PLACEHOLDER_KEY = "B";
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = process.argv.includes("--all") ? Infinity : (LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : 150);
const KEY_ARG = process.argv.find((a) => a.startsWith("--key="));
const ONLY_KEY = KEY_ARG ? KEY_ARG.split("=")[1] : null;

/** Strip the minor "m" suffix to compare just the tonic. */
function tonicOf(k: string): string {
  return k.replace(/m$/, "");
}

async function main() {
  const client = await pool.connect();
  try {
    const params: any[] = [PLACEHOLDER_KEY];
    let where = `key <> $1 AND key IS NOT NULL AND audio_url IS NOT NULL`;
    if (ONLY_KEY) { params.push(ONLY_KEY); where += ` AND key = $${params.length}`; }
    const { rows } = await client.query<{ id: number; title: string; key: string; audio_url: string }>(
      `SELECT id, title, key, audio_url FROM tunes WHERE ${where} ORDER BY random()`,
      params,
    );
    const sample = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);

    console.log(`\nKey-Detection Calibration`);
    console.log(`=========================`);
    console.log(`Eligible (known key + audio): ${rows.length}`);
    console.log(`Analyzing                   : ${sample.length}\n`);

    interface Row { stored: string; detected: string; confidence: number; exact: boolean; tonic: boolean; }
    const results: Row[] = [];
    let errors = 0;

    for (let i = 0; i < sample.length; i++) {
      const t = sample[i];
      process.stdout.write(`[${i + 1}/${sample.length}] ${t.title} (stored ${t.key})… `);
      try {
        const det = await detectKeyFromUrl(t.audio_url);
        const exact = det.key === t.key;
        const tonic = tonicOf(det.key) === tonicOf(t.key);
        results.push({ stored: t.key, detected: det.key, confidence: det.confidence, exact, tonic });
        console.log(`${det.key} (${det.confidence.toFixed(2)}) ${exact ? "✓" : tonic ? "~tonic" : "✗"}`);
      } catch (err: any) {
        errors++;
        console.log(`⚠ ${err.message}`);
      }
    }

    const n = results.length;
    const exact = results.filter((r) => r.exact).length;
    const tonic = results.filter((r) => r.tonic).length;

    console.log(`\n=========================`);
    console.log(`Analyzed OK : ${n}  (errors: ${errors})`);
    console.log(`Exact key   : ${exact}/${n}  (${pct(exact, n)}%)`);
    console.log(`Tonic only  : ${tonic}/${n}  (${pct(tonic, n)}%)`);

    console.log(`\nConfidence threshold sweep (exact-key accuracy among kept):`);
    console.log(`  thresh   kept   coverage   accuracy`);
    for (const th of [0.5, 0.55, 0.6, 0.62, 0.65, 0.7, 0.75, 0.8]) {
      const kept = results.filter((r) => r.confidence >= th);
      const acc = kept.filter((r) => r.exact).length;
      console.log(`  ${th.toFixed(2)}    ${String(kept.length).padStart(4)}   ${pct(kept.length, n).padStart(5)}%     ${kept.length ? pct(acc, kept.length).padStart(5) : "  n/a"}%`);
    }

    // Recommend the lowest threshold that reaches >=90% exact accuracy with >=40% coverage.
    let recommended: number | null = null;
    for (const th of [0.5, 0.55, 0.6, 0.62, 0.65, 0.7, 0.75, 0.8]) {
      const kept = results.filter((r) => r.confidence >= th);
      if (!kept.length) continue;
      const acc = kept.filter((r) => r.exact).length / kept.length;
      const cov = kept.length / n;
      if (acc >= 0.9 && cov >= 0.4) { recommended = th; break; }
    }
    console.log(`\nRecommended bulk-approve threshold: ${recommended !== null ? recommended.toFixed(2) : "manual review advised (no threshold hit 90% acc / 40% coverage)"}`);
    console.log(`(Detections below the threshold should be reviewed by hand.)\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

function pct(a: number, b: number): string {
  return b ? Math.round((a / b) * 100).toString() : "0";
}

main().catch((e) => { console.error(e); process.exit(1); });
