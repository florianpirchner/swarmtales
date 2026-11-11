# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 25 | 67 | 4 | 6 | 1 | 0 |
| 1 Black A02 | 24 | 105 | 7 | 5 | 2 | 0 |
| 2 White A02 | 40 | 202 | 7 | 7 | 8 | 1 |
| 2 Black A01 | 40 | 197 | 5 | 6 | 8 | 1 |
| 3 White A01 | 31 | 101 | 12 | 9 | 2 | 0 |
| 3 Black A02 | 31 | 60 | 8 | 8 | 0 | 0 |
| 4 White A02 | 40 | 95 | 16 | 12 | 2 | 0 |
| 4 Black A01 | 40 | 95 | 20 | 10 | 2 | 0 |

## Blunders and missed mates

- game 1, move 18... Re8 (A02): -9 to -830, best dxe5
- game 1, move 23. Rxf8+ (A01): 1000 to 625, best Ne6
- game 1, move 24... Nxd3 (A02): -603 to -954, best g6
- game 2, move 10... Nd5 (A01): 50 to -558, best Qe8
- game 2, move 13... Bf6 (A01): -322 to -866, best exd5
- game 2, move 14. Nf4 (A02): 866 to 348, best Nxf6+
- game 2, move 14... Qe7 (A01): -348 to -868, best exf4
- game 2, move 15. Qe2 (A02): 868 to 412, best Nh5
- game 2, move 15... Bg5 (A01): -412 to -970, best exf4
- game 2, move 18. Nf4 (A02): 883 to 401, best Ng3
- game 2, move 29. Rd1 (A02): 996 to 599, best Rxc7, missed a forced mate
- game 2, move 34. Rb7 (A02): 462 to -997, best Kf1
- game 2, move 34... Rc3 (A01): 997 to -490, best Ra1+, missed a forced mate
- game 2, move 37. Rb5 (A02): 466 to -584, best Ra7
- game 2, move 37... Rc2+ (A01): 584 to -230, best axb5
- game 2, move 38. Kf1 (A02): 230 to -597, best Kd1
- game 2, move 39... Rc3 (A01): 562 to -453, best Rxe1+
- game 2, move 40. Ke2 (A02): 453 to -559, best Ra5
- game 2, move 40... Rc2+ (A01): 559 to -227, best axb5
- game 3, move 27. Nxd6 (A01): 40 to -476, best e5
- game 3, move 31. Qxf6 (A01): -449 to -1000, best Rxc8
- game 4, move 23. d4 (A02): 54 to -600, best g3
- game 4, move 24... Qb5 (A01): 464 to 61, best Bxf2+
- game 4, move 25. Nd2 (A02): -61 to -440, best g3
- game 4, move 25... Rfe8 (A01): 440 to -124, best Bxf2+
