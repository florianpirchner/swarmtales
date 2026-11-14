# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 37 | 155 | 4 | 4 | 8 | 0 |
| 1 Black A02 | 36 | 187 | 2 | 5 | 10 | 0 |
| 2 White A02 | 40 | 38 | 3 | 1 | 2 | 0 |
| 2 Black A01 | 40 | 58 | 5 | 0 | 3 | 0 |
| 3 White A01 | 40 | 168 | 3 | 7 | 8 | 0 |
| 3 Black A02 | 40 | 186 | 4 | 9 | 7 | 0 |
| 4 White A02 | 30 | 149 | 2 | 1 | 9 | 0 |
| 4 Black A01 | 29 | 188 | 1 | 3 | 10 | 0 |

## Blunders and missed mates

- game 1, move 7... Nf5 (A02): 11 to -832, best Be6
- game 1, move 8. Qf3 (A01): 832 to 8, best Nxc6+
- game 1, move 8... Qf6 (A02): -8 to -493, best Be7
- game 1, move 9. Nd3+ (A01): 493 to -63, best Ng4+
- game 1, move 11... O-O (A02): 441 to 136, best Nf3+
- game 1, move 12. Rf1 (A01): -136 to -510, best Re4
- game 1, move 13... Qh4 (A02): 514 to -194, best Bxg4
- game 1, move 18. Qg3 (A01): 446 to -312, best Nc3
- game 1, move 18... Qxg3 (A02): 312 to -366, best Bd5+
- game 1, move 22... Rxd3 (A02): -445 to -1000, best h5
- game 1, move 23. Be3 (A01): 1000 to 397, best cxd3
- game 1, move 23... Rc3 (A02): -397 to -1000, best Rd5
- game 1, move 24. Rac1 (A01): 1000 to 387, best bxc3
- game 1, move 24... Rd8 (A02): -387 to -1000, best Rc4
- game 1, move 25. Bf4 (A01): 1000 to 446, best bxc3
- game 1, move 32... Rh4 (A02): -417 to -1000, best Kf8
- game 1, move 33. Kg2 (A01): 1000 to 561, best Rfe1
- game 1, move 33... Rff4 (A02): -561 to -984, best Rxg3+
- game 2, move 4. O-O (A02): -20 to -433, best Bxc6
- game 2, move 4... Be7 (A01): 433 to 0, best axb5
- game 2, move 5. Re1 (A02): 0 to -430, best Bxc6
- game 2, move 5... Nf6 (A01): 430 to -4, best axb5
- game 2, move 32... Rxc2 (A01): 3 to -754, best Rxf2
- game 3, move 18. Rfe1 (A01): 451 to 31, best Nxa5
- game 3, move 18... Nc5 (A02): -31 to -343, best Bb6
- game 3, move 19. Nxc5 (A01): 343 to 38, best Nxa5
- game 3, move 22. Qd4 (A01): 366 to -968, best Qxc3
- game 3, move 22... Bxe1 (A02): 968 to 269, best Bxd4
- game 3, move 23. Rxe1 (A01): -269 to -1000, best Qxf6
- game 3, move 23... Rd7 (A02): 1000 to 172, best cxd4
- game 3, move 24... Rf8 (A02): 163 to -1000, best gxf6
- game 3, move 36. Rb6+ (A01): 885 to -47, best Rxg7
- game 3, move 36... Kf7 (A02): 47 to -884, best axb6
- game 3, move 37. Kf1 (A01): 884 to 40, best Rb7+
- game 3, move 37... g6 (A02): -40 to -829, best axb6
- game 3, move 38. Nxh6+ (A01): 829 to 416, best Rb7+
- game 3, move 39... Kh7 (A02): -281 to -891, best gxf5
- game 3, move 40. Ke1 (A01): 891 to 521, best Rb7+
- game 4, move 4. O-O (A02): -20 to -433, best Bxc6
- game 4, move 4... Nf6 (A01): 433 to 7, best axb5
- game 4, move 5. d3 (A02): -7 to -445, best Bxc6
- game 4, move 5... Be7 (A01): 445 to -42, best axb5
- game 4, move 6. Nc3 (A02): 42 to -425, best Bxc6
- game 4, move 6... O-O (A01): 425 to -31, best axb5
- game 4, move 15... Bc4 (A01): -190 to -665, best Qf6
- game 4, move 16. Rad1 (A02): 665 to 162, best dxc4
- game 4, move 16... Qe7 (A01): -162 to -663, best Bxa2
- game 4, move 17. Nh5 (A02): 663 to 162, best dxc4
- game 4, move 18... Kh8 (A01): -218 to -675, best Kg7
- game 4, move 19. Rfe1 (A02): 675 to 238, best dxc4
- game 4, move 19... Rad8 (A01): -238 to -687, best Be6
- game 4, move 20. Nd5 (A02): 687 to 232, best dxc4
- game 4, move 20... Qe6 (A01): -232 to -715, best Bxd5
- game 4, move 21. Nxc7 (A02): 715 to 329, best dxc4
- game 4, move 25. Re4 (A02): 334 to -248, best Re7
- game 4, move 25... Rfe8 (A01): 248 to -309, best fxe4
- game 4, move 29... Rc6 (A01): -346 to -1000, best Rc8
