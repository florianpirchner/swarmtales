# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 26 | 101 | 7 | 2 | 2 | 0 |
| 1 Black A02 | 26 | 64 | 3 | 2 | 2 | 0 |
| 2 White A02 | 15 | 143 | 4 | 3 | 3 | 0 |
| 2 Black A01 | 15 | 61 | 3 | 2 | 1 | 0 |
| 3 White A01 | 29 | 38 | 13 | 1 | 0 | 0 |
| 3 Black A02 | 28 | 73 | 7 | 4 | 1 | 0 |
| 4 White A02 | 34 | 54 | 9 | 4 | 1 | 0 |
| 4 Black A01 | 33 | 84 | 7 | 7 | 2 | 0 |

## Blunders and missed mates

- game 1, move 11... Rf7 (A02): 63 to -246, best Rad8
- game 1, move 14... Ng4 (A02): -205 to -1000, best a6
- game 1, move 20. Qe4 (A01): 879 to -662, best Qf3
- game 1, move 21. Nxc7 (A01): -615 to -932, best c4
- game 2, move 11. Nd4 (A02): -128 to -651, best c3
- game 2, move 12. Bxd4 (A02): -521 to -980, best Bxc6
- game 2, move 14... Be6 (A01): 990 to 563, best Na5
- game 2, move 15. Qb3 (A02): -563 to -1000, best d5
- game 3, move 28... Qxf2 (A02): -219 to -1000, best Qd2
- game 4, move 14... Bb6 (A01): 6 to -576, best dxe4
- game 4, move 20. Ne5 (A02): 651 to 119, best a4
- game 4, move 22... Rf3 (A01): -123 to -751, best e5
