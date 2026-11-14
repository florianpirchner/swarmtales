# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 190 | 4 | 5 | 8 | 1 |
| 1 Black A02 | 40 | 164 | 3 | 6 | 5 | 0 |
| 2 White A02 | 32 | 130 | 2 | 4 | 3 | 0 |
| 2 Black A01 | 32 | 99 | 2 | 3 | 4 | 0 |
| 3 White A01 | 40 | 105 | 4 | 0 | 5 | 0 |
| 3 Black A02 | 40 | 101 | 6 | 0 | 6 | 0 |
| 4 White A02 | 30 | 140 | 1 | 0 | 8 | 0 |
| 4 Black A01 | 30 | 106 | 1 | 0 | 7 | 0 |

## Blunders and missed mates

- game 1, move 20. Qxg5+ (A01): 406 to -929, best Nxh6+
- game 1, move 20... Kh7 (A02): 929 to -999, best hxg5
- game 1, move 21. Nxh6 (A01): 999 to 422, best Qg7#, missed a forced mate
- game 1, move 21... Ng4 (A02): -422 to -1000, best Kh8
- game 1, move 22. Nf5 (A01): 1000 to 442, best Nxg4
- game 1, move 22... Qf6 (A02): -442 to -1000, best Rg8
- game 1, move 26. Nf5+ (A01): 1000 to 377, best Qxf6+
- game 1, move 27. exf5 (A01): 364 to -285, best Qh3
- game 1, move 30... Qf6 (A02): 225 to -957, best Qb4
- game 1, move 31. Ne4 (A01): 957 to -315, best Ne8+
- game 1, move 32... Qf6 (A02): 304 to -420, best Qf4
- game 1, move 33. Ne4 (A01): 420 to -409, best Ne8+
- game 1, move 38. Nf6 (A01): -330 to -817, best Ng5
- game 2, move 11. Rfe1 (A02): 15 to -299, best Bb3
- game 2, move 11... Qc8 (A01): 299 to -10, best b5
- game 2, move 14... Qe6 (A01): -10 to -1000, best b5
- game 2, move 15. Bd4 (A02): 1000 to 351, best dxe6
- game 2, move 15... Rfe8 (A01): -351 to -1000, best Qxd5
- game 2, move 18... Bxc2 (A01): -607 to -1000, best b5
- game 2, move 32. Rc3 (A02): 1000 to -999, best a4
- game 3, move 17... Nxe4 (A02): -44 to -368, best exd4
- game 3, move 18. Ra3 (A01): 368 to -97, best Bxe4
- game 3, move 23... Ra3 (A02): 12 to -645, best Ra1+
- game 3, move 24. Bc4 (A01): 645 to -10, best bxa3
- game 3, move 24... Rxc3 (A02): 10 to -572, best Ra1+
- game 3, move 25. Bd3 (A01): 572 to -133, best bxc3
- game 3, move 25... g6 (A02): 133 to -567, best Rc1+
- game 3, move 26. Kg2 (A01): 567 to -116, best bxc3
- game 3, move 26... Kf8 (A02): 116 to -567, best Bg5
- game 3, move 27. Rc2 (A01): 567 to -519, best bxc3
- game 3, move 27... Rb3 (A02): 519 to 101, best Rxd3
- game 4, move 20... Bc6 (A01): 51 to -370, best Qb7
- game 4, move 21. Bb3 (A02): 370 to -49, best dxc6
- game 4, move 21... a5 (A01): 49 to -359, best Bd7
- game 4, move 22. Nf3 (A02): 359 to -43, best dxc6
- game 4, move 23... Qb6 (A01): 40 to -373, best Bd7
- game 4, move 24. Qd3 (A02): 373 to -49, best dxc6
- game 4, move 24... Bf6 (A01): 49 to -367, best Bd7
- game 4, move 25. Re2 (A02): 367 to -46, best dxc6
- game 4, move 25... Re7 (A01): 46 to -375, best Bd7
- game 4, move 26. Rbe1 (A02): 375 to -42, best dxc6
- game 4, move 26... g6 (A01): 42 to -366, best Bd7
- game 4, move 27. Qd2 (A02): 366 to -38, best dxc6
- game 4, move 27... Kg7 (A01): 38 to -368, best Bd7
- game 4, move 28. Ng5 (A02): 368 to -43, best dxc6
- game 4, move 30. f4 (A02): 10 to -978, best Qe3
