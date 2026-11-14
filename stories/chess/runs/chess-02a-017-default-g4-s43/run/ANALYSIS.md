# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 101 | 5 | 3 | 3 | 1 |
| 1 Black A02 | 40 | 111 | 5 | 3 | 4 | 0 |
| 2 White A02 | 40 | 117 | 3 | 4 | 5 | 0 |
| 2 Black A01 | 40 | 95 | 4 | 5 | 5 | 0 |
| 3 White A01 | 40 | 62 | 6 | 1 | 4 | 0 |
| 3 Black A02 | 40 | 61 | 3 | 1 | 4 | 0 |
| 4 White A02 | 40 | 153 | 5 | 1 | 8 | 0 |
| 4 Black A01 | 40 | 175 | 4 | 3 | 9 | 0 |

## Blunders and missed mates

- game 1, move 26... Qe6 (A02): -216 to -1000, best Qd7
- game 1, move 27. Rad1 (A01): 1000 to 0, best dxe6
- game 1, move 27... Qf6 (A02): 0 to -370, best Rxg2+
- game 1, move 29... Re7 (A02): -329 to -1000, best e4
- game 1, move 31. Qc8 (A01): 997 to 391, best dxe8=Q+, missed a forced mate
- game 1, move 35. Qc4+ (A01): 393 to -1000, best Qc6
- game 1, move 35... Rf7 (A02): 1000 to -389, best bxc4
- game 2, move 15... Nc4 (A01): -80 to -569, best Ng4
- game 2, move 22. Qe2 (A02): 574 to -47, best Ba3
- game 2, move 25. Rb7 (A02): 229 to -680, best Ba3
- game 2, move 25... Rc8 (A01): 680 to 46, best Bxb7
- game 2, move 26... Qd6 (A01): 34 to -292, best Qc3
- game 2, move 27. Nbd4 (A02): 292 to -332, best e5
- game 2, move 32... Nc3 (A01): 65 to -467, best Rfe8
- game 2, move 33. Qd3 (A02): 467 to -469, best Rxd7
- game 2, move 37. Rb2 (A02): -569 to -1000, best Rd7
- game 2, move 37... Nc3 (A01): 1000 to 655, best Bxb2
- game 3, move 18. Nh4 (A01): 27 to -444, best a4
- game 3, move 18... g5 (A02): 444 to -73, best Bxh4
- game 3, move 19... Bxe4 (A02): -101 to -436, best Bf6
- game 3, move 20. Ng3 (A01): 436 to -77, best Bxe4
- game 3, move 27... Ne3 (A02): 64 to -352, best Nb6
- game 3, move 28. Qc3 (A01): 352 to -7, best Bxe3
- game 3, move 30... Ne3 (A02): -3 to -473, best Nb6
- game 3, move 31. Rc3 (A01): 473 to 73, best Bxe3
- game 4, move 13... Qd6 (A01): -21 to -745, best Qh4
- game 4, move 14. Re4 (A02): 745 to 13, best Rg5
- game 4, move 15. Rae1 (A02): 14 to -520, best Re3
- game 4, move 15... Rad8 (A01): 520 to -168, best dxe4
- game 4, move 16. h3 (A02): 168 to -518, best Bh6
- game 4, move 16... h6 (A01): 518 to -185, best dxe4
- game 4, move 17. Bg3 (A02): 185 to -531, best Bxh6
- game 4, move 17... Qf6 (A01): 531 to -102, best dxe4
- game 4, move 18. Qe3 (A02): 102 to -552, best Qxf6
- game 4, move 18... Bf5 (A01): 552 to -37, best dxe4
- game 4, move 19... Rfe8 (A01): -1 to -752, best Rb8
- game 4, move 22... Qd6 (A01): -677 to -1000, best Kg6
- game 4, move 23. Re5 (A02): 1000 to 682, best Bxd6
- game 4, move 24. Rxd5 (A02): 743 to 91, best Re8
- game 4, move 24... cxd5 (A01): -91 to -1000, best Qxd5
- game 4, move 25. Qf4 (A02): 1000 to -5, best Bxd6
- game 4, move 40... g5 (A01): -26 to -885, best cxb5
