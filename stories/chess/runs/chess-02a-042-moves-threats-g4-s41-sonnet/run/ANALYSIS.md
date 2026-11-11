# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 71 | 7 | 11 | 1 | 0 |
| 1 Black A02 | 40 | 66 | 8 | 8 | 2 | 0 |
| 2 White A02 | 40 | 66 | 9 | 7 | 2 | 0 |
| 2 Black A01 | 40 | 93 | 12 | 8 | 2 | 0 |
| 3 White A01 | 40 | 77 | 19 | 8 | 1 | 0 |
| 3 Black A02 | 40 | 77 | 18 | 10 | 1 | 0 |
| 4 White A02 | 40 | 53 | 12 | 8 | 0 | 0 |
| 4 Black A01 | 40 | 51 | 6 | 10 | 0 | 0 |

## Blunders and missed mates

- game 1, move 16... Nd4 (A02): -65 to -423, best Ne7
- game 1, move 21. b3 (A01): 402 to -10, best Bg5
- game 1, move 22... Rxc1 (A02): 36 to -281, best Nxe4
- game 2, move 21. Bc3 (A02): 155 to -509, best a4
- game 2, move 37. Qa5 (A02): -525 to -844, best Qe3
- game 2, move 37... Qd5 (A01): 844 to 467, best e4
- game 2, move 40... Be7 (A01): 375 to -841, best Nd5
- game 3, move 25... Qe7 (A02): -89 to -498, best Kh8
- game 3, move 26. Nf5 (A01): 498 to 79, best d4
