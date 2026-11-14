# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 162 | 2 | 5 | 5 | 1 |
| 1 Black A02 | 40 | 150 | 6 | 1 | 7 | 1 |
| 2 White A02 | 39 | 22 | 5 | 0 | 0 | 0 |
| 2 Black A01 | 39 | 20 | 2 | 1 | 0 | 0 |

## Blunders and missed mates

- game 1, move 15... Ng4 (A02): -16 to -509, best Be6
- game 1, move 16... Re8 (A02): -509 to -811, best Qc7
- game 1, move 26. Re8+ (A01): 552 to -162, best Rad1
- game 1, move 28... Re3 (A02): 292 to -584, best Rxd4
- game 1, move 29. Bd5 (A01): 584 to -279, best fxe3
- game 1, move 29... Rb2 (A02): 279 to -566, best Re7
- game 1, move 30. f3 (A01): 566 to -200, best fxe3
- game 1, move 34... Ree2 (A02): 192 to -485, best g5
- game 1, move 35. Bd3 (A01): 485 to -369, best Bxe2
- game 1, move 36... h6 (A02): 386 to -999, best g6
- game 1, move 37. Rg1 (A01): 999 to -999, best Rc8#, missed a forced mate
- game 1, move 37... Rxg1+ (A02): 999 to 371, best Rh2#, missed a forced mate
