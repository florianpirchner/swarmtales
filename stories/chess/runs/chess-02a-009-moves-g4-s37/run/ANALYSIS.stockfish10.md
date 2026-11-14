# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 29 | 106 | 7 | 5 | 4 | 0 |
| 1 Black A02 | 29 | 91 | 4 | 6 | 2 | 0 |
| 2 White A02 | 28 | 110 | 6 | 8 | 2 | 0 |
| 2 Black A01 | 28 | 67 | 5 | 3 | 2 | 0 |
| 3 White A01 | 26 | 108 | 5 | 5 | 1 | 0 |
| 3 Black A02 | 26 | 70 | 5 | 4 | 1 | 0 |
| 4 White A02 | 27 | 52 | 9 | 4 | 0 | 0 |
| 4 Black A01 | 26 | 83 | 7 | 5 | 1 | 0 |

## Blunders and missed mates

- game 1, move 9. Bb3 (A01): 174 to -278, best exd5
- game 1, move 10. Nd5 (A01): -261 to -744, best Nd2
- game 1, move 15. Rd6 (A01): -661 to -1000, best a4
- game 1, move 16... Bc7 (A02): 1000 to 490, best Bd4
- game 1, move 21... Bxa2 (A02): 662 to -74, best Rd7
- game 1, move 29. Rxe4 (A01): -59 to -447, best Be5
- game 2, move 21... Rfd8 (A01): 353 to 31, best Bc5
- game 2, move 23. Re8+ (A02): -75 to -625, best Rxd7
- game 2, move 25... Bb5 (A01): 856 to 352, best Re7
- game 2, move 28. Rc7 (A02): -301 to -989, best Rg8
- game 3, move 9... Rb8 (A02): 7 to -878, best Qd8
- game 3, move 17. Qf4 (A01): 1000 to -448, best Re4
- game 4, move 26... Rg8 (A01): -10 to -828, best h4
