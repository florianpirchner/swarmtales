# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 39 | 64 | 11 | 5 | 1 | 0 |
| 1 Black A02 | 38 | 76 | 10 | 4 | 2 | 0 |
| 2 White A02 | 23 | 134 | 3 | 8 | 2 | 0 |
| 2 Black A01 | 23 | 77 | 4 | 4 | 2 | 0 |

## Blunders and missed mates

- game 1, move 17... Nd3 (A02): 27 to -526, best Nc4
- game 1, move 22. Ne7+ (A01): 668 to 16, best Rf1
- game 1, move 25... Ra3 (A02): 212 to -768, best b5
- game 2, move 11... Re8 (A01): 216 to -87, best Nxd4
- game 2, move 16. Re2 (A02): 246 to -194, best exf6
- game 2, move 16... Nd4 (A01): 194 to -234, best Ne4
- game 2, move 18. Qc2 (A02): 271 to -933, best exf6
