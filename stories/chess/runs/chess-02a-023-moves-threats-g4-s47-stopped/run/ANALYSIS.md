# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 18 | 20 | 3 | 1 | 0 | 0 |
| 1 Black A02 | 17 | 79 | 2 | 1 | 2 | 0 |
| 2 White A02 | 24 | 80 | 1 | 2 | 3 | 3 |
| 2 Black A01 | 23 | 128 | 3 | 1 | 4 | 0 |
| 3 White A01 | 21 | 35 | 1 | 1 | 1 | 0 |
| 3 Black A02 | 20 | 62 | 1 | 2 | 2 | 0 |

## Blunders and missed mates

- game 1, move 10... Nd4 (A02): -46 to -455, best Na5
- game 1, move 17... Qxd4+ (A02): -427 to -1000, best Qc7
- game 2, move 8... Nd4 (A01): -31 to -473, best d6
- game 2, move 20. Qd5 (A02): 433 to -211, best d4
- game 2, move 20... Qc3 (A01): 211 to -996, best Re1+
- game 2, move 21. Rf1 (A02): 996 to 554, best Qxf7+, missed a forced mate
- game 2, move 21... Qxc2 (A01): -554 to -996, best Rf8
- game 2, move 22. Qxb7 (A02): 996 to 543, best Qxf7+, missed a forced mate
- game 2, move 23... Qa6 (A01): -607 to -996, best Rf8
- game 2, move 24. Bxa6 (A02): 996 to 1000, best Qxf7+, missed a forced mate
- game 3, move 10... Nd4 (A02): 5 to -479, best d5
- game 3, move 16. Nd4 (A01): 578 to 249, best dxc4
- game 3, move 16... Qd7 (A02): -249 to -612, best Qc5
