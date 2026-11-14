# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 245 | 8 | 10 | 8 | 1 |
| 1 Black A02 | 40 | 220 | 7 | 13 | 7 | 0 |
| 2 White A02 | 32 | 143 | 4 | 6 | 4 | 0 |
| 2 Black A01 | 32 | 107 | 2 | 6 | 3 | 0 |
| 3 White A01 | 40 | 145 | 10 | 9 | 5 | 0 |
| 3 Black A02 | 40 | 139 | 7 | 8 | 6 | 0 |
| 4 White A02 | 30 | 195 | 9 | 6 | 8 | 0 |
| 4 Black A01 | 30 | 154 | 6 | 7 | 7 | 0 |

## Blunders and missed mates

- game 1, move 18... g5 (A02): -141 to -543, best d5
- game 1, move 20. Qxg5+ (A01): 690 to -1000, best Nxh6+
- game 1, move 20... Kh7 (A02): 1000 to -999, best hxg5
- game 1, move 21. Nxh6 (A01): 999 to 758, best Qg7#, missed a forced mate
- game 1, move 22. Nf5 (A01): 1000 to 526, best Nxg4
- game 1, move 22... Qf6 (A02): -526 to -1000, best Rg8
- game 1, move 26. Nf5+ (A01): 1000 to 487, best Qxf6+
- game 1, move 27. exf5 (A01): 581 to -369, best Qh3
- game 1, move 29... Bc8 (A02): 306 to 0, best Rb8
- game 1, move 30... Qf6 (A02): 61 to -1000, best Qb4
- game 1, move 31. Ne4 (A01): 1000 to -340, best Ne8+
- game 1, move 32... Qf6 (A02): 356 to -662, best Qc5
- game 1, move 33. Ne4 (A01): 662 to -508, best Ne8+
- game 1, move 36... Qf6 (A02): 346 to 0, best f6
- game 1, move 37. Ne4 (A01): 0 to -387, best Re1
- game 1, move 38. Nf6 (A01): -300 to -975, best Ng5
- game 2, move 9. Nc3 (A02): 43 to -266, best e5
- game 2, move 10. Be3 (A02): 17 to -310, best Bb3
- game 2, move 11... Qc8 (A01): 312 to -26, best b5
- game 2, move 14... Qe6 (A01): -13 to -1000, best Bf6
- game 2, move 15. Bd4 (A02): 1000 to 465, best dxe6
- game 2, move 15... Rfe8 (A01): -465 to -1000, best Qxd5
- game 2, move 32. Rc3 (A02): 1000 to -999, best Bg3
- game 3, move 17... Nxe4 (A02): -50 to -416, best exd4
- game 3, move 18. Ra3 (A01): 416 to -80, best Bxe4
- game 3, move 23... Ra3 (A02): 64 to -679, best Rb8
- game 3, move 24. Bc4 (A01): 679 to -47, best bxa3
- game 3, move 24... Rxc3 (A02): 47 to -521, best Ra1+
- game 3, move 25. Bd3 (A01): 521 to -147, best bxc3
- game 3, move 25... g6 (A02): 147 to -484, best Rc1+
- game 3, move 26. Kg2 (A01): 484 to -136, best bxc3
- game 3, move 26... Kf8 (A02): 136 to -500, best Rb3
- game 3, move 27. Rc2 (A01): 500 to -689, best bxc3
- game 3, move 27... Rb3 (A02): 689 to 125, best Rxd3
- game 4, move 20... Bc6 (A01): 62 to -384, best c4
- game 4, move 21. Bb3 (A02): 384 to -56, best dxc6
- game 4, move 21... a5 (A01): 56 to -387, best Bd7
- game 4, move 22. Nf3 (A02): 387 to -77, best dxc6
- game 4, move 23... Qb6 (A01): 76 to -394, best Bd7
- game 4, move 24. Qd3 (A02): 394 to -87, best dxc6
- game 4, move 24... Bf6 (A01): 87 to -397, best c4
- game 4, move 25. Re2 (A02): 397 to -98, best dxc6
- game 4, move 25... Re7 (A01): 98 to -390, best Bd7
- game 4, move 26. Rbe1 (A02): 390 to -88, best dxc6
- game 4, move 26... g6 (A01): 88 to -396, best Bd7
- game 4, move 27. Qd2 (A02): 396 to -85, best dxc6
- game 4, move 27... Kg7 (A01): 85 to -388, best Bd7
- game 4, move 28. Ng5 (A02): 388 to -98, best dxc6
- game 4, move 30. f4 (A02): 43 to -1000, best Qe3
