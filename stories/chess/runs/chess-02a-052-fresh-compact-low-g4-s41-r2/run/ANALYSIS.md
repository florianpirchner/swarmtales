# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 23 | 86 | 1 | 1 | 4 | 0 |
| 1 Black A02 | 23 | 42 | 1 | 2 | 1 | 0 |
| 2 White A02 | 39 | 146 | 0 | 3 | 5 | 1 |
| 2 Black A01 | 38 | 177 | 0 | 3 | 5 | 1 |
| 3 White A01 | 18 | 134 | 1 | 0 | 5 | 0 |
| 3 Black A02 | 18 | 108 | 1 | 0 | 4 | 0 |
| 4 White A02 | 40 | 122 | 5 | 5 | 7 | 0 |
| 4 Black A01 | 40 | 145 | 1 | 5 | 10 | 0 |

## Blunders and missed mates

- game 1, move 14. Nd5 (A01): -102 to -610, best Qa4
- game 1, move 15. Ne5 (A01): -611 to -956, best Rc1
- game 1, move 15... Bxe5 (A02): 956 to 552, best dxe5
- game 1, move 16. Qf3 (A01): -552 to -1000, best dxe5
- game 1, move 20. Qxd6 (A01): -570 to -1000, best b3
- game 2, move 24. Ng5 (A02): 0 to -574, best Na5
- game 2, move 24... Qd7 (A01): 574 to -664, best Qxg5
- game 2, move 25. Qb3 (A02): 664 to -1000, best Qxh7+
- game 2, move 25... Ne4 (A01): 1000 to -446, best Nxb3
- game 2, move 26. Nf3 (A02): 446 to -76, best Nxe4
- game 2, move 28. Qxb7 (A02): -120 to -489, best Qxd5
- game 2, move 35... Kg8 (A01): 280 to -999, best Kg6
- game 2, move 36. Qd5 (A02): 999 to -995, best Qe8#, missed a forced mate
- game 2, move 36... Qb1+ (A01): 995 to 1000, best exd5, missed a forced mate
- game 2, move 37... Nb3 (A01): 1000 to -218, best exd5
- game 2, move 38... Kh8 (A01): -218 to -999, best Kf8
- game 3, move 4. O-O (A01): -20 to -433, best Bxc6
- game 3, move 4... Nf6 (A02): 433 to 7, best axb5
- game 3, move 5. d3 (A01): -7 to -445, best Bxc6
- game 3, move 5... Be7 (A02): 445 to -42, best axb5
- game 3, move 6. Nc3 (A01): 42 to -425, best Bxc6
- game 3, move 6... O-O (A02): 425 to -31, best axb5
- game 3, move 7. a4 (A01): 31 to -399, best Bxc6
- game 3, move 7... Na5 (A02): 399 to 9, best axb5
- game 3, move 17. Nh4 (A01): 9 to -473, best c3
- game 4, move 4. O-O (A02): -20 to -433, best Bxc6
- game 4, move 4... Nf6 (A01): 433 to 7, best axb5
- game 4, move 5. d3 (A02): -7 to -445, best Bxc6
- game 4, move 5... Be7 (A01): 445 to -42, best axb5
- game 4, move 6. Nbd2 (A02): 42 to -518, best Bxc6
- game 4, move 6... O-O (A01): 518 to -47, best axb5
- game 4, move 13. Be3 (A02): 5 to -738, best Qg3
- game 4, move 20. Bc5 (A02): -670 to -1000, best Rxd6
- game 4, move 23... Bxa2 (A01): 1000 to 638, best Qf4
- game 4, move 24... Rad8 (A01): 624 to 78, best Bxb1
- game 4, move 26... Rd2 (A01): 100 to -209, best Be6
- game 4, move 29... Bb3 (A01): 99 to -274, best Bd5
- game 4, move 30. c4 (A02): 274 to -189, best cxb3
- game 4, move 32... Bb3 (A01): 188 to -494, best Bxd1
- game 4, move 36... Kf8 (A01): -460 to -1000, best Bb5
- game 4, move 37. Rxb7 (A02): 1000 to 585, best Nxc4
- game 4, move 37... Ke8 (A01): -585 to -1000, best Bd5
