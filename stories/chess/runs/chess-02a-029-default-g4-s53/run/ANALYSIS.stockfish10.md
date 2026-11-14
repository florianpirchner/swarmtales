# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 120 | 6 | 10 | 4 | 1 |
| 1 Black A02 | 40 | 143 | 10 | 15 | 4 | 0 |
| 2 White A02 | 40 | 184 | 15 | 7 | 8 | 0 |
| 2 Black A01 | 40 | 197 | 10 | 5 | 10 | 0 |
| 3 White A01 | 32 | 78 | 3 | 4 | 2 | 0 |
| 3 Black A02 | 32 | 48 | 1 | 6 | 1 | 0 |
| 4 White A02 | 40 | 140 | 10 | 9 | 6 | 0 |
| 4 Black A01 | 40 | 154 | 2 | 12 | 7 | 0 |

## Blunders and missed mates

- game 1, move 17... Nf4 (A02): -98 to -638, best Bf6
- game 1, move 18. Bd3 (A01): 638 to -13, best Bxf4
- game 1, move 24. Rc6 (A01): 312 to -639, best Ba5
- game 1, move 24... Rc8 (A02): 639 to -75, best bxc6
- game 1, move 27... g6 (A02): 79 to -297, best Bb5
- game 1, move 38. Be5 (A01): 900 to 588, best Qf6
- game 1, move 40. axb4 (A01): 997 to 356, best Rxc8+, missed a forced mate
- game 1, move 40... Rd8 (A02): -356 to -866, best Na7
- game 2, move 11... Nd5 (A01): 32 to -511, best a5
- game 2, move 12. Qe2 (A02): 511 to 56, best exd5
- game 2, move 12... Bb6 (A01): -56 to -517, best Nde7
- game 2, move 13. h3 (A02): 517 to 36, best exd5
- game 2, move 15. Ne3 (A02): 171 to -410, best d4
- game 2, move 15... Re8 (A01): 410 to -143, best fxe3
- game 2, move 17... Be3 (A01): -141 to -572, best Ne5
- game 2, move 18. Nxe3 (A02): 572 to 115, best fxe3
- game 2, move 18... Ne5 (A01): -115 to -526, best fxe3
- game 2, move 20... Qg5 (A01): -408 to -769, best a5
- game 2, move 36. Qf3 (A02): 824 to -26, best Rc1
- game 2, move 36... Qd5 (A01): 26 to -1000, best Rxf3
- game 2, move 37. Rc7 (A02): 1000 to 254, best exd5
- game 2, move 37... Qe6 (A01): -254 to -793, best Qa5
- game 2, move 38. Kh2 (A02): 793 to 19, best Qe3
- game 2, move 38... Rf5 (A01): -19 to -1000, best Rxf3
- game 2, move 40. Rb2 (A02): 825 to 176, best Rbc1
- game 2, move 40... Qxd3 (A01): -176 to -1000, best Rg5
- game 3, move 14. Qd3 (A01): 96 to -1000, best Qe2
- game 3, move 15... Qxc3 (A02): 1000 to 636, best Bxc5
- game 3, move 16. Nd7 (A01): -636 to -1000, best bxc3
- game 4, move 12. Nc3 (A02): 181 to -119, best Rd1
- game 4, move 12... Nd7 (A01): 119 to -181, best b5
- game 4, move 20... Nxb2 (A01): 36 to -406, best b5
- game 4, move 21. Qd2 (A02): 406 to -147, best Qxb2
- game 4, move 27... Na4 (A01): 147 to -345, best Nc4
- game 4, move 29. Qf2 (A02): 435 to 81, best Nc3
- game 4, move 30. Rxe4 (A02): 127 to -717, best Nb2
- game 4, move 30... Rxe4 (A01): 717 to -121, best Qxa1+
- game 4, move 31. Qc2 (A02): 121 to -762, best Nb2
- game 4, move 31... Qe7 (A01): 762 to -117, best Qxa1+
- game 4, move 33. Qb3 (A02): 70 to -475, best Qd3
- game 4, move 33... Qe5 (A01): 475 to -54, best Qe4
- game 4, move 35... Qf2 (A01): -77 to -745, best Re3
