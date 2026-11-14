# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 17 | 64 | 0 | 0 | 2 | 0 |
| 1 Black A02 | 17 | 6 | 0 | 0 | 0 | 0 |
| 2 White A02 | 22 | 74 | 2 | 2 | 2 | 0 |
| 2 Black A01 | 22 | 28 | 2 | 3 | 0 | 0 |
| 3 White A01 | 27 | 8 | 0 | 0 | 0 | 0 |
| 3 Black A02 | 26 | 46 | 1 | 0 | 2 | 0 |
| 4 White A02 | 22 | 29 | 1 | 3 | 0 | 0 |
| 4 Black A01 | 22 | 13 | 2 | 0 | 0 | 0 |

## Blunders and missed mates

- game 1, move 10. Nd5 (A01): 13 to -453, best d4
- game 1, move 17. Qb5 (A01): -457 to -1000, best d5
- game 2, move 14. Bb6 (A02): -187 to -513, best Qxb7
- game 2, move 22. Rf5 (A02): -524 to -1000, best Rae1
- game 3, move 14... Qxe3 (A02): 28 to -540, best Rad8
- game 3, move 23... Rf5 (A02): -616 to -1000, best Rad8
