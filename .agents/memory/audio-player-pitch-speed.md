---
name: Audio player pitch vs. speed constraint
description: Why the mini player cannot combine slowdown and transpose, and why Web Audio pitch-shift is not viable
---

**Rule:** In the site-wide mini player, slowdown must ALWAYS preserve pitch; transpose (semitone shift) applies only at 1× speed. The two are mutually exclusive on one HTMLAudioElement — transpose works via varispeed (`preservesPitch = false` + playbackRate), so combining it with a speed change makes slowdown drop the pitch.

**Why:** User-reported bug (July 2026): slowing down changed pitch site-wide whenever a semitone shift was set (the shift state persists across tunes). Fix: `transposing = semitones !== 0 && speed === 1`; set `preservesPitch` (+moz/webkit prefixes) BEFORE `playbackRate`; disable pitch controls with a "available at 1× speed" hint when speed ≠ 1.

**How to apply:** Any future audio-player work must keep this decoupling. Do NOT try Web Audio (MediaElementSource + pitch-shift worklet) for a proper independent pitch shift: most tune MP3s are external (oldtimefiddletunes.net, Internet Archive, loc.gov) without CORS headers, so a MediaElementSource outputs silence. A real solution would require proxying all audio through the server first.
