# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 32 | 211 | 2 | 1 | 10 | 0 |
| 1 Black A02 | 31 | 229 | 0 | 1 | 11 | 0 |
| 2 White A02 | 39 | 67 | 5 | 4 | 4 | 0 |
| 2 Black A01 | 38 | 88 | 4 | 3 | 5 | 0 |
| 3 White A01 | 27 | 73 | 3 | 2 | 3 | 0 |
| 3 Black A02 | 27 | 50 | 4 | 1 | 1 | 0 |
| 4 White A02 | 36 | 39 | 2 | 3 | 1 | 0 |
| 4 Black A01 | 35 | 53 | 2 | 3 | 2 | 0 |

## Blunders and missed mates

- game 1, move 14... Bg4 (A02): 12 to -394, best Bd7
- game 1, move 21. Nc4 (A01): 402 to -61, best Nf3
- game 1, move 21... Qc6 (A02): 61 to -1000, best Qxc4
- game 1, move 22. Nb6 (A01): 1000 to 552, best dxc6
- game 1, move 22... Rc7 (A02): -552 to -1000, best Qc7
- game 1, move 24. Rd3 (A01): 1000 to 376, best dxc6
- game 1, move 24... Re8 (A02): -376 to -1000, best Qc5
- game 1, move 25. f4 (A01): 1000 to 339, best dxc6
- game 1, move 25... Bh6 (A02): -339 to -1000, best Qc5+
- game 1, move 26. fxe5 (A01): 1000 to 392, best dxc6
- game 1, move 26... Rxe5 (A02): -392 to -1000, best Qc5+
- game 1, move 27. Rf1 (A01): 1000 to 382, best dxc6
- game 1, move 27... Ree7 (A02): -382 to -1000, best Qc5+
- game 1, move 28. Rff3 (A01): 1000 to 371, best dxc6
- game 1, move 28... Bg5 (A02): -371 to -1000, best Qc5+
- game 1, move 29. Kg2 (A01): 1000 to 372, best dxc6
- game 1, move 29... Re5 (A02): -372 to -1000, best Qc5
- game 1, move 30. Rf2 (A01): 1000 to 383, best dxc6
- game 1, move 30... h5 (A02): -383 to -1000, best Qc5
- game 1, move 31. Qb5 (A01): 1000 to -116, best dxc6
- game 1, move 31... Qe8 (A02): 116 to -425, best Qxb5
- game 2, move 10... Nd7 (A01): 66 to -525, best Nxd5
- game 2, move 11. Bxc6 (A02): 525 to 28, best dxc6
- game 2, move 12. Nh4 (A02): 16 to -409, best dxc6
- game 2, move 12... cxd5 (A01): 409 to 106, best Bxh4
- game 2, move 14. Nxd6 (A02): -88 to -471, best c3
- game 2, move 14... Nb6 (A01): 471 to 0, best cxd6
- game 2, move 15. Ne4 (A02): 0 to -362, best Nf5
- game 2, move 24... Kd6 (A01): 599 to -102, best Rxg2
- game 2, move 38... Kf7 (A01): -389 to -756, best Bh4
- game 3, move 21. Bc4 (A01): 49 to -325, best Ng4
- game 3, move 23. exd5 (A01): -43 to -602, best Bxd5
- game 3, move 24... Qc5 (A02): 603 to 100, best bxc4
- game 3, move 26. Qe4 (A01): -253 to -637, best Qf1
- game 4, move 19... Qb6 (A01): -1 to -480, best Bxd5
- game 4, move 29... Re3 (A01): -388 to -1000, best Re6
- game 4, move 30. Bd4 (A02): 1000 to 308, best fxe3
