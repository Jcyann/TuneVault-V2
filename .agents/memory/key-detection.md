---
name: Audio key-detection accuracy ceiling
description: Why TuneVault's essentia.js key-detection is human-review-only, not auto-fix
---

# Key detection on solo old-time fiddle is a hard problem

essentia.js `KeyExtractor` over the known-key calibration set (tunes that already
have a correct key + direct MP3) tops out around **~46% exact / ~58% tonic-only**
accuracy, regardless of pitch profile.

**Why:** old-time fiddle is solo with heavy open-string / double-stop drones,
which inflate the dominant in the chroma. Errors are overwhelmingly fifth/dominant
or relative-major/minor confusions (Cripple Creek A→G, Bonaparte's Retreat G→D,
Wildwood Flower C→G). KeyExtractor's profiles target full ensemble / electronic
music, not solo strings.

**Profiles tested** (bgate, krumhansl, temperley, shaath): all within a few points;
`temperley` was marginally best → that's the `DEFAULT_KEY_PROFILE`.

**Confidence is NOT a correctness signal here** — high-strength detections are
frequently wrong (e.g. June Apple → C# at high confidence). So
`KEY_CONFIDENCE_THRESHOLD` is an advisory UI label only.

**How to apply:** the detection engine ASSISTS a human reviewer (suggests a
candidate key + inline audio to verify); it must never auto-overwrite the tunes
table. Any "bulk approve by confidence" path is unsafe for unattended use and must
stay behind an explicit, warned confirmation. Re-running calibration after a
profile/param change is the way to re-measure — don't trust the number from memory.

# Batch-detection operational lessons (detectBadKeys)

**Download is the bottleneck, not analysis.** ffmpeg-over-HTTP decode ~4-5s/tune;
essentia analysis ~0.5-1s. oldtimefiddletunes.net appears to throttle concurrent
connections per IP, so a worker pool barely helps. The real lever is downloading
less: ffmpeg `-t 45` (input option, before `-i`) stops the HTTP read early, ~halving
bytes. The batch analyzes only the first 45s (key is stable); calibration still uses 90s.

**Scripts must not import server/autoSeed.ts** — it imports server/index.ts which
calls app.listen() on load → EADDRINUSE against the dev server. detectBadKeys inlines
its own `CREATE TABLE IF NOT EXISTS` guard instead.

**Never run overlapping batch passes.** The NOT EXISTS "skip already-queued" guard is
only safe for a single sequential run. Two concurrent processes (or a timed-out run
still finishing while the next starts) race the same not-yet-queued SELECT and insert
duplicate rows. Dedupe with: `DELETE FROM key_reviews a USING key_reviews b WHERE
a.tune_id=b.tune_id AND a.id>b.id`. There is intentionally no unique constraint on
tune_id (rejected + re-detected tunes legitimately get multiple rows over time).

**essentia WASM is not reentrant** — analyzePcm() serializes analysis through a promise
chain so callers can decode many files in parallel while analysis stays safe.
