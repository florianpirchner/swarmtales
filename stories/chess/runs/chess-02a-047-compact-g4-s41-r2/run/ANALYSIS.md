# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 22 | 89 | 1 | 4 | 3 | 0 |
| 1 Black A02 | 22 | 52 | 1 | 2 | 2 | 0 |
| 2 White A02 | 38 | 117 | 1 | 3 | 8 | 1 |
| 2 Black A01 | 37 | 139 | 3 | 2 | 9 | 0 |
| 3 White A01 | 23 | 137 | 2 | 1 | 5 | 0 |
| 3 Black A02 | 23 | 122 | 1 | 1 | 5 | 0 |
| 4 White A02 | 39 | 123 | 3 | 4 | 7 | 0 |
| 4 Black A01 | 39 | 101 | 2 | 6 | 5 | 0 |

## Blunders and missed mates

- game 1, move 11... Re8 (A02): -18 to -415, best d5
- game 1, move 12. Nc3 (A01): 415 to 64, best d5
- game 1, move 14. Ne5 (A01): 57 to -341, best a3
- game 1, move 19... Nxb3 (A02): 572 to 224, best exd4
- game 1, move 20. Rad1 (A01): -224 to -669, best axb3
- game 2, move 13. Na5 (A02): -41 to -475, best h3
- game 2, move 14... Nb4 (A01): 488 to 29, best Qc7
- game 2, move 15. a3 (A02): -29 to -520, best cxb4
- game 2, move 17. Qb3 (A02): -494 to -1000, best d4
- game 2, move 17... Rac8 (A01): 1000 to 507, best Bxb3
- game 2, move 18. Rad1 (A02): -507 to -1000, best c4
- game 2, move 18... h6 (A01): 1000 to 538, best Bxb3
- game 2, move 19. Re3 (A02): -538 to -1000, best Qc2
- game 2, move 19... Kh7 (A01): 1000 to 541, best Bxb3
- game 2, move 20. Nh4 (A02): -541 to -1000, best Qc2
- game 2, move 20... Ng4 (A01): 1000 to 642, best Bxb3
- game 2, move 21. Rg3 (A02): -642 to -1000, best c4
- game 2, move 21... Nf6 (A01): 1000 to 521, best Bxb3
- game 2, move 22. Nf5 (A02): -521 to -1000, best c4
- game 2, move 22... Bxf5 (A01): 1000 to 363, best Bxb3
- game 2, move 26... Nxc3 (A01): 473 to 40, best Rb8
- game 2, move 36... Re8 (A01): -69 to -776, best h5
- game 2, move 38. Re2 (A02): 996 to 758, best Raa8, missed a forced mate
- game 3, move 16... Bd7 (A02): 44 to -298, best a5
- game 3, move 17. Qd2 (A01): 298 to -45, best b4
- game 3, move 17... Rac8 (A02): 45 to -298, best a5
- game 3, move 18. h3 (A01): 298 to -29, best b4
- game 3, move 18... h6 (A02): 29 to -308, best a5
- game 3, move 19. g4 (A01): 308 to -28, best b4
- game 3, move 19... Rfe8 (A02): 28 to -308, best a5
- game 3, move 20. Kh2 (A01): 308 to -39, best b4
- game 3, move 22... Bg5 (A02): -11 to -1000, best Qa5
- game 3, move 23. Rf3 (A01): 1000 to -345, best Rxb6
- game 4, move 18... Re6 (A01): -101 to -652, best e4
- game 4, move 19. Qxa5 (A02): 652 to 137, best dxe6
- game 4, move 19... Nf5 (A01): -137 to -639, best Re8
- game 4, move 20. Bc3 (A02): 639 to 126, best dxe6
- game 4, move 20... Qd7 (A01): -126 to -622, best Re8
- game 4, move 21. Rfe1 (A02): 622 to 115, best dxe6
- game 4, move 21... h6 (A01): -115 to -624, best Ree8
- game 4, move 22. Qb4 (A02): 624 to 110, best dxe6
- game 4, move 22... Rae8 (A01): -110 to -647, best Ree8
- game 4, move 25. Nd2 (A02): 614 to 61, best dxe6
- game 4, move 28. Re3 (A02): 292 to -358, best dxe6
- game 4, move 30. Nf3 (A02): -534 to -947, best dxe6
