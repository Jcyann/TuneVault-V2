import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tuneDescriptionSnippet } from "../../shared/tuneCopy";
import { plainHistory, plainNotes } from "./tuneCopyEditorial";

const seed = JSON.parse(readFileSync("server/seedData/tunes.json", "utf8"));
for (const t of seed) {
  assert.ok(!/search results|as an AI\b|Geographic provenance:|AKA and see|First documented in|TuneVault editorial research/i.test(`${t.description ?? ""} ${t.notes ?? ""}`), `Artifact: ${t.id}`);
  assert.ok((t.description?.length ?? 0) <= 10000, `Owner editor description limit: ${t.id}`);
  assert.ok((t.notes?.length ?? 0) <= 10000, `Owner editor notes limit: ${t.id}`);
  const snippet = tuneDescriptionSnippet({ ...t, tuneType: t.tune_type });
  assert.ok(snippet.length <= 160, `SEO limit: ${t.id}`);
  assert.ok(!/\n|[*_]/.test(snippet), `SEO formatting: ${t.id}`);
}
assert.equal(tuneDescriptionSnippet({ title: "Example", key: "D", tuneType: "reel", description: "Short history." }), "Short history.");
assert.equal(tuneDescriptionSnippet({ title: "Example", key: "D", tuneType: "reel", description: "Short history.\n\nSource: An archive." }), "Short history.");
assert.match(tuneDescriptionSnippet({ title: "Example", key: "D", tuneType: "reel", description: null }), /not yet documented/);
assert.equal(plainNotes("Texas contest style: the bow arm drives from the elbow."), null);
assert.equal(plainNotes("Cross-tune to AEAE before you start — the standard-tuned version loses its drone magic entirely."), null);
assert.equal(plainHistory("Here's a full research summary drawn from the archive."), null);
assert.match(plainHistory("It was recorded in 1930.\n\nSource: Traditional Tune Archive. Used under Creative Commons license.") ?? "", /Creative Commons/);
assert.ok(!seed.find((t: any) => t.id === 3).description.includes("1839–1862"));
assert.match(seed.find((t: any) => t.id === 10).description, /June 18, 1966/);
console.log(`PASS: ${seed.length} tune descriptions/notes, editor limits, SEO snippets, attribution and factual regression fixtures.`);
