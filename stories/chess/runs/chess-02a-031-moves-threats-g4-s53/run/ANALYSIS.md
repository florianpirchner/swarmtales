# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 36 | 36 | 2 | 0 | 3 | 0 |
| 1 Black A02 | 35 | 66 | 1 | 1 | 5 | 0 |
| 2 White A02 | 33 | 58 | 2 | 2 | 3 | 0 |
| 2 Black A01 | 33 | 29 | 2 | 1 | 1 | 0 |
| 3 White A01 | 21 | 109 | 3 | 0 | 4 | 0 |
| 3 Black A02 | 21 | 60 | 2 | 0 | 1 | 0 |
| 4 White A02 | 40 | 28 | 6 | 0 | 1 | 0 |
| 4 Black A01 | 40 | 40 | 5 | 0 | 2 | 0 |

## Blunders and missed mates

- game 1, move 10... Be6 (A02): 50 to -323, best exd4
- game 1, move 11. Bxe6 (A01): 323 to 18, best d5
- game 1, move 11... Rxe6 (A02): -18 to -365, best fxe6
- game 1, move 12. b3 (A01): 365 to -90, best d5
- game 1, move 12... Bc5 (A02): 90 to -372, best exd4
- game 1, move 15... Nd4 (A02): -365 to -714, best Ne8
- game 1, move 18. Nxd4 (A01): 712 to 359, best Nc4
- game 1, move 20... Nxa4 (A02): -368 to -730, best Qd5
- game 2, move 18. Be2 (A02): -136 to -466, best Nd2
- game 2, move 18... Nc6 (A01): 466 to 124, best Nxf3+
- game 2, move 29. Nxa5 (A02): -90 to -477, best Ne3
- game 2, move 31. f5 (A02): -489 to -1000, best Kf3
- game 3, move 16. Rxc7 (A01): -48 to -599, best Nd2
- game 3, move 18. Nf3 (A01): -614 to -1000, best Nf1
- game 3, move 18... Re1+ (A02): 1000 to -34, best Bxf3
- game 3, move 20. Nf3 (A01): 44 to -405, best Nc2
- game 3, move 21. Bxf3 (A01): -416 to -999, best Be3
- game 4, move 11... Nxe4 (A01): 141 to -251, best Qe7
- game 4, move 17... Re3 (A01): -252 to -921, best Qe4
- game 4, move 22. Qxd6 (A02): 1000 to 570, best Qc3
