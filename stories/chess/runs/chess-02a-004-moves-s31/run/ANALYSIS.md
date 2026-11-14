# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 15 | 75 | 0 | 0 | 1 | 0 |
| 1 Black A02 | 15 | 9 | 0 | 0 | 0 | 0 |
| 2 White A02 | 35 | 33 | 4 | 1 | 1 | 0 |
| 2 Black A01 | 34 | 62 | 4 | 2 | 3 | 0 |

## Blunders and missed mates

- game 1, move 15. Qe5 (A01): 35 to -1000, best Qd3
- game 2, move 14... Nf5 (A01): 78 to -366, best Ne6
- game 2, move 19... Qe6 (A01): -343 to -1000, best Qe7
- game 2, move 21. Qxf7+ (A02): 1000 to 358, best Rd1
- game 2, move 31... Rd3 (A01): -666 to -1000, best Rd2
