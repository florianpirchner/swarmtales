# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 62 | 7 | 4 | 2 | 0 |
| 1 Black A02 | 40 | 75 | 5 | 2 | 4 | 0 |
| 2 White A02 | 40 | 76 | 3 | 4 | 4 | 0 |
| 2 Black A01 | 39 | 82 | 5 | 4 | 5 | 0 |
| 3 White A01 | 40 | 58 | 3 | 2 | 3 | 0 |
| 3 Black A02 | 40 | 59 | 4 | 2 | 3 | 0 |
| 4 White A02 | 40 | 43 | 3 | 5 | 1 | 0 |
| 4 Black A01 | 40 | 46 | 4 | 4 | 1 | 0 |

## Blunders and missed mates

- game 1, move 12... Nxe4 (A02): -16 to -367, best Bb4
- game 1, move 19... Be6 (A02): -466 to -993, best Rb8
- game 1, move 21. Nf6+ (A01): 1000 to 520, best Rae1
- game 1, move 22. Re4 (A01): 601 to -141, best Qd5
- game 1, move 22... Re7 (A02): 141 to -501, best fxe4
- game 1, move 37... h5 (A02): -488 to -1000, best b5
- game 2, move 10... Nc6 (A01): -97 to -479, best d5
- game 2, move 11. Bf4 (A02): 479 to 79, best d5
- game 2, move 13... Nb4 (A01): -193 to -547, best Nd7
- game 2, move 14. Rc1 (A02): 547 to 223, best d5
- game 2, move 15... Ne5 (A01): -193 to -522, best h6
- game 2, move 16. Bxe5 (A02): 522 to 139, best dxe5
- game 2, move 17... Bd6 (A01): 115 to -257, best b5
- game 2, move 18... Bxe5 (A01): -243 to -552, best b5
- game 2, move 27... Qe5 (A01): -506 to -1000, best Qb6
- game 2, move 28. Re4 (A02): 1000 to 306, best Rxe5
- game 3, move 4. O-O (A01): -20 to -433, best Bxc6
- game 3, move 4... Nf6 (A02): 433 to 7, best axb5
- game 3, move 5. d3 (A01): -7 to -445, best Bxc6
- game 3, move 5... Be7 (A02): 445 to -42, best axb5
- game 3, move 15. Nd5 (A01): -116 to -841, best Qg4
- game 3, move 15... Be7 (A02): 841 to 96, best Ne2+
- game 4, move 11. Nd5 (A02): -33 to -471, best a3
- game 4, move 30... Be5 (A01): 590 to 15, best Bb6
