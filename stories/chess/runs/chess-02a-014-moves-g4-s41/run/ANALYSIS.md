# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 18 | 91 | 0 | 2 | 2 | 0 |
| 1 Black A02 | 18 | 40 | 1 | 2 | 1 | 0 |
| 2 White A02 | 33 | 49 | 2 | 5 | 1 | 0 |
| 2 Black A01 | 32 | 81 | 0 | 3 | 2 | 0 |
| 3 White A01 | 10 | 131 | 0 | 3 | 1 | 0 |
| 3 Black A02 | 10 | 32 | 0 | 2 | 0 | 0 |
| 4 White A02 | 40 | 130 | 3 | 2 | 7 | 0 |
| 4 Black A01 | 40 | 108 | 1 | 4 | 7 | 0 |

## Blunders and missed mates

- game 1, move 8. Re1 (A01): 76 to -288, best Bd5
- game 1, move 8... Nc5 (A02): 288 to -78, best Nxf2
- game 1, move 10. Qd4 (A01): 172 to -628, best Bg5
- game 2, move 13... Qxe4 (A01): -121 to -572, best Bxc1
- game 2, move 17. Re3 (A02): 367 to -259, best Qd3
- game 2, move 32... h4 (A01): 429 to -938, best Qc4
- game 3, move 10. Qe6+ (A01): -368 to -1000, best Qa4
- game 4, move 12. Bg5 (A02): 44 to -512, best Bf4
- game 4, move 12... h6 (A01): 512 to -24, best Rxg5
- game 4, move 17. Bxa6 (A02): -127 to -442, best Bb3
- game 4, move 20... Bxc6 (A01): 411 to -91, best Bxh3
- game 4, move 23... Rg5 (A01): -76 to -754, best Rb8
- game 4, move 24. g4 (A02): 754 to 103, best Qxe8+
- game 4, move 24... Qf6 (A01): -103 to -754, best Rge5
- game 4, move 25. Re2 (A02): 754 to 0, best Qxe8+
- game 4, move 29. Qxe6 (A02): -53 to -1000, best Qa6
- game 4, move 31... Qf8 (A01): 1000 to 645, best Qf4+
- game 4, move 32. f3 (A02): -645 to -1000, best Kg2
- game 4, move 32... Qe7 (A01): 1000 to 510, best Qf4+
- game 4, move 35... Bc5 (A01): 488 to 80, best Bf4
- game 4, move 36. Nd5 (A02): -80 to -1000, best f4
