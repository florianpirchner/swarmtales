# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 31 | 175 | 6 | 3 | 5 | 4 |
| 1 Black A02 | 30 | 214 | 5 | 3 | 6 | 0 |
| 2 White A02 | 40 | 161 | 10 | 6 | 6 | 0 |
| 2 Black A01 | 40 | 155 | 6 | 3 | 7 | 0 |
| 3 White A01 | 40 | 226 | 6 | 8 | 9 | 2 |
| 3 Black A02 | 40 | 244 | 1 | 8 | 8 | 0 |
| 4 White A02 | 40 | 60 | 11 | 5 | 1 | 0 |
| 4 Black A01 | 40 | 80 | 11 | 3 | 3 | 0 |

## Blunders and missed mates

- game 1, move 10... Qe8 (A02): 147 to -299, best g5
- game 1, move 13. e5 (A01): 274 to -28, best Qd2
- game 1, move 16... Qd7 (A02): -30 to -1000, best Qd8
- game 1, move 21. Qxe5 (A01): 995 to -37, best Qg6, missed a forced mate
- game 1, move 21... Rd7 (A02): 37 to -1000, best fxe5
- game 1, move 22. Rae1 (A01): 1000 to 10, best Qh5
- game 1, move 22... Kg7 (A02): -10 to -1000, best fxe5
- game 1, move 23. Qg5+ (A01): 1000 to -71, best Qf5
- game 1, move 23... Kh7 (A02): 71 to -1000, best hxg5
- game 1, move 25. Rxd1 (A01): 993 to -9, best Qf5+, missed a forced mate
- game 1, move 25... c5 (A02): 9 to -997, best fxg5
- game 1, move 27. Bxf7 (A01): 998 to 939, best Rxf7+, missed a forced mate
- game 1, move 28. Rxb7 (A01): 999 to 1000, best Qg8#, missed a forced mate
- game 2, move 11... Na5 (A01): 214 to -1000, best Bxd5
- game 2, move 12. c4 (A02): 1000 to -57, best Bxd7
- game 2, move 12... Qe8 (A01): 57 to -1000, best Qxa4
- game 2, move 13. dxe6 (A02): 1000 to 47, best Bxe8
- game 2, move 13... fxe6 (A01): -47 to -1000, best Qxa4
- game 2, move 14. Bc2 (A02): 1000 to 384, best Bxe8
- game 2, move 19... Rfe8 (A01): -390 to -761, best g6
- game 2, move 20. Ne5 (A02): 761 to 286, best Qxh7+
- game 2, move 21. Rab1 (A02): 299 to -105, best Qxh7+
- game 2, move 21... Bf6 (A01): 105 to -255, best g6
- game 2, move 27. Qxd6 (A02): 16 to -1000, best Ba4
- game 2, move 27... Qxd6 (A01): 1000 to 544, best cxd6
- game 2, move 28... Bf4 (A01): 553 to -163, best cxd6
- game 3, move 13. Qd3 (A01): -132 to -456, best Nc3
- game 3, move 14. Qb3 (A01): -438 to -792, best Nc3
- game 3, move 21. Qc3 (A01): -614 to -1000, best Bc4
- game 3, move 24... Bxf2+ (A02): 804 to -457, best Bxe7
- game 3, move 25... Re8 (A02): -426 to -998, best Rf8
- game 3, move 26. Rxe8+ (A01): 998 to 282, best Qxf7+, missed a forced mate
- game 3, move 29... a6 (A02): -299 to -1000, best Bc5
- game 3, move 31. Qxe3 (A01): 997 to 483, best Qd8+, missed a forced mate
- game 3, move 32... Re8 (A02): -420 to -1000, best fxe5
- game 3, move 33. Nd7+ (A01): 1000 to 696, best Qb4+
- game 3, move 33... Kg8 (A02): -696 to -1000, best Ke7
- game 3, move 36. Qxf6 (A01): 1000 to -599, best Nxb6
- game 3, move 37... Re8 (A02): 562 to -1000, best gxf6
- game 3, move 38. Nf8 (A01): 1000 to -840, best Qc6
- game 3, move 38... Kg8 (A02): 840 to -702, best gxf6
- game 3, move 39. Ne6 (A01): 702 to -469, best Qf4
- game 3, move 39... Rxe6 (A02): 469 to -1000, best gxf6
- game 4, move 13... Ne5 (A01): 31 to -307, best Na5
- game 4, move 16... Nd5 (A01): -287 to -867, best Qe7
- game 4, move 40. Rxc6 (A02): 755 to 31, best Rcd1
- game 4, move 40... Rxd6 (A01): -31 to -1000, best bxc6
