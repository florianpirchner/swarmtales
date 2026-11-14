# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A | 27 | 33 | 1 | 1 | 1 | 0 |
| 1 Black B | 26 | 70 | 0 | 1 | 2 | 0 |
| 2 White B | 40 | 181 | 2 | 2 | 12 | 2 |
| 2 Black A | 40 | 181 | 4 | 1 | 12 | 0 |
| 3 White A | 26 | 75 | 2 | 1 | 3 | 0 |
| 3 Black B | 25 | 110 | 2 | 2 | 4 | 0 |
| 4 White B | 40 | 22 | 1 | 0 | 1 | 0 |
| 4 Black A | 40 | 20 | 0 | 0 | 1 | 0 |

## Blunders and missed mates

- game 1, move 19... Bf6 (A03): -93 to -481, best dxe5
- game 1, move 21. Rg5+ (A01): 490 to -86, best Rad1
- game 1, move 25... Qxh3 (A03): 91 to -1000, best Rc8
- game 2, move 4. O-O (A04): -20 to -433, best Bxc6
- game 2, move 4... Nf6 (A02): 433 to 7, best axb5
- game 2, move 5. Re1 (A03): -7 to -448, best Bxc6
- game 2, move 5... Be7 (A01): 448 to -4, best axb5
- game 2, move 6. c3 (A04): 4 to -458, best Bxc6
- game 2, move 6... O-O (A02): 458 to -15, best axb5
- game 2, move 7. d4 (A03): 15 to -390, best Bxc6
- game 2, move 7... exd4 (A01): 390 to 42, best axb5
- game 2, move 8. cxd4 (A04): -42 to -393, best Bd3
- game 2, move 8... Na5 (A02): 393 to -49, best axb5
- game 2, move 9... Bd6 (A01): -67 to -445, best d5
- game 2, move 10. Nbd2 (A04): 445 to 97, best e5
- game 2, move 10... Re8 (A02): -97 to -454, best Be7
- game 2, move 11. h3 (A03): 454 to 104, best e5
- game 2, move 11... c6 (A01): -104 to -460, best Be7
- game 2, move 12. Nc4 (A04): 460 to 30, best e5
- game 2, move 21... Kf8 (A01): 19 to -997, best b5
- game 2, move 22. Be3 (A04): 997 to -44, best Bh6+, missed a forced mate
- game 2, move 24... Bb4 (A02): -9 to -997, best a5
- game 2, move 25. Rc1 (A03): 997 to -8, best Bh6+, missed a forced mate
- game 2, move 27. Rc6 (A03): 4 to -773, best Rc4
- game 2, move 31... Rb6 (A01): 1000 to 114, best Bxa6
- game 2, move 37. Bd4 (A03): -6 to -494, best Kf2
- game 2, move 37... Rc2 (A01): 494 to 46, best Rd3
- game 3, move 4. O-O (A02): -20 to -433, best Bxc6
- game 3, move 4... Nf6 (A04): 433 to 7, best axb5
- game 3, move 5. Re1 (A01): -7 to -448, best Bxc6
- game 3, move 5... d6 (A03): 448 to -29, best axb5
- game 3, move 6. d3 (A02): 29 to -481, best Bxc6+
- game 3, move 6... Be6 (A04): 481 to -16, best axb5
- game 3, move 25... Re3 (A03): -112 to -866, best Bf5
- game 4, move 32... Nxd7 (A02): 2 to -470, best Rxd7
- game 4, move 33. Bd4 (A03): 470 to -2, best Rd4
