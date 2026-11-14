# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 21 | 69 | 3 | 2 | 1 | 0 |
| 1 Black A02 | 21 | 20 | 2 | 1 | 0 | 0 |
| 2 White A02 | 26 | 203 | 0 | 6 | 4 | 2 |
| 2 Black A01 | 24 | 209 | 3 | 5 | 3 | 0 |
| 3 White A01 | 25 | 16 | 2 | 1 | 0 | 0 |
| 3 Black A02 | 24 | 14 | 1 | 1 | 0 | 0 |

## Blunders and missed mates

- game 1, move 21. Qd2 (A01): -90 to -1000, best Qc7
- game 2, move 13. Qc1 (A02): -292 to -806, best Qxa1
- game 2, move 18... Qe6 (A01): 835 to 93, best Qf5
- game 2, move 19. Ng5 (A02): -93 to -841, best Bxe6
- game 2, move 22... Be4 (A01): 854 to -997, best Qa1+
- game 2, move 23. Nxe4 (A02): 997 to -385, best Qxf7+, missed a forced mate
- game 2, move 23... Re8 (A01): 385 to -998, best Ne5
- game 2, move 24. Ng5 (A02): 998 to -292, best Qxf7+, missed a forced mate
- game 2, move 24... a5 (A01): 292 to -998, best Re1+
