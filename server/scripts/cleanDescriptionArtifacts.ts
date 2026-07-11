/**
 * Cleans AI/web-research artifacts out of tune descriptions left by an
 * earlier enrichment session. Three rules, applied in order:
 *
 *   1. NULL descriptions that open with a "couldn't find" statement — those
 *      are non-content; the honest "not yet documented" placeholder should
 *      show instead.
 *   2. Strip the boilerplate footer paragraph
 *      "Sources: Web research compiled from ...".
 *   3. Strip a pure meta preamble first paragraph ("Here is what the search
 *      results reveal about ...:", "Here's a comprehensive overview ...:",
 *      "Great — the key source has been found. ...:").
 *
 * Substantive prose is kept untouched. After running, any description that
 * still mentions search/research meta-language is listed for manual review.
 *
 * Run:  npx tsx server/scripts/cleanDescriptionArtifacts.ts --dry-run
 * Then: npx tsx server/scripts/cleanDescriptionArtifacts.ts
 * (Remember to run exportTunesToSeed.ts afterwards.)
 */

import { pool } from "../db";

const DRY_RUN = process.argv.includes("--dry-run");

const FOOTER_RE = /\n*Sources:\s*Web research compiled from[^\n]*\s*$/i;

const CANT_FIND_RE =
  /^(I wasn'?t able to find|I was unable to find|I couldn'?t find|I could not find|Based on the search results, there (is|was) no|The search(es)? (didn'?t|did not) (return|turn up)|Unfortunately, (I|the search))/i;

const PREAMBLE_RE =
  /^["\s]*(Here('|’)s |Here is |Great[ —–!-]|Excellent[ —–-]|Based on (all )?(the )?(available )?search results|The specific tune|This is a (very |genuinely )?obscure tune)/i;

const LEFTOVER_RE =
  /search results|web research|the search(es)?\b|search turned up|able to retrieve|I found|I was able|I was not able/i;

async function main() {
  const { rows } = await pool.query(
    `SELECT id, title, description FROM tunes
     WHERE description ~* 'search results|web research|the searches|wasn''t able to find|unable to find'
     ORDER BY id`
  );
  console.log(`${rows.length} descriptions with artifacts${DRY_RUN ? " (dry run)" : ""}`);

  let nulled = 0, cleaned = 0, untouched = 0;
  const leftovers: Array<{ id: number; title: string }> = [];

  for (const t of rows) {
    const original: string = t.description;
    let d = original.trim();

    if (CANT_FIND_RE.test(d)) {
      nulled++;
      console.log(`✗ NULL  #${t.id} ${t.title}`);
      if (!DRY_RUN) await pool.query(`UPDATE tunes SET description = NULL WHERE id = $1`, [t.id]);
      continue;
    }

    d = d.replace(FOOTER_RE, "").trim();

    // Drop a first paragraph that is pure meta scaffolding. Only when it
    // ends with ":" (an intro line) so real content is never removed.
    const paras = d.split(/\n\n+/);
    if (paras.length > 1 && PREAMBLE_RE.test(paras[0]) && /:\s*$/.test(paras[0])) {
      paras.shift();
      d = paras.join("\n\n").trim();
    }

    // If meta-language survives the strip, the description is an
    // unverifiable search narrative — NULL it (honest gap beats hedge prose).
    if (LEFTOVER_RE.test(d)) {
      nulled++;
      console.log(`✗ NULL (residual meta) #${t.id} ${t.title}`);
      if (!DRY_RUN) await pool.query(`UPDATE tunes SET description = NULL WHERE id = $1`, [t.id]);
      continue;
    }

    if (d === original.trim()) { untouched++; continue; }

    cleaned++;
    console.log(`✓ clean #${t.id} ${t.title}`);
    if (!DRY_RUN) await pool.query(`UPDATE tunes SET description = $1 WHERE id = $2`, [d, t.id]);
  }

  console.log(`\nDone: ${nulled} nulled, ${cleaned} cleaned, ${untouched} untouched.`);
  if (leftovers.length) {
    console.log(`\n${leftovers.length} still contain meta-language — manual review needed:`);
    for (const l of leftovers) console.log(`  #${l.id} ${l.title}`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
