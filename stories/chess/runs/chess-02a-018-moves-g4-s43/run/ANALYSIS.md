# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 20 | 100 | 3 | 1 | 2 | 1 |
| 1 Black A02 | 19 | 161 | 0 | 2 | 3 | 0 |
| 2 White A02 | 35 | 63 | 2 | 1 | 2 | 0 |
| 2 Black A01 | 35 | 43 | 3 | 1 | 1 | 0 |
| 3 White A01 | 27 | 55 | 3 | 1 | 2 | 2 |
| 3 Black A02 | 26 | 95 | 4 | 1 | 4 | 0 |
| 4 White A02 | 21 | 66 | 0 | 1 | 1 | 0 |
| 4 Black A01 | 21 | 18 | 3 | 0 | 0 | 0 |

## Blunders and missed mates

- game 1, move 9... Nd6 (A02): 125 to -237, best d5
- game 1, move 10. Nc3 (A01): 237 to -515, best Bg5
- game 1, move 12... Nd2 (A02): 632 to 190, best d5
- game 1, move 18. Rxf7 (A01): -126 to -710, best Qd5
- game 1, move 18... Qe8 (A02): 710 to -998, best Rxf7
- game 1, move 19. Rxc7+ (A01): 998 to 705, best Rxg7+, missed a forced mate
- game 2, move 17. Qg3 (A02): 25 to -848, best g3
- game 2, move 25... Qf3 (A01): 1000 to -24, best Qc2
- game 2, move 35. Rc5 (A02): -2 to -736, best Rd2
- game 3, move 12... Bxb2 (A02): 78 to -340, best Bc5
- game 3, move 21... Nd5 (A02): -390 to -887, best Re8
- game 3, move 22. Be3 (A01): 887 to 351, best Qxd5
- game 3, move 23... Qd6 (A02): -443 to -1000, best Re8
- game 3, move 25. Rc3 (A01): 999 to 478, best Re8#, missed a forced mate
- game 3, move 25... Qe4 (A02): -478 to -999, best Kh8
- game 3, move 26. Rxe4+ (A01): 999 to 1000, best Re8#, missed a forced mate
- game 4, move 21. Qb5 (A02): 110 to -1000, best Nxc6
