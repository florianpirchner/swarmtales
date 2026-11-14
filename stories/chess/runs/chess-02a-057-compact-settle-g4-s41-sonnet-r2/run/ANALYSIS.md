# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 58 | 49 | 6 | 2 | 4 | 0 |
| 1 Black A02 | 58 | 34 | 9 | 1 | 2 | 0 |
| 2 White A02 | 64 | 76 | 12 | 6 | 5 | 0 |
| 2 Black A01 | 64 | 67 | 7 | 5 | 5 | 1 |
| 3 White A01 | 45 | 81 | 1 | 1 | 4 | 0 |
| 3 Black A02 | 44 | 107 | 0 | 0 | 6 | 0 |
| 4 White A02 | 41 | 65 | 2 | 3 | 4 | 0 |
| 4 Black A01 | 41 | 40 | 1 | 2 | 3 | 0 |

## Blunders and missed mates

- game 1, move 27. Bg5 (A01): 35 to -459, best Qd3
- game 1, move 29... Nb8 (A02): 465 to 108, best Qc1+
- game 1, move 31. Qxc5 (A01): 0 to -421, best Qxc6
- game 1, move 31... Qe7 (A02): 421 to -120, best Qc1+
- game 1, move 32. Qb6 (A01): 120 to -278, best Qxc6
- game 1, move 54. f4 (A01): -390 to -1000, best Kb5
- game 2, move 17. Be3 (A02): -2 to -564, best Nf5
- game 2, move 17... Rfe8 (A01): 564 to 13, best Bc4
- game 2, move 36... Rd5 (A01): 31 to -621, best Bd6
- game 2, move 37. Kh2 (A02): 621 to -70, best exd5+
- game 2, move 37... Bd6 (A01): 70 to -527, best Rb5
- game 2, move 38. Bb3 (A02): 527 to -31, best exd5+
- game 2, move 54. Bb3 (A02): -559 to -1000, best Ba4
- game 2, move 54... d1=Q (A01): 1000 to 567, best Rc3+
- game 2, move 58. Kg4 (A02): -580 to -998, best Kf2
- game 2, move 58... Rd4 (A01): 998 to 577, best h5+, missed a forced mate
- game 3, move 18. Re7 (A01): -86 to -703, best d5
- game 3, move 18... Rxa2 (A02): 703 to -22, best Nxe7
- game 3, move 20... Nd8 (A02): 145 to -414, best Nxd4
- game 3, move 21. Rc8 (A01): 414 to -746, best Nd7
- game 3, move 21... Ra1 (A02): 746 to -506, best Rxc8
- game 3, move 26. Rxb6 (A01): 467 to -201, best Rb7+
- game 3, move 26... Ra1 (A02): 201 to -539, best axb6
- game 3, move 27. Ne4 (A01): 539 to -173, best Rb7+
- game 3, move 27... Ra4 (A02): 173 to -573, best axb6
- game 3, move 44... Kf8 (A02): -488 to -999, best f6
- game 4, move 21. Nh4 (A02): 12 to -447, best Ng5
- game 4, move 23... Nf6 (A01): 428 to 65, best Be7
- game 4, move 24. Rd1 (A02): -65 to -422, best g3
- game 4, move 25... Qd7 (A01): 430 to 68, best h6
- game 4, move 26. Qe2 (A02): -68 to -409, best g3
- game 4, move 26... Qd5 (A01): 409 to 85, best Nd5
- game 4, move 41. Qxa6 (A02): -331 to -1000, best Qf3
