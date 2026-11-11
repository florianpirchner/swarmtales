# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 13 | 62 | 4 | 3 | 0 | 0 |
| 1 Black A02 | 13 | 37 | 3 | 2 | 0 | 0 |
| 2 White A02 | 17 | 72 | 2 | 7 | 0 | 0 |
| 2 Black A01 | 16 | 141 | 3 | 6 | 2 | 0 |
| 3 White A01 | 25 | 52 | 2 | 3 | 1 | 0 |
| 3 Black A02 | 25 | 8 | 1 | 1 | 0 | 0 |
| 4 White A02 | 10 | 70 | 3 | 3 | 0 | 0 |
| 4 Black A01 | 10 | 56 | 3 | 2 | 0 | 0 |

## Blunders and missed mates

- game 2, move 11... Bg4 (A01): -32 to -341, best c6
- game 2, move 14... Nxe4 (A01): -206 to -770, best Bxe3
- game 3, move 11. Nxd4 (A01): -281 to -740, best Ne4
