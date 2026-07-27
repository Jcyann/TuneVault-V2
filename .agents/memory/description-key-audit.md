---
name: Description-key audit (in progress)
description: Ongoing audit matching description key mentions against DB key field; large batch of verified corrections ready to apply.
---

## Status: PAUSED mid-execution

### What was done
- Queried all 1,848 descriptions for "in the key of X" patterns vs DB key field
- Found **68 root mismatches** (different first letter) + 176 mode-only mismatches
- Fixed description text for tunes whose F-key label was recently corrected:
  - Auger In The Ditch, Old Voile, Poor Little Johnny's Gone to War, Uncle Pink, Big Sandy
- Big Sandy DB key corrected F→A→G (user confirmed G)

### Confirmed key corrections still to apply to DB

**B-key cluster (27 tunes — DB says "B", clearly wrong for old-time fiddle):**
Verified keys from SH/TTA/web:

| ID | Title | Correct key | Source |
|---|---|---|---|
| 157 | Billy in the Lowland | C | TheSession/web |
| 165 | Blake's March | G | Ken Torke tab |
| 203 | Cacklin Hen | D | TTA (K:D) |
| 242 | Corn In The Crib | G | Blaine Smith tab |
| 317 | Full Moon Reel | A | Slippery Hill |
| 352 | Grey Haired Dancing Girl | A | AEAE tuning tab |
| 360 | Harrington Valley Two Step | A | Calvin Vollrath tab |
| 405 | Jeff Davis County Reel | C | Slippery Hill |
| 434 | Ladies on the Steamboat | G | TTA |
| 438 | Lady of the Lake 4 | D | Slippery Hill |
| 442 | Lantern In The Ditch | D | TTA |
| 518 | North Carolina Breakdown | G | Slippery Hill (Arthur Smith) |
| 655 | Santa Anna's Retreat | A Modal | Slippery Hill + Ken Torke tab |
| 708 | Sweet Dixie | D | Art Stamper tab (D key) |

Still needing verification (partial data only):
| 524 | Old Abe | ? | only Lamancusa found |
| 534 | Old Cow Crossing the Road | C or F | SH shows "C & F" |
| 535 | Old Cumberland | ? | SH found, key not extracted |
| 542 | Old Melinda | ? | TTA found, key not extracted |
| 546 | Old Parnell Reel | ? | SH found, key not extracted |
| 547 | Old Piss | ? | TTA found, key not extracted |
| 596 | Purcell's Reel | ? | SH found, key not extracted |
| 747 | Uncle Frank's Piece | ? | sheet music found |
| 751 | Wagoner | ? | SH found |
| 802 | Culburnie Cottage | ? | |
| 808 | Homage a Belle Gaspesie | ? | |
| 869 | Cherry Blossom Waltz | ? | |
| 947 | Tuscaloosa Waltz | ? | |

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
