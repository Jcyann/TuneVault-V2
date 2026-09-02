---
name: Dry-run cursor semantics
description: How resumable ingestion must handle candidates discovered without applying them
---

Dry-run candidates are nonterminal. A later live resume must revisit the earliest pending candidate before continuing beyond the discovery cursor, and must run the complete source adapter again rather than trusting stale candidate fields.

**Why:** A single cursor advanced during dry-run discovery can place every pending candidate behind the live resume position, silently preventing those candidates from ever being applied.

**How to apply:** Any resumable discovery/application pipeline must either keep separate discovery and application cursors or rewind live resumes to the earliest nonterminal candidate. Re-run identity, rights, attribution, and file checks immediately before application.