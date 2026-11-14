# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 25 | 30 | 2 | 2 | 1 | 0 |
| 1 Black A02 | 24 | 69 | 3 | 1 | 2 | 0 |
| 2 White A02 | 40 | 152 | 5 | 3 | 8 | 1 |
| 2 Black A01 | 40 | 152 | 6 | 2 | 9 | 1 |
| 3 White A01 | 31 | 54 | 4 | 1 | 2 | 0 |
| 3 Black A02 | 31 | 21 | 4 | 2 | 0 | 0 |
| 4 White A02 | 40 | 31 | 2 | 0 | 2 | 0 |
| 4 Black A01 | 40 | 31 | 3 | 0 | 2 | 0 |

## Blunders and missed mates

- game 1, move 18... Re8 (A02): -69 to -770, best dxe5
- game 1, move 23. Rxf8+ (A01): 904 to 586, best Rc8
- game 1, move 24... Nxd3 (A02): -561 to -979, best Nf3+
- game 2, move 10... Nd5 (A01): 23 to -486, best d5
- game 2, move 13... Bf6 (A01): -351 to -811, best exd5
- game 2, move 14. Nf4 (A02): 811 to 365, best Nxf6+
- game 2, move 14... Qe7 (A01): -365 to -803, best exf4
- game 2, move 15. Qe2 (A02): 803 to 382, best Nh5
- game 2, move 15... Bg5 (A01): -382 to -836, best exf4
- game 2, move 18. Nf4 (A02): 819 to 375, best Ng3
- game 2, move 28... Rd2 (A01): -595 to -996, best Rxc1+
- game 2, move 29. Rd1 (A02): 996 to 521, best Rxc7, missed a forced mate
- game 2, move 34. Rb7 (A02): 426 to -997, best d4
- game 2, move 34... Rc3 (A01): 997 to -339, best Ra1+, missed a forced mate
- game 2, move 37. Rb5 (A02): 399 to -342, best Rb2
- game 2, move 37... Rc2+ (A01): 342 to -209, best axb5
- game 2, move 38. Kf1 (A02): 209 to -338, best Kd1
- game 2, move 39... Rc3 (A01): 344 to -338, best Rxe1+
- game 2, move 40. Ke2 (A02): 338 to -346, best Rb7
- game 2, move 40... Rc2+ (A01): 346 to -204, best axb5
- game 3, move 27. Nxd6 (A01): -12 to -396, best e5
- game 3, move 31. Qxf6 (A01): -409 to -1000, best Rxc8
- game 4, move 23. d4 (A02): 8 to -353, best g3
- game 4, move 24... Qb5 (A01): 286 to -19, best Bxf2+
- game 4, move 25. Nd2 (A02): 19 to -296, best g3
- game 4, move 25... Rfe8 (A01): 296 to -44, best Bxf2+
