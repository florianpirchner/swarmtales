# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 113 | 13 | 11 | 4 | 0 |
| 1 Black A02 | 40 | 116 | 6 | 14 | 3 | 0 |
| 2 White A02 | 40 | 77 | 11 | 8 | 2 | 0 |
| 2 Black A01 | 40 | 62 | 8 | 11 | 0 | 0 |
| 3 White A01 | 40 | 53 | 12 | 5 | 1 | 0 |
| 3 Black A02 | 40 | 70 | 7 | 5 | 2 | 0 |
| 4 White A02 | 19 | 157 | 6 | 5 | 4 | 0 |
| 4 Black A01 | 19 | 81 | 2 | 3 | 2 | 0 |

## Blunders and missed mates

- game 1, move 16. Bf4 (A01): 153 to -215, best Qd3
- game 1, move 16... Bd6 (A02): 215 to -116, best exf4
- game 1, move 22. h3 (A01): 285 to -59, best Nxb5
- game 1, move 28... Bb4 (A02): 374 to -196, best c5
- game 1, move 29. Na4 (A01): 196 to -614, best Rxb4
- game 1, move 29... Kh7 (A02): 614 to -235, best Bxe1
- game 1, move 33. Kf1 (A01): 504 to 130, best f4
- game 2, move 27. Ne2 (A02): 212 to -295, best dxe6
- game 2, move 30. f5 (A02): -316 to -631, best b4
- game 3, move 12. Nd5 (A01): 56 to -483, best Ne2
- game 3, move 12... Qd7 (A02): 483 to -28, best exd5
- game 3, move 17... Nd7 (A02): -32 to -1000, best e5
- game 4, move 15. Nd5 (A02): -126 to -716, best f4
- game 4, move 16. Qf4 (A02): -653 to -1000, best Qe2
- game 4, move 16... Nh5 (A01): 1000 to 634, best exf4
- game 4, move 17. Qh4 (A02): -634 to -1000, best Qg4
- game 4, move 18... exf4 (A01): 1000 to 602, best Bxh4
- game 4, move 19. Qxf4 (A02): -602 to -1000, best Qh5
