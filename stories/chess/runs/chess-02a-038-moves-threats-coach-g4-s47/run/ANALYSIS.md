# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 26 | 83 | 2 | 1 | 2 | 0 |
| 1 Black A02 | 26 | 46 | 1 | 1 | 1 | 0 |
| 2 White A02 | 15 | 94 | 0 | 1 | 3 | 0 |
| 2 Black A01 | 15 | 28 | 0 | 0 | 1 | 0 |
| 3 White A01 | 29 | 5 | 0 | 0 | 0 | 0 |
| 3 Black A02 | 28 | 41 | 1 | 1 | 1 | 0 |
| 4 White A02 | 34 | 24 | 2 | 1 | 1 | 0 |
| 4 Black A01 | 33 | 52 | 4 | 1 | 2 | 0 |

## Blunders and missed mates

- game 1, move 14... Ng4 (A02): -167 to -1000, best e5
- game 1, move 20. Qe4 (A01): 743 to -568, best Qc4
- game 1, move 21. Nxc7 (A01): -575 to -960, best Re1
- game 2, move 11. Nd4 (A02): -95 to -560, best c4
- game 2, move 12. Bxd4 (A02): -529 to -935, best Bxc6
- game 2, move 14... Be6 (A01): 945 to 598, best Na5
- game 2, move 15. Qb3 (A02): -598 to -1000, best d5
- game 3, move 28... Qxf2 (A02): -182 to -1000, best Qd2
- game 4, move 14... Bb6 (A01): 13 to -444, best dxe4
- game 4, move 20. Ne5 (A02): 469 to 97, best a4
- game 4, move 22... Rf3 (A01): -80 to -703, best Ref7
