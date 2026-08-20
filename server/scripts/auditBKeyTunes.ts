/**
 * Research report for tunes imported with the suspect key "B".
 * It does not alter the database. Review the JSON report before applying any key changes.
 */
import { pool } from "../db";
import { writeFileSync } from "fs";

const UA = { "User-Agent": "TuneVault/1.0 (tunevault.org; research)" };
const CONCURRENCY = 6;
const PAUSE_MS = 180;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractField(html: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<b>\\s*${escaped}\\s*<\\/b>[\\s\\S]*?<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
      "i",
    ),
  );
  return match ? cleanText(match[1]) : "";
}

function normaliseKey(tonic: string, mode: string): string | null {
  if (!tonic) return null;
  const normalizedMode = mode.toLowerCase();
  if (/minor|aeolian/.test(normalizedMode)) return `${tonic.trim()}m`;
  if (/dorian/.test(normalizedMode)) return `${tonic.trim()} Dorian`;
  if (/mixolydian/.test(normalizedMode)) return `${tonic.trim()} Mixolydian`;
  return tonic.trim();
}

function candidateUrls(title: string): string[] {
  const withoutArticle = title.replace(/^The\s+/i, "");
  const toPageName = (value: string) => value.replace(/\s+/g, "_");
  const names = [
    toPageName(title),
    toPageName(withoutArticle),
    `${toPageName(title)}_(1)`,
    `${toPageName(title)}_(2)`,
  ];
  return [...new Set(names)].map(
    (name) => `https://tunearch.org/wiki/${encodeURIComponent(name)}`,
  );
}

async function findTtaKey(title: string) {
  for (const url of candidateUrls(title)) {
    try {
      const response = await fetch(url, {
        headers: UA,
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) continue;
      const html = await response.text();
      if (html.length < 2_000 || html.includes("no text in this page")) continue;
      const key = normaliseKey(
        extractField(html, "Key/Tonic of"),
        extractField(html, "Mode"),
      );
      if (key) return { key, url };
    } catch {
      // A missing page or a temporary upstream failure simply moves to the next candidate.
    } finally {
      await sleep(PAUSE_MS);
    }
  }
  return { key: null, url: null };
}

async function main() {
  const client = await pool.connect();
  const { rows } = await client.query(
    `SELECT id, title, description
     FROM tunes
     WHERE key = 'B' AND the_session_id IS NULL AND (abc_notation IS NULL OR abc_notation = '')
     ORDER BY id`,
  );
  client.release();
  await pool.end();

  console.log(`Checking ${rows.length} B-key tunes against the Traditional Tune Archive…`);
  const results: Array<{
    id: number;
    title: string;
    description: string | null;
    ttaKey: string | null;
    sourceUrl: string | null;
  }> = Array(rows.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= rows.length) return;
      const tune = rows[index];
      const match = await findTtaKey(tune.title);
      results[index] = {
        id: tune.id,
        title: tune.title,
        description: tune.description,
        ttaKey: match.key,
        sourceUrl: match.url,
      };
      console.log(
        `${String(index + 1).padStart(3)}/${rows.length}  ${tune.title} → ${match.key ?? "not found"}`,
      );
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeFileSync("/tmp/tunevault-b-key-tta-report.json", JSON.stringify(results, null, 2));

  const found = results.filter((result) => result.ttaKey);
  const changes = found.filter((result) => result.ttaKey !== "B");
  console.log(`\nTTA matches: ${found.length}/${results.length}`);
  console.log(`TTA indicates a non-B key: ${changes.length}`);
  console.log(`Report: /tmp/tunevault-b-key-tta-report.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});