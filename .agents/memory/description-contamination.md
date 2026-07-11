---
name: Tune descriptions can carry AI meta-language from old sessions
description: Legacy "web research" descriptions contained AI scaffolding; a gate in the seed export now blocks contaminated text, and a cleanup script fixes it.
---

# Tune descriptions can carry AI meta-language from old sessions

Rule: never ship prose that narrates the research process ("Here is what the search results reveal…", "I wasn't able to find…", "Sources: Web research compiled…"). Strip scaffolding when substantive facts remain; NULL the description when only hedge narrative exists — the honest placeholder is the correct state.

**Why:** A pre-July-2026 enrichment session wrote 662 such descriptions straight into the DB, and they went live. The owner has been publicly criticized for AI-invented content, so this class of text is a reputational hazard, not just a style issue.

**How to apply:** `server/scripts/cleanDescriptionArtifacts.ts` (dry-run first) does the cleanup; `server/scripts/exportTunesToSeed.ts` refuses to export while any description matches its meta-language regex, so contamination cannot silently re-enter the seed. Extend both regexes if new phrasings appear.
