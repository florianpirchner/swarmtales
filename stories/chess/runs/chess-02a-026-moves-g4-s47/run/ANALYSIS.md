# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 32 | 67 | 1 | 3 | 2 | 0 |
| 1 Black A02 | 31 | 96 | 1 | 1 | 5 | 1 |
| 2 White A02 | 32 | 48 | 1 | 3 | 2 | 0 |
| 2 Black A01 | 31 | 76 | 1 | 4 | 1 | 0 |
| 3 White A01 | 30 | 177 | 0 | 2 | 6 | 1 |
| 3 Black A02 | 30 | 142 | 2 | 5 | 3 | 1 |
| 4 White A02 | 36 | 108 | 1 | 1 | 6 | 1 |
| 4 Black A01 | 35 | 137 | 2 | 1 | 7 | 0 |

## Blunders and missed mates

- game 1, move 14... Nxf2 (A02): 327 to 23, best Bxf2+
- game 1, move 15. Rxe6 (A01): -23 to -996, best Be3
- game 1, move 17... Rd8 (A02): 998 to 59, best Nh3+, missed a forced mate
- game 1, move 18. Bf4 (A01): -59 to -502, best Kf1
- game 1, move 18... Rd1 (A02): 502 to 11, best Nh3+
- game 1, move 23... Bd4 (A02): -8 to -499, best Nd5
- game 1, move 31... Ng3+ (A02): -487 to -932, best g6
- game 2, move 11. Nf4 (A02): 33 to -435, best d4
- game 2, move 21. Rad1 (A02): -510 to -1000, best Qxh6
- game 2, move 23... Qg3+ (A01): 850 to -591, best Qc1+
- game 3, move 21. Qa5 (A01): 371 to 48, best Qxb7
- game 3, move 23. Rf1 (A01): 198 to -996, best h3
- game 3, move 23... Qh6 (A02): 996 to -998, best Nf2+, missed a forced mate
- game 3, move 24. h3 (A01): 998 to 503, best Qa8+, missed a forced mate
- game 3, move 25. Rf3 (A01): 775 to 435, best Qa4
- game 3, move 25... Qg5 (A02): -435 to -754, best Ne5
- game 3, move 26. hxg4 (A01): 754 to 0, best Qa8+
- game 3, move 26... Qxg4 (A02): 0 to -739, best Qh4+
- game 3, move 28. Rd2 (A01): 864 to -1000, best Qa4
- game 4, move 10. Nd5 (A02): -148 to -509, best Na4
- game 4, move 15... Ne3 (A01): 618 to 264, best h6
- game 4, move 16. Bxe3 (A02): -264 to -716, best fxe3
- game 4, move 16... Qxe3 (A01): 716 to -579, best dxe3
- game 4, move 19... Bd4 (A01): -575 to -996, best h6
- game 4, move 20. Ne6 (A02): 996 to 573, best Nf7+, missed a forced mate
- game 4, move 21. Qg5 (A02): 612 to -43, best Rb1
- game 4, move 21... Rg8 (A01): 43 to -576, best Bxa1
- game 4, move 23. Rxe3 (A02): 629 to -598, best Qxe3
- game 4, move 24. Nxg5 (A02): -601 to -1000, best Rb3
- game 4, move 24... Be5 (A01): 1000 to 593, best Bd4
- game 4, move 28... Rf2 (A01): 615 to -76, best Rd8
- game 4, move 35... Nd5+ (A01): -419 to -959, best Kh6
