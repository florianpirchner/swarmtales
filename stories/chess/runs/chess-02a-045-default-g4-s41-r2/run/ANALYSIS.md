# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 37 | 68 | 4 | 3 | 3 | 0 |
| 1 Black A02 | 37 | 44 | 3 | 2 | 2 | 0 |
| 2 White A02 | 40 | 181 | 1 | 2 | 12 | 0 |
| 2 Black A01 | 40 | 157 | 0 | 3 | 10 | 0 |
| 3 White A01 | 40 | 143 | 3 | 9 | 7 | 0 |
| 3 Black A02 | 40 | 124 | 6 | 7 | 5 | 0 |
| 4 White A02 | 26 | 88 | 0 | 0 | 1 | 0 |
| 4 Black A01 | 26 | 47 | 0 | 1 | 1 | 0 |

## Blunders and missed mates

- game 1, move 19... Nxe4 (A02): 26 to -293, best b5
- game 1, move 22. Rd1 (A01): 303 to -364, best Re2
- game 1, move 23. Be3 (A01): -361 to -724, best Ne1
- game 1, move 23... Bc7 (A02): 724 to 191, best exf3
- game 1, move 36. Kd3 (A01): -174 to -837, best Ke4
- game 2, move 19. Be3 (A02): 27 to -579, best Qe2
- game 2, move 21. Bc5 (A02): -544 to -1000, best a4
- game 2, move 24... Bd4 (A01): 746 to 290, best Qc4
- game 2, move 25. Rdc1 (A02): -290 to -723, best cxd4
- game 2, move 25... Qb6 (A01): 723 to 355, best Bc5
- game 2, move 26. Bd3 (A02): -355 to -832, best cxd4
- game 2, move 26... Qe6 (A01): 832 to 312, best Bxf2+
- game 2, move 27. Kh2 (A02): -312 to -832, best cxd4
- game 2, move 27... Rd8 (A01): 832 to 382, best Bxf2
- game 2, move 28. Be4 (A02): -382 to -824, best cxd4
- game 2, move 29... Qh4 (A01): 725 to 326, best Bc5
- game 2, move 30... Rd7 (A01): 370 to -526, best Qg5
- game 2, move 31. Bc6 (A02): 526 to -303, best gxh4
- game 2, move 31... Rd6 (A01): 303 to -299, best Bg1+
- game 2, move 32. Be4 (A02): 299 to -370, best gxh4
- game 2, move 32... Kh8 (A01): 370 to -515, best Qg5
- game 2, move 33. Kg2 (A02): 515 to -437, best gxh4
- game 2, move 34. Rc2 (A02): -286 to -708, best cxd4
- game 2, move 34... Qe7 (A01): 708 to 302, best Ba7
- game 2, move 35. Bd3 (A02): -302 to -761, best cxd4
- game 2, move 36... Bd4 (A01): 852 to 302, best Qd7
- game 2, move 37. Rd1 (A02): -302 to -704, best cxd4
- game 3, move 11. Nxc6 (A01): 7 to -409, best Nd2
- game 3, move 11... Qe8 (A02): 409 to -579, best dxc6
- game 3, move 12. Bg5 (A01): 579 to 79, best Rxe8
- game 3, move 13... Re8 (A02): -192 to -579, best dxc6
- game 3, move 14. Qxe8+ (A01): 579 to 66, best Ne5
- game 3, move 15. Ne5 (A01): 88 to -282, best Ne7+
- game 3, move 15... Bxe5 (A02): 282 to -65, best f6
- game 3, move 16... Nf6 (A02): -81 to -507, best Rb8
- game 3, move 17. Bxf6 (A01): 507 to 118, best exf6
- game 3, move 27. Kg3 (A01): 195 to -574, best exf6
- game 3, move 39... Rg3 (A02): 859 to -1, best d5
- game 3, move 40. Kc4 (A01): 1 to -943, best fxg3
- game 4, move 25... Qg3 (A01): -259 to -1000, best h5
- game 4, move 26. Qd1 (A02): 1000 to -999, best fxg3
