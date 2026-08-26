---
name: Exact title match is insufficient for open-corpus audio sources
description: Internet Archive and Wikimedia Commons both attached wrong audio through exact title/alias matches; a positive genre/context check on the source's own metadata is required before auto-attaching.
---

# Exact title match is insufficient for open-corpus audio sources

Rule: for any audio-sourcing lane against a general-purpose open corpus (Internet Archive, Wikimedia Commons, or similar — as opposed to a single-purpose curated site for this exact repertoire), an exact title/alias string match on the item's own name is not sufficient evidence it's a genuine recording of the catalog tune. Require a deterministic positive-evidence check against the source's own metadata (genre/subject tags, description, categories) — traditional/folk/instrument keywords, a named performer/recording credit, or a recognized historical-archive marker — and explicitly reject spoken-word/audiobook, improv/freeform, off-genre, and non-music (pronunciation clips, synthesizer test tones) content, before auto-attaching.

**Why:** Exact-match-only auto-attach produced real wrong audio: an Internet Archive LibriVox audiobook attached to a same-named polka, an "improv solo" attached to an unrelated tune, two Jamendo tracks attached despite declared genres (electronic/hip-hop, rock) contradicting the tune's actual style, and on Wikimedia Commons a tune's stored alias "Dundee" matched a spoken place-name-pronunciation clip while another alias "Canon" matched a synthesizer-generated test file. All passed title matching cleanly; only reading the source's own descriptive metadata caught them.

**How to apply:** Build the disqualification/positive-evidence check as a small shared function reused by both the discovery script (to filter early) and the apply script (which must re-check live, since a review report is untrusted input). A single-purpose curated site for the exact repertoire (e.g. a dedicated old-time-fiddle archive) carries much lower collision risk and may not need the same bar, but any general-purpose media host does.
