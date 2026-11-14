# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 17 | 96 | 7 | 0 | 2 | 0 |
| 1 Black A02 | 17 | 36 | 7 | 1 | 0 | 0 |
| 2 White A02 | 22 | 118 | 6 | 4 | 4 | 0 |
| 2 Black A01 | 22 | 66 | 6 | 4 | 1 | 0 |
| 3 White A01 | 27 | 38 | 10 | 2 | 0 | 0 |
| 3 Black A02 | 26 | 68 | 7 | 3 | 1 | 0 |
| 4 White A02 | 22 | 73 | 7 | 4 | 1 | 0 |
| 4 Black A01 | 22 | 56 | 6 | 4 | 0 | 0 |

## Blunders and missed mates

- game 1, move 10. Nd5 (A01): 64 to -498, best Ne2
- game 1, move 17. Qb5 (A01): -435 to -1000, best c3
- game 2, move 3. Nxe5 (A02): 85 to -259, best Bb5
- game 2, move 14. Bb6 (A02): -131 to -660, best Qxb7
- game 2, move 17. Rf4 (A02): -510 to -901, best d4
- game 2, move 18... Nf3+ (A01): 883 to 571, best Bg5
- game 2, move 22. Rf5 (A02): -613 to -1000, best Re2
- game 3, move 14... Qxe3 (A02): -42 to -737, best Qd6
- game 4, move 15. Bxc6 (A02): 453 to 17, best Rxf7
