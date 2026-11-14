# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 147 | 8 | 1 | 8 | 0 |
| 1 Black A02 | 40 | 155 | 7 | 1 | 10 | 0 |
| 2 White A02 | 40 | 55 | 3 | 3 | 3 | 0 |
| 2 Black A01 | 40 | 33 | 1 | 2 | 2 | 0 |
| 3 White A01 | 39 | 15 | 1 | 1 | 0 | 0 |
| 3 Black A02 | 38 | 15 | 3 | 0 | 0 | 0 |
| 4 White A02 | 40 | 56 | 1 | 3 | 3 | 0 |
| 4 Black A01 | 40 | 74 | 1 | 6 | 4 | 0 |

## Blunders and missed mates

- game 1, move 13. Bb3 (A01): 105 to -441, best Nd2
- game 1, move 13... Qb6 (A02): 441 to -53, best cxb3
- game 1, move 17... Rb4 (A02): -115 to -665, best Rb7
- game 1, move 19. Nd4 (A01): 672 to -495, best Bd2
- game 1, move 20... Ng4 (A02): 494 to -31, best cxd4
- game 1, move 21. Qd2 (A01): 31 to -460, best Nf3
- game 1, move 22... Rb8 (A02): 458 to -62, best exd4
- game 1, move 23. Rb1 (A01): 62 to -487, best Nc6
- game 1, move 23... Nf6 (A02): 487 to 61, best exd4
- game 1, move 24. Bd3 (A01): -61 to -455, best Nc6
- game 1, move 24... h6 (A02): 455 to -49, best cxd4
- game 1, move 25. Bc3 (A01): 49 to -552, best Nc6
- game 1, move 25... Rc8 (A02): 552 to 26, best cxd4
- game 1, move 26. Re1 (A01): -26 to -515, best Nf3
- game 1, move 26... Re8 (A02): 515 to -60, best cxd4
- game 1, move 36... Bc3 (A02): 192 to -386, best exf2+
- game 1, move 39... Rb5 (A02): -344 to -1000, best exf2+
- game 1, move 40. Bc4 (A01): 1000 to 302, best Bxb5
- game 2, move 9. Nc4 (A02): -34 to -377, best Bb3
- game 2, move 9... Bxc4 (A01): 377 to 27, best b5
- game 2, move 12. Qe3 (A02): -125 to -547, best Qd1
- game 2, move 34... Qg6 (A01): 779 to 406, best b5
- game 2, move 35. Qe2 (A02): -406 to -759, best Qxf3
- game 4, move 19... Nxe3 (A01): -59 to -375, best Kh8
- game 4, move 20... Qxg4 (A01): -102 to -414, best f5
- game 4, move 32. Nb8 (A02): 901 to 594, best Nxe5
- game 4, move 34. Kg3 (A02): 596 to 17, best gxf5
- game 4, move 34... Kd7 (A01): -17 to -563, best f4+
- game 4, move 35. Rf2 (A02): 563 to 15, best Kh2
- game 4, move 35... Rf7 (A01): -15 to -577, best f4+
