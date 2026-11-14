# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 28 | 70 | 3 | 0 | 2 | 0 |
| 1 Black A02 | 28 | 32 | 4 | 2 | 0 | 0 |
| 2 White A02 | 17 | 108 | 4 | 0 | 2 | 0 |
| 2 Black A01 | 17 | 59 | 1 | 1 | 2 | 0 |
| 3 White A01 | 12 | 87 | 2 | 0 | 1 | 0 |
| 3 Black A02 | 12 | 9 | 1 | 0 | 0 | 0 |
| 4 White A02 | 25 | 93 | 3 | 2 | 2 | 0 |
| 4 Black A01 | 25 | 51 | 2 | 2 | 1 | 0 |

## Blunders and missed mates

- game 1, move 6. Nf6+ (A01): 313 to -154, best Ng3
- game 1, move 20. Qxd4 (A01): 85 to -1000, best Qe4
- game 2, move 8... Be6 (A01): 79 to -300, best exd4
- game 2, move 9. Bxe6 (A02): 300 to -11, best d5
- game 2, move 11... Nxc3 (A01): 88 to -255, best d5
- game 2, move 17. Qc5 (A02): 215 to -885, best Qe2
- game 3, move 11. Qe3 (A01): -86 to -1000, best Qf4
- game 4, move 16... Kg7 (A01): 9 to -489, best Qf5
- game 4, move 17. Nf3 (A02): 489 to -12, best Qg5+
- game 4, move 25. Qf5 (A02): 127 to -1000, best Nd1
