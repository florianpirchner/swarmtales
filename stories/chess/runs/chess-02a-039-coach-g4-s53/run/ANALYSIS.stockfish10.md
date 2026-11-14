# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 137 | 9 | 12 | 6 | 2 |
| 1 Black A02 | 40 | 132 | 10 | 10 | 6 | 0 |
| 2 White A02 | 40 | 160 | 12 | 6 | 8 | 0 |
| 2 Black A01 | 40 | 139 | 9 | 5 | 8 | 0 |
| 3 White A01 | 30 | 190 | 9 | 6 | 7 | 0 |
| 3 Black A02 | 29 | 229 | 6 | 6 | 9 | 0 |
| 4 White A02 | 32 | 131 | 11 | 7 | 3 | 0 |
| 4 Black A01 | 31 | 158 | 8 | 7 | 4 | 0 |

## Blunders and missed mates

- game 1, move 9... Ne4 (A02): -232 to -669, best d5
- game 1, move 10... Nxe5 (A02): -542 to -1000, best d5
- game 1, move 11. Bb3 (A01): 1000 to 553, best dxe5
- game 1, move 12... Qe7 (A02): -514 to -980, best d5
- game 1, move 13. Nc5 (A01): 980 to 422, best Bg5
- game 1, move 14... Qxc5 (A02): -547 to -997, best d5
- game 1, move 15. Be3 (A01): 997 to 520, best Qxf7+, missed a forced mate
- game 1, move 15... Qb6 (A02): -520 to -998, best Qe7
- game 1, move 16. Qd5 (A01): 998 to 411, best Qxf7+, missed a forced mate
- game 1, move 19... Rd6 (A02): -425 to -1000, best c6
- game 1, move 20. Bc4 (A01): 1000 to 337, best Bxa8
- game 1, move 21. Bf4 (A01): 404 to -37, best Bb3
- game 2, move 15... Bd5 (A01): 100 to -312, best b5
- game 2, move 17... Nxc3 (A01): -311 to -740, best Nf4
- game 2, move 18. Qe3 (A02): 740 to 61, best bxc3
- game 2, move 20... Rad8 (A01): -58 to -481, best Re6
- game 2, move 21. Nf1 (A02): 481 to -10, best Rxf6
- game 2, move 24... Qg4 (A01): 40 to -1000, best d5
- game 2, move 25. Qxg4 (A02): 1000 to 462, best hxg4
- game 2, move 26. Nf5 (A02): 500 to 45, best hxg4
- game 2, move 29... c6 (A01): 98 to -240, best Kg7
- game 2, move 30. Ne3 (A02): 240 to -90, best Nf6+
- game 2, move 37. Re3 (A02): -11 to -787, best Bxa4
- game 2, move 37... Rdd7 (A01): 787 to 301, best axb3
- game 2, move 38. Bc4 (A02): -301 to -787, best Bxa4
- game 2, move 38... h5 (A01): 787 to 441, best f4
- game 2, move 39... Kf6 (A01): 628 to 271, best f4
- game 2, move 40. Kh2 (A02): -271 to -662, best a3
- game 3, move 11. Bb5 (A01): 115 to -409, best Bxf6
- game 3, move 11... c6 (A02): 409 to 0, best axb5
- game 3, move 14... Bxc4 (A02): 186 to -355, best g5
- game 3, move 15... Nd5 (A02): -272 to -1000, best g5
- game 3, move 17. exd5 (A01): 1000 to 343, best Bxd8
- game 3, move 17... Rc8 (A02): -343 to -1000, best Qc7
- game 3, move 18. Qd3 (A01): 1000 to 327, best Bxd8
- game 3, move 22... Rb5 (A02): -323 to -825, best Bxe1
- game 3, move 23. Nxa5 (A01): 825 to 461, best cxb5
- game 3, move 24... Qc6 (A02): -259 to -1000, best Ra4
- game 3, move 25. Re4 (A01): 1000 to 341, best dxc6
- game 3, move 25... Re8 (A02): -341 to -1000, best Qc5
- game 3, move 26. Bf4 (A01): 1000 to 437, best dxc6
- game 3, move 26... Rc5 (A02): -437 to -1000, best Qa4
- game 3, move 27. Rd2 (A01): 1000 to 487, best dxc6
- game 3, move 27... Rxd5 (A02): -487 to -1000, best Qd7
- game 4, move 15. Ng5 (A02): 141 to -410, best a4
- game 4, move 15... Nh5 (A01): 410 to -94, best hxg5
- game 4, move 26. Qxe5 (A02): 87 to -547, best a4
- game 4, move 26... Qd7 (A01): 547 to -321, best Rxe5
- game 4, move 27. Red1 (A02): 321 to -779, best Qxe6
- game 4, move 27... Rf7 (A01): 779 to -187, best Rxe5
- game 4, move 31... Qe4 (A01): -44 to -1000, best Rbf5
