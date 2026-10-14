---
name: Tune descriptions can carry AI meta-language from old sessions
description: Legacy "web research" descriptions contained AI scaffolding; a gate in the seed export now blocks contaminated text, and a cleanup script fixes it.
---

# Tune descriptions can carry AI meta-language from old sessions

Rule: never ship prose that narrates the research process ("Here is what the search results reveal…", "I wasn't able to find…", "Sources: Web research compiled…"). Strip scaffolding when substantive facts remain; NULL the description when only hedge narrative exists — the honest placeholder is the correct state.

**Why:** A pre-July-2026 enrichment session wrote 662 such descriptions straight into the DB, and they went live. The owner has been publicly criticized for AI-invented content, so this class of text is a reputational hazard, not just a style issue.

**How to apply:** `server/scripts/cleanDescriptionArtifacts.ts` (dry-run first) does the cleanup; `server/scripts/exportTunesToSeed.ts` refuses to export while any description matches its meta-language regex, so contamination cannot silently re-enter the seed. Extend both regexes if new phrasings appear.

## Editorial standard

Tune-page prose must retain historically accurate information, remove repetition and roughly half the fluff, and use a plain human voice. This is not a requirement to halve every description or replace facts with personality.

**Why:** The owner again reported reader feedback about overworked AI-sounding garble and repeated information. Removing obvious research scaffolding alone did not address the broader editorial problem.

**How to apply:** Review whole entries for inflated praise, speculative metaphors, repetitive provenance, pasted archive text, and invented-sounding performance advice. Preserve supported details and attribution; do not invent personal anecdotes to sound natural.

## Factual fidelity before bulk approval

Do not approve catalog-wide paraphrases based on coverage counts or shorter word counts alone. Compare factual relationships with the original, including what each date describes, and preserve source/license credits independently of the prose.

**Why:** Bulk editorial drafts changed a military discharge year into a death date, removed useful attributed history, and retained unsupported playing prescriptions despite explicit instructions. An entry having a review record does not make its replacement accurate.

**How to apply:** Bulk editing is acceptable; use source comparisons and factual guards rather than repeatedly asking for approval. Reject drafts that alter factual meaning, turn a collection citation into an earliest-appearance claim, or invent technique.

## Improvement over perfection

The owner wants catalog-wide incremental improvement in one batch or four, not an open-ended pursuit of perfect historical accounts.

**Why:** The owner explicitly corrected an approach that stopped after preparing drafts instead of shipping useful improvements.

**How to apply:** Complete the whole catalog in a few batches. Preserve recoverability, source credits and owner edits, fix concrete factual errors, and ship the improvement without making exhaustive new historical research a prerequisite.
