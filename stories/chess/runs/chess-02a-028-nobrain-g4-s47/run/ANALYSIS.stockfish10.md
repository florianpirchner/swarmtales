# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 32 | 262 | 9 | 4 | 10 | 0 |
| 1 Black A02 | 31 | 281 | 9 | 3 | 11 | 0 |
| 2 White A02 | 39 | 101 | 9 | 8 | 4 | 0 |
| 2 Black A01 | 38 | 121 | 7 | 6 | 5 | 0 |
| 3 White A01 | 27 | 123 | 6 | 8 | 3 | 0 |
| 3 Black A02 | 27 | 90 | 6 | 6 | 2 | 0 |
| 4 White A02 | 36 | 67 | 6 | 2 | 2 | 0 |
| 4 Black A01 | 35 | 88 | 9 | 4 | 3 | 0 |

## Blunders and missed mates

- game 1, move 14... Bg4 (A02): 17 to -378, best b5
- game 1, move 21. Nc4 (A01): 408 to -103, best Nd1
- game 1, move 21... Qc6 (A02): 103 to -1000, best Qxc4
- game 1, move 22. Nb6 (A01): 1000 to 608, best dxc6
- game 1, move 22... Rc7 (A02): -608 to -1000, best Qc7
- game 1, move 24. Rd3 (A01): 1000 to 327, best dxc6
- game 1, move 24... Re8 (A02): -327 to -1000, best Qe8
- game 1, move 25. f4 (A01): 1000 to 130, best dxc6
- game 1, move 25... Bh6 (A02): -130 to -1000, best Qc5+
- game 1, move 26. fxe5 (A01): 1000 to 278, best dxc6
- game 1, move 26... Rxe5 (A02): -278 to -1000, best Qc5+
- game 1, move 27. Rf1 (A01): 1000 to 300, best dxc6
- game 1, move 27... Ree7 (A02): -300 to -1000, best Qc5+
- game 1, move 28. Rff3 (A01): 1000 to 297, best dxc6
- game 1, move 28... Bg5 (A02): -297 to -1000, best Qc5+
- game 1, move 29. Kg2 (A01): 1000 to 296, best dxc6
- game 1, move 29... Re5 (A02): -296 to -1000, best Qc5
- game 1, move 30. Rf2 (A01): 1000 to 419, best dxc6
- game 1, move 30... h5 (A02): -419 to -1000, best Qc5
- game 1, move 31. Qb5 (A01): 1000 to -247, best dxc6
- game 1, move 31... Qe8 (A02): 247 to -414, best Qxb5
- game 2, move 10... Nd7 (A01): 121 to -546, best Nxd5
- game 2, move 11. Bxc6 (A02): 546 to -36, best dxc6
- game 2, move 12. Nh4 (A02): 34 to -486, best dxc6
- game 2, move 12... cxd5 (A01): 486 to 98, best Bxh4
- game 2, move 14. Nxd6 (A02): -141 to -524, best Bd2
- game 2, move 14... Nb6 (A01): 524 to 0, best cxd6
- game 2, move 15. Ne4 (A02): 0 to -382, best Nf5
- game 2, move 24... Kd6 (A01): 811 to -177, best Rxg2
- game 2, move 25... Kc5 (A01): -158 to -472, best Bg5+
- game 3, move 21. Bc4 (A01): 71 to -392, best Bf1
- game 3, move 21... Rfe8 (A02): 392 to -29, best bxc4
- game 3, move 23. exd5 (A01): -67 to -738, best Bxd5
- game 3, move 24... Qc5 (A02): 724 to 139, best bxc4
- game 3, move 26. Qe4 (A01): -283 to -732, best Bf1
- game 4, move 19... Qb6 (A01): -62 to -675, best Nxd5
- game 4, move 20. Qd4 (A02): 675 to 203, best dxc6
- game 4, move 22... Bd8 (A01): -125 to -507, best Bf6
- game 4, move 29... Re3 (A01): -461 to -1000, best Re6
- game 4, move 30. Bd4 (A02): 1000 to 245, best fxe3
