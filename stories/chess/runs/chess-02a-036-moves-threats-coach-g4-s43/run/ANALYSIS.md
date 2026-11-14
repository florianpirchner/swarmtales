# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 26 | 67 | 0 | 0 | 3 | 0 |
| 1 Black A02 | 26 | 29 | 2 | 0 | 1 | 0 |
| 2 White A02 | 26 | 67 | 3 | 2 | 2 | 0 |
| 2 Black A01 | 26 | 28 | 3 | 2 | 0 | 1 |
| 3 White A01 | 24 | 4 | 0 | 0 | 0 | 0 |
| 3 Black A02 | 23 | 47 | 0 | 0 | 1 | 0 |
| 4 White A02 | 40 | 32 | 2 | 2 | 1 | 0 |
| 4 Black A01 | 40 | 45 | 3 | 0 | 2 | 0 |

## Blunders and missed mates

- game 1, move 15. Ne4 (A01): -3 to -354, best Qh3
- game 1, move 17... Bd6 (A02): 371 to -91, best Rad8
- game 1, move 22. Bd4 (A01): 247 to -370, best b4
- game 1, move 26. Qe6 (A01): -391 to -1000, best Qe2
- game 2, move 21. Qb3 (A02): 23 to -673, best Qxa6
- game 2, move 24. Ra2 (A02): -693 to -998, best Rf1
- game 2, move 24... Rf6 (A01): 998 to 710, best Qxf2+, missed a forced mate
- game 3, move 18... Qxc4 (A02): -20 to -1000, best Rde8
- game 4, move 16... Qe7 (A01): -1 to -678, best Qd7
- game 4, move 20. Kh2 (A02): 567 to -216, best Kf1
- game 4, move 24... Rxd3 (A01): 300 to -366, best Rd1
