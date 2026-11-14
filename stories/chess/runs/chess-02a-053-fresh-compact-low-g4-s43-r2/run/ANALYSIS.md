# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 36 | 125 | 9 | 2 | 7 | 0 |
| 1 Black A02 | 36 | 124 | 7 | 3 | 7 | 0 |
| 2 White A02 | 40 | 82 | 7 | 2 | 4 | 0 |
| 2 Black A01 | 40 | 92 | 7 | 5 | 5 | 0 |
| 3 White A01 | 32 | 153 | 2 | 2 | 8 | 0 |
| 3 Black A02 | 32 | 120 | 1 | 2 | 7 | 0 |
| 4 White A02 | 40 | 99 | 3 | 3 | 7 | 0 |
| 4 Black A01 | 40 | 116 | 6 | 3 | 8 | 0 |

## Blunders and missed mates

- game 1, move 4. O-O (A01): -20 to -433, best Bxc6
- game 1, move 4... Be7 (A02): 433 to 0, best axb5
- game 1, move 5. Re1 (A01): 0 to -430, best Bxc6
- game 1, move 5... Nf6 (A02): 430 to -4, best axb5
- game 1, move 6. d3 (A01): 4 to -470, best Bxc6
- game 1, move 6... O-O (A02): 470 to 9, best axb5
- game 1, move 7. c3 (A01): -9 to -475, best Bxc6
- game 1, move 7... Na5 (A02): 475 to 5, best axb5
- game 1, move 8. Bd2 (A01): -5 to -412, best Ba4
- game 1, move 8... c5 (A02): 412 to 27, best axb5
- game 1, move 18... Nxe4 (A02): -44 to -447, best Bg4
- game 1, move 19. Nxd6 (A01): 447 to 78, best dxe4
- game 1, move 32. Bf4 (A01): 151 to -581, best Bc5
- game 1, move 32... Bxd3 (A02): 581 to -33, best exf4
- game 2, move 21. Nf4 (A02): 15 to -510, best a3
- game 2, move 21... Nf6 (A01): 510 to -18, best Nxf4
- game 2, move 24... Rxb2 (A01): 2 to -592, best Nxe7
- game 2, move 25. Nd3 (A02): 592 to 176, best Rd7
- game 2, move 25... Nxe7 (A01): -176 to -578, best Rd2
- game 2, move 28... Nb4 (A01): -601 to -1000, best Nxc3
- game 2, move 29. Re2 (A02): 1000 to 177, best cxb4
- game 2, move 30... Nf4 (A01): -111 to -562, best Nc5
- game 2, move 31. Re4 (A02): 562 to 104, best Rf3
- game 3, move 4. O-O (A01): -20 to -433, best Bxc6
- game 3, move 4... Nf6 (A02): 433 to 7, best axb5
- game 3, move 5. Nc3 (A01): -7 to -417, best Bxc6
- game 3, move 5... Be7 (A02): 417 to -31, best axb5
- game 3, move 6. d4 (A01): 31 to -310, best Bxc6
- game 3, move 9... Nf5 (A02): 404 to -79, best b5
- game 3, move 10. Bf4 (A01): 79 to -282, best exf5
- game 3, move 10... Nd6 (A02): 282 to -102, best Nd4
- game 3, move 12. Qe2 (A01): 105 to -473, best Qxd6
- game 3, move 13... Re8 (A02): 521 to -28, best Be5
- game 3, move 14. Bb3 (A01): 28 to -525, best Rxd6
- game 3, move 14... h6 (A02): 525 to -19, best Be5
- game 3, move 15. Nd5 (A01): 19 to -555, best Rxd6
- game 3, move 16... Bf4 (A02): 582 to 84, best Ng5
- game 3, move 18. Nd5 (A01): -34 to -1000, best Qc4
- game 4, move 4. O-O (A02): -20 to -433, best Bxc6
- game 4, move 4... Nf6 (A01): 433 to 7, best axb5
- game 4, move 5. d3 (A02): -7 to -445, best Bxc6
- game 4, move 5... Be7 (A01): 445 to -42, best axb5
- game 4, move 6. Nc3 (A02): 42 to -425, best Bxc6
- game 4, move 6... O-O (A01): 425 to -31, best axb5
- game 4, move 9... Bb7 (A01): -79 to -422, best Re8
- game 4, move 10. Bg5 (A02): 422 to 91, best e5
- game 4, move 12... Nxe4 (A01): -84 to -459, best Bf8
- game 4, move 25. Rde1 (A02): 525 to 0, best Qd5
- game 4, move 26... Rxe1 (A01): 0 to -417, best Qg4+
- game 4, move 27... Qf6 (A01): -422 to -1000, best Qg4+
- game 4, move 28. Be5 (A02): 1000 to 487, best Bxf6
- game 4, move 37... d4 (A01): -578 to -955, best Rb6
- game 4, move 38. Bf4 (A02): 955 to 593, best axb4
