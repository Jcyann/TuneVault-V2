/**
 * auditSourceTags.ts
 *
 * Two passes in one script:
 *
 * Pass A — BLANK DESCRIPTIONS (no description at all, no TheSession ID)
 *   Composes a minimal factual description from DB fields (title, type, key,
 *   region, audio attribution) and cites the appropriate source.
 *
 * Pass B — MISSING SOURCE TAGS (has description, but no "(Source:..." line)
 *   Determines the likely source from audio_source / audio_attribution /
 *   audio_url and appends a concise source citation. Falls back to
 *   "TuneVault editorial research" when no external source is detectable.
 *
 * Usage:
 *   npx tsx server/scripts/auditSourceTags.ts --dry-run
 *   npx tsx server/scripts/auditSourceTags.ts --limit=200
 *   npx tsx server/scripts/auditSourceTags.ts               # all
 */

import { pool } from "../db";

const DRY_RUN   = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT     = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : Infinity;

const SOURCE_PATTERNS = [
  "source:", "tunearch.org", "thesession.org", "internet archive",
  "library of congress", "folkways", "smithsonian", "oldtimefiddletunes",
  "slippery hill", "archive.org",
];

function hasSourceTag(desc: string): boolean {
  if (!desc) return false;
  const lower = desc.toLowerCase();
  return SOURCE_PATTERNS.some((p) => lower.includes(p));
}

/** Determine the best source label for a tune based on its audio metadata. */
function resolveSourceLabel(row: any): string {
  const audioSrc   = (row.audio_source || "").toLowerCase();
  const audioAttr  = (row.audio_attribution || "").toLowerCase();
  const audioUrl   = (row.audio_url || "").toLowerCase();
  const locId      = row.loc_item_id;
  const folkwaysUrl = row.folkways_url;

  if (locId) return "Library of Congress, American Folklife Center";
  if (folkwaysUrl) return "Smithsonian Folkways";
  if (audioUrl.includes("archive.org")) return "Internet Archive";
  if (audioSrc.includes("old time fiddle") || audioUrl.includes("oldtimefiddletunes")) {
    return "oldtimefiddletunes.net (John Lamancusa collection)";
  }
  if (audioAttr && audioAttr.length > 2 && !audioAttr.includes("lamancusa")) {
    // Named performer credit — cite that
    return `recording by ${row.audio_attribution}`;
  }
  if (audioSrc && audioSrc.length > 2) return audioSrc;
  return "TuneVault editorial research";
}

async function main() {
  const client = await pool.connect();
  console.log(`\nSource tag audit — dry-run: ${DRY_RUN}, limit: ${LIMIT}\n`);

  // ── Pass A: blank descriptions (no TheSession ID = hand-curated) ──────────
  const { rows: blankRows } = await client.query(`
    SELECT id, title, tune_type, key, region, difficulty,
           audio_source, audio_attribution, audio_url, loc_item_id, folkways_url
    FROM tunes
    WHERE (description IS NULL OR TRIM(description) = '')
      AND (the_session_id IS NULL)
    ORDER BY popularity DESC, title ASC
  `);

  console.log(`Pass A — ${blankRows.length} tunes with no description and no TheSession ID\n`);
  let aFilled = 0;

  for (const t of blankRows.slice(0, LIMIT === Infinity ? blankRows.length : LIMIT)) {
    const source = resolveSourceLabel(t);
    const typeStr = t.tune_type ? `a ${t.tune_type}` : "a traditional tune";
    const keyStr  = t.key       ? ` in the key of ${t.key}` : "";
    const regionStr = (t.region && t.region !== "Unknown" && t.region !== "Various") ? ` from the ${t.region} tradition` : "";

    const desc = `${t.title} is ${typeStr}${keyStr}${regionStr}. (Source: ${source})`;

    process.stdout.write(`  [A:${t.id}] ${t.title} … `);
    if (DRY_RUN) {
      console.log(`DRY → "${desc.slice(0, 100)}"`);
    } else {
      await client.query("UPDATE tunes SET description = $1 WHERE id = $2", [desc, t.id]);
      console.log("✓");
      aFilled++;
    }
  }

  // ── Pass B: has description but no source tag ─────────────────────────────
  const { rows: noTagRows } = await client.query(`
    SELECT id, title, description,
           audio_source, audio_attribution, audio_url, loc_item_id, folkways_url
    FROM tunes
    WHERE description IS NOT NULL AND TRIM(description) != ''
      AND the_session_id IS NULL
    ORDER BY popularity DESC, title ASC
  `);

  // Filter in JS for descriptions genuinely missing source tags
  const needsTag = noTagRows.filter((r) => !hasSourceTag(r.description));
  const bSlice   = needsTag.slice(0, LIMIT === Infinity ? needsTag.length : Math.max(0, LIMIT - blankRows.length));

  console.log(`\nPass B — ${needsTag.length} tunes with description but no source tag\n`);
  let bTagged = 0;

  for (const t of bSlice) {
    const source = resolveSourceLabel(t);
    const addition = `\n\n(Source: ${source})`;

    process.stdout.write(`  [B:${t.id}] ${t.title} … `);
    if (DRY_RUN) {
      console.log(`DRY +source → "${source}"`);
    } else {
      await client.query(
        "UPDATE tunes SET description = description || $1 WHERE id = $2",
        [addition, t.id],
      );
      console.log("✓");
      bTagged++;
    }
  }

  client.release();
  await pool.end();

  console.log(`
Source tag audit complete
  Pass A — blank descriptions filled : ${aFilled}
  Pass B — source tags added         : ${bTagged}
  Dry-run                            : ${DRY_RUN}
`);
}

main().catch((e) => { console.error(e); process.exit(1); });
