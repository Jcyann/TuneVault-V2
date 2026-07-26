/**
 * checkFKeyTunes.ts
 *
 * Cross-references tunes tagged key=F (no ABC) against the Traditional Tune
 * Archive to find their actual key. Prints a mismatch report and optionally
 * applies corrections.
 *
 * Usage:
 *   npx tsx server/scripts/checkFKeyTunes.ts          # report only
 *   npx tsx server/scripts/checkFKeyTunes.ts --fix    # apply corrections
 */

import { pool } from "../db";

const FIX = process.argv.includes("--fix");
const UA  = { "User-Agent": "TuneVault/1.0 (tunevault.org)" };
const DELAY = 600;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function cleanText(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function extractField(html: string, field: string): string {
  const esc = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<b>\\s*${esc}\\s*<\\/b>[\\s\\S]*?<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "i");
  const m = html.match(re);
  return m ? cleanText(m[1]) : "";
}

/** Map TTA key text to a canonical TuneVault key label */
function normaliseKey(ttaKey: string, ttaMode: string): string | null {
  if (!ttaKey) return null;
  // TTA key field examples: "A", "D", "G", "C", "Bb", "F", "E", "B"
  // Mode examples: "Ionian (Major)", "Dorian", "Mixolydian", "Aeolian (Minor)", "Minor"
  const k = ttaKey.trim();
  const m = (ttaMode || "").toLowerCase();
  if (!k) return null;

  if (/minor|aeolian/.test(m)) return `${k}m`;
  if (/dorian/.test(m))        return `${k} Dorian`;
  if (/mixolydian/.test(m))    return `${k} Mixolydian`;
  // default = major
  return k;
}

async function fetchTTAKey(title: string): Promise<{ key: string | null; pageUrl: string | null }> {
  const underscore = (t: string) => t.replace(/\s+/g, "_").replace(/'/g, "%27").replace(/'/g, "%27");
  const titleCase  = title.replace(/\b(\w)/g, c => c.toUpperCase());
  const candidates = [
    `https://tunearch.org/wiki/${underscore(title)}`,
    `https://tunearch.org/wiki/${underscore(titleCase)}`,
    `https://tunearch.org/wiki/${underscore(title.replace(/^The\s+/i, ""))}`,
    `https://tunearch.org/wiki/${underscore(titleCase + "_(1)")}`,
  ];

  for (const url of [...new Set(candidates)]) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
      if (!res.ok) { await sleep(150); continue; }
      const html = await res.text();
      if (html.length < 2000 || html.includes("no text in this page")) { await sleep(150); continue; }
      await sleep(DELAY);

      const ttaKey  = extractField(html, "Key/Tonic of");
      const ttaMode = extractField(html, "Mode");
      const canonical = normaliseKey(ttaKey, ttaMode);
      return { key: canonical, pageUrl: url };
    } catch { await sleep(150); }
  }
  return { key: null, pageUrl: null };
}

async function main() {
  const client = await pool.connect();

  const { rows } = await client.query(`
    SELECT id, title, key, tune_type
    FROM tunes
    WHERE key ILIKE 'F%'
      AND (abc_notation IS NULL OR abc_notation = '')
      AND the_session_id IS NULL
    ORDER BY title ASC
  `);

  console.log(`\nChecking ${rows.length} F-key Lamancusa tunes against TTA…\n`);
  console.log("─".repeat(70));

  const fixes: { id: number; title: string; oldKey: string; newKey: string }[] = [];
  const notFound: string[] = [];

  for (const t of rows) {
    process.stdout.write(`${t.title.padEnd(45)} `);
    const { key: ttaKey, pageUrl } = await fetchTTAKey(t.title);

    if (!ttaKey) {
      console.log("· not in TTA");
      notFound.push(t.title);
      continue;
    }

    if (ttaKey.toLowerCase() === (t.key || "").toLowerCase()) {
      console.log(`✓ confirmed F`);
    } else {
      console.log(`⚠ TTA says ${ttaKey}  ← fix`);
      fixes.push({ id: t.id, title: t.title, oldKey: t.key, newKey: ttaKey });
    }
  }

  console.log("\n" + "─".repeat(70));
  console.log(`\nSummary`);
  console.log(`  Confirmed F   : ${rows.length - fixes.length - notFound.length}`);
  console.log(`  Not in TTA    : ${notFound.length}`);
  console.log(`  Wrong key     : ${fixes.length}`);

  if (fixes.length > 0) {
    console.log("\nMismatches:");
    fixes.forEach(f => console.log(`  [${f.id}] ${f.title} — was "${f.oldKey}", TTA: "${f.newKey}"`));
  }

  if (FIX && fixes.length > 0) {
    console.log("\nApplying corrections…");
    for (const f of fixes) {
      await client.query("UPDATE tunes SET key = $1 WHERE id = $2", [f.newKey, f.id]);
      console.log(`  ✓ [${f.id}] ${f.title} → ${f.newKey}`);
    }
    console.log("Done.");
  }

  client.release();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
