# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 27 | 62 | 4 | 3 | 1 | 0 |
| 1 Black A02 | 27 | 37 | 5 | 1 | 1 | 0 |
| 2 White A02 | 19 | 25 | 2 | 2 | 0 | 0 |
| 2 Black A01 | 18 | 77 | 2 | 0 | 2 | 0 |
| 3 White A01 | 18 | 60 | 0 | 0 | 2 | 0 |
| 3 Black A02 | 18 | 60 | 0 | 0 | 2 | 0 |

## Blunders and missed mates

- game 1, move 15... Bxa4 (A02): 102 to -303, best Rxe1+
- game 1, move 16. Qc1 (A01): 303 to -586, best Qxa4
- game 2, move 16... Nxe4 (A01): 49 to -438, best h6
- game 2, move 18... Bf6 (A01): -376 to -982, best Rc8
- game 3, move 13. Bd2 (A01): -4 to -516, best exd5
- game 3, move 13... Re8 (A02): 516 to 9, best Be6
- game 3, move 14. c4 (A01): -9 to -498, best exd5
- game 3, move 18... d5 (A02): 528 to 9, best Qe5
