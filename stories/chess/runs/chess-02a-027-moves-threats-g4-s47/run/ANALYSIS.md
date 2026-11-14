# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 61 | 2 | 0 | 5 | 0 |
| 1 Black A02 | 40 | 61 | 0 | 0 | 5 | 0 |
| 2 White A02 | 33 | 62 | 2 | 2 | 3 | 0 |
| 2 Black A01 | 33 | 35 | 2 | 3 | 1 | 2 |
| 3 White A01 | 30 | 33 | 1 | 5 | 0 | 0 |
| 3 Black A02 | 29 | 73 | 0 | 4 | 2 | 0 |
| 4 White A02 | 33 | 84 | 3 | 3 | 3 | 0 |
| 4 Black A01 | 32 | 117 | 3 | 3 | 7 | 0 |

## Blunders and missed mates

- game 1, move 10... Nd4 (A02): 0 to -461, best Qb8
- game 1, move 14. Nd5 (A01): 483 to 24, best Bb3
- game 1, move 15... Nxd5 (A02): -11 to -451, best Qb6
- game 1, move 16. Rxf8+ (A01): 451 to 85, best Bb3
- game 1, move 16... Qxf8 (A02): -85 to -471, best Kxf8
- game 1, move 17. Qf1 (A01): 471 to -10, best Bb3
- game 1, move 18... Rf8 (A02): 0 to -505, best Nb6
- game 1, move 19. Rxf8+ (A01): 505 to -17, best Bb3
- game 1, move 21... Nc3 (A02): 70 to -488, best Nb4
- game 1, move 32. Kg4 (A01): 326 to 17, best Bc2
- game 2, move 16. Nf3 (A02): 24 to -431, best Bg5
- game 2, move 21. Bxc7 (A02): -360 to -776, best a4
- game 2, move 28... Nd3 (A01): 998 to 1000, best Nh3+, missed a forced mate
- game 2, move 30... Ne2+ (A01): 998 to 549, best Nh3+, missed a forced mate
- game 2, move 31. Kf2 (A02): -549 to -1000, best Kf1
- game 3, move 14... Bxb3 (A02): 367 to -72, best c4
- game 3, move 26... Re2 (A02): 165 to -697, best cxb3
- game 4, move 16... Nxd4 (A01): 68 to -365, best Bg6
- game 4, move 20... Nc2 (A01): -242 to -558, best Ne6
- game 4, move 21... Nb4 (A01): -261 to -657, best Nd4
- game 4, move 22. a3 (A02): 657 to 268, best Bxf7+
- game 4, move 22... Nc6 (A01): -268 to -669, best d5
- game 4, move 23. Re3 (A02): 669 to 199, best Bxf7+
- game 4, move 27... Re7 (A01): -569 to -893, best Kf8
- game 4, move 28. Ne6 (A02): 893 to -69, best Nxf7
- game 4, move 28... fxe6 (A01): 69 to -321, best Ng6
- game 4, move 32... Kg6 (A01): -314 to -999, best Kh8
