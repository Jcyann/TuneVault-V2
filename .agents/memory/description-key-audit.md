---
name: Description-key audit (in progress)
description: Ongoing audit matching description key mentions against DB key field; large batch of verified corrections ready to apply.
---

## Status: partially complete; remaining non-B audit is paused

### What was done
- Queried all 1,848 descriptions for "in the key of X" patterns vs DB key field
- Found **68 root mismatches** (different first letter) + 176 mode-only mismatches
- Fixed description text for tunes whose F-key label was recently corrected:
  - Auger In The Ditch, Old Voile, Poor Little Johnny's Gone to War, Uncle Pink, Big Sandy
- Big Sandy DB key corrected F→A→G (user confirmed G)

### Completed B-key audit

Every tune that carried the erroneous B-major label was rehomed after
source verification. Exact collection notation was the primary source for
the imported collection; Slippery Hill or the Traditional Tune Archive was
used only when the collection listing did not give a readable key. The
database and production seed snapshot now contain no B-major records, while
legitimate B-flat, minor, and modal values remain.

**Other mismatch groups with confirmed corrections:**

| ID | Title | DB key | Correct key | Source |
|---|---|---|---|---|
| 305 | Fireman's Dance Cotillion | G | G | ✓ confirmed correct |
| 314 | Forty Miles From Georgetown | G | C | Slippery Hill |
| 330 | Glory at the Meeting House | G | D | TTA |
| 490 | Morgan on the Railroad | G | G | ✓ confirmed (TTA #2) |
| 578 | Pleasure House Rag | G | D | Slippery Hill |
| 752 | Wagoner One Step | G | C | Slippery Hill |
| 566 | Paddy On The Pike | D | A | Slippery Hill |
| 317 | Full Moon Reel | B | A | Slippery Hill |
| 405 | Jeff Davis County Reel | B | C | Slippery Hill |

**Still unverified (no clear source found):**
- Crow Creek (252), Possum Trot 2 (588), Bell Cow desc vs DB mismatch,
  Nancy Rollins (501), Streak O' Lean Streak O' Fat (698), Waverley (763),
  Olga Blom's Waltz (922), New Money (512), Tie-Hacker Tune #2 (732),
  Tilden to the Whitehouse (733), Farewell Princeton (298), Grotts (354),
  Lady of the Lake 5 (439), Muddy Creek (494), Old Plantation (548),
  Paddy On The PA Turnpike (567), Rustic Dance (633), St. Joe Hornpipe (643),
  Shag Poke (662), Soppin' Up the Gravy (685), Red Fox Waltz (935),
  Valse de los Panos (976), Hawks And Eagles (364), The Horny Ewe (382),
  Jake's Got A Bellyache (400), Mississippi Echoes (483), Silver Lake (672),
  Wrassled With A Wildcat (790)

### Mode-only mismatches (176)
Mostly TheSession waltz imports where DB has "Am/Dm/Em/Bm/Gm" but description
regex captured just "A/D/E/B/G" — this is a regex artifact from the pattern
`[A-Gb#♭]+` not capturing the trailing 'm'. These descriptions are correct;
the regex pattern needs a minor fix to capture "Am", "Dm" etc.

### Script to resume
`server/scripts/checkFKeyTunes.ts` — modify for the B-key cluster, or write
a new `server/scripts/auditDescriptionKeys.ts` that:
1. Fetches SH/TTA for remaining unverified tunes
2. Applies all confirmed DB key corrections
3. Updates description text to match corrected key
4. Fixes mode-only descriptions (Am vs A)

### Key finding
The "B" key label in Lamancusa data appears to be a systematic data entry
error — "B" likely means Bb or was a placeholder. No old-time tune in the
Lamancusa collection that was verified against external sources turned out
to actually be in B.
