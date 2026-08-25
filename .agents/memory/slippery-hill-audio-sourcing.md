---
name: Slippery Hill audio sourcing
description: Reliable and safe way to discover direct recordings from Slippery Hill.
---

Slippery Hill directory pages reject automated requests, but verified direct recording URLs are available. Treat a candidate as reviewable only when its filename exactly represents the tune title or a stored alias and the URL passes the bounded HTTPS/MIME/audio-signature check. Run discovery in small batches; broad scans exceed the execution window.

**Why:** Filename guesses alone can attach the wrong recording, while large scans can die before writing a usable report.

**How to apply:** Keep discovery read-only, store filename/title evidence in the review report, re-verify audio immediately before applying, and update seed exports after each applied batch.