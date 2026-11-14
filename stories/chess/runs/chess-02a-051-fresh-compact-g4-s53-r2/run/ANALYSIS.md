# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 37 | 116 | 4 | 5 | 6 | 0 |
| 1 Black A02 | 36 | 148 | 4 | 0 | 7 | 0 |
| 2 White A02 | 40 | 54 | 6 | 5 | 1 | 0 |
| 2 Black A01 | 40 | 44 | 6 | 3 | 1 | 0 |
| 3 White A01 | 40 | 143 | 4 | 0 | 6 | 0 |
| 3 Black A02 | 40 | 122 | 4 | 3 | 4 | 0 |
| 4 White A02 | 33 | 67 | 2 | 2 | 2 | 0 |
| 4 Black A01 | 33 | 45 | 2 | 4 | 1 | 0 |

## Blunders and missed mates

- game 1, move 4. O-O (A01): -20 to -433, best Bxc6
- game 1, move 4... Nf6 (A02): 433 to 7, best axb5
- game 1, move 5. Re1 (A01): -7 to -448, best Bxc6
- game 1, move 5... Be7 (A02): 448 to -4, best axb5
- game 1, move 6. Nxe5 (A01): 4 to -382, best Bxc6
- game 1, move 15... Bxc3 (A02): 651 to 332, best Nd5
- game 1, move 21... Ne3 (A02): 520 to 1, best Be6
- game 1, move 32... Qf3 (A02): 488 to -1000, best Bxg2+
- game 1, move 33. Qxf3 (A01): 1000 to 330, best gxf3
- game 1, move 34. h3 (A01): 322 to -168, best gxf3
- game 1, move 34... Re8 (A02): 168 to -307, best Be4
- game 1, move 35. Bf2 (A01): 307 to -181, best gxf3
- game 1, move 35... Re2 (A02): 181 to -998, best Be4
- game 2, move 37... Rf3 (A01): 589 to -105, best Rd4
- game 2, move 38. Be4 (A02): 105 to -579, best gxf3
- game 3, move 12... Nxd4 (A02): 109 to -265, best exd4
- game 3, move 21. Qf4 (A01): 349 to -916, best Qb3
- game 3, move 21... Rd7 (A02): 916 to -349, best Rxf4
- game 3, move 22. Rxd4 (A01): 349 to -200, best Qg4
- game 3, move 23... Rd8 (A02): -92 to -1000, best cxd4
- game 3, move 24. Nf3 (A01): 1000 to 471, best Nxc6
- game 3, move 29. Qxf8+ (A01): 499 to -143, best Qe4
- game 3, move 38. Rd1 (A01): -226 to -973, best Re3
- game 3, move 39... Qg4 (A02): 1000 to -403, best Qd2
- game 3, move 40. Nf3 (A01): 403 to -1000, best hxg4
- game 4, move 24... Rxd3 (A01): -260 to -782, best Rc8
- game 4, move 25. Re3 (A02): 782 to 11, best Bxd3
- game 4, move 28. Be6 (A02): -140 to -743, best e4
