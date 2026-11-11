# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 26 | 146 | 5 | 5 | 6 | 2 |
| 1 Black A02 | 25 | 183 | 4 | 5 | 7 | 0 |
| 2 White A02 | 40 | 141 | 7 | 13 | 3 | 0 |
| 2 Black A01 | 40 | 117 | 11 | 12 | 2 | 0 |
| 3 White A01 | 40 | 142 | 9 | 9 | 6 | 0 |
| 3 Black A02 | 40 | 119 | 8 | 6 | 5 | 0 |
| 4 White A02 | 35 | 70 | 7 | 5 | 2 | 0 |
| 4 Black A01 | 34 | 102 | 5 | 6 | 4 | 0 |

## Blunders and missed mates

- game 1, move 9... Re8 (A02): -75 to -429, best b5
- game 1, move 10. Nbd2 (A01): 429 to 74, best d5
- game 1, move 14... Nd7 (A02): 11 to -309, best c6
- game 1, move 15. Bb3 (A01): 309 to -4, best d5
- game 1, move 17... Ne5 (A02): 2 to -437, best c5
- game 1, move 18. Nxe5 (A01): 437 to 102, best dxe5
- game 1, move 18... Rxe5 (A02): -102 to -615, best dxe5
- game 1, move 19. Rae1 (A01): 615 to 31, best dxe5
- game 1, move 19... Qe7 (A02): -31 to -631, best Re6
- game 1, move 20. Nd2 (A01): 631 to 155, best dxe5
- game 1, move 20... Bg5 (A02): -155 to -709, best d5
- game 1, move 21. Nf3 (A01): 709 to 178, best dxe5
- game 1, move 21... Rxe4 (A02): -178 to -820, best Ra5
- game 1, move 23. Nxg5 (A01): 998 to 1000, best Re8+, missed a forced mate
- game 1, move 24. Qxc7 (A01): 998 to 830, best Re8+, missed a forced mate
- game 2, move 8... Bg4 (A01): 0 to -420, best b5
- game 2, move 19. d5 (A02): 310 to -458, best Nc3
- game 2, move 29... Qf4 (A01): 402 to -1000, best c5
- game 2, move 30. Nd2 (A02): 1000 to -437, best gxf4
- game 2, move 39. Qb6 (A02): -499 to -1000, best Qf3
- game 3, move 16... Ng4 (A02): -101 to -562, best Qc7
- game 3, move 17. Bg5 (A01): 562 to 41, best hxg4
- game 3, move 26... Qe7 (A02): 89 to -921, best g6
- game 3, move 27. Qg3 (A01): 921 to -2, best Nxe7
- game 3, move 27... g6 (A02): 2 to -906, best N4h5
- game 3, move 33. Rf3 (A01): 888 to 39, best Qe2
- game 3, move 34. Rg3 (A01): 71 to -542, best hxg4
- game 3, move 38... Nxb3 (A02): 758 to 458, best f5
- game 3, move 39. h4 (A01): -458 to -821, best axb3
- game 3, move 39... Kh7 (A02): 821 to 348, best e4
- game 3, move 40. Rgg3 (A01): -348 to -797, best axb3
- game 4, move 15... Nxc3 (A01): 224 to -219, best Nxd2
- game 4, move 16... Bg4 (A01): -214 to -799, best f6
- game 4, move 31. Bb2 (A02): 930 to 400, best Nc4
- game 4, move 31... Rc2 (A01): -400 to -922, best Rb3
- game 4, move 33. Bb2 (A02): 930 to 400, best Nc4
- game 4, move 33... Rc2 (A01): -400 to -922, best Rb3
