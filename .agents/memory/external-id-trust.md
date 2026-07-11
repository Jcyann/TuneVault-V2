---
name: External reference IDs must be verified, not trusted
description: Stored third-party IDs (TheSession, etc.) in this project have been fabricated before; verify by strict title match before using or linking them.
---

# External reference IDs must be verified, not trusted

Rule: before using any stored third-party identifier (TheSession tune ID, MusicBrainz ID, etc.) for enrichment or public links, verify it by fetching the remote record and strict-matching its title/aliases against the tune's title/alternate titles. Clear or correct IDs that fail; never enrich through an unverified ID.

**Why:** In July 2026, ALL 35 stored `the_session_id` values turned out to point at unrelated Irish tunes (fabricated data from an earlier session) and were publicly linked on tune pages. 24 were corrected via strict title search, 10 cleared, 1 was correct. A wrong match/link is worse than none — the owner has been publicly criticized for invented content.

**How to apply:** `server/scripts/enrichFromPublicSources.ts --source=fix-session-ids` is the pattern: re-check stored ID → exact-title search → disambiguate by key tonic → NULL when ambiguous. Any new external-ID column should get the same audit before being surfaced.
