# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 28 | 104 | 2 | 8 | 2 | 0 |
| 1 Black A02 | 28 | 64 | 3 | 5 | 2 | 0 |
| 2 White A02 | 17 | 164 | 3 | 8 | 2 | 0 |
| 2 Black A01 | 17 | 86 | 2 | 3 | 2 | 0 |
| 3 White A01 | 12 | 134 | 3 | 4 | 1 | 0 |
| 3 Black A02 | 12 | 19 | 1 | 1 | 0 | 0 |
| 4 White A02 | 25 | 178 | 4 | 8 | 3 | 0 |
| 4 Black A01 | 25 | 121 | 2 | 7 | 2 | 0 |

## Blunders and missed mates

- game 1, move 4... Nxe4 (A02): 2 to -319, best Bb4
- game 1, move 6. Nf6+ (A01): 330 to -209, best Nc3
- game 1, move 13... Rfe8 (A02): 548 to -53, best c6
- game 1, move 20. Qxd4 (A01): 109 to -1000, best Qe4
- game 2, move 8... Be6 (A01): 129 to -346, best exd4
- game 2, move 9. Bxe6 (A02): 346 to -8, best d5
- game 2, move 11... Nxc3 (A01): 127 to -307, best d5
- game 2, move 17. Qc5 (A02): 209 to -1000, best Qb3
- game 3, move 11. Qe3 (A01): -151 to -1000, best cxd4
- game 4, move 16... Kg7 (A01): -99 to -870, best Qf5
- game 4, move 17. Nf3 (A02): 870 to 125, best Qg5+
- game 4, move 17... Re8 (A01): -125 to -836, best Qg4
- game 4, move 19. Rf1 (A02): 900 to 192, best Qg5+
- game 4, move 25. Qf5 (A02): 265 to -1000, best Nd1
