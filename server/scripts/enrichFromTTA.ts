/**
 * Fetches historical tune descriptions from the Traditional Tune Archive (tunearch.org)
 * — the successor to Andrew Kuntz's Fiddler's Companion — and writes them to the DB.
 *
 * TTA content is published under Creative Commons. Attribution is appended to each description.
 *
 * Run with:  npx tsx server/scripts/enrichFromTTA.ts
 *
 * Options:
 *   --dry-run          Print what would be saved without writing to DB
 *   --limit=N          Only process N tunes (default: all)
 *   --overwrite        Re-fetch tunes that already have a description
 *   --title="Name"     Only process a single tune by title (for testing)
 */

import { pool } from "../db";

const DRY_RUN = process.argv.includes("--dry-run");
const OVERWRITE = process.argv.includes("--overwrite");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : Infinity;
const TITLE_ARG = process.argv.find((a) => a.startsWith("--title="));
const SINGLE_TITLE = TITLE_ARG ? TITLE_ARG.split("=").slice(1).join("=") : null;

const TTA_BASE = "https://tunearch.org/wiki/Annotation:";
const DELAY_MS = 700; // be respectful to TTA's servers

function titleToTTASlug(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, "_")
    .replace(/'/g, "%27")
    .replace(/&/g, "%26")
    .replace(/#/g, "%23");
}

function parseTTAAnnotation(markdown: string, tuneTitle: string): string | null {
  // If TTA says there's no content, bail early
  if (
    markdown.includes("There is currently no text in this page") ||
    markdown.includes("You do not have permission to create this page")
  ) {
    return null;
  }

  // Remove ABC notation blocks (between ``` fences)
  let text = markdown.replace(/```[\s\S]*?```/g, "");

  // Remove navigation lines
  text = text
    .split("\n")
    .filter((line) => {
      const l = line.trim();
      if (!l) return false;
      if (l.startsWith("[Jump to content]")) return false;
      if (l.startsWith("[The TTA Manifesto]")) return false;
      if (l.startsWith("Back to [")) return false;
      if (l.startsWith("Find traditional instrumental music")) return false;
      if (l.startsWith("Sheet Music for")) return false;
      if (l.startsWith("Hello! Ask me anything")) return false;
      if (l.startsWith("New chat")) return false;
      if (l.startsWith("💚")) return false;
      if (l.startsWith("![")) return false;
      if (l.startsWith("|")) return false; // table rows (ABC header)
      if (l.startsWith("* * *")) return false;
      if (l.startsWith("Retrieved from")) return false;
      if (l.startsWith("Source:") || l.startsWith("Notes:") || l.startsWith("Transcription:")) return false;
      // Skip lines that look like ABC notation (header fields like X:, T:, M:, K:, N:, etc.)
      if (/^[A-Za-z]:/.test(l)) return false;
      // Skip lines with tune notation bars
      if (/\|/.test(l) && /[A-Ga-gzZ]/.test(l) && l.length < 120) return false;
      return true;
    })
    .join("\n");

  // Remove markdown link syntax but keep text: [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove remaining markdown links: [text] → text
  text = text.replace(/\[([^\]]+)\]/g, "$1");

  // Remove bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");

  // Remove lines that look like page titles (contain "Annotation:" or "- The Traditional Tune Archive")
  text = text
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      if (t.includes("Traditional Tune Archive")) return false;
      if (t.startsWith("Annotation:")) return false;
      if (t.startsWith("Sheet music crediting")) return false;
      if (t.startsWith("Sheet Music for")) return false;
      if (t.startsWith("This page was last edited")) return false;
      if (t.startsWith("Content is available under")) return false;
      if (t.startsWith("Privacy policy")) return false;
      return true;
    })
    .join("\n");

  // Collapse whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // Find the main annotation paragraph(s) — TTA annotations typically start with
  // the tune name in caps, e.g. "CRIPPLE CREEK. AKA – ..."
  // Look for the first paragraph that contains meaningful content
  const upperTitle = tuneTitle.toUpperCase();
  const lines = text.split("\n").filter((l) => l.trim().length > 40);

  if (lines.length === 0) return null;

  // Prefer paragraphs that start with or reference the tune title
  let startIdx = lines.findIndex(
    (l) => l.toUpperCase().startsWith(upperTitle) || l.toUpperCase().includes(upperTitle + ".")
  );
  if (startIdx === -1) startIdx = 0;

  // Join up to ~3 paragraphs (keep it focused but rich)
  const selected = lines.slice(startIdx, startIdx + 4).join("\n\n").trim();

  if (selected.length < 60) return null;

  // Cap at ~1800 characters cleanly at a sentence boundary
  let result = selected;
  if (result.length > 1800) {
    const truncated = result.slice(0, 1800);
    const lastPeriod = truncated.lastIndexOf(".");
    result = lastPeriod > 1200 ? truncated.slice(0, lastPeriod + 1) : truncated + "…";
  }

  return result + "\n\nSource: Traditional Tune Archive (tunearch.org), adapted from The Fiddler's Companion by Andrew Kuntz. Used under Creative Commons license.";
}

