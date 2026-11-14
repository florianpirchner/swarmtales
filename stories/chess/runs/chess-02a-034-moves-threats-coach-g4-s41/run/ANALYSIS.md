# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 21 | 21 | 2 | 1 | 0 | 0 |
| 1 Black A02 | 20 | 69 | 4 | 2 | 1 | 0 |
| 2 White A02 | 16 | 6 | 0 | 0 | 0 | 0 |
| 2 Black A01 | 15 | 74 | 0 | 0 | 1 | 0 |
| 3 White A01 | 15 | 86 | 1 | 0 | 1 | 0 |
| 3 Black A02 | 15 | 20 | 3 | 0 | 0 | 0 |
| 4 White A02 | 29 | 57 | 2 | 2 | 2 | 0 |
| 4 Black A01 | 29 | 24 | 3 | 2 | 0 | 0 |

## Blunders and missed mates

- game 1, move 20... Qd6 (A02): -552 to -1000, best Qb7
- game 2, move 15... Qxc3 (A01): 24 to -1000, best b5
- game 3, move 15. Qxa7 (A01): 133 to -1000, best Qa6
- game 4, move 7. Be6 (A02): 11 to -494, best a3
- game 4, move 29. Re6 (A02): -368 to -1000, best Re2
