# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 150 | 5 | 8 | 6 | 0 |
| 1 Black A02 | 40 | 129 | 4 | 11 | 4 | 0 |
| 2 White A02 | 26 | 153 | 5 | 8 | 4 | 0 |
| 2 Black A01 | 26 | 104 | 1 | 7 | 3 | 2 |
| 3 White A01 | 32 | 85 | 12 | 4 | 1 | 0 |
| 3 Black A02 | 31 | 124 | 8 | 6 | 1 | 0 |
| 4 White A02 | 33 | 170 | 3 | 7 | 6 | 0 |
| 4 Black A01 | 33 | 138 | 4 | 5 | 4 | 0 |

## Blunders and missed mates

- game 1, move 12... Bf5 (A02): -153 to -607, best a5
- game 1, move 13. Nh4 (A01): 607 to 50, best exf5
- game 1, move 25. Qc2 (A01): 190 to -331, best Nf1
- game 1, move 25... Qe6 (A02): 331 to -1000, best Bg5
- game 1, move 26. Nb3 (A01): 1000 to -147, best fxe6
- game 1, move 29. Nc1 (A01): -138 to -653, best Kf1
- game 1, move 32... Rb4 (A02): 766 to -245, best Ra2
- game 1, move 33. Rd2 (A01): 245 to -800, best cxb4
- game 1, move 34... Be5 (A02): 805 to 253, best Rc4
- game 1, move 35. f4 (A01): -253 to -775, best dxe5
- game 2, move 9... Qe7 (A01): 123 to -381, best e4
- game 2, move 10. Be3 (A02): 381 to -96, best Bg5
- game 2, move 12... Bd7 (A01): 91 to -407, best Be6
- game 2, move 13. Bb3 (A02): 407 to -69, best Bg5
- game 2, move 15. Qc3 (A02): 32 to -739, best d5
- game 2, move 20... Qxe3 (A01): 1000 to 608, best Qxb3
- game 2, move 21. Qf1 (A02): -608 to -1000, best fxe3
- game 2, move 24... Rxd7 (A01): 998 to 1000, best Qxf2+, missed a forced mate
- game 2, move 25... Qe1 (A01): 998 to 1000, best Qxf2+, missed a forced mate
- game 3, move 27. Qe1 (A01): 137 to -773, best Rf1
- game 3, move 30... Ng4 (A02): 1000 to -912, best Qc5
- game 4, move 16. c3 (A02): 26 to -301, best g3
- game 4, move 20... Qe6 (A01): 419 to -640, best d5
- game 4, move 21. Bb3 (A02): 640 to -342, best Bxe6
- game 4, move 21... Rfe8 (A01): 342 to -624, best Qd7
- game 4, move 22. Bc4 (A02): 624 to -377, best Bxe6
- game 4, move 26. Qf3 (A02): -404 to -1000, best dxe4
- game 4, move 28... Rxd3 (A01): 1000 to 660, best Qa2
- game 4, move 29. Qxd3 (A02): -660 to -1000, best Bxd3
- game 4, move 31... Qe3 (A01): 1000 to -222, best Qc1
- game 4, move 32. Bc4 (A02): 222 to -1000, best fxe3
