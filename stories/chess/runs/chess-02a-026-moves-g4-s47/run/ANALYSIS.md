# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 32 | 105 | 8 | 3 | 4 | 0 |
| 1 Black A02 | 31 | 129 | 5 | 2 | 6 | 1 |
| 2 White A02 | 32 | 76 | 3 | 5 | 2 | 0 |
| 2 Black A01 | 31 | 113 | 8 | 6 | 1 | 0 |
| 3 White A01 | 30 | 188 | 6 | 5 | 4 | 1 |
| 3 Black A02 | 30 | 152 | 4 | 7 | 5 | 0 |
| 4 White A02 | 36 | 144 | 5 | 5 | 5 | 0 |
| 4 Black A01 | 35 | 172 | 6 | 8 | 6 | 0 |

## Blunders and missed mates

- game 1, move 14. Re1 (A01): 41 to -374, best b4
- game 1, move 14... Nxf2 (A02): 374 to -27, best Bxf2+
- game 1, move 15. Rxe6 (A01): 27 to -996, best Be3
- game 1, move 17... Rd8 (A02): 998 to 8, best Nh3+, missed a forced mate
- game 1, move 18. Bf4 (A01): -8 to -452, best Kf1
- game 1, move 18... Rd1 (A02): 452 to -9, best Nd3+
- game 1, move 23... Bd4 (A02): -88 to -585, best Nd5
- game 1, move 27... Nd4 (A02): -289 to -734, best cxd5
- game 1, move 28. dxc6 (A01): 734 to 272, best d6
- game 1, move 31... Ng3+ (A02): -440 to -862, best g6
- game 2, move 11. Nf4 (A02): 211 to -447, best d4
- game 2, move 21. Rad1 (A02): -559 to -1000, best Qxe5
- game 2, move 23... Qg3+ (A01): 960 to -776, best Qc1+
- game 3, move 14... Ne5 (A02): 212 to -233, best Qe3+
- game 3, move 21. Qa5 (A01): 465 to -348, best Qb8+
- game 3, move 21... Qe3+ (A02): 348 to -190, best Ng4
- game 3, move 23... Qh6 (A02): 0 to -998, best Nf2+
- game 3, move 24. h3 (A01): 998 to 723, best Qa8+, missed a forced mate
- game 3, move 25. Rf3 (A01): 952 to 510, best Qxc7
- game 3, move 25... Qg5 (A02): -510 to -834, best Ne5
- game 3, move 26. hxg4 (A01): 834 to 0, best Ne2
- game 3, move 26... Qxg4 (A02): 0 to -795, best Qh4+
- game 3, move 28. Rd2 (A01): 1000 to -1000, best Qa4
- game 4, move 10. Nd5 (A02): -128 to -583, best Na4
- game 4, move 15... Ne3 (A01): 755 to 343, best Rf8
- game 4, move 16. Bxe3 (A02): -343 to -819, best fxe3
- game 4, move 16... Qxe3 (A01): 819 to -791, best dxe3
- game 4, move 21. Qg5 (A02): 856 to 20, best Rb1
- game 4, move 21... Rg8 (A01): -20 to -783, best Bxa1
- game 4, move 23. Rxe3 (A02): 821 to -568, best Qxe3
- game 4, move 24. Nxg5 (A02): -562 to -1000, best Rb3
- game 4, move 24... Be5 (A01): 1000 to 604, best Bd4
- game 4, move 28... Rf2 (A01): 653 to -249, best Kg6
- game 4, move 29... Nd4 (A01): -232 to -534, best Kg6
