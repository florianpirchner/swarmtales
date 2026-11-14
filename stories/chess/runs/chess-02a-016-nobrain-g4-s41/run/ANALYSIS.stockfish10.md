# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 18 | 108 | 4 | 1 | 1 | 0 |
| 1 Black A02 | 18 | 47 | 5 | 0 | 1 | 0 |
| 2 White A02 | 40 | 134 | 12 | 6 | 7 | 1 |
| 2 Black A01 | 40 | 145 | 7 | 10 | 6 | 0 |
| 3 White A01 | 40 | 77 | 6 | 6 | 4 | 0 |
| 3 Black A02 | 40 | 76 | 8 | 4 | 4 | 0 |
| 4 White A02 | 40 | 122 | 6 | 10 | 4 | 4 |
| 4 Black A01 | 40 | 138 | 5 | 8 | 6 | 0 |

## Blunders and missed mates

- game 1, move 12... Nd5 (A02): -29 to -453, best Nb4
- game 1, move 16. Qc2 (A01): 481 to -1000, best Nxb5
- game 2, move 12... Qd7 (A01): -162 to -546, best d5
- game 2, move 13. Bxc6 (A02): 546 to 85, best d5
- game 2, move 15. Nxd5 (A02): 375 to -40, best exd5
- game 2, move 15... Nxd5 (A01): 40 to -414, best cxd5
- game 2, move 17. Ne5 (A02): 491 to -92, best Qa4
- game 2, move 17... Qe6 (A01): 92 to -1000, best dxe5
- game 2, move 18. Nxc6 (A02): 1000 to 549, best dxe6
- game 2, move 29. Bb6 (A02): 482 to 2, best Rxa6
- game 2, move 29... Rxd5 (A01): -2 to -493, best cxb6
- game 2, move 34... Rd7 (A01): -615 to -998, best f6
- game 2, move 35. Rb6 (A02): 998 to 557, best Ra8+, missed a forced mate
- game 2, move 36. Be5 (A02): 632 to 0, best Rb8+
- game 2, move 36... d5 (A01): 0 to -593, best dxe5
- game 3, move 10... Bg4 (A02): 119 to -566, best Qxd5
- game 3, move 11. Qb3 (A01): 566 to 89, best dxc6
- game 3, move 11... Na5 (A02): -89 to -394, best Bxf3
- game 3, move 12. Qb5+ (A01): 394 to 87, best Qe3+
- game 3, move 12... Qd7 (A02): -87 to -571, best c6
- game 3, move 17... Re1+ (A02): -572 to -1000, best a6
- game 3, move 19. Re8+ (A01): 1000 to 638, best Qb5
- game 3, move 36. Ne6 (A01): 562 to 78, best Ne8
- game 4, move 12... Re8 (A01): 102 to -214, best Bxd4
- game 4, move 14... Ne7 (A01): -169 to -900, best Ba7
- game 4, move 15. Nxe7+ (A02): 900 to 87, best Nxf6+
- game 4, move 18... Nf6 (A01): -154 to -546, best Kf8
- game 4, move 19. Qf4 (A02): 546 to -105, best Bxh6
- game 4, move 26... Qxc6 (A01): -54 to -832, best bxc6
- game 4, move 28. Qd3 (A02): 914 to 81, best Bxg5
- game 4, move 28... Bc5 (A01): -81 to -936, best d5
- game 4, move 29. d5 (A02): 936 to 323, best Bxg5
- game 4, move 29... Qb6 (A01): -323 to -1000, best Qb5
- game 4, move 31. Rxe7 (A02): 991 to 1000, best Qg6+, missed a forced mate
- game 4, move 36. Qf3 (A02): 996 to 982, best Qxd6, missed a forced mate
- game 4, move 37. Qg3 (A02): 994 to 1000, best g3, missed a forced mate
- game 4, move 38. Rb8+ (A02): 996 to 1000, best Qxd6, missed a forced mate
