# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 33 | 86 | 7 | 3 | 2 | 0 |
| 1 Black A02 | 33 | 53 | 6 | 3 | 1 | 0 |
| 2 White A02 | 40 | 58 | 10 | 6 | 1 | 0 |
| 2 Black A01 | 40 | 54 | 7 | 4 | 2 | 0 |
| 3 White A01 | 40 | 71 | 10 | 8 | 2 | 0 |
| 3 Black A02 | 40 | 60 | 8 | 7 | 1 | 0 |
| 4 White A02 | 40 | 47 | 10 | 2 | 1 | 0 |
| 4 Black A01 | 40 | 17 | 7 | 1 | 0 | 0 |

## Blunders and missed mates

- game 1, move 29. Ra1 (A01): -75 to -992, best Ne1
- game 1, move 29... Qb4 (A02): 992 to 137, best Qxa1+
- game 1, move 32. Ra1 (A01): -320 to -1000, best Nd2
- game 2, move 29... Ng8 (A01): 34 to -377, best Nb3
- game 2, move 30. Nf5 (A02): 377 to -83, best Bxc5
- game 2, move 38... Kxf7 (A01): 474 to -12, best c4
- game 3, move 25. Qg4 (A01): 37 to -348, best Nb3
- game 3, move 26... Nxe4 (A02): 370 to -52, best d5
- game 3, move 32. Qe3 (A01): 166 to -170, best fxg7
- game 4, move 26. Rc1 (A02): -20 to -825, best Ng3
