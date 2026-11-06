# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 212 | 8 | 10 | 5 | 1 |
| 1 Black A02 | 40 | 196 | 3 | 12 | 7 | 1 |
| 2 White A02 | 39 | 63 | 8 | 9 | 0 | 0 |
| 2 Black A01 | 39 | 68 | 9 | 10 | 0 | 0 |

## Blunders and missed mates

- game 1, move 15... Ng4 (A02): -45 to -554, best Be6
- game 1, move 16... Re8 (A02): -466 to -847, best Qc7
- game 1, move 26. Re8+ (A01): 566 to -305, best Rad1
- game 1, move 28... Re3 (A02): 406 to -608, best Rxd4
- game 1, move 29. Bd5 (A01): 608 to -436, best fxe3
- game 1, move 29... Rb2 (A02): 436 to -635, best Re7
- game 1, move 30. f3 (A01): 635 to -397, best fxe3
- game 1, move 34... Ree2 (A02): 409 to -497, best g6
- game 1, move 35. Bd3 (A01): 497 to -645, best Bxe2
- game 1, move 36... h6 (A02): 633 to -999, best g6
- game 1, move 37. Rg1 (A01): 999 to -999, best Rc8#, missed a forced mate
- game 1, move 37... Rxg1+ (A02): 999 to 695, best Rh2#, missed a forced mate
