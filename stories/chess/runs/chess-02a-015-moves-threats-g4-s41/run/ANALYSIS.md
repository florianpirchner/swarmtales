# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 27 | 40 | 3 | 4 | 0 | 0 |
| 1 Black A02 | 26 | 80 | 3 | 2 | 3 | 0 |
| 2 White A02 | 36 | 46 | 4 | 3 | 1 | 0 |
| 2 Black A01 | 36 | 35 | 4 | 3 | 1 | 0 |
| 3 White A01 | 23 | 47 | 0 | 0 | 1 | 0 |
| 3 Black A02 | 23 | 4 | 0 | 0 | 0 | 0 |
| 4 White A02 | 34 | 26 | 3 | 0 | 1 | 0 |
| 4 Black A01 | 33 | 50 | 3 | 1 | 2 | 0 |

## Blunders and missed mates

- game 1, move 11... Re8 (A02): -37 to -338, best d5
- game 1, move 20... Nc2 (A02): -41 to -517, best Qc8
- game 1, move 24... g6 (A02): -521 to -1000, best Nd7
- game 2, move 11... Nd4 (A01): 49 to -382, best Ng4
- game 2, move 36. Rc6 (A02): 315 to -376, best Rd7
- game 3, move 14. Qd4 (A01): 6 to -1000, best Rf2
- game 4, move 11... Nxe4 (A01): -25 to -381, best h6
- game 4, move 17. Bf4 (A02): 469 to 10, best Re1
- game 4, move 30... Rf5 (A01): 107 to -633, best c5
