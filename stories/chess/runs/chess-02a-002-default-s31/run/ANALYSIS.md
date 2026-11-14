# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 212 | 2 | 2 | 11 | 0 |
| 1 Black A02 | 40 | 217 | 4 | 1 | 11 | 0 |
| 2 White A02 | 18 | 61 | 1 | 1 | 1 | 0 |
| 2 Black A01 | 18 | 3 | 0 | 0 | 0 | 0 |

## Blunders and missed mates

- game 1, move 21. Qb5 (A01): 28 to -1000, best Be3
- game 1, move 21... Rb8 (A02): 1000 to -67, best axb5
- game 1, move 22. Rec1 (A01): 67 to -1000, best Qxa6
- game 1, move 22... Rc8 (A02): 1000 to -93, best axb5
- game 1, move 25... Qb6 (A02): -206 to -905, best c5
- game 1, move 26. Qxb6 (A01): 905 to 202, best Qxc8
- game 1, move 27. Rc4 (A01): 195 to -548, best Be3
- game 1, move 27... Rb8 (A02): 548 to -208, best dxc4
- game 1, move 28. Re2 (A01): 208 to -479, best Rb4
- game 1, move 28... Rbe8 (A02): 479 to -179, best dxc4
- game 1, move 29. Kh2 (A01): 179 to -484, best Rb4
- game 1, move 29... g5 (A02): 484 to -69, best dxc4
- game 1, move 30. Bxg5 (A01): 69 to -373, best Rb4
- game 1, move 30... f6 (A02): 373 to -162, best dxc4
- game 1, move 31. Bf4 (A01): 162 to -469, best Rb4
- game 1, move 31... fxe5 (A02): 469 to -44, best dxc4
- game 1, move 32. Be3 (A01): 44 to -488, best Rb4
- game 1, move 32... Bxd4 (A02): 488 to -59, best dxc4
- game 1, move 36. Rxd5 (A01): 92 to -582, best b4
- game 1, move 36... Rxf2 (A02): 582 to -176, best cxd5
- game 1, move 37. Rb5 (A01): 176 to -667, best Rd8+
- game 1, move 37... Kg7 (A02): 667 to -186, best cxb5
- game 2, move 18. Qd4 (A02): -92 to -1000, best Ra2
