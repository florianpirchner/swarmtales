# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 39 | 3 | 3 | 1 | 0 |
| 1 Black A02 | 40 | 38 | 5 | 2 | 1 | 0 |
| 2 White A02 | 40 | 86 | 4 | 2 | 4 | 0 |
| 2 Black A01 | 40 | 111 | 3 | 2 | 6 | 0 |
| 3 White A01 | 40 | 15 | 3 | 1 | 0 | 0 |
| 3 Black A02 | 40 | 11 | 0 | 2 | 0 | 0 |
| 4 White A02 | 40 | 31 | 2 | 1 | 1 | 0 |
| 4 Black A01 | 40 | 22 | 0 | 1 | 1 | 0 |

## Blunders and missed mates

- game 1, move 26. Rf3 (A01): -106 to -743, best Rf2
- game 1, move 37... Ra2+ (A02): 852 to 195, best Ra1
- game 2, move 18... Bf5 (A01): -152 to -452, best Kh8
- game 2, move 19. Nd4 (A02): 452 to 81, best dxc6
- game 2, move 26... Rb8 (A01): -19 to -592, best Rf8
- game 2, move 29. Qb4 (A02): 592 to -707, best Qf8
- game 2, move 29... Qf6 (A01): 707 to -591, best Qxb4
- game 2, move 31. Rb2 (A02): 506 to 82, best fxe3
- game 2, move 31... exf2+ (A01): -82 to -572, best a5
- game 2, move 32. Kxf2 (A02): 572 to -86, best Rxf2
- game 2, move 32... Bg4+ (A01): 86 to -445, best Bd3+
- game 2, move 34... Qh4+ (A01): -427 to -1000, best a5
- game 4, move 26... Qg6 (A01): 17 to -506, best dxe5
- game 4, move 36. g4 (A02): 352 to -330, best Ng4
