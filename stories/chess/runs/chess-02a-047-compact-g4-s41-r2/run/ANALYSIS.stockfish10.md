# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 22 | 150 | 5 | 6 | 4 | 0 |
| 1 Black A02 | 22 | 96 | 4 | 5 | 2 | 0 |
| 2 White A02 | 38 | 150 | 10 | 6 | 8 | 0 |
| 2 Black A01 | 37 | 172 | 6 | 7 | 8 | 0 |
| 3 White A01 | 23 | 175 | 5 | 7 | 4 | 0 |
| 3 Black A02 | 23 | 155 | 7 | 4 | 4 | 0 |
| 4 White A02 | 39 | 171 | 6 | 8 | 7 | 0 |
| 4 Black A01 | 39 | 141 | 4 | 8 | 7 | 0 |

## Blunders and missed mates

- game 1, move 11... Re8 (A02): -67 to -456, best Bxb3
- game 1, move 12. Nc3 (A01): 456 to 118, best d5
- game 1, move 14. Ne5 (A01): 199 to -346, best Ng5
- game 1, move 15. Bg5 (A01): -353 to -682, best dxe5
- game 1, move 19... Nxb3 (A02): 740 to 257, best exd4
- game 1, move 20. Rad1 (A01): -257 to -765, best axb3
- game 2, move 13. Na5 (A02): 65 to -534, best d4
- game 2, move 14... Nb4 (A01): 536 to -41, best Qc7
- game 2, move 15. a3 (A02): 41 to -550, best cxb4
- game 2, move 17. Qb3 (A02): -489 to -1000, best c4
- game 2, move 17... Rac8 (A01): 1000 to 493, best Bxb3
- game 2, move 18. Rad1 (A02): -493 to -1000, best Qd1
- game 2, move 18... h6 (A01): 1000 to 522, best Bxb3
- game 2, move 19. Re3 (A02): -522 to -1000, best c4
- game 2, move 19... Kh7 (A01): 1000 to 548, best Bxb3
- game 2, move 20. Nh4 (A02): -548 to -1000, best c4
- game 2, move 21... Nf6 (A01): 1000 to 545, best Bxb3
- game 2, move 22. Nf5 (A02): -545 to -1000, best c4
- game 2, move 22... Bxf5 (A01): 1000 to 281, best Bxb3
- game 2, move 23. exf5 (A02): -281 to -612, best Qxf7
- game 2, move 26... Nxc3 (A01): 637 to 76, best Rb8
- game 2, move 36... Re8 (A01): -136 to -1000, best Rb3
- game 3, move 16... Bd7 (A02): 44 to -278, best a5
- game 3, move 17. Qd2 (A01): 278 to -48, best b4
- game 3, move 19. g4 (A01): 214 to -110, best b4
- game 3, move 19... Rfe8 (A02): 110 to -276, best a5
- game 3, move 20. Kh2 (A01): 276 to -122, best b4
- game 3, move 21... a4 (A02): 298 to -63, best Bg5
- game 3, move 22... Bg5 (A02): 62 to -1000, best Qc7
- game 3, move 23. Rf3 (A01): 1000 to -387, best Rxb6
- game 4, move 18... Re6 (A01): -168 to -762, best e4
- game 4, move 19. Qxa5 (A02): 762 to 193, best dxe6
- game 4, move 19... Nf5 (A01): -193 to -761, best Re8
- game 4, move 20. Bc3 (A02): 761 to 144, best dxe6
- game 4, move 20... Qd7 (A01): -144 to -714, best Re8
- game 4, move 21. Rfe1 (A02): 714 to 134, best dxe6
- game 4, move 21... h6 (A01): -134 to -724, best Ree8
- game 4, move 22. Qb4 (A02): 724 to 118, best dxe6
- game 4, move 22... Rae8 (A01): -118 to -765, best Ree8
- game 4, move 23. g4 (A02): 765 to 362, best dxe6
- game 4, move 23... Ne7 (A01): -362 to -710, best R6e7
- game 4, move 25. Nd2 (A02): 593 to -159, best dxe6
- game 4, move 26... Nxh3+ (A01): 275 to -100, best R6e7
- game 4, move 28. Re3 (A02): 128 to -920, best dxe6
