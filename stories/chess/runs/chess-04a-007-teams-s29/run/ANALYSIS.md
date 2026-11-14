# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A | 40 | 167 | 2 | 3 | 8 | 0 |
| 1 Black B | 40 | 145 | 2 | 2 | 8 | 3 |
| 2 White B | 40 | 27 | 2 | 2 | 1 | 0 |
| 2 Black A | 40 | 42 | 3 | 4 | 2 | 0 |

## Blunders and missed mates

- game 1, move 17... d5 (A03): -8 to -1000, best Qh6
- game 1, move 18. exd5 (A02): 1000 to 467, best Nxg5
- game 1, move 18... Ne7 (A04): -467 to -1000, best Qe7
- game 1, move 19. e4 (A01): 1000 to 152, best Nxg5
- game 1, move 19... Ng6 (A03): -152 to -1000, best Qh5
- game 1, move 20. g3 (A02): 1000 to 127, best Nxg5
- game 1, move 20... Nh4 (A04): -127 to -1000, best Qg4
- game 1, move 21. Nxh4 (A01): 1000 to 591, best Nxg5
- game 1, move 21... Qh5 (A03): -591 to -1000, best Qh6
- game 1, move 22. Nf5 (A02): 1000 to -594, best Qxh5
- game 1, move 32... Re6 (A04): 808 to 185, best Rf8
- game 1, move 34. Ng5 (A02): -189 to -1000, best dxe6
- game 1, move 36... Qf4+ (A04): 996 to 486, best Qe2+, missed a forced mate
- game 1, move 37. Kh5 (A01): -486 to -999, best gxf4
- game 1, move 37... Rxf7 (A03): 999 to 957, best Rh6#, missed a forced mate
- game 1, move 39... Qf4+ (A03): 995 to 659, best Rf8, missed a forced mate
- game 1, move 40. Kh5 (A02): -659 to -999, best gxf4
- game 2, move 13. Nd5 (A03): 21 to -458, best d4
- game 2, move 13... Nxd5 (A01): 458 to 114, best exd5
- game 2, move 40... Kf6 (A02): -215 to -628, best Kd7
