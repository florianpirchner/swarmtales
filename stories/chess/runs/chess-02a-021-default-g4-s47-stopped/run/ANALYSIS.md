# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 27 | 114 | 8 | 8 | 1 | 0 |
| 1 Black A02 | 27 | 84 | 6 | 9 | 1 | 0 |
| 2 White A02 | 19 | 66 | 6 | 5 | 0 | 0 |
| 2 Black A01 | 18 | 115 | 6 | 3 | 2 | 0 |
| 3 White A01 | 18 | 110 | 6 | 3 | 2 | 0 |
| 3 Black A02 | 18 | 100 | 5 | 3 | 2 | 0 |

## Blunders and missed mates

- game 1, move 15... Bxa4 (A02): 152 to -408, best Rxe1+
- game 1, move 16. Qc1 (A01): 408 to -737, best Qxa4
- game 2, move 16... Nxe4 (A01): 52 to -460, best Ne8
- game 2, move 18... Bf6 (A01): -479 to -1000, best Rc8
- game 3, move 13. Bd2 (A01): 20 to -506, best exd5
- game 3, move 13... Re8 (A02): 506 to -15, best Be6
- game 3, move 14. c4 (A01): 15 to -513, best exd5
- game 3, move 18... d5 (A02): 536 to -15, best Bd7
