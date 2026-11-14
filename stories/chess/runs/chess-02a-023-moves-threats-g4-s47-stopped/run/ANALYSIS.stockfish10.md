# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 18 | 58 | 3 | 6 | 0 | 0 |
| 1 Black A02 | 17 | 127 | 3 | 5 | 2 | 0 |
| 2 White A02 | 24 | 118 | 3 | 5 | 3 | 3 |
| 2 Black A01 | 23 | 162 | 4 | 5 | 4 | 0 |
| 3 White A01 | 21 | 71 | 6 | 2 | 2 | 0 |
| 3 Black A02 | 20 | 100 | 3 | 5 | 2 | 0 |

## Blunders and missed mates

- game 1, move 10... Nd4 (A02): 29 to -526, best Ne7
- game 1, move 17... Qxd4+ (A02): -444 to -1000, best Qc7
- game 2, move 8... Nd4 (A01): 24 to -512, best d6
- game 2, move 17... Rfe8 (A01): -362 to -662, best Qc5+
- game 2, move 20. Qd5 (A02): 472 to -401, best d4
- game 2, move 20... Qc3 (A01): 401 to -996, best Re1+
- game 2, move 21. Rf1 (A02): 996 to 617, best Qxf7+, missed a forced mate
- game 2, move 21... Qxc2 (A01): -617 to -996, best Qf6
- game 2, move 22. Qxb7 (A02): 996 to 646, best Qxf7+, missed a forced mate
- game 2, move 24. Bxa6 (A02): 996 to 1000, best Qxf7+, missed a forced mate
- game 3, move 10... Nd4 (A02): 33 to -514, best h6
- game 3, move 16. Nd4 (A01): 626 to 250, best dxc4
- game 3, move 16... Qd7 (A02): -250 to -704, best Qb6
- game 3, move 20. Nd4 (A01): 854 to 521, best Qg5
