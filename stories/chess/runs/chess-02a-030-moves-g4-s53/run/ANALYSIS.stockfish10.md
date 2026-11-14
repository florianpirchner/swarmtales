# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 24 | 154 | 4 | 6 | 3 | 0 |
| 1 Black A02 | 24 | 111 | 4 | 4 | 1 | 0 |
| 2 White A02 | 24 | 119 | 7 | 5 | 2 | 1 |
| 2 Black A01 | 23 | 163 | 3 | 7 | 2 | 0 |
| 3 White A01 | 22 | 90 | 6 | 2 | 2 | 0 |
| 3 Black A02 | 22 | 43 | 6 | 1 | 1 | 0 |
| 4 White A02 | 34 | 65 | 10 | 8 | 0 | 0 |
| 4 Black A01 | 33 | 85 | 11 | 5 | 1 | 0 |

## Blunders and missed mates

- game 1, move 15. Qb3 (A01): 160 to -167, best dxe5
- game 1, move 22. Bf4 (A01): -360 to -719, best Be3
- game 1, move 23... Bxb2 (A02): 983 to -635, best Rxb2+
- game 1, move 24. Rxb2 (A01): 635 to -725, best Kxf2
- game 2, move 14. Bb3 (A02): 145 to -169, best Bd3
- game 2, move 22... Rd8 (A01): 346 to -998, best h5
- game 2, move 23. Qe7 (A02): 998 to -190, best Qe8+, missed a forced mate
- game 2, move 23... Rd7 (A01): 190 to -999, best Qc8
- game 3, move 12. Nd5 (A01): 25 to -562, best Qe1
- game 3, move 16... Nd4 (A02): 813 to 422, best Qf6
- game 3, move 18. Qxf1 (A01): -415 to -887, best Kxf1
- game 4, move 33... Rf5 (A01): 89 to -823, best Re6
