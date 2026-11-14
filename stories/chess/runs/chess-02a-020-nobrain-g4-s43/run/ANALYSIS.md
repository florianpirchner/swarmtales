# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 26 | 111 | 0 | 2 | 6 | 2 |
| 1 Black A02 | 25 | 153 | 0 | 2 | 7 | 0 |
| 2 White A02 | 40 | 86 | 6 | 2 | 3 | 0 |
| 2 Black A01 | 40 | 61 | 3 | 1 | 2 | 0 |
| 3 White A01 | 40 | 99 | 2 | 1 | 6 | 0 |
| 3 Black A02 | 40 | 81 | 3 | 1 | 5 | 0 |
| 4 White A02 | 35 | 37 | 2 | 1 | 2 | 0 |
| 4 Black A01 | 34 | 65 | 0 | 2 | 4 | 0 |

## Blunders and missed mates

- game 1, move 9... Re8 (A02): -8 to -358, best exd4
- game 1, move 10. Nbd2 (A01): 358 to 6, best d5
- game 1, move 14... Nd7 (A02): -28 to -346, best b5
- game 1, move 15. Bb3 (A01): 346 to 33, best d5
- game 1, move 17... Ne5 (A02): -36 to -415, best c6
- game 1, move 18. Nxe5 (A01): 415 to 44, best dxe5
- game 1, move 18... Rxe5 (A02): -44 to -560, best dxe5
- game 1, move 19. Rae1 (A01): 560 to 47, best dxe5
- game 1, move 19... Qe7 (A02): -47 to -558, best Rb5
- game 1, move 20. Nd2 (A01): 558 to 65, best dxe5
- game 1, move 20... Bg5 (A02): -65 to -589, best Rb5
- game 1, move 21. Nf3 (A01): 589 to 148, best dxe5
- game 1, move 21... Rxe4 (A02): -148 to -1000, best Rb5
- game 1, move 23. Nxg5 (A01): 998 to 1000, best Re8+, missed a forced mate
- game 1, move 24. Qxc7 (A01): 998 to 812, best Re8+, missed a forced mate
- game 2, move 8... Bg4 (A01): -4 to -401, best Be6
- game 2, move 19. d5 (A02): 283 to -313, best e5
- game 2, move 29... Qf4 (A01): 303 to -972, best Rce8
- game 2, move 30. Nd2 (A02): 972 to -311, best gxf4
- game 2, move 39. Qb6 (A02): -399 to -1000, best Kg1
- game 3, move 16... Ng4 (A02): -129 to -525, best h6
- game 3, move 17. Bg5 (A01): 525 to 37, best hxg4
- game 3, move 26... Qe7 (A02): 9 to -766, best g6
- game 3, move 27. Qg3 (A01): 766 to 30, best Nxe7
- game 3, move 27... g6 (A02): -30 to -757, best Qf8
- game 3, move 33. Rf3 (A01): 755 to 27, best Qg3
- game 3, move 34. Rg3 (A01): 28 to -469, best hxg4
- game 3, move 38... Nxb3 (A02): 583 to 211, best f5
- game 3, move 39. h4 (A01): -211 to -691, best axb3
- game 3, move 39... Kh7 (A02): 691 to 211, best Nc1
- game 3, move 40. Rgg3 (A01): -211 to -691, best axb3
- game 4, move 15... Nxc3 (A01): 139 to -263, best Nxd2
- game 4, move 16... Bg4 (A01): -268 to -811, best f6
- game 4, move 31. Bb2 (A02): 935 to 504, best Nc4
- game 4, move 31... Rc2 (A01): -504 to -911, best Rb3
- game 4, move 33. Bb2 (A02): 935 to 504, best Nc4
- game 4, move 33... Rc2 (A01): -504 to -911, best Rb3
