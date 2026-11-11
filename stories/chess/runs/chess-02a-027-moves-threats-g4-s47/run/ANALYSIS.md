# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 93 | 6 | 5 | 5 | 0 |
| 1 Black A02 | 40 | 88 | 5 | 3 | 5 | 0 |
| 2 White A02 | 33 | 105 | 7 | 6 | 4 | 0 |
| 2 Black A01 | 33 | 61 | 4 | 5 | 2 | 2 |
| 3 White A01 | 30 | 73 | 6 | 8 | 1 | 0 |
| 3 Black A02 | 29 | 108 | 5 | 6 | 2 | 0 |
| 4 White A02 | 33 | 146 | 6 | 7 | 5 | 0 |
| 4 Black A01 | 32 | 177 | 5 | 8 | 7 | 0 |

## Blunders and missed mates

- game 1, move 10... Nd4 (A02): 44 to -510, best Ne7
- game 1, move 14. Nd5 (A01): 564 to -34, best Bb3
- game 1, move 15... Nxd5 (A02): 34 to -536, best Qb6
- game 1, move 16. Rxf8+ (A01): 536 to 206, best Bb3
- game 1, move 16... Qxf8 (A02): -206 to -527, best Kxf8
- game 1, move 17. Qf1 (A01): 527 to -9, best Bb3
- game 1, move 18... Rf8 (A02): 3 to -519, best Nb6
- game 1, move 19. Rxf8+ (A01): 519 to -24, best Bb3
- game 1, move 21... Nc3 (A02): 129 to -502, best Nb4
- game 1, move 29. d5 (A01): 541 to 63, best Kf4
- game 2, move 8... Be6 (A01): 91 to -291, best exd4
- game 2, move 9. Bb3 (A02): 291 to -89, best d5
- game 2, move 16. Nf3 (A02): 100 to -519, best Bg5
- game 2, move 21. Bxc7 (A02): -407 to -848, best a4
- game 2, move 28... Nd3 (A01): 998 to 1000, best Nh3+, missed a forced mate
- game 2, move 30... Ne2+ (A01): 998 to 618, best Nh3+, missed a forced mate
- game 2, move 31. Kf2 (A02): -618 to -1000, best Kf1
- game 3, move 14... Bxb3 (A02): 425 to -85, best c4
- game 3, move 26. Rxd6 (A01): 0 to -459, best bxc4
- game 3, move 26... Re2 (A02): 459 to -846, best cxb3
- game 4, move 16... Nxd4 (A01): 114 to -411, best Bg6
- game 4, move 18... Nxc2 (A01): -299 to -691, best Ne6
- game 4, move 19. Re2 (A02): 691 to 268, best Bxf7+
- game 4, move 20... Nc2 (A01): -103 to -794, best Re5
- game 4, move 21. Re2 (A02): 794 to 268, best Bxf7+
- game 4, move 21... Nb4 (A01): -268 to -866, best Nd4
- game 4, move 22. a3 (A02): 866 to 289, best Bxf7+
- game 4, move 22... Nc6 (A01): -289 to -791, best d5
- game 4, move 23. Re3 (A02): 791 to 134, best Bxf7+
- game 4, move 28. Ne6 (A02): 935 to -21, best Rxf7
- game 4, move 28... fxe6 (A01): 21 to -410, best Ng6
- game 4, move 32... Kg6 (A01): -362 to -999, best Rd7
