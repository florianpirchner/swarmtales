# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 94 | 9 | 10 | 2 | 0 |
| 1 Black A02 | 40 | 113 | 8 | 11 | 4 | 0 |
| 2 White A02 | 40 | 98 | 5 | 6 | 6 | 0 |
| 2 Black A01 | 39 | 118 | 8 | 11 | 5 | 0 |
| 3 White A01 | 40 | 93 | 6 | 5 | 4 | 0 |
| 3 Black A02 | 40 | 97 | 10 | 6 | 3 | 0 |
| 4 White A02 | 40 | 79 | 7 | 10 | 2 | 0 |
| 4 Black A01 | 40 | 79 | 7 | 8 | 2 | 0 |

## Blunders and missed mates

- game 1, move 12... Nxe4 (A02): -30 to -468, best d5
- game 1, move 19... Be6 (A02): -573 to -1000, best Kh8
- game 1, move 21. Nf6+ (A01): 1000 to 625, best Rae1
- game 1, move 22. Re4 (A01): 790 to -62, best Bxf5
- game 1, move 22... Re7 (A02): 62 to -667, best fxe4
- game 1, move 37... h5 (A02): -628 to -1000, best b6
- game 2, move 10... Nc6 (A01): -210 to -564, best c5
- game 2, move 11. Bf4 (A02): 564 to 257, best d5
- game 2, move 13... Nb4 (A01): -303 to -743, best Nd7
- game 2, move 14. Rc1 (A02): 743 to 310, best cxb4
- game 2, move 16. Bxe5 (A02): 598 to 188, best dxe5
- game 2, move 17... Bd6 (A01): 0 to -413, best b5
- game 2, move 24... Nxe4 (A01): -503 to -854, best Qxe4
- game 2, move 25. Ng3 (A02): 854 to 487, best Re1
- game 2, move 27... Qe5 (A01): -687 to -1000, best Qb6
- game 2, move 28. Re4 (A02): 1000 to 272, best Rxe5
- game 2, move 28... Qd6 (A01): -272 to -757, best Nxe4
- game 2, move 34. Rxe8+ (A02): 888 to 564, best Bxf7+
- game 3, move 4. O-O (A01): 83 to -434, best Bxc6
- game 3, move 4... Nf6 (A02): 434 to -161, best axb5
- game 3, move 5. d3 (A01): 161 to -459, best Bxc6
- game 3, move 5... Be7 (A02): 459 to -199, best axb5
- game 3, move 12. Qg3 (A01): 1 to -389, best Qd1
- game 3, move 15. Nd5 (A01): -169 to -1000, best Rce1
- game 3, move 15... Be7 (A02): 1000 to 202, best Ne2+
- game 4, move 11. Nd5 (A02): 0 to -543, best Na4
- game 4, move 30... Be5 (A01): 825 to -3, best e3
- game 4, move 36... Rf7 (A01): -9 to -425, best Rxd6
- game 4, move 39. d7 (A02): 437 to 0, best c5
