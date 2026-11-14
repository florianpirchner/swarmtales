# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 107 | 4 | 3 | 5 | 0 |
| 1 Black A02 | 40 | 86 | 3 | 1 | 4 | 0 |
| 2 White A02 | 26 | 132 | 2 | 7 | 3 | 0 |
| 2 Black A01 | 26 | 94 | 5 | 5 | 2 | 2 |
| 3 White A01 | 32 | 48 | 4 | 0 | 2 | 0 |
| 3 Black A02 | 31 | 82 | 3 | 3 | 1 | 0 |
| 4 White A02 | 33 | 136 | 1 | 1 | 5 | 0 |
| 4 Black A01 | 33 | 106 | 0 | 0 | 4 | 0 |

## Blunders and missed mates

- game 1, move 12... Bf5 (A02): -58 to -539, best d5
- game 1, move 13. Nh4 (A01): 539 to 15, best exf5
- game 1, move 25... Qe6 (A02): 112 to -1000, best Bg5
- game 1, move 26. Nb3 (A01): 1000 to -72, best fxe6
- game 1, move 29. Nc1 (A01): -87 to -578, best Na5
- game 1, move 32... Rb4 (A02): 662 to -65, best Ra2
- game 1, move 33. Rd2 (A01): 65 to -691, best cxb4
- game 1, move 34... Be5 (A02): 756 to 217, best Rc4
- game 1, move 35. f4 (A01): -217 to -676, best dxe5
- game 2, move 12... Bd7 (A01): 109 to -367, best Be6
- game 2, move 13. Bb3 (A02): 367 to -108, best Bg5
- game 2, move 15. Qc3 (A02): 133 to -650, best d5
- game 2, move 20... Qxe3 (A01): 1000 to 557, best Qxb3
- game 2, move 21. Qf1 (A02): -557 to -1000, best fxe3
- game 2, move 24... Rxd7 (A01): 998 to 1000, best Qxf2+, missed a forced mate
- game 2, move 25... Qe1 (A01): 998 to 1000, best Qxf2+, missed a forced mate
- game 3, move 27. Qe1 (A01): 93 to -557, best b3
- game 3, move 30. Ne3 (A01): -506 to -964, best Kh1
- game 3, move 30... Ng4 (A02): 964 to -827, best Qc5
- game 4, move 20... Qe6 (A01): 284 to -493, best d5
- game 4, move 21. Bb3 (A02): 493 to -256, best Bxe6
- game 4, move 21... Rfe8 (A01): 256 to -502, best Qe5
- game 4, move 22. Bc4 (A02): 502 to -284, best Bxe6
- game 4, move 26. Qf3 (A02): -283 to -1000, best dxe4
- game 4, move 28... Rxd3 (A01): 1000 to 418, best Re8
- game 4, move 29. Qxd3 (A02): -418 to -1000, best Bxd3
- game 4, move 31... Qe3 (A01): 1000 to -300, best Qa1
- game 4, move 32. Bc4 (A02): 300 to -1000, best fxe3
