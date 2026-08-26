---
name: Slippery Hill audio sourcing
description: Reliable and safe way to discover direct recordings from Slippery Hill.
---

Slippery Hill directory pages reject broad automated scans, but verified direct recording URLs are available. Treat a candidate as reviewable only when its filename exactly represents the tune title or a stored alias, or an exact Slippery Hill `/content/` page has been fetched and proves both the tune heading and the direct audio link. The URL must pass the bounded HTTPS/MIME/audio-signature check. Run discovery in small batches; broad scans exceed the execution window.

**Why:** Filename guesses or self-asserted review fields can attach the wrong recording; source-page content must prove the title-to-file relationship. Large scans can also die before writing a usable report.

**How to apply:** Keep discovery read-only, store filename/title or source-page evidence in the review report, fetch the live source page and verify its heading and audio link immediately before applying, re-verify audio, and update seed exports after each applied batch.

Per-tune, the handful of filename-form guesses (title + aliases × known suffix patterns) are independent HEAD requests against the same host — checking them with `Promise.all` instead of sequentially roughly halves per-tune latency and makes a full ~850-tune backlog pass finish in a handful of chunked runs instead of dozens. Still chunk across tool calls (see background-process-quirk.md) since a full catalog pass still exceeds one call's time cap.