# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 31 | 178 | 10 | 2 | 7 | 1 |
| 1 Black A02 | 31 | 141 | 10 | 2 | 6 | 0 |
| 2 White A02 | 40 | 204 | 5 | 11 | 9 | 0 |
| 2 Black A01 | 40 | 191 | 5 | 10 | 9 | 0 |
| 3 White A01 | 40 | 82 | 7 | 9 | 2 | 0 |
| 3 Black A02 | 40 | 100 | 5 | 10 | 3 | 0 |
| 4 White A02 | 38 | 163 | 13 | 9 | 5 | 0 |
| 4 Black A01 | 38 | 127 | 11 | 4 | 5 | 0 |

## Blunders and missed mates

- game 1, move 11... Na3 (A02): -67 to -574, best Na5
- game 1, move 17... Qb5 (A02): -527 to -1000, best Qc7
- game 1, move 18. Qd3 (A01): 1000 to 589, best a4
- game 1, move 18... Nb6 (A02): -589 to -1000, best a5
- game 1, move 19. Nxb6 (A01): 1000 to 560, best a4
- game 1, move 22... Re6 (A02): -536 to -1000, best Qc7
- game 1, move 23. c4 (A01): 1000 to 559, best dxe6
- game 1, move 23... Qb4 (A02): -559 to -1000, best Ree8
- game 1, move 24. Qd3 (A01): 1000 to 573, best dxe6
- game 1, move 27. f4 (A01): 618 to -62, best a4
- game 1, move 28... Rxe4 (A02): 0 to -999, best fxg3
- game 1, move 29. Bg5 (A01): 999 to 134, best Qxg7#, missed a forced mate
- game 1, move 30. Rd3 (A01): 193 to -998, best Bxe4
- game 2, move 22. Qe3 (A02): 185 to -132, best Qf1
- game 2, move 22... Nxe4 (A01): 132 to -277, best Nd5
- game 2, move 23... Rxe4 (A01): -273 to -766, best Qc6
- game 2, move 24. Qf3 (A02): 766 to 9, best Bxe4
- game 2, move 24... Ra4 (A01): -9 to -710, best Re2
- game 2, move 25. Qg2 (A02): 710 to 127, best bxa4
- game 2, move 27... Qc6 (A01): -225 to -775, best Ra5
- game 2, move 28. Qf1 (A02): 775 to 45, best bxa4
- game 2, move 28... Nd5 (A01): -45 to -799, best Ra5
- game 2, move 30. Be3 (A02): 792 to 57, best bxa4
- game 2, move 30... g6 (A01): -57 to -784, best Ra5
- game 2, move 31. f4 (A02): 784 to -37, best bxa4
- game 2, move 33... Kg7 (A01): -55 to -757, best Ra3
- game 2, move 34. Kg2 (A02): 757 to 80, best bxa4
- game 2, move 34... Be7 (A01): -80 to -763, best Ra3
- game 2, move 35. c4 (A02): 763 to 83, best bxa4
- game 2, move 36. Qc3+ (A02): 65 to -372, best Bc3+
- game 2, move 40... Nf5 (A01): 804 to 263, best Rxa2+
- game 3, move 23. Ng5 (A01): 8 to -419, best Nc6
- game 3, move 23... Bxg5 (A02): 419 to 45, best e5
- game 3, move 34... Rxc3 (A02): 25 to -584, best Bc6
- game 3, move 39. Rb7 (A01): 688 to -33, best Rb6
- game 3, move 39... f6 (A02): 33 to -702, best Bxb7
- game 4, move 17. d4 (A02): -57 to -362, best Kg2
- game 4, move 18... Nxd4 (A01): 374 to -35, best e5
- game 4, move 19... Qc6 (A01): 20 to -1000, best e5
- game 4, move 20. Nf5 (A02): 1000 to -362, best Nxc6
- game 4, move 20... Bd8 (A01): 362 to -135, best exf5
- game 4, move 21. Qd2 (A02): 135 to -384, best Nd4
- game 4, move 21... Nh7 (A01): 384 to -36, best exf5
- game 4, move 22. Nxd6 (A02): 36 to -445, best Nd4
- game 4, move 36... Rd4 (A01): 883 to -5, best Qxc3+
- game 4, move 37. Qxc4 (A02): 5 to -809, best cxd4
