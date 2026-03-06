import { db } from "./db";
import { tunes } from "@shared/schema";
import { sql } from "drizzle-orm";

const BASE_AUDIO = "https://www.oldtimefiddletunes.net/tunes/audio/";
const AUDIO_SOURCE = "Old Time Fiddle Tunes";
const AUDIO_ATTRIBUTION = "oldtimefiddletunes.net";

function extractKey(parenText: string): string {
  if (!parenText) return "D";
  const clean = parenText.replace(/<[^>]+>/g, "");
  const m = clean.match(/\b([A-G][b#]?)\s*(mix|dor|min|m(?!a)\b)?/i);
  if (!m) return "D";
  const base = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase().replace(/[b#]/g, (c) => c);
  const mode = (m[2] || "").toLowerCase();
  if (mode === "mix") return base;
  if (mode === "dor" || mode === "min" || mode === "m") return base + "m";
  return base;
}

function sectionToTuneType(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("breakdown")) return "breakdown";
  if (s.includes("hornpipe")) return "hornpipe";
  if (s.includes("jig")) return "jig";
  if (s.includes("waltz")) return "waltz";
  if (s.includes("polka")) return "polka";
  if (s.includes("schottis") || s.includes("mazurka") || s.includes("bouree")) return "schottische";
  if (s.includes("march")) return "march";
  if (s.includes("two-step") || s.includes("two step")) return "two-step";
  if (s.includes("rag") || s.includes("swing")) return "rag";
  if (s.includes("hambo") || s.includes("polska") || s.includes("scandinavian")) return "polska";
  if (s.includes("air") || s.includes("slow") || s.includes("march")) return "air";
  if (s.includes("celtic") || s.includes("contra") || s.includes("canadian") || s.includes("new england")) return "reel";
  if (s.includes("reel") || s.includes("appalachian") || s.includes("midwestern") || s.includes("old time")) return "reel";
  if (s.includes("recent")) return "reel";
  if (s.includes("italian") || s.includes("ethnic") || s.includes("misc")) return "reel";
  if (s.includes("southwest") || s.includes("o'odham")) return "reel";
  return "reel";
}

function tuneTypeToRegion(tuneType: string, title: string, section: string): string {
  const t = title.toLowerCase();
  const s = section.toLowerCase();
  if (t.includes("texas") || s.includes("southwestern") || s.includes("o'odham")) return "Texas";
  if (s.includes("appalachian")) return "Appalachian";
  if (s.includes("celtic") || s.includes("irish") || s.includes("canadian") || s.includes("new england") || s.includes("contra")) return "Celtic";
  if (s.includes("scandinavian") || s.includes("mazurka") || s.includes("hambo")) return "Scandinavian";
  if (s.includes("italian")) return "Various";
  if (tuneType === "jig") return "Celtic";
  if (tuneType === "hornpipe") return "New England";
  if (tuneType === "polska") return "Scandinavian";
  if (tuneType === "reel" || tuneType === "breakdown") return "Appalachian";
  if (tuneType === "waltz" || tuneType === "polka" || tuneType === "rag" || tuneType === "schottische") return "Various";
  return "Various";
}

interface ParsedTune {
  title: string;
  key: string;
  tuneType: string;
  region: string;
  audioUrl: string;
}

async function fetchPage(): Promise<string> {
  console.log("  Fetching oldtimefiddletunes.net...");
  const res = await fetch("https://www.oldtimefiddletunes.net", {
    headers: { "User-Agent": "Mozilla/5.0 TuneVault/1.0 (educational research)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  console.log(`  Fetched ${Math.round(html.length / 1024)}KB`);
  return html;
}

function parseHtml(html: string): ParsedTune[] {
  const results: ParsedTune[] = [];
  const seen = new Set<string>();
  let currentSection = "Old Time Reels";
  const lines = html.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers
    const secMatch = line.match(/<h2[^>]*>\s*([^<]+)/i);
    if (secMatch) {
      currentSection = secMatch[1].replace(/<[^>]+>/g, "").trim();
      continue;
    }

    // Detect PDF title line: has tunes/{something}.pdf with a title
    const pdfMatch = line.match(/href="tunes\/([^"]+\.pdf)"[^>]*>\s*([^<]+)\s*<\/a>/i);
    if (!pdfMatch) continue;

    const pdfFile = pdfMatch[1];
    if (!pdfFile || pdfFile === ".pdf") continue; // skip template line

    let title = pdfMatch[2]
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 2) continue;

    // Extract key from parenthetical on same line
    const parenMatch = line.match(/&nbsp;\(([^)]+)\)&nbsp;/);
    const tuneKey = extractKey(parenMatch ? parenMatch[1] : "");

    // Look ahead up to 4 lines for audio link
    let audioFile: string | null = null;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const audioMatch = lines[j].match(/href="tunes\/audio\/([^"]+\.mp3)"/i);
      if (audioMatch) {
        audioFile = audioMatch[1];
        break;
      }
      // Stop if we hit another PDF link (next tune)
      if (lines[j].includes(".pdf") && lines[j].includes("href=")) break;
    }

    // Only include if has audio
    if (!audioFile) continue;

    // Deduplicate by title
    const titleKey = title.toLowerCase().trim();
    if (seen.has(titleKey)) continue;
    seen.add(titleKey);

    const tuneType = sectionToTuneType(currentSection);
    const region = tuneTypeToRegion(tuneType, title, currentSection);

    results.push({
      title,
      key: tuneKey,
      tuneType,
      region,
      audioUrl: BASE_AUDIO + audioFile,
    });
  }

  return results;
}

async function main() {
  console.log("=== Lamancusa Import ===\n");

  const html = await fetchPage();
  const parsed = parseHtml(html);
  console.log(`Parsed ${parsed.length} tunes with audio from Lamancusa`);

  if (parsed.length === 0) {
    console.error("Nothing parsed — check HTML structure");
    process.exit(1);
  }

  // Show sample
  console.log("\nSample of first 5:");
  parsed.slice(0, 5).forEach((t) =>
    console.log(`  ${t.title} (${t.key}) [${t.tuneType}/${t.region}] => ${t.audioUrl.split("/").pop()}`)
  );

  // Get existing titles
  const existing = await db.select({ title: tunes.title }).from(tunes);
  const existingSet = new Set(existing.map((t) => t.title.toLowerCase().trim()));
  console.log(`\nExisting tunes in DB: ${existingSet.size}`);

  const newTunes = parsed.filter((t) => !existingSet.has(t.title.toLowerCase().trim()));
  const skipped = parsed.length - newTunes.length;
  console.log(`New tunes to import:  ${newTunes.length}`);
  console.log(`Duplicate skips:      ${skipped}\n`);

  if (newTunes.length === 0) {
    console.log("Nothing new to import.");
    process.exit(0);
  }

  // Insert in batches
  const BATCH = 50;
  let imported = 0;
  for (let i = 0; i < newTunes.length; i += BATCH) {
    const batch = newTunes.slice(i, i + BATCH);
    await db.insert(tunes).values(
      batch.map((t) => ({
        title: t.title,
        key: t.key,
        tuneType: t.tuneType,
        region: t.region,
        audioUrl: t.audioUrl,
        audioSource: AUDIO_SOURCE,
        audioAttribution: AUDIO_ATTRIBUTION,
        difficulty: "intermediate" as const,
        popularity: 5,
      }))
    ).onConflictDoNothing();
    imported += batch.length;
    process.stdout.write(`\r  Progress: ${imported}/${newTunes.length}`);
  }

  const [final] = await db.select({ total: sql<number>`count(*)` }).from(tunes);
  console.log(`\n\n=== DONE ===`);
  console.log(`Imported:    ${imported}`);
  console.log(`Total tunes: ${Number(final.total)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
