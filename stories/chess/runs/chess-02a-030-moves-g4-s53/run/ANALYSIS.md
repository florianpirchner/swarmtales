# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 24 | 98 | 3 | 4 | 2 | 0 |
| 1 Black A02 | 24 | 79 | 3 | 1 | 1 | 0 |
| 2 White A02 | 24 | 67 | 1 | 2 | 1 | 1 |
| 2 Black A01 | 23 | 115 | 2 | 0 | 2 | 0 |
| 3 White A01 | 22 | 67 | 0 | 2 | 2 | 0 |
| 3 Black A02 | 22 | 28 | 0 | 1 | 1 | 0 |
| 4 White A02 | 34 | 16 | 3 | 1 | 0 | 0 |
| 4 Black A01 | 33 | 39 | 3 | 1 | 1 | 0 |

## Blunders and missed mates

- game 1, move 23. Bxc7 (A01): -481 to -941, best Be5
- game 1, move 23... Bxb2 (A02): 941 to -483, best Rxb2+
- game 1, move 24. Rxb2 (A01): 483 to -464, best Kxf2
- game 2, move 22... Rd8 (A01): 224 to -998, best h6
- game 2, move 23. Qe7 (A02): 998 to -188, best Qe8+, missed a forced mate
- game 2, move 23... Rd7 (A01): 188 to -999, best Rf8
- game 3, move 12. Nd5 (A01): -5 to -476, best d4
- game 3, move 16... Nd4 (A02): 772 to 316, best d5
- game 3, move 18. Qxf1 (A01): -313 to -794, best Kxf1
- game 4, move 33... Rf5 (A01): 7 to -665, best c6
