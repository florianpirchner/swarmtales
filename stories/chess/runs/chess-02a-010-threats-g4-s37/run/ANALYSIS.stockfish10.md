# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 23 | 157 | 7 | 5 | 3 | 0 |
| 1 Black A02 | 23 | 108 | 5 | 3 | 1 | 0 |
| 2 White A02 | 40 | 141 | 10 | 9 | 6 | 0 |
| 2 Black A01 | 40 | 117 | 9 | 11 | 4 | 0 |
| 3 White A01 | 22 | 53 | 10 | 3 | 0 | 0 |
| 3 Black A02 | 21 | 92 | 5 | 3 | 2 | 0 |
| 4 White A02 | 40 | 107 | 9 | 9 | 4 | 0 |
| 4 Black A01 | 40 | 81 | 9 | 6 | 3 | 0 |

## Blunders and missed mates

- game 1, move 11. Bg5 (A01): -95 to -616, best Bd2
- game 1, move 17... Qf4 (A02): 736 to -747, best Qd2
- game 1, move 18. Qxf4 (A01): 747 to -629, best gxf4
- game 1, move 23. Re6 (A01): -542 to -1000, best Kg2
- game 2, move 15. g4 (A02): 64 to -411, best Kh1
- game 2, move 16... exf4 (A01): 316 to -76, best Rxf4
- game 2, move 20. h4 (A02): 116 to -286, best e5
- game 2, move 22. Qe2 (A02): -200 to -865, best f3
- game 2, move 22... Rf7 (A01): 865 to 101, best f3
- game 2, move 23. Nd2 (A02): -101 to -1000, best Qf3
- game 2, move 23... Qh3 (A01): 1000 to 62, best f3
- game 2, move 24. Nf3 (A02): -62 to -373, best Qf3
- game 2, move 25... Re8 (A01): 676 to 255, best Rf6
- game 2, move 39. Nd6+ (A02): -31 to -747, best Rb8
- game 3, move 13... Ng4 (A02): 54 to -578, best Bxe3
- game 3, move 17... Nf5 (A02): -492 to -991, best Qg6
- game 4, move 18. g3 (A02): -13 to -523, best Rc1
- game 4, move 18... Rf7 (A01): 523 to 86, best Qxf3+
- game 4, move 26. Nf2 (A02): -254 to -862, best b4
- game 4, move 26... Rxh4 (A01): 862 to 285, best Rxf2+
- game 4, move 31... Rf4 (A01): 283 to -74, best Bb6
- game 4, move 32. Rxf4 (A02): 74 to -257, best Nh5+
- game 4, move 33. Nd5 (A02): -279 to -737, best Ne8+
