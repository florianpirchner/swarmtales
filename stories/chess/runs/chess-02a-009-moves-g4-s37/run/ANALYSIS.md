# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 29 | 70 | 1 | 4 | 3 | 0 |
| 1 Black A02 | 29 | 60 | 2 | 1 | 3 | 0 |
| 2 White A02 | 28 | 65 | 4 | 2 | 2 | 0 |
| 2 Black A01 | 28 | 33 | 2 | 4 | 0 | 0 |
| 3 White A01 | 26 | 100 | 2 | 5 | 1 | 0 |
| 3 Black A02 | 26 | 63 | 3 | 5 | 1 | 0 |
| 4 White A02 | 27 | 12 | 2 | 1 | 0 | 0 |
| 4 Black A01 | 26 | 40 | 1 | 1 | 1 | 0 |

## Blunders and missed mates

- game 1, move 10. Nd5 (A01): -152 to -625, best Ng5
- game 1, move 15. Rd6 (A01): -632 to -1000, best Bf4
- game 1, move 16... Bc7 (A02): 1000 to 640, best Bd4
- game 1, move 21... Bxa2 (A02): 672 to 73, best Rd7
- game 1, move 22... Bd5 (A02): 71 to -278, best Be6
- game 1, move 23. Bd6 (A01): 278 to -65, best Rd1
- game 2, move 23. Re8+ (A02): -43 to -533, best Rxd7
- game 2, move 28. Rc7 (A02): -376 to -1000, best Rc3
- game 3, move 9... Rb8 (A02): 14 to -723, best Qd8
- game 3, move 17. Qf4 (A01): 930 to -460, best Re4
- game 4, move 26... Rg8 (A01): -28 to -728, best Re8
