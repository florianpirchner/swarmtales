# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 30 | 4 | 5 | 0 | 0 |
| 1 Black A02 | 40 | 33 | 7 | 1 | 1 | 0 |
| 2 White A02 | 40 | 29 | 3 | 0 | 1 | 0 |
| 2 Black A01 | 40 | 46 | 4 | 0 | 1 | 0 |
| 3 White A01 | 40 | 30 | 1 | 1 | 1 | 0 |
| 3 Black A02 | 40 | 31 | 2 | 1 | 1 | 0 |
| 4 White A02 | 40 | 11 | 1 | 0 | 0 | 0 |
| 4 Black A01 | 40 | 15 | 4 | 0 | 0 | 0 |

## Blunders and missed mates

- game 1, move 16... Nd4 (A02): -43 to -396, best Na5
- game 2, move 21. Bc3 (A02): 72 to -498, best Bd3
- game 2, move 40... Be7 (A01): 500 to -661, best Nd5
- game 3, move 25... Qe7 (A02): -19 to -363, best g6
- game 3, move 26. Nf5 (A01): 363 to 40, best d4
