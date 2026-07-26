/**
 * enrichFromTuneArchive.ts
 *
 * Fills in missing descriptions and enriches existing ones using the
 * Traditional Tune Archive (tunearch.org), Andrew Kuntz's encyclopedic
 * index of North American and British Isles fiddle tunes.
 *
 * For each tune the script:
 *   1. Fetches the TTA wiki page by title (tries multiple URL variants)
 *   2. Parses the structured metadata table (region, genre, composer, mode,
 *      first-print book/year, geographic provenance, alternate titles)
 *   3. Fetches the Annotation page for any narrative history text
 *   4. Composes a description from these facts
 *   5a. Tunes with NO description → sets the composed description
 *   5b. Tunes WITH a description → appends only facts not already present
 *       and adds a source citation if missing
 *   6. Also improves region = "Unknown" where TTA has a better value
 *
 * Rules:
 *   - Only facts explicitly stated by TTA are written; nothing is invented.
 *   - Every update includes a source citation: "(Source: Traditional Tune
 *     Archive, tunearch.org)"
 *   - Never overwrites an existing non-empty description entirely; appends only.
 *   - Strict title-match gate: we confirm the page title/aliases match before
 *     using any data from it.
 *
 * Usage:
 *   npx tsx server/scripts/enrichFromTuneArchive.ts --dry-run
 *   npx tsx server/scripts/enrichFromTuneArchive.ts --dry-run --limit=20
 *   npx tsx server/scripts/enrichFromTuneArchive.ts --limit=200
 *   npx tsx server/scripts/enrichFromTuneArchive.ts              # all tunes
 *   npx tsx server/scripts/enrichFromTuneArchive.ts --missing-only  # no-desc only
 *   npx tsx server/scripts/enrichFromTuneArchive.ts --update-only   # has-desc only
 */

import { pool } from "../db";

const DRY_RUN        = process.argv.includes("--dry-run");
const MISSING_ONLY   = process.argv.includes("--missing-only");
const UPDATE_ONLY    = process.argv.includes("--update-only");
const LIMIT_ARG      = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT          = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : Infinity;

const UA      = { "User-Agent": "TuneVault/1.0 (tunevault.org; tune enrichment bot; contact@tunevault.org)" };
const DELAY   = 700; // between successful requests — respectful of TTA
const sleep   = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Normalisation helpers ─────────────────────────────────────────────────────

