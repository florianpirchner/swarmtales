# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 22 | 45 | 1 | 4 | 0 | 0 |
| 1 Black A02 | 21 | 90 | 1 | 2 | 3 | 0 |
| 2 White A02 | 40 | 63 | 4 | 3 | 4 | 0 |
| 2 Black A01 | 40 | 85 | 7 | 2 | 6 | 0 |
| 3 White A01 | 40 | 21 | 1 | 0 | 1 | 3 |
| 3 Black A02 | 40 | 46 | 1 | 0 | 3 | 0 |
| 4 White A02 | 40 | 64 | 2 | 2 | 2 | 1 |
| 4 Black A01 | 40 | 54 | 2 | 4 | 2 | 0 |

## Blunders and missed mates

- game 1, move 14... Nf4 (A02): 542 to -129, best Rb8
- game 1, move 20... Qxa2 (A02): -198 to -596, best Qc3
- game 1, move 21... Rxe8 (A02): -585 to -999, best g5
- game 2, move 4. O-O (A02): -20 to -433, best Bxc6
- game 2, move 4... Nf6 (A01): 433 to 7, best axb5
- game 2, move 5. d3 (A02): -7 to -445, best Bxc6
- game 2, move 5... Be7 (A01): 445 to -42, best axb5
- game 2, move 6. Nc3 (A02): 42 to -425, best Bxc6
- game 2, move 6... O-O (A01): 425 to -31, best axb5
- game 2, move 13... Nxe4 (A01): -160 to -508, best b4
- game 2, move 25... Kg8 (A01): -495 to -1000, best Kxe7
- game 2, move 31. Re4 (A02): 1000 to 698, best Bc3
- game 2, move 31... Kc6 (A01): -698 to -1000, best fxe4
- game 3, move 15... Nd4 (A02): 115 to -358, best Rxa2
- game 3, move 19... Rxe4 (A02): -448 to -1000, best c6
- game 3, move 26. Qxb7+ (A01): 994 to 367, best Rc1, missed a forced mate
- game 3, move 26... Qe7 (A02): -367 to -994, best Qxb7
- game 3, move 27. Qxe7+ (A01): 994 to 1000, best Rd7, missed a forced mate
- game 3, move 36. Re5+ (A01): 996 to 1000, best Re6, missed a forced mate
- game 4, move 9. Nd5 (A02): 4 to -408, best d4
- game 4, move 9... Bd6 (A01): 408 to 13, best Nxd5
- game 4, move 14... Qe6 (A01): 77 to -674, best d5
- game 4, move 33. Qxd5+ (A02): 998 to -415, best Qg4+, missed a forced mate
