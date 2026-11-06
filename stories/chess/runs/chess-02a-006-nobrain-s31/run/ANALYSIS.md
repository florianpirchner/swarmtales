# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 20 | 169 | 10 | 1 | 3 | 0 |
| 1 Black A02 | 20 | 104 | 3 | 3 | 2 | 0 |
| 2 White A02 | 24 | 138 | 4 | 8 | 2 | 0 |
| 2 Black A01 | 23 | 182 | 5 | 8 | 3 | 0 |

## Blunders and missed mates

- game 1, move 17. Nb6 (A01): 32 to -429, best Nd2
- game 1, move 18... Nxe4 (A02): 412 to 27, best Rad8
- game 1, move 19. Qc5 (A01): -27 to -1000, best dxe4
- game 1, move 19... Kh7 (A02): 1000 to -37, best Nxc5
- game 1, move 20. Nf3 (A01): 37 to -1000, best dxe4
- game 2, move 13... Be6 (A01): -52 to -398, best b5
- game 2, move 14. Be3 (A02): 398 to -9, best d5
- game 2, move 15... Qa5 (A01): 149 to -1000, best Nxe4
- game 2, move 16. Rc1 (A02): 1000 to -79, best Rxa5
- game 2, move 23... Nd5 (A01): 124 to -1000, best Kh7
