# Tune-page copy review

Completed across 1348 tunes in four batches of 337.

| Outcome | Count |
|---|---:|
| Revised | 1119 |
| Left concise | 218 |
| Honest information gap | 11 |
| Words before (history + notes, including credits) | 170917 |
| Words after | 67569 |
| Reduction | 60.5% |

All 173 original performance-note entries and all 11 recording rows were
reviewed. The recording rows had no separate notes. 11 tune entries retain
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
`generated-artifacts/tune-copy/snapshot.json` (database, seed, overrides),
`approved.json` (per-entry review),
`coverage.json`, `coverage.csv`, and `review-report.html` (coverage and examples).
The HTML report is self-contained and includes every tune.

The one-time application script is
`server/scripts/reviseTuneCopy.ts`; its prepare mode requires the retained
editorial inputs in that generated directory. Apply compares snapshot/effective
copy, overrides and seed hashes under locks and aborts on conflicts. Metadata
and recording preservation are asserted. Do not rerun preparation against
a different catalog or use the snapshot to overwrite newer owner edits.

Only prose fields in the tune seed were changed. Manual copy overrides still
take precedence during startup sync. Development now reads development seed
files even if an old build exists. Server and browser share the same plain
SEO snippet function; short descriptions no longer gain a spurious ellipsis.

## Checks

- `npx tsx server/scripts/testTuneCopy.ts`
- `npx tsx server/scripts/reviseTuneCopy.ts verify` (requires retained snapshot)
- `npx tsx server/scripts/testTuneCopyOverrides.ts` (actual sync SQL, rolled back)
- `npm run build`
- Public Kitchen Girl page screenshot; public API and server-rendered SEO checks.
- Startup seed sync followed by full-catalog verification.

The existing `npm run check` baseline also reports six unrelated errors:
missing essentia.js declarations and ES5 iteration/target errors in older
audio-audit scripts. This copy change introduces no additional errors.
