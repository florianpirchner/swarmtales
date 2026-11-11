# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 26 | 128 | 10 | 5 | 3 | 0 |
| 1 Black A02 | 26 | 79 | 7 | 5 | 1 | 0 |
| 2 White A02 | 26 | 99 | 6 | 8 | 1 | 0 |
| 2 Black A01 | 26 | 51 | 5 | 6 | 0 | 1 |
| 3 White A01 | 24 | 40 | 7 | 3 | 0 | 0 |
| 3 Black A02 | 23 | 83 | 3 | 4 | 1 | 0 |
| 4 White A02 | 40 | 80 | 7 | 10 | 1 | 0 |
| 4 Black A01 | 40 | 101 | 4 | 8 | 4 | 0 |

## Blunders and missed mates

- game 1, move 15. Ne4 (A01): 6 to -393, best Qh3
- game 1, move 17... Bd6 (A02): 427 to -259, best Rad8
- game 1, move 22. Bd4 (A01): 438 to -389, best b4
- game 1, move 26. Qe6 (A01): -399 to -1000, best Qe2
- game 2, move 21. Qb3 (A02): 113 to -770, best Qxa6
- game 2, move 24... Rf6 (A01): 998 to 824, best Qxf2+, missed a forced mate
- game 3, move 18... Qxc4 (A02): 12 to -1000, best a5
- game 4, move 16... Qe7 (A01): 33 to -811, best g6
- game 4, move 20. Kh2 (A02): 682 to -416, best g3
- game 4, move 24... Rxd3 (A01): 515 to -386, best f5
- game 4, move 38... Ke3 (A01): -160 to -486, best b5
- game 4, move 39... Kf4 (A01): -331 to -675, best Kd4
