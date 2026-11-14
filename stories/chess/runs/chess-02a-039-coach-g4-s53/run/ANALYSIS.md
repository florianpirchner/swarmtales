# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 102 | 5 | 2 | 6 | 2 |
| 1 Black A02 | 40 | 88 | 2 | 6 | 4 | 0 |
| 2 White A02 | 40 | 93 | 1 | 6 | 5 | 0 |
| 2 Black A01 | 40 | 85 | 2 | 4 | 4 | 0 |
| 3 White A01 | 30 | 145 | 4 | 1 | 7 | 0 |
| 3 Black A02 | 29 | 185 | 1 | 1 | 9 | 0 |
| 4 White A02 | 32 | 71 | 2 | 1 | 3 | 0 |
| 4 Black A01 | 31 | 106 | 3 | 1 | 4 | 0 |

## Blunders and missed mates

- game 1, move 10... Nxe5 (A02): -195 to -940, best d5
- game 1, move 11. Bb3 (A01): 940 to 448, best dxe5
- game 1, move 13. Nc5 (A01): 797 to 387, best Bg5
- game 1, move 14... Qxc5 (A02): -480 to -997, best Rd8
- game 1, move 15. Be3 (A01): 997 to 456, best Qxf7+, missed a forced mate
- game 1, move 15... Qb6 (A02): -456 to -998, best Qe7
- game 1, move 16. Qd5 (A01): 998 to 383, best Qxf7+, missed a forced mate
- game 1, move 19... Rd6 (A02): -487 to -1000, best c6
- game 1, move 20. Bc4 (A01): 1000 to 356, best Bxa8
- game 1, move 21. Bf4 (A01): 352 to -42, best Rac1
- game 2, move 15... Bd5 (A01): 41 to -292, best b5
- game 2, move 17... Nxc3 (A01): -296 to -726, best Nf4
- game 2, move 18. Qe3 (A02): 726 to 162, best bxc3
- game 2, move 24... Qg4 (A01): -73 to -1000, best d5
- game 2, move 25. Qxg4 (A02): 1000 to 561, best hxg4
- game 2, move 26. Nf5 (A02): 562 to 114, best hxg4
- game 2, move 37. Re3 (A02): 136 to -497, best Bxa4
- game 2, move 39... Kf6 (A01): 427 to -14, best f4
- game 2, move 40. Kh2 (A02): 14 to -321, best a3
- game 3, move 11. Bb5 (A01): 6 to -413, best Qc1
- game 3, move 11... c6 (A02): 413 to 35, best axb5
- game 3, move 14... Bxc4 (A02): 94 to -357, best g5
- game 3, move 15... Nd5 (A02): -336 to -1000, best g5
- game 3, move 17. exd5 (A01): 1000 to 429, best Bxd8
- game 3, move 17... Rc8 (A02): -429 to -1000, best Qc7
- game 3, move 18. Qd3 (A01): 1000 to 401, best Bxd8
- game 3, move 22... Rb5 (A02): -392 to -824, best Bxe1
- game 3, move 23. Nxa5 (A01): 824 to 413, best cxb5
- game 3, move 24... Qc6 (A02): -355 to -1000, best Ra4
- game 3, move 25. Re4 (A01): 1000 to 353, best dxc6
- game 3, move 25... Re8 (A02): -353 to -1000, best Qc5
- game 3, move 26. Bf4 (A01): 1000 to 483, best dxc6
- game 3, move 26... Rc5 (A02): -483 to -1000, best Qa4
- game 3, move 27. Rd2 (A01): 1000 to 470, best dxc6
- game 3, move 27... Rxd5 (A02): -470 to -1000, best Qd7
- game 4, move 15. Ng5 (A02): -6 to -480, best a4
- game 4, move 15... Nh5 (A01): 480 to 12, best hxg5
- game 4, move 26. Qxe5 (A02): 78 to -457, best dxe5
- game 4, move 26... Qd7 (A01): 457 to -212, best Rxe5
- game 4, move 27. Red1 (A02): 212 to -581, best Qxe6
- game 4, move 27... Rf7 (A01): 581 to -108, best Rxe5
- game 4, move 31... Qe4 (A01): -89 to -1000, best Rbf5
