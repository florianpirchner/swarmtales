# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 39 | 31 | 2 | 2 | 1 | 0 |
| 1 Black A02 | 38 | 51 | 4 | 2 | 2 | 0 |
| 2 White A02 | 23 | 87 | 3 | 1 | 2 | 0 |
| 2 Black A01 | 23 | 45 | 0 | 3 | 1 | 0 |

## Blunders and missed mates

- game 1, move 17... Nd3 (A02): 24 to -461, best Rf8
- game 1, move 22. Ne7+ (A01): 551 to -9, best Nxb6
- game 1, move 25... Ra3 (A02): 114 to -629, best h5
- game 2, move 16. Re2 (A02): 273 to -71, best exf6
- game 2, move 16... Nd4 (A01): 71 to -284, best Ne4
- game 2, move 18. Qc2 (A02): 287 to -728, best exf6
