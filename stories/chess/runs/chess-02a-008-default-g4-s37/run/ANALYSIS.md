# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 31 | 136 | 0 | 0 | 7 | 1 |
| 1 Black A02 | 31 | 102 | 1 | 1 | 5 | 0 |
| 2 White A02 | 40 | 141 | 2 | 3 | 8 | 0 |
| 2 Black A01 | 40 | 133 | 6 | 1 | 8 | 0 |
| 3 White A01 | 40 | 49 | 3 | 1 | 2 | 0 |
| 3 Black A02 | 40 | 64 | 7 | 1 | 3 | 0 |
| 4 White A02 | 38 | 105 | 4 | 4 | 4 | 0 |
| 4 Black A01 | 38 | 85 | 2 | 2 | 4 | 0 |

## Blunders and missed mates

- game 1, move 11... Na3 (A02): -25 to -452, best Nb6
- game 1, move 17... Qb5 (A02): -502 to -1000, best Qc7
- game 1, move 18. Qd3 (A01): 1000 to 589, best a4
- game 1, move 19. Nxb6 (A01): 804 to 491, best a4
- game 1, move 22... Re6 (A02): -522 to -1000, best Qd8
- game 1, move 23. c4 (A01): 1000 to 540, best dxe6
- game 1, move 23... Qb4 (A02): -540 to -1000, best Ree8
- game 1, move 24. Qd3 (A01): 1000 to 533, best dxe6
- game 1, move 27. f4 (A01): 553 to 229, best Rd3
- game 1, move 28... Rxe4 (A02): -212 to -999, best fxg3
- game 1, move 29. Bg5 (A01): 999 to 233, best Qxg7#, missed a forced mate
- game 1, move 30. Rd3 (A01): 274 to -998, best Bxe4
- game 2, move 23... Rxe4 (A01): -162 to -691, best Qc6
- game 2, move 24. Qf3 (A02): 691 to 24, best Bxe4
- game 2, move 24... Ra4 (A01): -24 to -628, best Re1+
- game 2, move 25. Qg2 (A02): 628 to 104, best bxa4
- game 2, move 27... Qc6 (A01): -106 to -682, best Ra5
- game 2, move 28. Qf1 (A02): 682 to 67, best bxa4
- game 2, move 28... Nd5 (A01): -67 to -681, best Ra5
- game 2, move 30. Be3 (A02): 706 to 43, best bxa4
- game 2, move 30... g6 (A01): -43 to -665, best Ra5
- game 2, move 31. f4 (A02): 665 to -2, best bxa4
- game 2, move 33... Kg7 (A01): -52 to -656, best Ra3
- game 2, move 34. Kg2 (A02): 656 to 57, best bxa4
- game 2, move 34... Be7 (A01): -57 to -666, best Ra3
- game 2, move 35. c4 (A02): 666 to 27, best bxa4
- game 2, move 37. Qe3 (A02): -171 to -493, best bxa4
- game 2, move 40... Nf5 (A01): 675 to 319, best Rxa2+
- game 3, move 23. Ng5 (A01): -68 to -450, best Re1
- game 3, move 23... Bxg5 (A02): 450 to 80, best e5
- game 3, move 34... Rxc3 (A02): 26 to -578, best Bc6
- game 3, move 39. Rb7 (A01): 643 to -103, best Rb6
- game 3, move 39... f6 (A02): 103 to -656, best Bxb7
- game 4, move 19... Qc6 (A01): -3 to -862, best e5
- game 4, move 20. Nf5 (A02): 862 to -356, best Nxc6
- game 4, move 20... Bd8 (A01): 356 to -67, best exf5
- game 4, move 21. Qd2 (A02): 67 to -358, best Nd4
- game 4, move 21... Nh7 (A01): 358 to -24, best exf5
- game 4, move 22. Nxd6 (A02): 24 to -363, best Nd4
- game 4, move 36... Rd4 (A01): 821 to 3, best Qxc3+
- game 4, move 37. Qxc4 (A02): -3 to -740, best cxd4
