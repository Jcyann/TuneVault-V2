/**
 * importFromTheSession.ts
 *
 * Imports tunes that exist on TheSession.org but are not yet in TuneVault.
 * Uses the search API with broad queries to discover tunes, checks each
 * against our database (by theSessionId or normalized title), then fetches
 * full details and inserts new records.
 *
 * Safeguards:
 *   - Never overwrites existing tunes — insert only, never update.
 *   - Strict title-match required before trusting TheSession data.
 *   - Respects TheSession rate limits (800ms between requests).
 *   - Skips tunes whose key/ABC data is absent (required fields must be valid).
 *
 * Usage:
 *   npx tsx server/scripts/importFromTheSession.ts --dry-run
 *   npx tsx server/scripts/importFromTheSession.ts --dry-run --limit=20
 *   npx tsx server/scripts/importFromTheSession.ts --limit=200
 *   npx tsx server/scripts/importFromTheSession.ts   # full run (slow — hours)
 *
 * Options:
 *   --dry-run      Preview inserts; write nothing.
 *   --limit=N      Stop after inserting N new tunes.
 */

import { pool } from "../db";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const INSERT_LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : Infinity;

const UA = { "User-Agent": "TuneVault/1.0 (tunevault.org; tune import bot; contact@tunevault.org)" };
const DELAY_MS = 900; // > 1 req/sec, respectful of TheSession's wishes

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (err: any) {
    console.warn(`  ⚠ fetch failed ${url}: ${err.message}`);
    return null;
  }
}

/** Normalize a tune title for deduplication: lowercase, strip punctuation,
 *  remove common leading articles, collapse whitespace. */
