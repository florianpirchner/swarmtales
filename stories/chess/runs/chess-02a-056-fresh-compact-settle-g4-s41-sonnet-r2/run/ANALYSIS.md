# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 36 | 17 | 4 | 1 | 0 | 0 |
| 1 Black A02 | 35 | 45 | 5 | 0 | 1 | 0 |
| 2 White A02 | 43 | 45 | 2 | 1 | 2 | 0 |
| 2 Black A01 | 43 | 25 | 5 | 1 | 1 | 0 |
| 3 White A01 | 51 | 58 | 4 | 5 | 4 | 0 |
| 3 Black A02 | 50 | 79 | 7 | 6 | 3 | 0 |
| 4 White A02 | 46 | 22 | 3 | 1 | 1 | 2 |
| 4 Black A01 | 45 | 44 | 2 | 1 | 3 | 0 |

## Blunders and missed mates

- game 1, move 26... Qe4 (A02): 99 to -1000, best Qxa2
- game 2, move 16... Rac8 (A01): -13 to -374, best d5
- game 2, move 17. Nd2 (A02): 374 to 25, best e5
- game 2, move 39. g3 (A02): 1000 to 0, best Kg1
- game 3, move 29... Kh7 (A02): -114 to -593, best c6
- game 3, move 30. Nd4 (A01): 593 to 157, best e5+
- game 3, move 30... Bf8 (A02): -157 to -486, best Kg8
- game 3, move 31. Nf5 (A01): 486 to 172, best e5+
- game 3, move 46. d7 (A01): 774 to 442, best Bb7
- game 3, move 47. Nxh6+ (A01): 435 to -19, best h5
- game 3, move 47... Kh8 (A02): 19 to -1000, best Rxh6
- game 4, move 14... Nxc5 (A01): -110 to -588, best Qc7
- game 4, move 16. Nd4 (A02): 491 to -51, best Rxd8
- game 4, move 19... Qf6 (A01): -1 to -565, best Rxc4
- game 4, move 30... Rc3 (A01): -480 to -1000, best b5
- game 4, move 40. Rb8+ (A02): 998 to 1000, best Bxe6, missed a forced mate
- game 4, move 43. Rb7 (A02): 995 to 1000, best g4, missed a forced mate
