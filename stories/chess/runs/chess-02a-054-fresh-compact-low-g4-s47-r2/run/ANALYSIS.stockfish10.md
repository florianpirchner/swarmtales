# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 37 | 203 | 3 | 7 | 10 | 0 |
| 1 Black A02 | 36 | 228 | 4 | 7 | 10 | 0 |
| 2 White A02 | 40 | 65 | 7 | 5 | 2 | 0 |
| 2 Black A01 | 40 | 96 | 11 | 6 | 3 | 0 |
| 3 White A01 | 40 | 187 | 5 | 11 | 6 | 0 |
| 3 Black A02 | 40 | 209 | 5 | 5 | 11 | 0 |
| 4 White A02 | 30 | 195 | 4 | 3 | 9 | 0 |
| 4 Black A01 | 29 | 235 | 2 | 6 | 10 | 0 |

## Blunders and missed mates

- game 1, move 7... Nf5 (A02): 0 to -961, best Be7
- game 1, move 8. Qf3 (A01): 961 to -39, best Nxc6+
- game 1, move 8... Qf6 (A02): 39 to -664, best Be7
- game 1, move 9. Nd3+ (A01): 664 to -153, best Ng4+
- game 1, move 10. g4 (A01): -75 to -522, best c3
- game 1, move 11. Qd1 (A01): -479 to -902, best Qxf6
- game 1, move 11... O-O (A02): 902 to 419, best h5
- game 1, move 12. Rf1 (A01): -419 to -1000, best Re4
- game 1, move 13... Qh4 (A02): 1000 to -117, best Bxg4
- game 1, move 18. Qg3 (A01): 417 to -432, best Nc3
- game 1, move 18... Qxg3 (A02): 432 to -288, best Bd5+
- game 1, move 22... Rxd3 (A02): -497 to -1000, best Rc5
- game 1, move 23. Be3 (A01): 1000 to 422, best cxd3
- game 1, move 23... Rc3 (A02): -422 to -1000, best Rd5
- game 1, move 24. Rac1 (A01): 1000 to 450, best bxc3
- game 1, move 24... Rd8 (A02): -450 to -1000, best Rc4
- game 1, move 25. Bf4 (A01): 1000 to 484, best bxc3
- game 1, move 32... Rh4 (A02): -482 to -1000, best f6
- game 1, move 33. Kg2 (A01): 1000 to 645, best gxh4
- game 1, move 33... Rff4 (A02): -645 to -1000, best Rxg3+
- game 2, move 4. O-O (A02): 83 to -434, best Bxc6
- game 2, move 4... Be7 (A01): 434 to -101, best axb5
- game 2, move 5. Re1 (A02): 101 to -426, best Bxc6
- game 2, move 5... Nf6 (A01): 426 to -187, best axb5
- game 2, move 32... Rxc2 (A01): -60 to -849, best Rxf2
- game 3, move 9... Be6 (A02): 182 to -159, best Nxe4
- game 3, move 14... Nxe3 (A02): 0 to -339, best exd5
- game 3, move 16... Rfd8 (A02): -291 to -623, best Nxd5
- game 3, move 18. Rfe1 (A01): 476 to -16, best Nxa5
- game 3, move 18... Nc5 (A02): 16 to -321, best Bb6
- game 3, move 19. Nxc5 (A01): 321 to -17, best Nxa5
- game 3, move 20... Qf6 (A02): 203 to -221, best exd5
- game 3, move 22. Qd4 (A01): 389 to -1000, best Qxc3
- game 3, move 22... Bxe1 (A02): 1000 to 425, best Bxd4
- game 3, move 23. Rxe1 (A01): -425 to -1000, best Qxf6
- game 3, move 23... Rd7 (A02): 1000 to 300, best cxd4
- game 3, move 24... Rf8 (A02): 341 to -1000, best gxf6
- game 3, move 36. Rb6+ (A01): 913 to -381, best Rxg7
- game 3, move 36... Kf7 (A02): 381 to -926, best axb6
- game 3, move 37. Kf1 (A01): 926 to -134, best Rb7+
- game 3, move 37... g6 (A02): 134 to -874, best axb6
- game 3, move 39... Kh7 (A02): -347 to -908, best gxf5
- game 4, move 4. O-O (A02): 83 to -434, best Bxc6
- game 4, move 4... Nf6 (A01): 434 to -161, best axb5
- game 4, move 5. d3 (A02): 161 to -459, best Bxc6
- game 4, move 5... Be7 (A01): 459 to -199, best axb5
- game 4, move 6. Nc3 (A02): 199 to -428, best Bxc6
- game 4, move 6... O-O (A01): 428 to -205, best axb5
- game 4, move 15... Bc4 (A01): -183 to -737, best Qf6
- game 4, move 16. Rad1 (A02): 737 to 261, best dxc4
- game 4, move 16... Qe7 (A01): -261 to -747, best Be6
- game 4, move 17. Nh5 (A02): 747 to 229, best dxc4
- game 4, move 18... Kh8 (A01): -272 to -772, best Kg7
- game 4, move 19. Rfe1 (A02): 772 to 282, best dxc4
- game 4, move 19... Rad8 (A01): -282 to -800, best Be6
- game 4, move 20. Nd5 (A02): 800 to 250, best dxc4
- game 4, move 20... Qe6 (A01): -250 to -802, best Bxd5
- game 4, move 21. Nxc7 (A02): 802 to 439, best dxc4
- game 4, move 25. Re4 (A02): 500 to -308, best b4
- game 4, move 25... Rfe8 (A01): 308 to -453, best fxe4
- game 4, move 29... Rc6 (A01): -603 to -1000, best Rc7
