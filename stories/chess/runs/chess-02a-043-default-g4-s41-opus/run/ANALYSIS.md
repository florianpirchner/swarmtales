# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 33 | 63 | 0 | 1 | 3 | 0 |
| 1 Black A02 | 33 | 31 | 2 | 0 | 1 | 0 |
| 2 White A02 | 40 | 27 | 3 | 4 | 0 | 0 |
| 2 Black A01 | 40 | 29 | 6 | 1 | 1 | 0 |
| 3 White A01 | 40 | 17 | 3 | 2 | 0 | 0 |
| 3 Black A02 | 40 | 14 | 1 | 3 | 0 | 0 |
| 4 White A02 | 40 | 29 | 1 | 1 | 1 | 0 |
| 4 Black A01 | 40 | 2 | 0 | 0 | 0 | 0 |

## Blunders and missed mates

- game 1, move 29. Ra1 (A01): -65 to -843, best Rb1
- game 1, move 29... Qb4 (A02): 843 to 69, best Qxa1+
- game 1, move 31. Qxb2 (A01): -66 to -411, best Ne1
- game 1, move 32. Ra1 (A01): -402 to -1000, best Nd2
- game 2, move 38... Kxf7 (A01): 402 to -121, best c4
- game 4, move 26. Rc1 (A02): -52 to -721, best Ng3
