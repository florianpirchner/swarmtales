# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 15 | 118 | 4 | 2 | 1 | 0 |
| 1 Black A02 | 15 | 54 | 6 | 2 | 0 | 0 |
| 2 White A02 | 35 | 61 | 4 | 5 | 1 | 0 |
| 2 Black A01 | 34 | 86 | 4 | 6 | 3 | 0 |

## Blunders and missed mates

- game 1, move 15. Qe5 (A01): 122 to -1000, best Qd3
- game 2, move 14... Nf5 (A01): 151 to -443, best Ne6
- game 2, move 19... Qe6 (A01): -359 to -1000, best e4
- game 2, move 21. Qxf7+ (A02): 1000 to 375, best Rae1
- game 2, move 31... Rd3 (A01): -677 to -1000, best Rd2
