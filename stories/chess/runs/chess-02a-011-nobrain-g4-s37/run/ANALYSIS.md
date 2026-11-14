# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 35 | 133 | 3 | 3 | 4 | 0 |
| 1 Black A02 | 35 | 100 | 5 | 2 | 5 | 0 |
| 2 White A02 | 32 | 50 | 2 | 1 | 2 | 0 |
| 2 Black A01 | 31 | 83 | 1 | 3 | 4 | 0 |
| 3 White A01 | 30 | 246 | 2 | 1 | 10 | 0 |
| 3 Black A02 | 30 | 213 | 2 | 1 | 10 | 0 |
| 4 White A02 | 40 | 184 | 2 | 5 | 11 | 1 |
| 4 Black A01 | 39 | 193 | 5 | 5 | 10 | 0 |

## Blunders and missed mates

- game 1, move 16... Qd7 (A02): -50 to -370, best Nh5
- game 1, move 17. Ng3 (A01): 370 to 9, best Bxf4
- game 1, move 17... Bh4 (A02): -9 to -468, best Bg5
- game 1, move 18. Be3 (A01): 468 to -1, best Bxf4
- game 1, move 25. Qf2 (A01): -12 to -919, best Qxb7
- game 1, move 25... Rxb3 (A02): 919 to 197, best Rxf2
- game 1, move 26... Qe7 (A02): 219 to -455, best Qb5
- game 1, move 33... Qe5 (A02): -489 to -1000, best f6
- game 1, move 34. Rxf7 (A01): 1000 to -998, best Rxe5
- game 2, move 21... Bd5 (A01): 32 to -492, best g6
- game 2, move 22. Re1 (A02): 492 to -7, best exd5
- game 2, move 22... Rc4 (A01): 7 to -471, best Bb7
- game 2, move 23. Be3 (A02): 471 to -95, best exd5
- game 2, move 25... Rc2 (A01): 3 to -330, best d5
- game 2, move 28... Bg5 (A01): -331 to -809, best Bh4
- game 3, move 14. Qd3 (A01): 115 to -1000, best dxe5
- game 3, move 14... exd4 (A02): 1000 to -83, best cxd3
- game 3, move 15. Nxd4 (A01): 83 to -1000, best Qxd4
- game 3, move 15... Be6 (A02): 1000 to -109, best cxd3
- game 3, move 17... Nd5 (A02): -216 to -701, best Qd7
- game 3, move 18. Qb3 (A01): 701 to 218, best exd5
- game 3, move 18... Qd7 (A02): -218 to -659, best Rb8
- game 3, move 19. Bd2 (A01): 659 to 134, best exd5
- game 3, move 19... Bf6 (A02): -134 to -629, best Nf4
- game 3, move 20. Rad1 (A01): 629 to 194, best exd5
- game 3, move 20... Rfe8 (A02): -194 to -656, best Ne7
- game 3, move 21. h3 (A01): 656 to 173, best exd5
- game 3, move 21... h6 (A02): -173 to -648, best Ne7
- game 3, move 22. Kh2 (A01): 648 to 156, best exd5
- game 3, move 22... Qc6 (A02): -156 to -544, best Ne7
- game 3, move 23. Rc1 (A01): 544 to 76, best exd5
- game 3, move 23... Nxc3 (A02): -76 to -451, best Nb6
- game 3, move 24... Nd5 (A02): -408 to -1000, best Rb8
- game 3, move 25. exd5 (A01): 1000 to 509, best Rxc6
- game 3, move 26. Bc3 (A01): 510 to -790, best Qxd5
- game 4, move 8... Be6 (A01): -40 to -429, best O-O
- game 4, move 9. Bxe6 (A02): 429 to 89, best d5
- game 4, move 11... Nc4 (A01): -88 to -528, best exd5
- game 4, move 12. b3 (A02): 528 to 37, best Qa4+
- game 4, move 15. Nd4 (A02): 15 to -593, best Re2
- game 4, move 15... Bxd4 (A01): 593 to 77, best Rxf2
- game 4, move 23... Rf5 (A01): 21 to -518, best exd5
- game 4, move 24. dxc6 (A02): 518 to 91, best exf5
- game 4, move 24... bxc6 (A01): -91 to -521, best Rf7
- game 4, move 25. g3 (A02): 521 to -7, best exf5
- game 4, move 25... Nd3 (A01): 7 to -545, best Rff8
- game 4, move 27. Rfe1 (A02): 552 to 33, best exf5
- game 4, move 27... Kf7 (A01): -33 to -546, best Rf7
- game 4, move 28. Ne2 (A02): 546 to 23, best exf5
- game 4, move 37. Re5 (A02): 185 to -496, best Ree7
- game 4, move 37... Rb4 (A01): 496 to -188, best dxe5
- game 4, move 38. Kf2 (A02): 188 to -463, best Re6
- game 4, move 38... Rf8 (A01): 463 to -198, best dxe5
- game 4, move 39. Kg2 (A02): 198 to -472, best Ree7
- game 4, move 39... Rf7 (A01): 472 to -999, best dxe5
- game 4, move 40. Rxf7 (A02): 999 to 194, best Re8#, missed a forced mate
