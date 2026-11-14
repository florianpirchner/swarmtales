# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 58 | 77 | 7 | 10 | 5 | 0 |
| 1 Black A02 | 58 | 66 | 14 | 9 | 2 | 0 |
| 2 White A02 | 64 | 108 | 17 | 16 | 5 | 0 |
| 2 Black A01 | 64 | 93 | 13 | 11 | 6 | 1 |
| 3 White A01 | 45 | 127 | 8 | 3 | 5 | 0 |
| 3 Black A02 | 44 | 148 | 8 | 0 | 7 | 0 |
| 4 White A02 | 41 | 97 | 9 | 5 | 5 | 0 |
| 4 Black A01 | 41 | 70 | 10 | 8 | 2 | 0 |

## Blunders and missed mates

- game 1, move 27. Bg5 (A01): 44 to -545, best Qd3
- game 1, move 29... Nb8 (A02): 624 to 125, best Nf6
- game 1, move 31. Qxc5 (A01): 0 to -399, best Qxc6
- game 1, move 31... Qe7 (A02): 399 to -178, best Qc1+
- game 1, move 32. Qb6 (A01): 178 to -262, best Qxc6
- game 1, move 41. b6 (A01): 84 to -230, best Kg3
- game 1, move 54. f4 (A01): -679 to -1000, best b8=R
- game 2, move 17. Be3 (A02): 4 to -729, best Nf5
- game 2, move 17... Rfe8 (A01): 729 to 6, best Bc4
- game 2, move 25... a5 (A01): 258 to -81, best c4
- game 2, move 26. Ng3 (A02): 81 to -294, best Qxb5
- game 2, move 36... Rd5 (A01): 168 to -691, best Bd6
- game 2, move 37. Kh2 (A02): 691 to -166, best exd5+
- game 2, move 37... Bd6 (A01): 166 to -505, best Rb5
- game 2, move 38. Bb3 (A02): 505 to -137, best exd5+
- game 2, move 54. Bb3 (A02): -675 to -1000, best Ba4
- game 2, move 54... d1=Q (A01): 1000 to 631, best Rc3+
- game 2, move 58... Rd4 (A01): 998 to 697, best h5+, missed a forced mate
- game 3, move 18. Re7 (A01): -101 to -819, best d5
- game 3, move 18... Rxa2 (A02): 819 to 14, best Nxe7
- game 3, move 19... Rb8 (A02): 65 to -288, best Ra3
- game 3, move 20. Nc5 (A01): 288 to -165, best d5
- game 3, move 20... Nd8 (A02): 165 to -338, best Nxd4
- game 3, move 21. Rc8 (A01): 338 to -848, best Nd7
- game 3, move 21... Ra1 (A02): 848 to -492, best Rxc8
- game 3, move 26. Rxb6 (A01): 437 to -554, best Rb7+
- game 3, move 26... Ra1 (A02): 554 to -528, best axb6
- game 3, move 27. Ne4 (A01): 528 to -522, best Rb7+
- game 3, move 27... Ra4 (A02): 522 to -590, best axb6
- game 3, move 44... Kf8 (A02): -445 to -999, best Rb1
- game 4, move 21. Nh4 (A02): 18 to -465, best Ng5
- game 4, move 25... Qd7 (A01): 474 to 117, best h6
- game 4, move 26. Qe2 (A02): -117 to -487, best g3
- game 4, move 34. Kg2 (A02): -98 to -474, best Qh5
- game 4, move 34... Nd5 (A01): 474 to 127, best Qd2+
- game 4, move 35. Bxd5 (A02): -127 to -471, best Qh6
- game 4, move 38. Kg2 (A02): -196 to -592, best Qe2
