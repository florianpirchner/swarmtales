# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 148 | 10 | 8 | 4 | 1 |
| 1 Black A02 | 40 | 162 | 10 | 6 | 7 | 0 |
| 2 White A02 | 40 | 176 | 10 | 9 | 6 | 0 |
| 2 Black A01 | 40 | 158 | 9 | 9 | 7 | 0 |
| 3 White A01 | 40 | 121 | 12 | 7 | 5 | 0 |
| 3 Black A02 | 40 | 122 | 8 | 10 | 5 | 0 |
| 4 White A02 | 40 | 174 | 4 | 4 | 7 | 0 |
| 4 Black A01 | 40 | 194 | 5 | 3 | 8 | 0 |

## Blunders and missed mates

- game 1, move 11... Na5 (A02): -116 to -418, best Na7
- game 1, move 12. Nb3 (A01): 418 to 24, best b4
- game 1, move 26... Qe6 (A02): -203 to -1000, best e4
- game 1, move 27. Rad1 (A01): 1000 to -177, best dxe6
- game 1, move 27... Qf6 (A02): 177 to -492, best Qh3
- game 1, move 28... Re8 (A02): -274 to -585, best e4
- game 1, move 29... Re7 (A02): -526 to -1000, best e4
- game 1, move 31. Qc8 (A01): 997 to 545, best dxe8=Q+, missed a forced mate
- game 1, move 32... Qe7 (A02): -562 to -899, best Rf5
- game 1, move 35. Qc4+ (A01): 658 to -1000, best Rd5
- game 1, move 35... Rf7 (A02): 1000 to -550, best bxc4
- game 2, move 15... Nc4 (A01): -135 to -725, best Ng4
- game 2, move 17. Nxc4 (A02): 900 to 493, best e5
- game 2, move 22. Qe2 (A02): 745 to 0, best Ba3
- game 2, move 24... Qc5 (A01): 69 to -403, best Qa5
- game 2, move 25. Rb7 (A02): 403 to -768, best Ba3
- game 2, move 25... Rc8 (A01): 768 to -4, best Bxb7
- game 2, move 26... Qd6 (A01): 55 to -337, best Qh5
- game 2, move 27. Nbd4 (A02): 337 to -522, best e5
- game 2, move 27... Bxe4 (A01): 522 to 128, best Bxb7
- game 2, move 31... Qd7 (A01): 456 to 96, best Qc6
- game 2, move 32... Nc3 (A01): 234 to -488, best Rce8
- game 2, move 33. Qd3 (A02): 488 to -617, best Rxd7
- game 2, move 37. Rb2 (A02): -621 to -1000, best Rd7
- game 3, move 18. Nh4 (A01): 176 to -482, best d5
- game 3, move 18... g5 (A02): 482 to -485, best Bxh4
- game 3, move 19... Bxe4 (A02): -409 to -741, best f6
- game 3, move 20. Ng3 (A01): 741 to -122, best Bxe4
- game 3, move 27... Ne3 (A02): -64 to -451, best Rb8
- game 3, move 28. Qc3 (A01): 451 to 36, best Bxe3
- game 3, move 30... Ne3 (A02): -7 to -582, best f5
- game 3, move 31. Rc3 (A01): 582 to 69, best Bxe3
- game 3, move 34. Nc3 (A01): 138 to -200, best Ng3
- game 3, move 34... Nxc3 (A02): 200 to -177, best Nb4
- game 4, move 13... Qd6 (A01): -39 to -890, best Qd7
- game 4, move 14. Re4 (A02): 890 to 24, best Rg5
- game 4, move 15. Rae1 (A02): 93 to -523, best Re3
- game 4, move 15... Rad8 (A01): 523 to -336, best dxe4
- game 4, move 16. h3 (A02): 336 to -515, best Bh6
- game 4, move 16... h6 (A01): 515 to -343, best dxe4
- game 4, move 17. Bg3 (A02): 343 to -542, best Bxh6
- game 4, move 17... Qf6 (A01): 542 to -180, best dxe4
- game 4, move 18. Qe3 (A02): 180 to -541, best Qxf6
- game 4, move 18... Bf5 (A01): 541 to -110, best dxe4
- game 4, move 19... Rfe8 (A01): -72 to -806, best Bxc2
- game 4, move 24. Rxd5 (A02): 787 to 65, best Qe2
- game 4, move 24... cxd5 (A01): -65 to -1000, best Qxd5
- game 4, move 25. Qf4 (A02): 1000 to 13, best Bxd6
- game 4, move 40... g5 (A01): 0 to -1000, best cxb5
