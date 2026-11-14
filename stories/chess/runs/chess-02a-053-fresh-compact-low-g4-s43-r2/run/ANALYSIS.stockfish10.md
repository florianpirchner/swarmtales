# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 36 | 171 | 6 | 6 | 8 | 0 |
| 1 Black A02 | 36 | 178 | 7 | 7 | 9 | 0 |
| 2 White A02 | 40 | 117 | 12 | 7 | 5 | 0 |
| 2 Black A01 | 40 | 136 | 6 | 13 | 5 | 0 |
| 3 White A01 | 32 | 204 | 0 | 3 | 10 | 0 |
| 3 Black A02 | 32 | 166 | 0 | 5 | 8 | 0 |
| 4 White A02 | 40 | 140 | 9 | 6 | 7 | 0 |
| 4 Black A01 | 40 | 158 | 5 | 8 | 8 | 0 |

## Blunders and missed mates

- game 1, move 4. O-O (A01): 83 to -434, best Bxc6
- game 1, move 4... Be7 (A02): 434 to -101, best axb5
- game 1, move 5. Re1 (A01): 101 to -426, best Bxc6
- game 1, move 5... Nf6 (A02): 426 to -187, best axb5
- game 1, move 6. d3 (A01): 187 to -481, best Bxc6
- game 1, move 6... O-O (A02): 481 to -183, best axb5
- game 1, move 7. c3 (A01): 183 to -542, best Bxc6
- game 1, move 7... Na5 (A02): 542 to -78, best axb5
- game 1, move 8. Bd2 (A01): 78 to -392, best Ba4
- game 1, move 8... c5 (A02): 392 to -38, best axb5
- game 1, move 18... Nxe4 (A02): -25 to -440, best Bg4
- game 1, move 19. Nxd6 (A01): 440 to 12, best dxe4
- game 1, move 25. Nf3 (A01): -14 to -426, best Bxd4
- game 1, move 25... Nxf3+ (A02): 426 to 85, best Ne2+
- game 1, move 31... Rd6 (A02): 161 to -141, best Rxd3
- game 1, move 32. Bf4 (A01): 141 to -743, best Bc5
- game 1, move 32... Bxd3 (A02): 743 to 8, best exf4
- game 2, move 21. Nf4 (A02): 197 to -511, best a3
- game 2, move 21... Nf6 (A01): 511 to -82, best Nxf4
- game 2, move 24... Rxb2 (A01): 0 to -725, best Nxe7
- game 2, move 25. Nd3 (A02): 725 to 288, best Rd7
- game 2, move 25... Nxe7 (A01): -288 to -687, best Rd2
- game 2, move 28... Nb4 (A01): -627 to -1000, best Nxc3
- game 2, move 29. Re2 (A02): 1000 to 291, best cxb4
- game 2, move 30... Nf4 (A01): -160 to -556, best Nc5
- game 2, move 31. Re4 (A02): 556 to 119, best Rf3
- game 2, move 34. h3 (A02): 403 to 73, best Rd7
- game 3, move 4. O-O (A01): 83 to -434, best Bxc6
- game 3, move 4... Nf6 (A02): 434 to -161, best axb5
- game 3, move 5. Nc3 (A01): 161 to -393, best Bxc6
- game 3, move 5... Be7 (A02): 393 to -191, best axb5
- game 3, move 6. d4 (A01): 191 to -253, best Bxc6
- game 3, move 8... c5 (A02): 450 to -12, best Nc6
- game 3, move 9. Be3 (A01): 12 to -435, best e5
- game 3, move 9... Nf5 (A02): 435 to -110, best Nc6
- game 3, move 10. Bf4 (A01): 110 to -287, best exf5
- game 3, move 10... Nd6 (A02): 287 to -188, best d5
- game 3, move 12. Qe2 (A01): 300 to -446, best Qxd6
- game 3, move 13... Re8 (A02): 515 to 0, best Be5
- game 3, move 14. Bb3 (A01): 0 to -544, best Rxd6
- game 3, move 14... h6 (A02): 544 to -93, best Be5
- game 3, move 15. Nd5 (A01): 93 to -548, best Rxd6
- game 3, move 16. h3 (A01): -343 to -668, best Rfe1
- game 3, move 16... Bf4 (A02): 668 to 0, best b5
- game 3, move 18. Nd5 (A01): 133 to -1000, best Qc4
- game 4, move 4. O-O (A02): 83 to -434, best Bxc6
- game 4, move 4... Nf6 (A01): 434 to -161, best axb5
- game 4, move 5. d3 (A02): 161 to -459, best Bxc6
- game 4, move 5... Be7 (A01): 459 to -199, best axb5
- game 4, move 6. Nc3 (A02): 199 to -428, best Bxc6
- game 4, move 6... O-O (A01): 428 to -205, best axb5
- game 4, move 10. Bg5 (A02): 447 to 145, best e5
- game 4, move 12... Nxe4 (A01): -104 to -451, best Bf8
- game 4, move 23... Qd2 (A01): -441 to -789, best Qh5
- game 4, move 24. Rcd1 (A02): 789 to 0, best Bc3
- game 4, move 24... Qe2 (A01): 0 to -599, best Qf4
- game 4, move 25. Rde1 (A02): 599 to 0, best Qd5
- game 4, move 26... Rxe1 (A01): 0 to -522, best Qg4+
- game 4, move 27... Qf6 (A01): -502 to -1000, best c5
- game 4, move 28. Be5 (A02): 1000 to 539, best Bxf6
