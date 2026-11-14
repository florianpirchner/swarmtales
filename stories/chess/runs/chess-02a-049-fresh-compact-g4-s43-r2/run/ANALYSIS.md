# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 31 | 151 | 1 | 3 | 4 | 4 |
| 1 Black A02 | 30 | 189 | 1 | 1 | 6 | 0 |
| 2 White A02 | 40 | 126 | 4 | 2 | 5 | 0 |
| 2 Black A01 | 40 | 127 | 2 | 4 | 5 | 0 |
| 3 White A01 | 40 | 184 | 4 | 5 | 7 | 2 |
| 3 Black A02 | 40 | 209 | 3 | 4 | 8 | 0 |
| 4 White A02 | 40 | 29 | 3 | 1 | 1 | 1 |
| 4 Black A01 | 40 | 53 | 1 | 1 | 3 | 0 |

## Blunders and missed mates

- game 1, move 16... Qd7 (A02): 58 to -983, best Qd8
- game 1, move 21. Qxe5 (A01): 995 to -44, best Qg6, missed a forced mate
- game 1, move 21... Rd7 (A02): 44 to -1000, best fxe5
- game 1, move 22. Rae1 (A01): 1000 to 60, best Qh5
- game 1, move 22... Kg7 (A02): -60 to -1000, best fxe5
- game 1, move 23. Qg5+ (A01): 1000 to -13, best Qf5
- game 1, move 23... Kh7 (A02): 13 to -991, best fxg5
- game 1, move 24. Rd1 (A01): 991 to 696, best Bd3+, missed a forced mate
- game 1, move 24... Rxd1 (A02): -696 to -1000, best Bxf2+
- game 1, move 25. Rxd1 (A01): 1000 to 8, best Qf5+
- game 1, move 25... c5 (A02): -8 to -997, best fxg5
- game 1, move 27. Bxf7 (A01): 998 to 874, best Rxf7+, missed a forced mate
- game 1, move 28. Rxb7 (A01): 999 to 1000, best Qg8#, missed a forced mate
- game 2, move 11... Na5 (A01): 104 to -1000, best Bxd5
- game 2, move 12. c4 (A02): 1000 to -98, best Bxd7
- game 2, move 12... Qe8 (A01): 98 to -1000, best Qxa4
- game 2, move 13. dxe6 (A02): 1000 to 54, best Bxe8
- game 2, move 13... fxe6 (A01): -54 to -1000, best Qxa4
- game 2, move 14. Bc2 (A02): 1000 to 413, best Bxe8
- game 2, move 20. Ne5 (A02): 526 to 36, best Qxh7+
- game 2, move 27. Qxd6 (A02): 76 to -1000, best Ba4
- game 2, move 27... Qxd6 (A01): 1000 to 613, best cxd6
- game 2, move 28... Bf4 (A01): 619 to -92, best cxd6
- game 3, move 14. Qb3 (A01): -347 to -757, best Nc3
- game 3, move 24... Bxf2+ (A02): 727 to -336, best Bxe7
- game 3, move 25... Re8 (A02): -395 to -998, best Rf8
- game 3, move 26. Rxe8+ (A01): 998 to 316, best Qxf7+, missed a forced mate
- game 3, move 29... a6 (A02): -292 to -1000, best Bc5
- game 3, move 31. Qxe3 (A01): 997 to 392, best Qd8+, missed a forced mate
- game 3, move 32... Re8 (A02): -385 to -933, best fxe5
- game 3, move 33. Nd7+ (A01): 933 to 578, best Qb4+
- game 3, move 33... Kg8 (A02): -578 to -934, best Ke7
- game 3, move 36. Qxf6 (A01): 964 to -350, best Nxb6
- game 3, move 37... Re8 (A02): 348 to -1000, best gxf6
- game 3, move 38. Nf8 (A01): 1000 to -781, best Qc6
- game 3, move 38... Kg8 (A02): 781 to -557, best gxf6
- game 3, move 39. Ne6 (A01): 557 to -272, best Qc3
- game 3, move 39... Rxe6 (A02): 272 to -1000, best gxf6
- game 4, move 13... Ne5 (A01): -36 to -341, best Na5
- game 4, move 16... Nd5 (A01): -362 to -836, best h6
- game 4, move 28. Qd4 (A02): 994 to 1000, best Bxf7+, missed a forced mate
- game 4, move 40. Rxc6 (A02): 683 to 12, best Rcd1
- game 4, move 40... Rxd6 (A01): -12 to -1000, best bxc6
