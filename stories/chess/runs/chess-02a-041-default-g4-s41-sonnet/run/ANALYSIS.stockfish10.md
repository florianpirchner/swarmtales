# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 89 | 9 | 8 | 2 | 0 |
| 1 Black A02 | 40 | 65 | 10 | 5 | 1 | 0 |
| 2 White A02 | 40 | 74 | 11 | 6 | 1 | 0 |
| 2 Black A01 | 40 | 56 | 9 | 7 | 0 | 0 |
| 3 White A01 | 40 | 58 | 9 | 8 | 1 | 0 |
| 3 Black A02 | 40 | 48 | 8 | 6 | 1 | 0 |
| 4 White A02 | 40 | 55 | 18 | 6 | 0 | 0 |
| 4 Black A01 | 40 | 60 | 12 | 9 | 0 | 0 |

## Blunders and missed mates

- game 1, move 17. Be3 (A01): -11 to -732, best Nh4
- game 1, move 17... Rd7 (A02): 732 to -12, best Bc4
- game 1, move 39. Ke3 (A01): 76 to -688, best Nd6
- game 2, move 32. Rc1 (A02): 52 to -783, best Kf2
- game 3, move 23... Nd7 (A02): 89 to -349, best c5
- game 3, move 24. Nxd7 (A01): 349 to -118, best f5
