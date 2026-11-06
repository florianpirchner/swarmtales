# quarry-04a-005-burn-as-loss

Four Haiku matches of `quarry-burn` on the seeds 31, 37, 41 and 43 (the deals of series 003), after the
game's result line words a returnable burn as a loss: "(its pack came back to A01 later: A01 lost that
card)" instead of only saying that the pack came back (P126). 4 seats, 3 games of 2 packs of 6, free burns
(at most two a game), place bonus 10/5, strategy brain on, hidden hands. Run in parallel on 2026-11-06
(`swt run --story quarry-burn --provider anthropic --model haiku --seed <n>`). One folder per match
(`quarry-burn-<seed>/run/`, with the reporter's draft `REPORT.md`); every signed log verifies.

**Cost 0.133 USD** for the 4 matches (0.032-0.036 each), plus about 0.008 USD for the reporter drafts
(OpenRouter).

## Result

| Seed | Table score (005) | burn arm 003 | no-burn arm 003 | Burns 005 (own colour, early) | Burns 003 (own colour, early) |
|---:|---:|---:|---:|---|---|
| 31 | 739 | 874 | 981 | 12 (7, 5) | 14 (13, 5) |
| 37 | 756 | 651 | 789 | 13 (10, 2) | 21 (19, 9) |
| 41 | 754 | 758 | 878 | 11 (9, 3) | 13 (9, 3) |
| 43 | 838 | 776 | 869 | 13 (10, 5) | 18 (16, 4) |
| **all** | **3087** | **3059** | **3517** | **49 (36, 15)** | **66 (57, 21)** |

The table score is the sum of all quarries over the match without the place bonus. "Early" is the same
pack-size estimate as in 003; the mechanic's own line marked 24 of the 49 burns as "lost that card".

Inside the 48 seat-games:

| Burns in the game | Seat-games | Mean score (with place bonus) |
|---:|---:|---:|
| 0 | 15 | 74.6 |
| 1 | 17 | 68.8 |
| 2 | 16 | 62.4 |

Burns per game, summed over the four matches: 13, 17, 19 (003: 18, 25, 23). No pick missed or refused;
7 of 48 brain retros were refused.

## Digest highlights

- **Fewer burns, fewer own-colour burns.** 49 burns against 66 on the same deals, own colour 73 % against
  86 %. Several brains now write the rule themselves: "Never burn my own" (A02 seed 37 #865, A02 seed 43
  #884, A01 seed 43 #906), or "only to deny a rival's main colour".
- **The table does not recover.** 3087 against 3059 with the old line: 1 % more, still 12 % below the no-burn
  arm (3517). Seat-games without a burn still score 12 points more than seat-games with two.
- **Burns still rise over the match** (13, 17, 19). The loss line teaches "not my own colour", not "not at
  all": the burns move to rival colours, which the line never marks as lost.
- **One brain dismisses the line.** "Burned cards may return to their owner; ignore them when planning" (A04
  seed 43 #870). Others keep "burn a second copy of my own colour" (A01 seed 37 #838, A03 seed 31 #883).

## Problems

- **P126 (partly fixed):** the loss wording helps with own-colour burns, but the cost of a rival-colour burn
  (the card the burner could have scored) is still invisible.
- **P120 (fixed, holds):** 7 of 48 brain writes were first refused as too long (run 004: 3 of 27); each seat shortened and wrote, no brain lost.
- P121/P122 unchanged: per-pick regret is blunt, scores per game differ by deal.

## Optimizations (proposals, open)

- Show every burn's cost in points, not only returned ones: "A01 burned jade, worth +7 to A01 in the end".
- Or make burns a cost (back to the original P123 rules) only for `quarry-burn`, since the free burn does not
  pay with Haiku on 8 matches.
- Keep `quarry` (no burns) as the default; more burn wording runs have low value.

## Loopholes

None. The reporter's candidates are the intended free burn and the city-shaped reading of a core story (P89).
