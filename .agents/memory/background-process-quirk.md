---
name: Background shell processes die between tool calls
description: nohup/setsid processes launched from the bash tool are killed when the shell session ends; long scripts must be resumable and run in chunks.
---

# Background shell processes die between tool calls

Rule: do not rely on `nohup`/`setsid ... &` from the bash tool to keep long scripts running across tool calls — the process group is killed when the shell session ends, and the log file may not even be created.

**Why:** Observed twice in one session: backgrounded enrichment scripts silently died with stalled logs while appearing "started".

**How to apply:** Write batch scripts to be idempotent and resumable (skip already-done rows, support `--skip`/`--limit` chunking), then run them synchronously within the tool's execution-time cap, repeating the call until the "done" summary line appears.
