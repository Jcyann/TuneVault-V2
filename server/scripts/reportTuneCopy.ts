/** Build a self-contained coverage report outside Git/deployment output. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const dir = "generated-artifacts/tune-copy";
const report = JSON.parse(readFileSync(`${dir}/approved.json`, "utf8"));
const snapshot = JSON.parse(readFileSync(`${dir}/snapshot.json`, "utf8"));
const entries = report.entries;
const wc = (s: string | null) => (s?.match(/\S+/g) ?? []).length;
const escapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => escapes[c]);
const before = entries.reduce((n: number, e: any) => n + e.beforeWords, 0);
const after = entries.reduce((n: number, e: any) => n + e.afterWords, 0);
const examples = [1, 3, 10, 12, 141, 501, 973].map(id => {
  const old = snapshot.tunes.find((t: any) => t.id === id);
  const next = entries.find((t: any) => t.id === id);
  return `<details><summary>${escape(next.title)} — ${next.beforeWords} → ${next.afterWords} words</summary>
    <h4>Before</h4><p>${escape(old.description)}</p>${old.notes ? `<h4>Before performance notes</h4><p>${escape(old.notes)}</p>` : ""}
    <h4>After</h4><p>${escape(next.description || "History not yet documented.")}</p>${next.notes ? `<h4>After performance notes</h4><p>${escape(next.notes)}</p>` : ""}</details>`;
}).join("");
const coverage = entries.map((e: any) => {
  const old = snapshot.tunes.find((t: any) => t.id === e.id);
  return {
    id: e.id, title: e.title, batch: e.batch, status: e.status,
    descriptionBeforeWords: wc(old.description), descriptionAfterWords: wc(e.description),
    notesBeforeWords: wc(old.notes), notesAfterWords: wc(e.notes),
    description: e.description, notes: e.notes, method: e.method,
  };
});
writeFileSync(`${dir}/coverage.json`, JSON.stringify({ generatedAt: new Date().toISOString(), entries: coverage, recordingReview: report.recordingReview }, null, 2));
const columns = ["id", "title", "batch", "status", "descriptionBeforeWords", "descriptionAfterWords", "notesBeforeWords", "notesAfterWords", "method"];
const csv = [columns.join(","), ...coverage.map((e: any) => columns.map(c => `"${String(e[c]).replace(/"/g, '""')}"`).join(","))].join("\n");
writeFileSync(`${dir}/coverage.csv`, csv + "\n");
const rows = coverage.map((e: any) => `<tr><td>${e.id}</td><td>${escape(e.title)}</td><td>${e.batch}</td><td>${escape(e.status)}</td><td>${e.descriptionBeforeWords} → ${e.descriptionAfterWords}</td><td>${e.notesBeforeWords} → ${e.notesAfterWords}</td><td>${escape(e.method)}</td></tr>`).join("");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TuneVault copy review</title><style>
body{font:16px/1.6 system-ui,sans-serif;color:#292721;background:#faf8f2;margin:0 auto;padding:32px;max-width:1200px}
h1,h2{font-family:Georgia,serif}h1{font-size:38px}h2{margin-top:42px}p{white-space:pre-line}
.stats{display:flex;gap:24px;flex-wrap:wrap;padding:20px;background:#ece6d8}.stats strong{display:block;font-size:26px}
details{border-top:1px solid #ccc4b3;padding:16px 0}summary{cursor:pointer;font-weight:600}input{width:min(100%,480px);padding:12px;border:1px solid #aaa;background:white;font:inherit}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{text-align:left;padding:9px;border-bottom:1px solid #ded8cb;vertical-align:top}thead{background:#ece6d8}.table{overflow:auto}small{color:#625e55}
</style><main><h1>TuneVault: full-catalog copy review</h1><p>Completed in four batches of 337 tunes. This is an incremental editorial improvement, not a claim that every historical assertion has been independently re-researched.</p>
<div class="stats"><div><strong>${entries.length.toLocaleString()}</strong>tunes reviewed</div><div><strong>${before.toLocaleString()} → ${after.toLocaleString()}</strong>words, including credits</div><div><strong>${((1 - after / before) * 100).toFixed(1)}%</strong>shorter overall</div></div>
<p>${entries.filter((e: any) => e.status === "revised").length} revised; ${entries.filter((e: any) => e.status === "concise").length} left concise; ${entries.filter((e: any) => e.status === "information_gap").length} left with an honest information gap.
All 173 original performance-note entries were reviewed. ${entries.filter((e: any) => e.notes).length} retain grounded version notes. All ${report.recordingReview.length} recording rows were reviewed; none contained separate notes. Recording credits, tuning and version metadata were preserved.</p>
<h2>Editorial decisions</h2><ul><li>Cut repetition, speculative title stories, research narration, inflated praise and pasted archive lists.</li>
<li>Keep source and license credits, useful dated evidence and distinctions between historical sources and linked recordings.</li>
<li>Remove unsupported playing prescriptions instead of replacing them with new advice.</li>
<li>Keep concise entries short. Where the original supplied only speculation or an incomplete excerpt, use the public information-gap message.</li>
<li>Questionable “first documented” citations were changed to collection appearances, not treated as dates of composition.</li></ul>
<h2>Representative before/after examples</h2>${examples}
<h2>Historical spot-checks</h2><ul>
<li><a href="https://adp.library.ucsb.edu/index.php/matrix/detail/800000585/B-26664-Sallie_Gooden">UC Santa Barbara: Robertson's Sallie Gooden, July 1, 1922</a></li>
<li><a href="https://www.loc.gov/item/afcreed000095">Library of Congress: Kitchen Girl, June 18, 1966</a></li>
<li><a href="https://tunearch.org/wiki/Annotation:Old_Joe_Clark">Traditional Tune Archive: competing Old Joe Clark origin stories</a></li>
<li><a href="https://tunearch.org/wiki/Annotation:Cripple_Creek">Traditional Tune Archive: Cripple Creek title uncertainty</a></li></ul>
<h2>Coverage: every tune</h2><label for="filter">Filter by title, ID or status</label><br><input id="filter" type="search" placeholder="Search coverage…">
<div class="table"><table><thead><tr><th>ID</th><th>Tune</th><th>Batch</th><th>Decision</th><th>History words</th><th>Notes words</th><th>Method</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Preservation and verification</h2><p>Pre-edit database values, seed text and owner overrides were snapshotted before editing. Writes were applied under database locks with full-catalog and owner-override comparisons; any concurrent change would abort the batch.
The seed was changed only in description and notes. Titles, keys, type, region, difficulty, tuning, notation, URLs and source-identity fields were not edited. Existing owner overrides continue to take precedence on seed synchronization.
Full before/after coverage is also available in coverage.json and coverage.csv beside this report in generated-artifacts/tune-copy/. The recoverable baseline is snapshot.json. Those files are excluded from Git and deployment output.</p>
<small>Prepared ${escape(new Date().toISOString().slice(0, 10))}. Word counts use whitespace-delimited tokens and include attribution.</small></main>
<script>document.getElementById('filter').addEventListener('input',function(){const q=this.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(function(row){row.hidden=!row.textContent.toLowerCase().includes(q)})});</script></html>`;
writeFileSync(`${dir}/review-report.html`, html);
mkdirSync("docs", { recursive: true });
writeFileSync("docs/tune-copy-review.md", `# Tune-page copy review

Completed across ${entries.length} tunes in four batches of 337.

| Outcome | Count |
|---|---:|
| Revised | ${entries.filter((e: any) => e.status === "revised").length} |
| Left concise | ${entries.filter((e: any) => e.status === "concise").length} |
| Honest information gap | ${entries.filter((e: any) => e.status === "information_gap").length} |
| Words before (history + notes, including credits) | ${before} |
| Words after | ${after} |
| Reduction | ${((1 - after / before) * 100).toFixed(1)}% |

All 173 original performance-note entries and all 11 recording rows were
reviewed. The recording rows had no separate notes. ${entries.filter((e: any) => e.notes).length} tune entries retain
grounded version notes. Recording/source credits and version/tuning fields
were not changed.

## Approach

Remove padding and duplicated metadata without creating new history.
Short drafts were checked against original dates; source/license credits and
distinct linked-recording descriptions were retained. Fuller original text
was conservatively edited where a draft introduced dates or over-compressed
the entry. Supported dated statements were restored when missing.
Concise metadata-only entries were not expanded. Unsupported technique and
title-inspired advice was removed rather than replaced.

This is the owner's requested catalog-wide incremental improvement, not an
exhaustive new historical investigation. Surviving attributed history has
not all been independently re-researched.

## Representative changes

- Sally Goodin: retain Robertson's documented July 1, 1922 session; remove
  the first-ever superlative, unsupported session-producer claim and mandatory
  elbow-driven bowing instructions.
- Old Joe Clark: separate competing origin stories from established history;
  do not turn a soldier's discharge year into his death date.
- Kitchen Girl: replace invented kitchen imagery with the Jabbours' documented
  June 18, 1966 Henry Reed recording and the Hollow Rock transmission.
- Cripple Creek: do not assert a definite Virginia origin where sources give
  competing Virginia and Colorado explanations.
- Lonnie's Polka: preserve Bob Holt's uncertain radio-transmission account
  as uncertainty, not a confident composer credit.

## References spot-checked

- UC Santa Barbara DAHR, Victor matrix B-26664:
  https://adp.library.ucsb.edu/index.php/matrix/detail/800000585/B-26664-Sallie_Gooden
- Library of Congress, Kitchen Girl:
  https://www.loc.gov/item/afcreed000095
- Traditional Tune Archive:
  https://tunearch.org/wiki/Annotation:Old_Joe_Clark
  https://tunearch.org/wiki/Annotation:Cripple_Creek

## Coverage, backups and application

Large outputs intentionally live outside Git/deployment:
\`generated-artifacts/tune-copy/snapshot.json\` (database, seed, overrides),
\`approved.json\` (per-entry review),
\`coverage.json\`, \`coverage.csv\`, and \`review-report.html\` (coverage and examples).
The HTML report is self-contained and includes every tune.

The one-time application script is
\`server/scripts/reviseTuneCopy.ts\`; its prepare mode requires the retained
editorial inputs in that generated directory. Apply compares snapshot/effective
copy, overrides and seed hashes under locks and aborts on conflicts. Metadata
and recording preservation are asserted. Do not rerun preparation against
a different catalog or use the snapshot to overwrite newer owner edits.

Only prose fields in the tune seed were changed. Manual copy overrides still
take precedence during startup sync. Development now reads development seed
files even if an old build exists. Server and browser share the same plain
SEO snippet function; short descriptions no longer gain a spurious ellipsis.

## Checks

- \`npx tsx server/scripts/testTuneCopy.ts\`
- \`npx tsx server/scripts/reviseTuneCopy.ts verify\` (requires retained snapshot)
- \`npx tsx server/scripts/testTuneCopyOverrides.ts\` (actual sync SQL, rolled back)
- \`npm run build\`
- Public Kitchen Girl page screenshot; public API and server-rendered SEO checks.
- Startup seed sync followed by full-catalog verification.

The existing \`npm run check\` baseline also reports six unrelated errors:
missing essentia.js declarations and ES5 iteration/target errors in older
audio-audit scripts. This copy change introduces no additional errors.
`);
console.log("Wrote full coverage JSON/CSV, self-contained HTML report, and concise docs summary.");
