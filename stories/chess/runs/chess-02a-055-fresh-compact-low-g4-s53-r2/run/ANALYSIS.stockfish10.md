# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 265 | 3 | 5 | 15 | 0 |
| 1 Black A02 | 40 | 260 | 0 | 6 | 14 | 3 |
| 2 White A02 | 34 | 138 | 1 | 6 | 5 | 1 |
| 2 Black A01 | 33 | 169 | 1 | 1 | 7 | 2 |
| 3 White A01 | 33 | 187 | 6 | 4 | 9 | 0 |
| 3 Black A02 | 33 | 155 | 7 | 3 | 8 | 0 |
| 4 White A02 | 40 | 151 | 9 | 12 | 6 | 0 |
| 4 Black A01 | 40 | 137 | 4 | 9 | 5 | 1 |

## Blunders and missed mates

- game 1, move 4. O-O (A01): 83 to -434, best Bxc6
- game 1, move 4... Be7 (A02): 434 to -101, best axb5
- game 1, move 5. c3 (A01): 101 to -432, best Bxc6
- game 1, move 5... Nf6 (A02): 432 to -137, best axb5
- game 1, move 6. d4 (A01): 137 to -401, best Bxc6
- game 1, move 6... O-O (A02): 401 to -74, best axb5
- game 1, move 7. Be3 (A01): 74 to -456, best Bxc6
- game 1, move 7... Re8 (A02): 456 to -109, best axb5
- game 1, move 15... Bd6 (A02): -24 to -462, best Bg6
- game 1, move 16. Nf3 (A01): 462 to -156, best Bxf7+
- game 1, move 16... Qe7 (A02): 156 to -549, best Qf6
- game 1, move 17. Nh4 (A01): 549 to -760, best Rxe7
- game 1, move 17... Bg6 (A02): 760 to -528, best Qxh4
- game 1, move 18. Nxg6 (A01): 528 to -130, best Rxe7
- game 1, move 18... hxg6 (A02): 130 to -531, best Qxe1+
- game 1, move 19. Re3 (A01): 531 to -72, best Rxe7
- game 1, move 20. Rxe8+ (A01): 226 to -153, best Rf3
- game 1, move 21. Qe1 (A01): -102 to -1000, best a4
- game 1, move 24... Kg8 (A02): 997 to 962, best Qb1+, missed a forced mate
- game 1, move 25... Qxd7 (A02): 998 to 1000, best Qb1+, missed a forced mate
- game 1, move 26... Qe6 (A02): 1000 to 494, best Qf5
- game 1, move 27. Kg1 (A01): -494 to -999, best Bxe6
- game 1, move 27... Qd5 (A02): 999 to -2, best Qe1#, missed a forced mate
- game 1, move 28... Be5 (A02): 0 to -579, best Be7
- game 1, move 29. Bc4 (A01): 579 to -107, best dxe5
- game 1, move 30. b3 (A01): -97 to -569, best Bd5
- game 1, move 30... Kf8 (A02): 569 to 36, best bxc4
- game 1, move 36. Bc4 (A01): -48 to -697, best f3
- game 1, move 36... f6 (A02): 697 to 60, best bxc4
- game 1, move 37. Kd2 (A01): -60 to -684, best Bf7
- game 1, move 38... Kc3 (A02): 700 to 67, best bxc4
- game 2, move 4. O-O (A02): 83 to -434, best Bxc6
- game 2, move 4... Nf6 (A01): 434 to -161, best axb5
- game 2, move 5. Re1 (A02): 161 to -427, best Bxc6
- game 2, move 5... Be7 (A01): 427 to -187, best axb5
- game 2, move 9... Bd6 (A01): 268 to -287, best c5
- game 2, move 10... Nxe4 (A01): -131 to -539, best Ng4
- game 2, move 11... h6 (A01): -428 to -935, best Kh8
- game 2, move 12. Qxd6 (A02): 935 to -377, best Bxh6
- game 2, move 15. Nc7 (A02): -428 to -999, best Bf4
- game 2, move 15... Qe5 (A01): 999 to 371, best Qe1#, missed a forced mate
- game 2, move 16. Nxa8 (A02): -371 to -999, best Bd2
- game 2, move 16... Qxb2 (A01): 999 to -1000, best Qe1#, missed a forced mate
- game 2, move 30. Bxd5 (A02): 999 to 1000, best Bc5#, missed a forced mate
- game 3, move 4. O-O (A01): 83 to -434, best Bxc6
- game 3, move 4... Nf6 (A02): 434 to -161, best axb5
- game 3, move 5. Re1 (A01): 161 to -427, best Bxc6
- game 3, move 5... Be7 (A02): 427 to -187, best axb5
- game 3, move 6. c3 (A01): 187 to -476, best Bxc6
- game 3, move 6... O-O (A02): 476 to -162, best axb5
- game 3, move 7. d4 (A01): 162 to -386, best Bxc6
- game 3, move 7... exd4 (A02): 386 to -72, best axb5
- game 3, move 8. cxd4 (A01): 72 to -416, best Bxc6
- game 3, move 8... Re8 (A02): 416 to -134, best axb5
- game 3, move 20. Nd7 (A01): 136 to -546, best Re5
- game 3, move 26... Qd7 (A02): 748 to 285, best Qh5
- game 3, move 27. Qxh6 (A01): -285 to -1000, best Rxe5
- game 3, move 27... Ng4 (A02): 1000 to 656, best gxh6
- game 3, move 32. Rc7 (A01): -662 to -1000, best Kf1
- game 3, move 32... Ne8 (A02): 1000 to 675, best Re8
- game 3, move 33. h3 (A01): -675 to -1000, best Re7
- game 4, move 4. O-O (A02): 83 to -434, best Bxc6
- game 4, move 4... Nf6 (A01): 434 to -161, best axb5
- game 4, move 5. Nc3 (A02): 161 to -393, best Bxc6
- game 4, move 5... Be7 (A01): 393 to -191, best axb5
- game 4, move 6. d3 (A02): 191 to -428, best Bxc6
- game 4, move 6... O-O (A01): 428 to -205, best axb5
- game 4, move 14. Ned5 (A02): -104 to -438, best f3
- game 4, move 14... Qd7 (A01): 438 to -148, best cxd5
- game 4, move 23. Kg1 (A02): -162 to -1000, best gxf3
- game 4, move 26... Qe1+ (A01): 997 to 79, best Qc1+, missed a forced mate
- game 4, move 32. Rxc7 (A02): 136 to -368, best Nh4+
