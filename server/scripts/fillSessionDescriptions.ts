/**
 * fillSessionDescriptions.ts
 *
 * Fills in descriptions for tunes that were imported from TheSession.org
 * and still have no description. Composes a concise, factual description
 * from data already stored in the DB (title, type, key, mode, alternate
 * titles, TheSession ID) and cites TheSession as the source.
 *
 * Safe rules:
 *   - Only processes tunes where description IS NULL or empty
 *   - Never touches tunes that already have a description
 *   - Every description ends with a TheSession source citation
 *
 * Usage:
 *   npx tsx server/scripts/fillSessionDescriptions.ts --dry-run
 *   npx tsx server/scripts/fillSessionDescriptions.ts --limit=200
 *   npx tsx server/scripts/fillSessionDescriptions.ts          # all
 */

import { pool } from "../db";

const DRY_RUN  = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT     = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : Infinity;

const ARTICLE_BY_TYPE: Record<string, string> = {
  reel: "a reel", jig: "a jig", "slip jig": "a slip jig",
  hornpipe: "a hornpipe", waltz: "a waltz", polka: "a polka",
  march: "a march", strathspey: "a strathspey", mazurka: "a mazurka",
  barndance: "a barndance", "three-two": "a three-two",
  slide: "a slide", schottische: "a schottische",
};

function composeDescription(row: any): string {
  const {
    title, tune_type: type, key,
    alternative_titles: alts, the_session_id: sessionId,
  } = row;

  const parts: string[] = [];

  // Opening: type + key
  const article = (type && ARTICLE_BY_TYPE[type.toLowerCase()]) || (type ? `a ${type}` : "a traditional tune");
  let opener = `${title} is ${article}`;
  if (key) opener += ` in the key of ${key}`;
  parts.push(opener + ".");

  // Alternate titles
  const altList = (alts || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter((s: string) => s && s.toLowerCase() !== title.toLowerCase())
    .slice(0, 5);
  if (altList.length > 0) {
    parts.push(`Also known as: ${altList.join(", ")}.`);
  }

  // Source citation
  if (sessionId) {
    parts.push(`(Source: TheSession.org tune #${sessionId}, CC BY-SA — thesession.org/tunes/${sessionId})`);
  } else {
    parts.push("(Source: TheSession.org, CC BY-SA)");
  }

  return parts.join(" ");
}

async function main() {
  const client = await pool.connect();
  console.log(`\nTheSession description filler — dry-run: ${DRY_RUN}, limit: ${LIMIT}\n`);

  const { rows } = await client.query(`
    SELECT id, title, tune_type, key, alternative_titles, the_session_id
    FROM tunes
    WHERE (description IS NULL OR TRIM(description) = '')
      AND the_session_id IS NOT NULL
    ORDER BY popularity ASC, title ASC
  `);

  const tunes = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);
  console.log(`${tunes.length} tunes to fill\n`);

  let filled = 0, errors = 0;

  for (const t of tunes) {
    const desc = composeDescription(t);
    process.stdout.write(`[${t.id}] ${t.title} … `);

    if (DRY_RUN) {
      console.log(`DRY → "${desc.slice(0, 100)}…"`);
    } else {
      try {
        await client.query(
          "UPDATE tunes SET description = $1 WHERE id = $2",
          [desc, t.id],
        );
        console.log("✓");
        filled++;
      } catch (err: any) {
        console.log(`✗ ${err.message}`);
        errors++;
      }
    }
  }

  client.release();
  await pool.end();

  console.log(`\nDone — filled: ${filled}, errors: ${errors}, dry-run: ${DRY_RUN}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
