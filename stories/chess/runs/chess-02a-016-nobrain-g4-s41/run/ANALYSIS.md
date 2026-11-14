# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 18 | 90 | 1 | 0 | 1 | 0 |
| 1 Black A02 | 18 | 33 | 1 | 0 | 1 | 0 |
| 2 White A02 | 40 | 119 | 4 | 4 | 8 | 1 |
| 2 Black A01 | 40 | 131 | 4 | 6 | 7 | 0 |
| 3 White A01 | 40 | 54 | 6 | 1 | 3 | 0 |
| 3 Black A02 | 40 | 54 | 4 | 1 | 3 | 0 |
| 4 White A02 | 40 | 74 | 9 | 4 | 3 | 5 |
| 4 Black A01 | 40 | 94 | 8 | 5 | 4 | 0 |

## Blunders and missed mates

- game 1, move 12... Nd5 (A02): -26 to -522, best d5
- game 1, move 16. Qc2 (A01): 486 to -955, best Nxb5
- game 2, move 10... Nb4 (A01): 9 to -297, best d5
- game 2, move 12. Nc3 (A02): 414 to 74, best d5
- game 2, move 12... Qd7 (A01): -74 to -437, best d5
- game 2, move 13. Bxc6 (A02): 437 to 87, best d5
- game 2, move 15. Nxd5 (A02): 356 to 17, best exd5
- game 2, move 15... Nxd5 (A01): -17 to -350, best cxd5
- game 2, move 17. Ne5 (A02): 424 to -62, best Qa4
- game 2, move 17... Qe6 (A01): 62 to -1000, best dxe5
- game 2, move 18. Nxc6 (A02): 1000 to 517, best dxe6
- game 2, move 29. Bb6 (A02): 478 to -16, best Rxa6
- game 2, move 29... Rxd5 (A01): 16 to -456, best cxb6
- game 2, move 34... Rd7 (A01): -577 to -998, best f6
- game 2, move 35. Rb6 (A02): 998 to 474, best Ra8+, missed a forced mate
- game 2, move 36. Be5 (A02): 570 to -23, best Rb8+
- game 2, move 36... d5 (A01): 23 to -563, best dxe5
- game 3, move 10... Bg4 (A02): 11 to -487, best Qxd5
- game 3, move 11. Qb3 (A01): 487 to 112, best dxc6
- game 3, move 12... Qd7 (A02): -146 to -522, best c6
- game 3, move 17... Re1+ (A02): -564 to -1000, best b6
- game 3, move 19. Re8+ (A01): 1000 to 623, best Qb5
- game 3, move 36. Ne6 (A01): 548 to -13, best a4
- game 4, move 14... Ne7 (A01): -86 to -654, best Ba7
- game 4, move 15. Nxe7+ (A02): 654 to 91, best Nxf6+
- game 4, move 26... Qxc6 (A01): -29 to -380, best bxc6
- game 4, move 28. Qd3 (A02): 395 to 82, best Bxg5
- game 4, move 28... Bc5 (A01): -82 to -760, best d5
- game 4, move 29. d5 (A02): 760 to 121, best Bxg5
- game 4, move 29... Qb6 (A01): -121 to -879, best Qb5
- game 4, move 31. Rxe7 (A02): 991 to 885, best Qg6+, missed a forced mate
- game 4, move 36. Qf3 (A02): 996 to 1000, best Qxd6, missed a forced mate
- game 4, move 37. Qg3 (A02): 994 to 940, best g3, missed a forced mate
- game 4, move 38. Rb8+ (A02): 996 to 1000, best Qxd6, missed a forced mate
- game 4, move 39. Qf3 (A02): 995 to 1000, best Qxd6, missed a forced mate
