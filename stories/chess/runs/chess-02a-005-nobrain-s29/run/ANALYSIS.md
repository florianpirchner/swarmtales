# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 25 | 140 | 2 | 5 | 6 | 0 |
| 1 Black A02 | 24 | 188 | 5 | 6 | 7 | 0 |
| 2 White A02 | 14 | 134 | 6 | 2 | 1 | 0 |
| 2 Black A01 | 14 | 51 | 3 | 3 | 0 | 0 |

## Blunders and missed mates

- game 1, move 10... Be6 (A02): 65 to -404, best Bg4
- game 1, move 11. Bxe6 (A01): 404 to 84, best d5
- game 1, move 11... Rxe6 (A02): -84 to -512, best fxe6
- game 1, move 12. Nd5 (A01): 512 to 208, best d5
- game 1, move 12... Nxd5 (A02): -208 to -869, best h6
- game 1, move 13. exd5 (A01): 869 to 327, best Bxd8
- game 1, move 13... Qe8 (A02): -327 to -759, best Rxe1+
- game 1, move 14... Nxd4 (A02): -688 to -1000, best d5
- game 1, move 15. e7 (A01): 1000 to 560, best Nxd4
- game 1, move 18. Bxd6 (A01): 977 to 447, best Rad1
- game 1, move 22... Rc2 (A02): -654 to -1000, best a5
- game 1, move 23. Qd8 (A01): 1000 to 655, best Rb8
- game 1, move 23... Qf8 (A02): -655 to -996, best Qxd8
- game 2, move 14. Qd3 (A02): 104 to -1000, best dxe5
