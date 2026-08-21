---
name: Tuner pitch regression coverage
description: Guardrails for validating real-time instrument pitch detection.
---

Pitch detection changes must be checked using the same 2048-sample buffer size as the browser analyser, including low-string frequencies such as D2, E2, G3, and A4—not only a 440 Hz reference tone.

**Why:** A normalized-difference pitch search can appear correct at A4 while selecting an early harmonic trough for lower strings, yielding a materially sharp reading.

**How to apply:** Keep synthetic sine-wave checks for every preset's lowest and highest string, plus the named low-string regression notes, whenever the detector or analyser settings change.