# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 18 | 138 | 2 | 4 | 2 | 0 |
| 1 Black A02 | 18 | 72 | 1 | 3 | 1 | 0 |
| 2 White A02 | 33 | 94 | 6 | 8 | 2 | 0 |
| 2 Black A01 | 32 | 126 | 5 | 5 | 4 | 0 |
| 3 White A01 | 10 | 221 | 2 | 4 | 2 | 0 |
| 3 Black A02 | 10 | 93 | 1 | 1 | 1 | 0 |
| 4 White A02 | 40 | 190 | 5 | 11 | 8 | 0 |
| 4 Black A01 | 40 | 164 | 3 | 9 | 8 | 0 |

## Blunders and missed mates

- game 1, move 8. Re1 (A01): 148 to -410, best Qd5
- game 1, move 8... Nc5 (A02): 410 to -215, best Nxf2
- game 1, move 10. Qd4 (A01): 371 to -858, best Ng5
- game 2, move 12... Ne4 (A01): -49 to -362, best c6
- game 2, move 13... Qxe4 (A01): -317 to -778, best Bxc1
- game 2, move 16. Qe2 (A02): 884 to 318, best Rg3
- game 2, move 17. Re3 (A02): 393 to -436, best Qd3
- game 2, move 25... Qxc2 (A01): 837 to 513, best Rxc2
- game 2, move 32... h4 (A01): 685 to -918, best Qc4
- game 3, move 7... Nd6 (A02): 119 to -515, best d5
- game 3, move 8. dxe5 (A01): 515 to -179, best Bg5
- game 3, move 10. Qe6+ (A01): -268 to -1000, best Qc2
- game 4, move 12. Bg5 (A02): 58 to -675, best h3
- game 4, move 12... h6 (A01): 675 to -83, best Rxg5
- game 4, move 17. Bxa6 (A02): -188 to -546, best Kh1
- game 4, move 19. Qc4 (A02): -412 to -866, best Kh1
- game 4, move 19... c5 (A01): 866 to 380, best Bxh3
- game 4, move 20... Bxc6 (A01): 567 to -212, best Bxh3
- game 4, move 23... Rg5 (A01): -107 to -783, best Qe6
- game 4, move 24. g4 (A02): 783 to 99, best Qxe8+
- game 4, move 24... Qf6 (A01): -99 to -803, best Rge5
- game 4, move 25. Re2 (A02): 803 to -319, best Qxe8+
- game 4, move 25... Re6 (A01): 319 to -228, best Qf4+
- game 4, move 26. Nd5 (A02): 228 to -199, best Kg3
- game 4, move 29. Qxe6 (A02): -138 to -1000, best Qa6
- game 4, move 32... Qe7 (A01): 1000 to 660, best Qf4+
- game 4, move 35... Bc5 (A01): 605 to 180, best Bf4
- game 4, move 36. Nd5 (A02): -180 to -1000, best f4
