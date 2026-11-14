# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 20 | 123 | 0 | 0 | 3 | 0 |
| 1 Black A02 | 20 | 73 | 0 | 0 | 2 | 0 |
| 2 White A02 | 24 | 69 | 3 | 2 | 1 | 0 |
| 2 Black A01 | 23 | 115 | 2 | 1 | 2 | 0 |

## Blunders and missed mates

- game 1, move 17. Nb6 (A01): -37 to -403, best Nd2
- game 1, move 18... Nxe4 (A02): 396 to 49, best g5
- game 1, move 19. Qc5 (A01): -49 to -1000, best dxe4
- game 1, move 19... Kh7 (A02): 1000 to 27, best Nxc5
- game 1, move 20. Nf3 (A01): -27 to -1000, best dxe4
- game 2, move 15... Qa5 (A01): 59 to -1000, best Nxe4
- game 2, move 16. Rc1 (A02): 1000 to -22, best Rxa5
- game 2, move 23... Nd5 (A01): 69 to -1000, best Qa2
