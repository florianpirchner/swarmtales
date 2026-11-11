# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 21 | 63 | 4 | 6 | 0 | 0 |
| 1 Black A02 | 20 | 128 | 5 | 10 | 1 | 0 |
| 2 White A02 | 16 | 48 | 10 | 0 | 0 | 0 |
| 2 Black A01 | 15 | 111 | 4 | 2 | 1 | 0 |
| 3 White A01 | 15 | 139 | 6 | 2 | 1 | 0 |
| 3 Black A02 | 15 | 61 | 3 | 4 | 0 | 0 |
| 4 White A02 | 29 | 94 | 8 | 6 | 2 | 0 |
| 4 Black A01 | 29 | 54 | 6 | 7 | 0 | 0 |

## Blunders and missed mates

- game 1, move 4... Nxe4 (A02): 2 to -319, best Bb4
- game 2, move 15... Qxc3 (A01): 41 to -1000, best b6
- game 3, move 15. Qxa7 (A01): 338 to -1000, best Qa6
- game 4, move 7. Be6 (A02): 87 to -532, best Bg5
- game 4, move 29. Re6 (A02): -425 to -1000, best d5
