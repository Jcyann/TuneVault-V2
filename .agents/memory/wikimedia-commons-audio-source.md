---
name: Wikimedia Commons as an audio source lane
description: How to pull lawful, license-checked audio from Wikimedia Commons for tune enrichment, and what yield to expect.
---

# Wikimedia Commons as an audio source

Wikimedia Commons (`commons.wikimedia.org` API, files served from `upload.wikimedia.org`) has real, exactly-titled, CC/PD-licensed audio files discoverable via `action=query&prop=imageinfo` with candidate `File:<title>.<ext>` names (ogg/oga/flac/wav/mp3), and supports batched multi-title queries (pipe-separated, works well up to ~50 titles per call). License terms (`LicenseShortName`/`UsageTerms`) and attribution (`Artist`) are given directly in the response — reject anything with missing or restrictive terms before attaching.

Files are typically served as `content-type: application/ogg`, not `audio/*`; a playable-audio check must accept `application/ogg` in addition to `audio/*`, and should still confirm real audio via byte-signature (OggS magic bytes), not content-type alone.

Exact title/alias string match is not sufficient by itself: Commons hosts tens of millions of files for unrelated purposes (place-name pronunciation clips, synthesizer/test-tone audio, etc.), and a short alias like a tune's alternate title can coincidentally collide with one of those. Two real collisions found this way: a tune's alias "Dundee" matched a spoken pronunciation-of-the-place-name clip, and an alias "Canon" matched a synthesizer-generated test file (not a real performance).

**Why:** Confirmed via direct API probing and range-request byte checks; the collisions were only caught by reading each candidate's Commons `Categories`/`ImageDescription` extmetadata, not by the title match itself.

**How to apply:** Require positive evidence from the file's own Commons categories/description that it's traditional/folk music (genre or instrument keywords) and explicitly reject spoken-word/pronunciation/synthesizer-test patterns, in addition to license and playable-audio checks, before treating a title/alias match as a real candidate. Expect a very low hit rate for niche traditional-music backlogs even before this filter — Commons is a cheap lane worth including but not a primary source for this kind of catalog.
