# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 60 | 5 | 4 | 2 | 0 |
| 1 Black A02 | 40 | 73 | 5 | 4 | 3 | 0 |
| 2 White A02 | 40 | 49 | 6 | 4 | 2 | 0 |
| 2 Black A01 | 40 | 41 | 4 | 7 | 0 | 0 |
| 3 White A01 | 40 | 26 | 3 | 1 | 1 | 0 |
| 3 Black A02 | 40 | 47 | 3 | 0 | 2 | 0 |
| 4 White A02 | 19 | 139 | 1 | 0 | 5 | 0 |
| 4 Black A01 | 19 | 87 | 0 | 0 | 3 | 0 |

## Blunders and missed mates

- game 1, move 16. Bf4 (A01): 40 to -367, best Qd3
- game 1, move 16... Bd6 (A02): 367 to -22, best exf4
- game 1, move 28... Bb4 (A02): 210 to -305, best Bc5
- game 1, move 29. Na4 (A01): 305 to -399, best Rxb4
- game 1, move 29... Kh7 (A02): 399 to -308, best Bxe1
- game 2, move 21. Bd4 (A02): 394 to 48, best g4
- game 2, move 27. Ne2 (A02): 107 to -267, best dxe6
- game 3, move 12. Nd5 (A01): 3 to -378, best Ne2
- game 3, move 12... Qd7 (A02): 378 to 8, best exd5
- game 3, move 17... Nd7 (A02): -6 to -1000, best Rf8
- game 4, move 15. Nd5 (A02): -10 to -471, best Qe2
- game 4, move 16. Qf4 (A02): -481 to -1000, best Qc3
- game 4, move 16... Nh5 (A01): 1000 to 491, best exf4
- game 4, move 17. Qh4 (A02): -491 to -1000, best Qg4
- game 4, move 17... Nf4 (A01): 1000 to 520, best Bxh4
- game 4, move 18. Bxf4 (A02): -520 to -1000, best Qg4
- game 4, move 18... exf4 (A01): 1000 to 476, best Bxh4
- game 4, move 19. Qxf4 (A02): -476 to -1000, best Qg4