function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(the|a|an|ye|old|ol')\s+/g, "")
    .replace(/[''`".,!?()\-–—]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build TTA wiki URL candidates for a given tune title. */
function ttaUrlCandidates(title: string): string[] {
  const base = "https://tunearch.org/wiki/";
  const encode = (t: string) =>
    t.split("_").map((w) => encodeURIComponent(w)).join("_");

  const underscore = (t: string) =>
    t.replace(/\s+/g, "_").replace(/'/g, "%27").replace(/'/g, "%27");

  // Keep candidates minimal — each miss costs a full DELAY
  const titleCase = title.replace(/\b(\w)/g, (c) => c.toUpperCase());
  const noThe = title.replace(/^The\s+/i, "");
  const variations = [
    title,          // as-is (covers most exact matches)
    titleCase,      // Title Case (TTA preferred form)
    noThe,          // without leading "The"
    titleCase + "_(1)", // disambiguation suffix TTA uses for duplicates
    noThe + "_(1)",
  ];

  const urls: string[] = [];
  for (const v of variations) {
    urls.push(base + underscore(v));
    urls.push(base + encode(underscore(v)));
  }
  // deduplicate preserving order
  return [...new Set(urls)];
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const text = await res.text();
    // TTA returns its normal HTML on success; Cloudflare challenge pages are tiny
    if (text.length < 2000 && text.includes("challenge")) return null;
    // "no text in this page" = empty wiki page
    if (text.includes("There is currently no text in this page")) return null;
    // If it redirected to Special:Search, the page wasn't found
    if (text.includes("wgCanonicalSpecialPageName\":\"Search\"")) return null;
    return text;
  } catch {
    return null;
  }
}

// ── HTML → metadata table ─────────────────────────────────────────────────────

interface TTAMeta {
  title: string;
  alsoKnownAs: string[];
  composer: string;
  region: string;
  genre: string;
  rhythm: string;
  key: string;
  mode: string;
  history: string;
  structure: string;
  editor: string;
  book: string;
  year: string;
}

function cleanHtmlText(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/Biography:/gi, "")
    .replace(/Book:/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTableField(html: string, fieldName: string): string {
  // Each metadata row: <td ...background:#E6E6FA...><b>FieldName</b>...</td><td...>VALUE...</td>
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<b>\\s*${escaped}\\s*<\\/b>[\\s\\S]*?<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
    "i",
  );
  const m = html.match(re);
  return m ? cleanHtmlText(m[1]) : "";
}

function extractPageTitle(html: string): string {
  // <title>Tune Name – ... – The Traditional Tune Archive</title>
  const m = html.match(/<title>\s*([^–<]+)/);
  return m ? m[1].trim() : "";
}

function extractAnnotationParagraphs(html: string): string {
  // Remove scripts, styles, and ABC notation blocks
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  // Pull paragraphs from the content area
  const paragraphs: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(clean)) !== null) {
    const text = cleanHtmlText(m[1]);
    // Skip navigation, short lines, TTA boilerplate, and ABC notation
    if (
      text.length > 80 &&
      !text.includes("Jump to") &&
      !text.includes("TTA Manifesto") &&
      !text.includes("mw-") &&
      !text.includes("Retrieved from") &&
      !text.match(/^X:\s*\d/) &&           // ABC header
      !text.match(/^T:[A-Za-z]/) &&        // ABC title
      !text.match(/^[A-G][|:][A-GzZ2]/) && // ABC note lines
      !text.match(/^\|[A-Gz:\d]/)          // ABC bar lines
    ) {
      paragraphs.push(text);
    }
  }
  return paragraphs.join("\n\n");
}

async function fetchTTAData(title: string, altTitles: string[]): Promise<{
  meta: TTAMeta;
  annotation: string;
  pageUrl: string;
} | null> {
  const ourNames = new Set([title, ...altTitles].map(normTitle).filter(Boolean));

  for (const url of ttaUrlCandidates(title)) {
    const html = await fetchHtml(url);
    if (!html) { await sleep(200); continue; } // short pause on 404; full pause on hit
    await sleep(DELAY);

    // Confirm this page is actually about our tune (title match gate)
    const pageTitle = extractPageTitle(html);
    if (pageTitle && !ourNames.has(normTitle(pageTitle))) {
      // Page found but it's about a different tune
      continue;
    }

    const alsoKnownAs = extractTableField(html, "Also known as")
      .split(",").map((s) => s.trim()).filter(Boolean);

    const meta: TTAMeta = {
      title:      pageTitle,
      alsoKnownAs,
      composer:   extractTableField(html, "Composer/Core Source"),
      region:     extractTableField(html, "Region"),
      genre:      extractTableField(html, "Genre/Style"),
      rhythm:     extractTableField(html, "Meter/Rhythm"),
      key:        extractTableField(html, "Key/Tonic of"),
      mode:       extractTableField(html, "Mode"),
      history:    extractTableField(html, "History"),
      structure:  extractTableField(html, "Structure"),
      editor:     extractTableField(html, "Editor/Compiler"),
      book:       extractTableField(html, "Book/Manuscript title"),
      year:       extractTableField(html, "Year of publication/Date of MS"),
    };

    // Only proceed if we got at least some meaningful metadata
    const hasData = meta.genre || meta.composer || meta.book || meta.history || meta.rhythm;
    if (!hasData) continue;

    // Fetch annotation page for narrative text
    const annoUrl = url.replace("tunearch.org/wiki/", "tunearch.org/wiki/Annotation:");
    const annoHtml = await fetchHtml(annoUrl);
    if (annoHtml) await sleep(DELAY);
    const annotation = annoHtml ? extractAnnotationParagraphs(annoHtml) : "";

    return { meta, annotation, pageUrl: url };
  }

  return null;
}

// ── Description composer ──────────────────────────────────────────────────────

function composeDescription(tuneTitle: string, meta: TTAMeta, annotation: string): string {
  const parts: string[] = [];

  // Attribution
  if (meta.composer) {
    const comp = meta.composer.replace(/,\s*$/, "");
    parts.push(`${tuneTitle} is attributed to ${comp}.`);
  }

  // Rhythm, genre, key/mode
  const rhythm = meta.rhythm.replace(/\s*\(.*?\)/, "").trim(); // strip "(single/double)"
  const mode = meta.mode && !/ionian/i.test(meta.mode) && !/major/i.test(meta.mode)
    ? meta.mode.replace(/\s*\(.*?\)/, "").trim()
    : "";
  const pieces: string[] = [];
  if (rhythm) pieces.push(rhythm.toLowerCase());
  if (meta.genre) pieces.push(`(${meta.genre})`);

  if (pieces.length) {
    let line = `It is a ${pieces.join(" ")}`;
    if (meta.key) {
      line += ` in the key of ${meta.key}`;
      if (mode) line += ` ${mode}`;
    }
    parts.push(line + ".");
  }

  // Geographic provenance
  if (meta.history && meta.history.length < 300) {
    // Clean up shouting: "USA(APPALACHIAN)" → "USA (Appalachian)"
    const hist = meta.history
      .replace(/([A-Z]+)\(([^)]+)\)/g, (_, country, region) =>
        `${country} (${region.charAt(0).toUpperCase() + region.slice(1).toLowerCase()})`
      )
      .replace(/,\s*/g, ", ");
    parts.push(`Documented in: ${hist}.`);
  }

  // First-print record
  if (meta.book || meta.year) {
    const book = meta.book.trim();
    const year = meta.year.trim();
    const editor = meta.editor.trim();

    let line = "First documented";
    if (editor) line += ` in ${editor}'s`;
    if (book) line += ` *${book}*`;
    if (year) line += ` (${year})`;
    parts.push(line + ".");
  }

  // Narrative annotation text (first 600 chars max)
  if (annotation) {
    const trimmed = annotation.length > 600 ? annotation.slice(0, 597) + "…" : annotation;
    parts.push(trimmed);
  }

  parts.push("\n(Source: Traditional Tune Archive, tunearch.org)");
  return parts.join(" ");
}

/** Returns true if the description already mentions this key fact (rough check). */
function alreadyMentions(desc: string, fact: string): boolean {
  if (!fact) return true;
  const key = fact.slice(0, 30).toLowerCase();
  return desc.toLowerCase().includes(key);
}

/** Build the additions to append to an existing description. */
function buildAdditions(existingDesc: string, tuneTitle: string, meta: TTAMeta, annotation: string): string | null {
  const additions: string[] = [];

  if (meta.composer && !alreadyMentions(existingDesc, meta.composer)) {
    additions.push(`Attributed to ${meta.composer}.`);
  }
  if (meta.history && !alreadyMentions(existingDesc, meta.history.slice(0, 20))) {
    const hist = meta.history
      .replace(/([A-Z]+)\(([^)]+)\)/g, (_: string, c: string, r: string) =>
        `${c} (${r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()})`
      );
    additions.push(`Geographic provenance: ${hist}.`);
  }
  if (meta.book && meta.year && !alreadyMentions(existingDesc, meta.book)) {
    const editor = meta.editor ? `${meta.editor}'s ` : "";
    additions.push(`First documented in ${editor}*${meta.book}* (${meta.year}).`);
  }
  if (annotation && !alreadyMentions(existingDesc, annotation.slice(0, 40))) {
    const trimmed = annotation.length > 500 ? annotation.slice(0, 497) + "…" : annotation;
    additions.push(trimmed);
  }

  const hasSource = /tunearch|Traditional Tune Archive|Source:/i.test(existingDesc);
  if (!hasSource) additions.push("(Source: Traditional Tune Archive, tunearch.org)");

  return additions.length > 0 ? "\n\n" + additions.join(" ") : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();

  console.log(`\nTuneVault × Traditional Tune Archive enrichment`);
  console.log(`dry-run: ${DRY_RUN}  missing-only: ${MISSING_ONLY}  update-only: ${UPDATE_ONLY}  limit: ${LIMIT}\n`);

  // Build query — by default skip tunes already enriched by TTA (fast re-runs)
  const SKIP_SOURCED = !process.argv.includes("--all");
  let whereClause = SKIP_SOURCED
    ? "WHERE (description IS NULL OR TRIM(description) = '' OR description NOT ILIKE '%tunearch.org%')"
    : "";
  if (MISSING_ONLY) whereClause = "WHERE description IS NULL OR TRIM(description) = ''";
  else if (UPDATE_ONLY) whereClause = "WHERE description IS NOT NULL AND TRIM(description) != '' AND description NOT ILIKE '%tunearch.org%'";

  const { rows } = await client.query(
    `SELECT id, title, alternative_titles, description, region
     FROM tunes ${whereClause} ORDER BY popularity DESC, title ASC`,
  );

  const tunes = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);
  console.log(`Processing ${tunes.length} tunes…\n`);

  let descSet = 0, descUpdated = 0, regionFixed = 0, noMatch = 0, skipped = 0;

  for (const t of tunes) {
    const altTitles = (t.alternative_titles || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    process.stdout.write(`[${t.id}] ${t.title} … `);

    const result = await fetchTTAData(t.title, altTitles);

    if (!result) {
      noMatch++;
      console.log("· not in TTA");
      continue;
    }

    const { meta, annotation, pageUrl } = result;
    const updates: string[] = [];
    const params: any[] = [];
    let p = 1;

    const hasDesc = t.description && t.description.trim().length > 0;

    if (!hasDesc) {
      // No description — compose and set
      const newDesc = composeDescription(t.title, meta, annotation);
      updates.push(`description = $${p++}`);
      params.push(newDesc);
      descSet++;
    } else {
      // Has description — append missing facts and/or source citation
      const additions = buildAdditions(t.description, t.title, meta, annotation);
      if (additions) {
        updates.push(`description = description || $${p++}`);
        params.push(additions);
        descUpdated++;
      } else {
        skipped++;
        console.log("· already complete");
        continue;
      }
    }

    // Improve region if currently "Unknown"
    const ttaRegion = mapTTARegion(meta.region, meta.history);
    if (ttaRegion && (!t.region || t.region === "Unknown")) {
      updates.push(`region = $${p++}`);
      params.push(ttaRegion);
      regionFixed++;
    }

    if (DRY_RUN) {
      const preview = params[0] ? String(params[0]).slice(0, 120).replace(/\n/g, " ") : "";
      console.log(`DRY [${hasDesc ? "update" : "new"}] → "${preview}…"`);
    } else {
      params.push(t.id);
      await client.query(
        `UPDATE tunes SET ${updates.join(", ")} WHERE id = $${p}`,
        params,
      );
      console.log(`✓ ${hasDesc ? "updated" : "description set"}${ttaRegion && (!t.region || t.region === "Unknown") ? " +region" : ""}`);
    }
  }

  client.release();
  await pool.end();

  console.log(`
TTA enrichment complete
  Descriptions set    : ${descSet}
  Descriptions updated: ${descUpdated}
  Regions fixed       : ${regionFixed}
  No TTA match        : ${noMatch}
  Already complete    : ${skipped}
  Dry-run mode        : ${DRY_RUN}
`);
}

/** Map TTA region/history text to TuneVault region values. */
function mapTTARegion(ttaRegion: string, history: string): string | null {
  const combined = `${ttaRegion} ${history}`.toLowerCase();
  if (/appalachian|upland south|southern mountain/i.test(combined)) return "Appalachian";
  if (/appalachian|virginia|kentucky|west virginia|tennessee|carolina/i.test(combined)) return "Appalachian";
  if (/midwest|ohio|indiana|illinois|michigan/i.test(combined)) return "Midwest";
  if (/new england|vermont|maine|new hampshire|massachusetts/i.test(combined)) return "New England";
  if (/ozark|missouri|arkansas/i.test(combined)) return "Ozarks";
  if (/texas/i.test(combined)) return "Texas";
  if (/canada|canadian|québec|quebec|maritimes|ontario|nova scotia/i.test(combined)) return "Canadian";
  if (/ireland|irish/i.test(combined)) return "Irish";
  if (/scotland|scottish|scots/i.test(combined)) return "Scottish";
  if (/england|english|british/i.test(combined)) return "British";
  if (/usa|united states|america/i.test(combined)) return "American";
  return null;
}

main().catch((e) => { console.error(e); process.exit(1); });
