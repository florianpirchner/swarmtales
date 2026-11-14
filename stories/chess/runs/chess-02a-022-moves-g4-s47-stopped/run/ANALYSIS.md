# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 13 | 21 | 2 | 1 | 0 | 0 |
| 1 Black A02 | 13 | 17 | 2 | 0 | 0 | 0 |
| 2 White A02 | 17 | 19 | 2 | 1 | 0 | 0 |
| 2 Black A01 | 16 | 85 | 1 | 3 | 2 | 0 |
| 3 White A01 | 25 | 39 | 1 | 1 | 2 | 0 |
| 3 Black A02 | 25 | 2 | 0 | 0 | 0 | 0 |
| 4 White A02 | 10 | 25 | 2 | 0 | 0 | 0 |
| 4 Black A01 | 10 | 26 | 1 | 1 | 0 | 0 |

## Blunders and missed mates

- game 2, move 14... Nxe4 (A01): -135 to -574, best Bxe3
- game 2, move 16... cxb6 (A01): -632 to -1000, best Bxf3
- game 3, move 11. Nxd4 (A01): -230 to -659, best Ne4
- game 3, move 13. Qxd6 (A01): -631 to -1000, best Qc1
