# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 84 | 2 | 2 | 4 | 1 |
| 1 Black A02 | 40 | 99 | 3 | 7 | 4 | 0 |
| 2 White A02 | 40 | 153 | 5 | 4 | 9 | 0 |
| 2 Black A01 | 40 | 179 | 5 | 2 | 11 | 0 |
| 3 White A01 | 32 | 63 | 2 | 1 | 2 | 0 |
| 3 Black A02 | 32 | 29 | 2 | 1 | 1 | 0 |
| 4 White A02 | 40 | 83 | 2 | 3 | 4 | 0 |
| 4 Black A01 | 40 | 98 | 6 | 2 | 6 | 0 |

## Blunders and missed mates

- game 1, move 17... Nf4 (A02): -25 to -451, best Bf6
- game 1, move 18. Bd3 (A01): 451 to -24, best Bxf4
- game 1, move 24. Rc6 (A01): 282 to -617, best Ba5
- game 1, move 24... Rc8 (A02): 617 to -33, best bxc6
- game 1, move 27. Nf5 (A01): 282 to -117, best Ba5
- game 1, move 39... Qxb4 (A02): -373 to -997, best Qa8
- game 1, move 40. axb4 (A01): 997 to 344, best Rxc8+, missed a forced mate
- game 1, move 40... Rd8 (A02): -344 to -704, best Na7
- game 2, move 11... Nd5 (A01): -2 to -480, best b5
- game 2, move 12. Qe2 (A02): 480 to 16, best exd5
- game 2, move 12... Bb6 (A01): -16 to -497, best Nf6
- game 2, move 13. h3 (A02): 497 to 34, best exd5
- game 2, move 15. Ne3 (A02): 71 to -338, best d4
- game 2, move 15... Re8 (A01): 338 to -83, best fxe3
- game 2, move 17... Be3 (A01): -87 to -527, best g5
- game 2, move 18. Nxe3 (A02): 527 to 130, best fxe3
- game 2, move 18... Ne5 (A01): -130 to -498, best fxe3
- game 2, move 30... Qe3 (A01): -667 to -1000, best Qa5
- game 2, move 31. Rc7 (A02): 1000 to 691, best fxe3
- game 2, move 31... Qc5 (A01): -691 to -1000, best Qb6
- game 2, move 36. Qf3 (A02): 794 to -24, best Qe3
- game 2, move 36... Qd5 (A01): 24 to -1000, best Rxf3
- game 2, move 37. Rc7 (A02): 1000 to 273, best exd5
- game 2, move 37... Qe6 (A01): -273 to -793, best Qd6
- game 2, move 38. Kh2 (A02): 793 to 96, best Qe3
- game 2, move 38... Rf5 (A01): -96 to -1000, best Rxf3
- game 2, move 40. Rb2 (A02): 789 to 153, best Rbc1
- game 2, move 40... Qxd3 (A01): -153 to -1000, best Rg5
- game 3, move 14. Qd3 (A01): 29 to -1000, best Bg5
- game 3, move 15... Qxc3 (A02): 1000 to 548, best Bxc5
- game 3, move 16. Nd7 (A01): -548 to -1000, best bxc3
- game 4, move 20... Nxb2 (A01): 16 to -363, best b5
- game 4, move 21. Qd2 (A02): 363 to -89, best Qxb2
- game 4, move 27... Na4 (A01): 89 to -352, best Nc4
- game 4, move 30. Rxe4 (A02): 162 to -489, best Nb2
- game 4, move 30... Rxe4 (A01): 489 to -157, best Qxa1+
- game 4, move 31. Qc2 (A02): 157 to -529, best Nb2
- game 4, move 31... Qe7 (A01): 529 to -216, best Qxa1+
- game 4, move 33. Qb3 (A02): 195 to -308, best Qd3
- game 4, move 33... Qe5 (A01): 308 to -158, best Qe4
- game 4, move 35... Qf2 (A01): -222 to -665, best Re3