async function fetchURL(url: string, title: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TuneVault/1.0 (tunevault.org; tune enrichment bot)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Convert HTML to plain text
    const plain = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&ndash;/g, "–")
      .replace(/&mdash;/g, "—")
      .replace(/&nbsp;/g, " ")
      .replace(/&#\d+;/g, "");

    return parseTTAAnnotation(plain, title);
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      console.warn(`  ⏱  Timeout fetching: ${url}`);
    } else {
      console.warn(`  ⚠  Error fetching ${url}: ${err.message}`);
    }
    return null;
  }
}

async function fetchTTAAnnotation(title: string): Promise<string | null> {
  const slug = titleToTTASlug(title);

  // Try candidates in order:
  // 1. Exact title          e.g. Annotation:Cripple_Creek
  // 2. Numbered (1) variant e.g. Annotation:Soldier%27s_Joy_(1)
  // 3. "The" prefix         e.g. Annotation:The_Arkansas_Traveler
  // 4. Strip "The " prefix  e.g. Annotation:Arkansas_Traveler
  const candidates: string[] = [
    `${TTA_BASE}${slug}`,
    `${TTA_BASE}${slug}_(1)`,
  ];
  if (title.toLowerCase().startsWith("the ")) {
    // already has "The" — also try without it
    candidates.push(`${TTA_BASE}${titleToTTASlug(title.replace(/^the\s+/i, ""))}`);
    candidates.push(`${TTA_BASE}${titleToTTASlug(title.replace(/^the\s+/i, ""))}_(1)`);
  } else {
    // try with "The" prefix
    candidates.push(`${TTA_BASE}${titleToTTASlug("The " + title)}`);
    candidates.push(`${TTA_BASE}${titleToTTASlug("The " + title)}_(1)`);
  }

  for (const url of candidates) {
    const result = await fetchURL(url, title);
    if (result) return result;
    // Small pause between candidate attempts to stay polite
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

async function main() {
  const client = await pool.connect();
  try {
    let query: string;
    let params: any[];

    if (SINGLE_TITLE) {
      query = `SELECT id, title FROM tunes WHERE LOWER(title) = LOWER($1)`;
      params = [SINGLE_TITLE];
    } else if (OVERWRITE) {
      query = `SELECT id, title FROM tunes ORDER BY popularity DESC, title ASC`;
      params = [];
    } else {
      query = `SELECT id, title FROM tunes WHERE description IS NULL OR description = '' ORDER BY popularity DESC, title ASC`;
      params = [];
    }

    const { rows } = await client.query<{ id: number; title: string }>(query, params);
    const tunes = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);

    console.log(`\nTTA Enrichment Script`);
    console.log(`=====================`);
    console.log(`Tunes to process : ${tunes.length}`);
    console.log(`Dry run          : ${DRY_RUN}`);
    console.log(`Overwrite        : ${OVERWRITE}`);
    console.log(`\nStarting…\n`);

    let hits = 0;
    let misses = 0;
    let errors = 0;
    let saved = 0;

    for (let i = 0; i < tunes.length; i++) {
      const { id, title } = tunes[i];
      const progress = `[${i + 1}/${tunes.length}]`;

      process.stdout.write(`${progress} ${title}… `);

      const description = await fetchTTAAnnotation(title);

      if (!description) {
        misses++;
        console.log("✗ (no match)");
      } else {
        hits++;
        console.log(`✓ (${description.length} chars)`);
        if (!DRY_RUN) {
          await client.query(`UPDATE tunes SET description = $1 WHERE id = $2`, [description, id]);
          saved++;
        } else {
          console.log(`\n--- PREVIEW ---\n${description.slice(0, 300)}\n---\n`);
        }
      }

      // Rate-limit to be respectful
      if (i < tunes.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    console.log(`\n=============================`);
    console.log(`Done!`);
    console.log(`  ✓ Found on TTA   : ${hits}`);
    console.log(`  ✗ No TTA match   : ${misses}`);
    console.log(`  ⚠ Errors         : ${errors}`);
    if (!DRY_RUN) {
      console.log(`  💾 Saved to DB    : ${saved}`);
    } else {
      console.log(`  (dry-run: nothing written)`);
    }
    console.log(`\nHit rate: ${tunes.length > 0 ? Math.round((hits / tunes.length) * 100) : 0}%`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
