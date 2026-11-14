# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 25 | 122 | 3 | 1 | 6 | 0 |
| 1 Black A02 | 24 | 169 | 1 | 5 | 7 | 0 |
| 2 White A02 | 14 | 81 | 0 | 0 | 1 | 0 |
| 2 Black A01 | 14 | 9 | 0 | 0 | 0 | 0 |

## Blunders and missed mates

- game 1, move 10... Be6 (A02): 10 to -368, best h6
- game 1, move 11. Bxe6 (A01): 368 to 41, best d5
- game 1, move 11... Rxe6 (A02): -41 to -399, best fxe6
- game 1, move 12. Nd5 (A01): 399 to 77, best d5
- game 1, move 12... Nxd5 (A02): -77 to -704, best Ba5
- game 1, move 13. exd5 (A01): 704 to 168, best Bxd8
- game 1, move 13... Qe8 (A02): -168 to -650, best Rxe1+
- game 1, move 14... Nxd4 (A02): -644 to -1000, best f6
- game 1, move 15. e7 (A01): 1000 to 511, best Nxd4
- game 1, move 18. Bxd6 (A01): 832 to 300, best Qxb7
- game 1, move 22... Rc2 (A02): -417 to -1000, best a5
- game 1, move 23. Qd8 (A01): 1000 to 587, best Rb8
- game 1, move 23... Qf8 (A02): -587 to -996, best Qxd8
- game 2, move 14. Qd3 (A02): 36 to -1000, best Qe2
