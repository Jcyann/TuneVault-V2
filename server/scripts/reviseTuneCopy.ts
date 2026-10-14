/**
 * Four-batch copy-only editorial application.
 * prepare: create the review from the pre-edit snapshot and per-entry drafts.
 * apply: compare-and-swap the complete catalog, overrides and seed under locks.
 * verify: assert effective copy, seed parity, coverage and non-copy preservation.
 *
 * npx tsx server/scripts/reviseTuneCopy.ts prepare|apply|verify
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pool } from "../db";
import { plainHistory, plainNotes, sourceCredits, splitSentences, wordCount } from "./tuneCopyEditorial";

const DIR = "generated-artifacts/tune-copy";
const seedPath = "server/seedData/tunes.json";
const recordingSeedPath = "server/seedData/recordings.json";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const load = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const snapshot = load(`${DIR}/snapshot.json`);
type Review = {
  id: number; title: string; description: string | null; notes: string | null;
  status: string; method: string; reason: string; batch: number;
  beforeWords: number; afterWords: number;
};
const withoutCopy = ({ description, notes, ...rest }: any) => rest;
const numericTokens = (s: string) => s.match(/\b\d{3,4}\b/g) ?? [];
const bodyOnly = (s: string) => s.replace(/\(?Sources?:[\s\S]*$/i, "").trim();
const contamination = /search results|web research compiled|the searches\b|as an AI\b|here.s a full research|TuneVault editorial research/i;

function prepare() {
  if (existsSync(`${DIR}/applied.json`) && !existsSync(`${DIR}/applied-review.json`)) {
    writeFileSync(`${DIR}/applied-review.json`, readFileSync(`${DIR}/approved.json`, "utf8"));
  }
  const drafts = Array.from({ length: 34 }, (_, i) => load(`${DIR}/final-${i}.json`).entries).flat();
  assert.equal(drafts.length, snapshot.tunes.length);
  assert.equal(new Set(drafts.map((t: any) => t.id)).size, snapshot.tunes.length);
  const corrections = load("server/seedData/tune-copy-corrections.json");
  const reviews: Review[] = snapshot.tunes.map((t: any, index: number) => {
    const draft = drafts.find((r: any) => r.id === t.id);
    assert.ok(draft, `No editorial review for ${t.id}`);
    let description = plainHistory(t.description);
    let notes = plainNotes(t.notes);
    let method = "conservative edit";
    const originalWords = wordCount(t.description);
    const candidateBody = draft.description ? bodyOnly(draft.description) : "";
    const oldNumbers = new Set(numericTokens(t.description ?? ""));
    const newNumbers = numericTokens(candidateBody).filter(n => !oldNumbers.has(n));
    // Reject introduced dates, restore omitted dated evidence from the original,
    // and keep the recording/source identities outside the rewrite.
    if (originalWords > 60 && candidateBody && newNumbers.length === 0 &&
        wordCount(candidateBody) >= originalWords * 0.12 &&
        !/\b(?:requires|should|must|soul|deep DNA)\b|TuneVault editorial research/i.test(candidateBody)) {
      description = plainHistory(candidateBody.replace(/\b[Ff]irst (?:documented|published) in\b/g, "Included in"));
      if (description) {
        const cleanedOriginal = plainHistory(t.description) ?? "";
        const existingYears = new Set(numericTokens(description));
        const restored: string[] = [];
        for (const sentence of splitSentences(bodyOnly(cleanedOriginal).replace(/\n+/g, " "))) {
          const missingYears = numericTokens(sentence).filter(n => /^(?:1[6-9]|20)\d\d$/.test(n) && !existingYears.has(n));
          if (!missingYears.length) continue;
          if (/^[A-Z][A-Z'’ -]+\.|^A{1,3}['’]?[BC]|^One part|^(?:Published in|Notation sources|Recordings include)|^Included in/.test(sentence)) continue;
          if (/first|earliest|named for|title|name|probably|possibly|may have|might have|seems|speculat|legend|claim|story|thinks|believes|suggests/i.test(sentence)) continue;
          if (!/\b(?:recorded|recording|published|publication|collected|collection|learned|born|died|composed|composer|book|repertoire|manuscript|printed|appears|included|father)\b/i.test(sentence)) continue;
          if (/;\s*p\.|^(?:County|Columbia|Rounder|Marimac|R\.P\.)\b/.test(sentence)) continue;
          if (sentence.length > 700 || !/[.!?]$/.test(sentence)) continue;
          restored.push(sentence);
          for (const year of missingYears) existingYears.add(year);
        }
        if (restored.length) description += `\n\n${restored.join(" ")}`;
        const credits = sourceCredits(t.description ?? "");
        if (credits.length) description += `\n\n${credits.join("\n")}`;
      }
      method = "shortened draft with original source credits";
    }
    if (originalWords > 60 && draft.description === null) {
      description = null;
      method = "honest history gap";
    }
    // Sparse metadata entries are already short. Remove redundant aliases only;
    // do not manufacture history or silently remove their licenses.
    if (originalWords <= 60 && /\bis a .+ in the key of\b/.test(t.description ?? "")) {
      description = (t.description ?? "").replace(/ Also known as:[\s\S]*?(?=\s*\(Source:|$)/, "").trim();
      method = "concise metadata retained";
    }
    // Keep distinct recording-version statements, never imply the historical
    // source fiddler is necessarily the performer of the linked recording.
    for (const statement of splitSentences(bodyOnly(t.description ?? ""))) {
      if (/the recording (?:heard|available|linked|included) here|this recording (?:is|was) by/i.test(statement)
          && description && !description.includes(statement)) {
        description += `\n\n${statement}`;
      }
    }
    if (Object.hasOwn(corrections, t.id)) {
      ({ description, notes } = corrections[t.id]);
      method = "individual factual correction";
    }
    const versionNotes: Record<number, string> = {
      130: "Howard Rains and Trish Spencer recorded this tune on Old Texas Fiddle.",
      133: "Chirps Smith recorded a version of this tune.",
      148: "Emmett Lundy recorded a version of this tune.",
      484: "Versions differ in their A parts and keys; check which setting your group plays.",
      688: "Versions differ in their A parts and keys; check which setting your group plays.",
      742: "Snuffy Jenkins recorded a banjo version.",
      1033: "Some versions have irregular phrase endings; others have been regularized.",
      1037: "Dock Boggs recorded a banjo version in 1927.",
    };
    if (notes && ![1, 3, 6].includes(t.id)) notes = versionNotes[t.id] ?? null;
    assert.ok(!contamination.test(`${description ?? ""} ${notes ?? ""}`), `Contaminated ${t.id}`);
    const unchanged = description === t.description && notes === t.notes;
    return {
      id: t.id, title: t.title, description, notes,
      status: !description ? "information_gap" : unchanged ? "concise" : "revised",
      method, reason: draft.reason,
      batch: Math.min(4, Math.floor(index / Math.ceil(snapshot.tunes.length / 4)) + 1),
      beforeWords: wordCount(t.description) + wordCount(t.notes),
      afterWords: wordCount(description) + wordCount(notes),
    };
  });
  // Recording notes are reviewed even when empty; credits/tuning stay untouched.
  const recordingReview = snapshot.recordings.map((r: any) => ({
    id: r.id, tuneId: r.tune_id, before: r.notes, after: r.notes,
    status: r.notes ? "concise" : "no notes", reason: "Preserved recording credits and factual version/tuning fields.",
  }));
  const seedRaw = readFileSync(seedPath, "utf8");
  const report = {
    preparedAt: new Date().toISOString(), seedHash: hash(seedRaw),
    recordingSeedHash: hash(readFileSync(recordingSeedPath, "utf8")),
    checklist: [
      "Keep supported dates, people, places, appearances and source attribution.",
      "Remove repeated provenance, archive headings, truncated passages and research narration.",
      "Avoid invented history, title explanations, musical analysis and compulsory playing advice.",
      "Keep concise entries concise; use an honest gap when no reliable history remains.",
      "Recording versions are not necessarily the tune's historical source fiddler.",
    ],
    entries: reviews, recordingReview,
  };
  writeFileSync(`${DIR}/approved.json`, JSON.stringify(report, null, 2) + "\n");
  summarize(reviews);
}

function summarize(entries: Review[]) {
  console.log(JSON.stringify({
    reviewed: entries.length,
    statuses: Object.fromEntries(["concise", "revised", "information_gap"].map(s => [s, entries.filter(e => e.status === s).length])),
    beforeWords: entries.reduce((n, e) => n + e.beforeWords, 0),
    afterWords: entries.reduce((n, e) => n + e.afterWords, 0),
    batches: [1, 2, 3, 4].map(b => ({ batch: b, count: entries.filter(e => e.batch === b).length })),
  }, null, 2));
}

async function apply() {
  const report = load(`${DIR}/approved.json`);
  const previousReport = existsSync(`${DIR}/applied-review.json`) ? load(`${DIR}/applied-review.json`) : null;
  assert.ok(!existsSync(`${DIR}/applied.json`) || previousReport, "Already applied; use verify.");
  const seedRaw = readFileSync(seedPath, "utf8");
  assert.equal(hash(seedRaw), report.seedHash, "Seed changed since review");
  assert.equal(hash(readFileSync(recordingSeedPath, "utf8")), report.recordingSeedHash);
  const seed = JSON.parse(seedRaw);
  const client = await pool.connect();
  let fileWritten = false;
  try {
    await client.query("BEGIN");
    // Same lock order as the owner editor (tunes before overrides). The snapshot
    // comparisons happen while writes are excluded; any conflict aborts all batches.
    await client.query("LOCK TABLE tunes IN SHARE ROW EXCLUSIVE MODE");
    await client.query("LOCK TABLE tune_copy_overrides IN SHARE ROW EXCLUSIVE MODE");
    const current = (await client.query("SELECT * FROM tunes ORDER BY id")).rows;
    const overrides = (await client.query("SELECT * FROM tune_copy_overrides ORDER BY tune_id")).rows;
    const expectedTunes = previousReport ? snapshot.tunes.map((t: any) => {
      const old = previousReport.entries.find((e: Review) => e.id === t.id);
      return { ...t, description: old.description, notes: old.notes };
    }) : snapshot.tunes;
    const expectedOverrides = previousReport ? snapshot.overrides.map((o: any) => {
      const old = previousReport.entries.find((e: Review) => e.id === o.tune_id);
      return { ...o, description: old.description, notes: old.notes };
    }) : snapshot.overrides;
    assert.deepEqual(JSON.parse(JSON.stringify(current)), expectedTunes, "Catalog changed since snapshot; review current changes before applying.");
    assert.deepEqual(JSON.parse(JSON.stringify(overrides)), expectedOverrides, "Owner overrides changed; refusing to overwrite.");
    assert.deepEqual((await client.query("SELECT * FROM recordings ORDER BY id")).rows.map(r => JSON.parse(JSON.stringify(r))), snapshot.recordings);
    writeFileSync(`${DIR}/pre-apply-${Date.now()}.json`, JSON.stringify({ tunes: current, overrides, seed, recordedAt: new Date().toISOString() }, null, 2));
    const approved = new Map<number, Review>(report.entries.map((r: Review) => [r.id, r]));
    assert.equal(approved.size, current.length);
    for (const batch of [1, 2, 3, 4]) {
      for (const edit of report.entries.filter((e: Review) => e.batch === batch)) {
        const result = await client.query(
          "UPDATE tunes SET description = $2, notes = $3 WHERE id = $1 RETURNING id",
          [edit.id, edit.description, edit.notes],
        );
        assert.equal(result.rowCount, 1);
        // Existing manual overrides take precedence on sync, so update reviewed
        // overrides too, but never create overrides for untouched seed-managed copy.
        await client.query("UPDATE tune_copy_overrides SET description=$2, notes=$3 WHERE tune_id=$1",
          [edit.id, edit.description, edit.notes]);
      }
      console.log(`Applied batch ${batch}: ${report.entries.filter((e: Review) => e.batch === batch).length} reviews`);
    }
    const nextSeed = seed.map((t: any) => {
      const edit = approved.get(t.id);
      return edit ? { ...t, description: edit.description, notes: edit.notes } : t;
    });
    for (let i = 0; i < seed.length; i++) assert.deepEqual(withoutCopy(seed[i]), withoutCopy(nextSeed[i]));
    assert.equal(hash(readFileSync(seedPath, "utf8")), report.seedHash, "Concurrent seed edit");
    writeFileSync(seedPath, JSON.stringify(nextSeed, null, 2) + "\n");
    fileWritten = true;
    await client.query("COMMIT");
    writeFileSync(`${DIR}/applied-review.json`, JSON.stringify(report, null, 2));
    writeFileSync(`${DIR}/applied.json`, JSON.stringify({ appliedAt: new Date().toISOString(), entries: approved.size }));
    summarize(report.entries);
  } catch (error) {
    await client.query("ROLLBACK");
    if (fileWritten) writeFileSync(seedPath, seedRaw);
    throw error;
  } finally {
    client.release();
  }
}

async function verify() {
  const report = load(`${DIR}/approved.json`);
  const current = (await pool.query("SELECT * FROM tunes ORDER BY id")).rows;
  assert.equal(current.length, report.entries.length);
  for (const t of current) {
    const original = snapshot.tunes.find((r: any) => r.id === t.id);
    const approved = report.entries.find((r: Review) => r.id === t.id);
    assert.deepEqual(withoutCopy(JSON.parse(JSON.stringify(t))), withoutCopy(original), `Metadata changed: ${t.id}`);
    assert.equal(t.description, approved.description, `Description mismatch: ${t.id}`);
    assert.equal(t.notes, approved.notes, `Notes mismatch: ${t.id}`);
    assert.ok(!contamination.test(`${t.description ?? ""} ${t.notes ?? ""}`));
  }
  const seed = load(seedPath);
  for (const t of seed) {
    const approved = report.entries.find((r: Review) => r.id === t.id);
    assert.equal(t.description, approved.description);
    assert.equal(t.notes, approved.notes);
  }
  assert.deepEqual(JSON.parse(JSON.stringify((await pool.query("SELECT * FROM recordings ORDER BY id")).rows)), snapshot.recordings);
  assert.equal(hash(readFileSync(recordingSeedPath, "utf8")), report.recordingSeedHash);
  console.log("PASS: full coverage, effective copy, seed parity, recording preservation, and non-copy metadata.");
  summarize(report.entries);
}

async function main() {
 try {
  const mode = process.argv[2];
  if (mode === "prepare") prepare();
  else if (mode === "apply") await apply();
  else if (mode === "verify") await verify();
  else throw new Error("Usage: reviseTuneCopy.ts prepare|apply|verify");
 } finally {
  await pool.end();
 }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
