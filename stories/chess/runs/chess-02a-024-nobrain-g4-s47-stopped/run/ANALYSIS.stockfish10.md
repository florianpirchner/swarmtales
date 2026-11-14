# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 21 | 117 | 4 | 6 | 2 | 0 |
| 1 Black A02 | 21 | 66 | 5 | 6 | 0 | 0 |
| 2 White A02 | 26 | 257 | 5 | 4 | 7 | 2 |
| 2 Black A01 | 24 | 256 | 1 | 5 | 5 | 0 |
| 3 White A01 | 25 | 65 | 10 | 6 | 0 | 0 |
| 3 Black A02 | 24 | 62 | 11 | 4 | 0 | 0 |

## Blunders and missed mates

- game 1, move 17. Qf3 (A01): 106 to -264, best dxe5
- game 1, move 21. Qd2 (A01): -101 to -1000, best Qc7
- game 2, move 9. Bb3 (A02): 312 to -257, best Nxd5
- game 2, move 9... Nxe4 (A01): 257 to -89, best dxe4
- game 2, move 10. Re1 (A02): 89 to -287, best Nxd5
- game 2, move 13. Qc1 (A02): -316 to -887, best Qxa1
- game 2, move 18... Qe6 (A01): 898 to 40, best Qf5
- game 2, move 19. Ng5 (A02): -40 to -852, best Bxe6
- game 2, move 20... Bf5 (A01): 862 to 414, best Be6
- game 2, move 21. Qe3 (A02): -414 to -895, best Nxf7
- game 2, move 22... Be4 (A01): 901 to -997, best Qa1+
- game 2, move 23. Nxe4 (A02): 997 to -517, best Qxf7+, missed a forced mate
- game 2, move 23... Re8 (A01): 517 to -998, best Rf8
- game 2, move 24. Ng5 (A02): 998 to -392, best Qxf7+, missed a forced mate
- game 2, move 24... a5 (A01): 392 to -998, best Re1+
