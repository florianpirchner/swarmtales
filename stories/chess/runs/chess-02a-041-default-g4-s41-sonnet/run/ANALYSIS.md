# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 48 | 7 | 1 | 2 | 0 |
| 1 Black A02 | 40 | 31 | 3 | 2 | 1 | 0 |
| 2 White A02 | 40 | 29 | 1 | 0 | 1 | 0 |
| 2 Black A01 | 40 | 11 | 1 | 0 | 0 | 0 |
| 3 White A01 | 40 | 14 | 2 | 1 | 0 | 0 |
| 3 Black A02 | 40 | 10 | 1 | 0 | 0 | 0 |
| 4 White A02 | 40 | 12 | 0 | 1 | 0 | 0 |
| 4 Black A01 | 40 | 17 | 2 | 1 | 0 | 0 |

## Blunders and missed mates

- game 1, move 17. Be3 (A01): -37 to -570, best Nf5
- game 1, move 17... Rd7 (A02): 570 to 13, best Bc4
- game 1, move 39. Ke3 (A01): -7 to -588, best Nd6
- game 2, move 32. Rc1 (A02): 5 to -651, best Rhh1
