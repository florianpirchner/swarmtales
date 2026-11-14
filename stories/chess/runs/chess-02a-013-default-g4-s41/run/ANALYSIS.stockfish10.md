# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 213 | 10 | 9 | 8 | 0 |
| 1 Black A02 | 40 | 222 | 8 | 8 | 10 | 0 |
| 2 White A02 | 40 | 91 | 12 | 9 | 2 | 0 |
| 2 Black A01 | 40 | 57 | 10 | 7 | 1 | 0 |
| 3 White A01 | 39 | 89 | 13 | 12 | 2 | 0 |
| 3 Black A02 | 38 | 83 | 11 | 12 | 1 | 0 |
| 4 White A02 | 40 | 109 | 17 | 6 | 3 | 0 |
| 4 Black A01 | 40 | 124 | 8 | 12 | 4 | 0 |

## Blunders and missed mates

- game 1, move 13. Bb3 (A01): 196 to -415, best Nd2
- game 1, move 13... Qb6 (A02): 415 to -140, best cxb3
- game 1, move 17... Rb4 (A02): -171 to -746, best Qb6
- game 1, move 19. Nd4 (A01): 741 to -507, best Bd2
- game 1, move 20... Ng4 (A02): 529 to -134, best cxd4
- game 1, move 21. Qd2 (A01): 134 to -497, best Nf3
- game 1, move 22... Rb8 (A02): 447 to -240, best exd4
- game 1, move 23. Rb1 (A01): 240 to -556, best Nc6
- game 1, move 23... Nf6 (A02): 556 to -191, best exd4
- game 1, move 24. Bd3 (A01): 191 to -537, best Nc6
- game 1, move 24... h6 (A02): 537 to -158, best exd4
- game 1, move 25. Bc3 (A01): 158 to -686, best Nc6
- game 1, move 25... Rc8 (A02): 686 to -33, best exd4
- game 1, move 26. Re1 (A01): 33 to -717, best Nc6
- game 1, move 26... Re8 (A02): 717 to -204, best exd4
- game 1, move 36... Bc3 (A02): 177 to -490, best exf2+
- game 1, move 39... Rb5 (A02): -376 to -1000, best exf2+
- game 1, move 40. Bc4 (A01): 1000 to 319, best Bxb5
- game 2, move 9. Nc4 (A02): 64 to -381, best h3
- game 2, move 9... Bxc4 (A01): 381 to 81, best b5
- game 2, move 12. Qe3 (A02): -214 to -731, best Qc2
- game 3, move 28. Ne2 (A01): 162 to -192, best e5
- game 3, move 29... Rcc7 (A02): 61 to -368, best g6
- game 3, move 30. Nf5 (A01): 368 to -60, best e5
- game 4, move 19... Nxe3 (A01): -60 to -617, best Kh8
- game 4, move 20. Rxe3 (A02): 617 to 62, best Nf6+
- game 4, move 20... Qxg4 (A01): -62 to -425, best f5
- game 4, move 34. Kg3 (A02): 730 to -90, best gxf5
- game 4, move 34... Kd7 (A01): 90 to -722, best f4+
- game 4, move 35. Rf2 (A02): 722 to -85, best gxf5
- game 4, move 35... Rf7 (A01): 85 to -710, best f4+
