# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 77 | 10 | 8 | 2 | 0 |
| 1 Black A02 | 40 | 68 | 10 | 7 | 1 | 0 |
| 2 White A02 | 40 | 135 | 7 | 6 | 5 | 0 |
| 2 Black A01 | 40 | 159 | 6 | 4 | 8 | 0 |
| 3 White A01 | 40 | 46 | 9 | 7 | 0 | 0 |
| 3 Black A02 | 40 | 29 | 7 | 3 | 0 | 0 |
| 4 White A02 | 40 | 74 | 15 | 5 | 1 | 0 |
| 4 Black A01 | 40 | 57 | 16 | 2 | 1 | 0 |

## Blunders and missed mates

- game 1, move 20. dxe4 (A01): 279 to -93, best Rxf6
- game 1, move 26. Rf3 (A01): -170 to -821, best Rf2
- game 1, move 37... Ra2+ (A02): 899 to 178, best Ra1
- game 2, move 10. Bc2 (A02): 65 to -295, best h3
- game 2, move 10... h6 (A01): 295 to -53, best Ng4
- game 2, move 16... Kh7 (A01): 80 to -294, best Bg4
- game 2, move 18... Bf5 (A01): -235 to -535, best Kg8
- game 2, move 19. Nd4 (A02): 535 to 101, best dxc6
- game 2, move 26... Rb8 (A01): 20 to -773, best Rae8
- game 2, move 29. Qb4 (A02): 781 to -845, best Rbd1
- game 2, move 29... Qf6 (A01): 845 to -694, best Qxb4
- game 2, move 31. Rb2 (A02): 507 to -80, best Rxe3
- game 2, move 31... exf2+ (A01): 80 to -738, best a5
- game 2, move 32. Kxf2 (A02): 738 to -110, best Rxf2
- game 2, move 32... Bg4+ (A01): 110 to -476, best Bd3+
- game 2, move 34... Qh4+ (A01): -480 to -1000, best a5
- game 4, move 26... Qg6 (A01): 72 to -657, best dxe5
- game 4, move 36. g4 (A02): 456 to -534, best Ng4