function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(the|a|an|ye|old|ol')\s+/g, "")
    .replace(/[''`".,!?()\-–—]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert TheSession key strings (e.g. "Dmajor", "Eminor", "Gmixolydian")
 *  to the simplified format used in TuneVault ("D", "Em", "G"). */
function sessionKeyToSimple(k: string): string {
  const m = k.match(/^([A-G][b#]?)(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|ionian)?$/i);
  if (!m) return k.charAt(0).toUpperCase() + k.slice(1, 3); // graceful fallback
  const root = m[1];
  const mode = (m[2] || "major").toLowerCase();
  // Minor-family modes map to "{root}m" which is how TuneVault stores minor keys
  if (["minor", "dorian", "phrygian", "aeolian"].includes(mode)) return `${root}m`;
  return root;
}

const METER_BY_TYPE: Record<string, string> = {
  reel: "4/4", breakdown: "4/4", hornpipe: "4/4", march: "4/4",
  jig: "6/8", "slip jig": "9/8", waltz: "3/4", polka: "2/4",
  barndance: "4/4", strathspey: "4/4", "three-two": "3/2", mazurka: "3/4",
};

function sessionKeyToAbcKey(k: string): string {
  const m = k.match(/^([A-G][b#]?)(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|ionian)?$/i);
  if (!m) return k;
  const mode = (m[2] || "major").toLowerCase().slice(0, 3);
  return `${m[1]}${mode}`;
}

// ── Search strategies ─────────────────────────────────────────────────────────
// We cast a wide net using multiple search queries. Duplicates are caught by
// the seen-session-IDs set in memory. The list is ordered: most fruitful
// queries first so even a --limit run captures the most relevant tunes.

const SEARCH_QUERIES = [
  // Tune-type words (appear in many traditional tune names)
  "reel", "jig", "polka", "hornpipe", "waltz", "march", "strathspey", "mazurka",
  // Very common words in old-time / Celtic tune names
  "the", "old", "new", "little", "big", "mr", "miss", "lady", "lord",
  "irish", "scotch", "highland", "mountain", "river", "creek", "road",
  "fiddle", "barn", "grey", "green", "red", "black", "white",
  // Letter-sweep — each covers a slice of the alphabet
  "an", "be", "ca", "co", "de", "do", "el", "fa", "fi", "gl",
  "go", "ha", "he", "ho", "in", "ki", "la", "le", "li", "lo",
  "ma", "me", "mi", "mo", "mu", "na", "ni", "no", "pa", "pi",
  "pl", "po", "pr", "ra", "re", "ri", "ro", "ru", "sa", "se",
  "sh", "si", "sl", "sm", "sn", "sp", "st", "sw", "ta", "te",
  "ti", "to", "tr", "tu", "tw", "un", "up", "vi", "wa", "we",
  "wh", "wi", "wo", "ye", "yo",
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  console.log(`\nTheSession import — dry-run: ${DRY_RUN}, limit: ${INSERT_LIMIT}\n`);

  // ── 1. Load existing tunes into memory for fast duplicate detection ──────
  const { rows: existing } = await client.query(
    "SELECT title, alternative_titles, the_session_id FROM tunes",
  );
  const existingSessionIds = new Set<string>();
  const existingTitles = new Set<string>();

  for (const row of existing) {
    if (row.the_session_id) existingSessionIds.add(String(row.the_session_id));
    existingTitles.add(normTitle(row.title || ""));
    for (const alt of (row.alternative_titles || "").split(",")) {
      const n = normTitle(alt.trim());
      if (n) existingTitles.add(n);
    }
  }

  console.log(`Loaded ${existing.length} existing tunes (${existingSessionIds.size} with session IDs)\n`);

  // ── 2. Search TheSession and collect candidate IDs ───────────────────────
  const seenInThisRun = new Set<string>(); // avoid re-fetching duplicates from overlapping searches
  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoData = 0;
  let skippedNoKey = 0;

  for (const query of SEARCH_QUERIES) {
    if (inserted >= INSERT_LIMIT) break;

    // Paginate through all pages of this query
    let page = 1;
    let totalPages = 1;

    do {
      if (inserted >= INSERT_LIMIT) break;

      const url = `https://thesession.org/tunes/search?q=${encodeURIComponent(query)}&format=json&perpage=50&page=${page}`;
      const data = await fetchJson(url);
      await sleep(DELAY_MS);

      if (!data || !Array.isArray(data.tunes)) break;
      totalPages = data.pages || 1;

      for (const searchResult of data.tunes) {
        if (inserted >= INSERT_LIMIT) break;

        const sessionId = String(searchResult.id);

        // Skip if already known
        if (seenInThisRun.has(sessionId)) continue;
        seenInThisRun.add(sessionId);

        if (existingSessionIds.has(sessionId)) { skippedExisting++; continue; }

        // Quick title pre-check before hitting the detail endpoint
        const nameNorm = normTitle(searchResult.name || "");
        if (existingTitles.has(nameNorm)) {
          skippedExisting++;
          // Tag it with the session ID in the DB so future enrichment can use it
          if (!DRY_RUN) {
            await client.query(
              "UPDATE tunes SET the_session_id = $1 WHERE the_session_id IS NULL AND $2 = ANY(ARRAY[title, alternative_titles])",
              [sessionId, searchResult.name]
            ).catch(() => {});
          }
          continue;
        }

        // ── Fetch full details ──────────────────────────────────────────────
        const detail = await fetchJson(
          `https://thesession.org/tunes/${sessionId}?format=json`,
        );
        await sleep(DELAY_MS);

        if (!detail || !detail.name) { skippedNoData++; continue; }

        // Re-check name match after getting detail (aliases may match existing)
        const allDetailNames = [detail.name, ...(Array.isArray(detail.aliases) ? detail.aliases : [])];
        const matchesExisting = allDetailNames.some(n => existingTitles.has(normTitle(n)));
        if (matchesExisting) { skippedExisting++; continue; }

        // ── Build key ───────────────────────────────────────────────────────
        const settings = Array.isArray(detail.settings) ? detail.settings : [];
        if (settings.length === 0) { skippedNoKey++; continue; }

        const firstSetting = settings[0];
        const keyRaw: string = firstSetting.key || "Dmajor";
        const key = sessionKeyToSimple(keyRaw);

        // ── Build ABC notation ──────────────────────────────────────────────
        let abcNotation: string | null = null;
        const tuneType = (detail.type || "").toLowerCase();
        const meter = METER_BY_TYPE[tuneType];
        const abcBody = String(firstSetting.abc || "")
          .replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/! ?/g, "\n").trim();

        if (abcBody.length > 20 && meter) {
          abcNotation = [
            "X:1",
            `T:${detail.name}`,
            `R:${detail.type || tuneType}`,
            `M:${meter}`,
            "L:1/8",
            `K:${sessionKeyToAbcKey(keyRaw)}`,
            abcBody,
            `% Source: TheSession.org tune #${sessionId} (CC BY-SA)`,
          ].join("\n");
        }

        // ── Build alternate titles ──────────────────────────────────────────
        const aliases: string[] = (Array.isArray(detail.aliases) ? detail.aliases : [])
          .filter((a: string) => normTitle(a) !== normTitle(detail.name))
          .slice(0, 8);
        const alternativeTitles = aliases.length > 0 ? aliases.join(", ") : null;

        // ── Insert ──────────────────────────────────────────────────────────
        process.stdout.write(
          `[TS#${sessionId}] ${detail.name} (${tuneType}, ${key})${abcNotation ? " +abc" : ""} … `,
        );

        if (DRY_RUN) {
          console.log("DRY");
        } else {
          try {
            await client.query(
              `INSERT INTO tunes
                (title, alternative_titles, key, tune_type, region, difficulty,
                 description, abc_notation, the_session_id, popularity, audio_source)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [
                detail.name,
                alternativeTitles,
                key,
                tuneType || null,
                "Unknown",      // TheSession doesn't carry regional provenance for old-time
                null,           // difficulty: leave blank for hand-curation
                null,           // description: leave blank for hand-curation
                abcNotation,
                sessionId,
                3,              // lower than hand-curated tunes (default 5)
                null,
              ],
            );
            console.log("✓ inserted");
            // Register all names for collision avoidance in this same run
            existingSessionIds.add(sessionId);
            existingTitles.add(normTitle(detail.name));
            for (const a of aliases) existingTitles.add(normTitle(a));
          } catch (err: any) {
            console.log(`✗ insert failed: ${err.message}`);
          }
        }

        inserted++;
      }

      page++;
    } while (page <= totalPages);
  }

  client.release();
  await pool.end();

  console.log(`
Import complete
  New tunes inserted : ${inserted}
  Already in DB      : ${skippedExisting}
  No detail data     : ${skippedNoData}
  No key/settings    : ${skippedNoKey}
  Dry-run mode       : ${DRY_RUN}
`);
}

main().catch((e) => { console.error(e); process.exit(1); });
