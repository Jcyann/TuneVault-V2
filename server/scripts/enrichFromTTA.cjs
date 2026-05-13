/**
 * Plain JS version of TTA enrichment — runs with: node server/scripts/enrichFromTTA.js
 * Faster startup than tsx since no TypeScript compilation needed.
 */

const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TTA_BASE = "https://tunearch.org/wiki/Annotation:";
const DELAY_MISS = 300;
const DELAY_HIT = 700;
const LIMIT = parseInt(process.env.LIMIT || "9999");
const DRY_RUN = process.env.DRY_RUN === "1";

function titleToSlug(title) {
  return title.trim().replace(/\s+/g, "_").replace(/'/g, "%27").replace(/&/g, "%26").replace(/#/g, "%23");
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)),
  ]);
}

function parseTTAAnnotation(html, tuneTitle) {
  if (
    html.includes("There is currently no text in this page") ||
    html.includes("You do not have permission to create this page")
  ) return null;

  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "");

  const lines = text.split("\n").filter(l => {
    const t = l.trim();
    if (!t || t.length < 20) return false;
    if (t.startsWith("[") && t.endsWith("]")) return false;
    if (t.includes("Traditional Tune Archive")) return false;
    if (t.startsWith("Annotation:")) return false;
    if (t.startsWith("Sheet music crediting") || t.startsWith("Sheet Music for")) return false;
    if (t.startsWith("This page was last edited") || t.startsWith("Content is available under")) return false;
    if (t.startsWith("Privacy policy") || t.startsWith("Back to [") || t.startsWith("Find traditional")) return false;
    if (t.startsWith("Hello!") || t.startsWith("New chat") || t.startsWith("💚")) return false;
    if (t.startsWith("Jump to content") || t.startsWith("The TTA Manifesto")) return false;
    if (/^[A-Za-z]:/.test(t)) return false; // ABC header fields (T:, M:, K:, N:, etc.)
    if (/\|/.test(t) && /[A-Ga-gzZ]/.test(t) && t.length < 120) return false; // ABC bars
    return true;
  });

  if (!lines.length) return null;

  const upperTitle = tuneTitle.toUpperCase();
  let startIdx = lines.findIndex(l =>
    l.toUpperCase().startsWith(upperTitle) || l.toUpperCase().includes(upperTitle + ".")
  );
  if (startIdx === -1) startIdx = 0;

  const selected = lines.slice(startIdx, startIdx + 4).join("\n\n").trim();
  if (selected.length < 60) return null;

  let result = selected;
  if (result.length > 1800) {
    const truncated = result.slice(0, 1800);
    const lastPeriod = truncated.lastIndexOf(".");
    result = lastPeriod > 1200 ? truncated.slice(0, lastPeriod + 1) : truncated + "…";
  }

  return result + "\n\nSource: Traditional Tune Archive (tunearch.org), adapted from The Fiddler's Companion by Andrew Kuntz. Used under Creative Commons license.";
}

async function fetchURL(url, title) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await withTimeout(fetch(url, {
      headers: { "User-Agent": "TuneVault/1.0 (tunevault.org; enrichment bot)" },
      signal: controller.signal,
    }), 9000);
    if (!res.ok) { clearTimeout(timer); return null; }
    const html = await withTimeout(res.text(), 7000);
    clearTimeout(timer);
    return parseTTAAnnotation(html, title);
  } catch (e) {
    clearTimeout(timer);
    controller.abort();
    return null;
  }
}

async function fetchTTA(title) {
  const slug = titleToSlug(title);
  const candidates = [
    `${TTA_BASE}${slug}`,
    `${TTA_BASE}${slug}_(1)`,
  ];
  for (const url of candidates) {
    const r = await fetchURL(url, title);
    if (r) return r;
    await new Promise(r => setTimeout(r, 80));
  }
  return null;
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, title FROM tunes WHERE description IS NULL OR description = '' ORDER BY popularity DESC, title ASC LIMIT $1`,
      [LIMIT]
    );
    console.log(`\nTTA Enrichment (JS)\n===================`);
    console.log(`To process: ${rows.length}${DRY_RUN ? " (DRY RUN)" : ""}\n`);

    let hits = 0, misses = 0, saved = 0;

    for (let i = 0; i < rows.length; i++) {
      const { id, title } = rows[i];
      process.stdout.write(`[${i + 1}/${rows.length}] ${title}… `);
      const desc = await fetchTTA(title);
      if (!desc) {
        misses++;
        console.log("✗");
      } else {
        hits++;
        console.log(`✓ (${desc.length}ch)`);
        if (!DRY_RUN) {
          await client.query(`UPDATE tunes SET description = $1 WHERE id = $2`, [desc, id]);
          saved++;
        }
      }
      if (i < rows.length - 1) await new Promise(r => setTimeout(r, desc ? DELAY_HIT : DELAY_MISS));
    }

    console.log(`\nDone! ✓${hits} ✗${misses}${!DRY_RUN ? ` 💾${saved}` : ""} | Hit rate: ${rows.length ? Math.round(hits/rows.length*100) : 0}%`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
