# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 215 | 0 | 3 | 14 | 0 |
| 1 Black A02 | 40 | 213 | 1 | 3 | 14 | 3 |
| 2 White A02 | 34 | 106 | 0 | 1 | 5 | 1 |
| 2 Black A01 | 33 | 145 | 0 | 1 | 6 | 2 |
| 3 White A01 | 33 | 131 | 0 | 2 | 8 | 0 |
| 3 Black A02 | 33 | 102 | 2 | 0 | 7 | 0 |
| 4 White A02 | 40 | 100 | 5 | 3 | 6 | 0 |
| 4 Black A01 | 40 | 93 | 3 | 4 | 5 | 1 |

## Blunders and missed mates

- game 1, move 4. O-O (A01): -20 to -433, best Bxc6
- game 1, move 4... Be7 (A02): 433 to 0, best axb5
- game 1, move 5. c3 (A01): 0 to -480, best Bxc6
- game 1, move 5... Nf6 (A02): 480 to 13, best axb5
- game 1, move 6. d4 (A01): -13 to -398, best Bxc6
- game 1, move 6... O-O (A02): 398 to 5, best axb5
- game 1, move 7. Be3 (A01): -5 to -414, best Bc4
- game 1, move 7... Re8 (A02): 414 to 19, best axb5
- game 1, move 15... Bd6 (A02): 27 to -393, best d5
- game 1, move 16. Nf3 (A01): 393 to -177, best Nxf7
- game 1, move 16... Qe7 (A02): 177 to -458, best Qf6
- game 1, move 17. Nh4 (A01): 458 to -676, best Rxe7
- game 1, move 17... Bg6 (A02): 676 to -482, best Qxh4
- game 1, move 18. Nxg6 (A01): 482 to -100, best Rxe7
- game 1, move 18... hxg6 (A02): 100 to -487, best Qxe1+
- game 1, move 19. Re3 (A01): 487 to -87, best Rxe7
- game 1, move 21. Qe1 (A01): -153 to -851, best Qd2
- game 1, move 24... Kg8 (A02): 997 to 806, best Qb1+, missed a forced mate
- game 1, move 25... Qxd7 (A02): 998 to 1000, best Qb1+, missed a forced mate
- game 1, move 26... Qe6 (A02): 1000 to 514, best Qf5
- game 1, move 27. Kg1 (A01): -514 to -999, best Bxe6
- game 1, move 27... Qd5 (A02): 999 to 17, best Qe1#, missed a forced mate
- game 1, move 28... Be5 (A02): 3 to -512, best Be7
- game 1, move 29. Bc4 (A01): 512 to -199, best dxe5
- game 1, move 30. b3 (A01): -200 to -512, best Bd5
- game 1, move 30... Kf8 (A02): 512 to 111, best bxc4
- game 1, move 36. Bc4 (A01): -122 to -608, best f4
- game 1, move 36... f6 (A02): 608 to 119, best bxc4
- game 1, move 37. Kd2 (A01): -119 to -607, best Bf7
- game 1, move 38... Kc3 (A02): 602 to 114, best bxc4
- game 2, move 4. O-O (A02): -20 to -433, best Bxc6
- game 2, move 4... Nf6 (A01): 433 to 7, best axb5
- game 2, move 5. Re1 (A02): -7 to -448, best Bxc6
- game 2, move 5... Be7 (A01): 448 to -4, best axb5
- game 2, move 9... Bd6 (A01): 240 to -349, best c5
- game 2, move 10... Nxe4 (A01): -98 to -422, best Qe7
- game 2, move 12. Qxd6 (A02): 691 to -274, best Bxh6
- game 2, move 15. Nc7 (A02): -258 to -999, best Bf4
- game 2, move 15... Qe5 (A01): 999 to 282, best Qe1#, missed a forced mate
- game 2, move 16. Nxa8 (A02): -282 to -999, best Be3
- game 2, move 16... Qxb2 (A01): 999 to -1000, best Qe1#, missed a forced mate
- game 2, move 32. Rb7+ (A02): 995 to 1000, best Be5, missed a forced mate
- game 3, move 4. O-O (A01): -20 to -433, best Bxc6
- game 3, move 4... Nf6 (A02): 433 to 7, best axb5
- game 3, move 5. Re1 (A01): -7 to -448, best Bxc6
- game 3, move 5... Be7 (A02): 448 to -4, best axb5
- game 3, move 6. c3 (A01): 4 to -458, best Bxc6
- game 3, move 6... O-O (A02): 458 to -15, best axb5
- game 3, move 7. d4 (A01): 15 to -390, best Bxc6
- game 3, move 7... exd4 (A02): 390 to 42, best axb5
- game 3, move 8. cxd4 (A01): -42 to -393, best Bd3
- game 3, move 8... Re8 (A02): 393 to -5, best axb5
- game 3, move 20. Nd7 (A01): 68 to -492, best Nxe6
- game 3, move 26... Qd7 (A02): 683 to 202, best Qh5
- game 3, move 27. Qxh6 (A01): -202 to -1000, best Rxe5
- game 3, move 27... Ng4 (A02): 1000 to 597, best Nf3+
- game 3, move 33. h3 (A01): -612 to -1000, best Re7
- game 4, move 4. O-O (A02): -20 to -433, best Bxc6
- game 4, move 4... Nf6 (A01): 433 to 7, best axb5
- game 4, move 5. Nc3 (A02): -7 to -417, best Bxc6
- game 4, move 5... Be7 (A01): 417 to -31, best axb5
- game 4, move 6. d3 (A02): 31 to -425, best Bxc6
- game 4, move 6... O-O (A01): 425 to -31, best axb5
- game 4, move 14. Ned5 (A02): -84 to -458, best Qf3
- game 4, move 14... Qd7 (A01): 458 to -35, best cxd5
- game 4, move 23. Kg1 (A02): -132 to -1000, best gxf3
- game 4, move 26... Qe1+ (A01): 997 to 126, best Qc1+, missed a forced mate
- game 4, move 32. Rxc7 (A02): -37 to -409, best Nh4+
