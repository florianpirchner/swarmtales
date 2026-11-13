# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 36 | 45 | 8 | 4 | 1 | 0 |
| 1 Black A02 | 35 | 72 | 4 | 5 | 1 | 0 |
| 2 White A02 | 43 | 73 | 9 | 4 | 3 | 0 |
| 2 Black A01 | 43 | 75 | 7 | 10 | 2 | 0 |
| 3 White A01 | 51 | 135 | 7 | 14 | 8 | 0 |
| 3 Black A02 | 50 | 161 | 7 | 18 | 7 | 0 |
| 4 White A02 | 46 | 47 | 9 | 6 | 1 | 2 |
| 4 Black A01 | 45 | 70 | 10 | 3 | 3 | 0 |

## Blunders and missed mates

- game 1, move 14. Qd3 (A01): 292 to -10, best Ng5
- game 1, move 26... Qe4 (A02): 275 to -1000, best Qxa2
- game 2, move 16... Rac8 (A01): -44 to -424, best d5
- game 2, move 17. Nd2 (A02): 424 to 29, best e5
- game 2, move 22. Nxe7+ (A02): 362 to -16, best Qg3
- game 2, move 33... Rd7 (A01): -241 to -797, best Re8
- game 2, move 39. g3 (A02): 1000 to 0, best Kg1
- game 3, move 21. Rc1 (A01): 404 to 90, best d5
- game 3, move 27... Nb6 (A02): -322 to -720, best Bf8
- game 3, move 28. Nf3 (A01): 720 to 192, best Nf5
- game 3, move 29... Kh7 (A02): -285 to -932, best c6
- game 3, move 30. Nd4 (A01): 932 to 344, best e5+
- game 3, move 30... Bf8 (A02): -344 to -901, best g6
- game 3, move 31. Nf5 (A01): 901 to 348, best e5+
- game 3, move 31... Qd8 (A02): -348 to -754, best Re5
- game 3, move 32. Qe3 (A01): 754 to 175, best Nxh6
- game 3, move 36... Nh7 (A02): -192 to -527, best c5
- game 3, move 37. Re3 (A01): 527 to 136, best Nxh6
- game 3, move 44... Kg8 (A02): -310 to -809, best g6
- game 3, move 46. d7 (A01): 952 to 452, best Bb7
- game 3, move 47. Nxh6+ (A01): 486 to -26, best h5
- game 3, move 47... Kh8 (A02): 26 to -1000, best Rxh6
- game 4, move 14... Nxc5 (A01): -95 to -710, best Qe8
- game 4, move 16. Nd4 (A02): 524 to -141, best Rxd8
- game 4, move 19... Qf6 (A01): 59 to -612, best Rxc4
- game 4, move 30... Rc3 (A01): -537 to -1000, best g5
- game 4, move 40. Rb8+ (A02): 998 to 1000, best Bxe6, missed a forced mate
- game 4, move 43. Rb7 (A02): 992 to 1000, best Rf8+, missed a forced mate
