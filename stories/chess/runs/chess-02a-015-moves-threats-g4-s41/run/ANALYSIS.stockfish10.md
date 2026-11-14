# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 27 | 94 | 8 | 8 | 1 | 0 |
| 1 Black A02 | 26 | 131 | 6 | 8 | 3 | 0 |
| 2 White A02 | 36 | 99 | 8 | 9 | 2 | 0 |
| 2 Black A01 | 36 | 71 | 2 | 8 | 2 | 0 |
| 3 White A01 | 23 | 65 | 4 | 2 | 1 | 0 |
| 3 Black A02 | 23 | 21 | 5 | 1 | 0 | 0 |
| 4 White A02 | 34 | 57 | 10 | 4 | 1 | 0 |
| 4 Black A01 | 33 | 79 | 9 | 4 | 2 | 0 |

## Blunders and missed mates

- game 1, move 11... Re8 (A02): -8 to -375, best Bxb3
- game 1, move 12. Re1 (A01): 375 to 0, best d5
- game 1, move 20... Nc2 (A02): -55 to -590, best Rc8
- game 1, move 24... g6 (A02): -616 to -1000, best Nd7
- game 2, move 11... Nd4 (A01): -4 to -486, best Ng4
- game 2, move 15. Nxd4 (A02): 517 to -77, best Qxd4
- game 2, move 15... Nxf2 (A01): 77 to -368, best Qh4
- game 2, move 36. Rc6 (A02): 156 to -786, best Rc8+
- game 3, move 14. Qd4 (A01): -12 to -1000, best Kh2
- game 4, move 11... Nxe4 (A01): -2 to -421, best h6
- game 4, move 17. Bf4 (A02): 549 to -68, best Ng5
- game 4, move 30... Rf5 (A01): 45 to -805, best c5
