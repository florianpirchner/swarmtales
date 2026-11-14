# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 23 | 109 | 0 | 1 | 3 | 0 |
| 1 Black A02 | 23 | 64 | 2 | 0 | 1 | 0 |
| 2 White A02 | 40 | 57 | 4 | 5 | 2 | 0 |
| 2 Black A01 | 40 | 42 | 5 | 2 | 1 | 0 |
| 3 White A01 | 22 | 13 | 1 | 0 | 0 | 0 |
| 3 Black A02 | 21 | 61 | 3 | 0 | 2 | 0 |
| 4 White A02 | 40 | 57 | 3 | 3 | 3 | 0 |
| 4 Black A01 | 40 | 45 | 0 | 4 | 2 | 0 |

## Blunders and missed mates

- game 1, move 11. Bg5 (A01): -69 to -561, best Bd2
- game 1, move 17... Qf4 (A02): 569 to -657, best Qg6
- game 1, move 18. Qxf4 (A01): 657 to -518, best gxf4
- game 1, move 23. Re6 (A01): -471 to -1000, best h4
- game 2, move 23. Nd2 (A02): -68 to -593, best Qf3
- game 2, move 23... Qh3 (A01): 593 to 62, best f3
- game 2, move 39. Nd6+ (A02): -62 to -638, best Rd5
- game 3, move 13... Ng4 (A02): -19 to -497, best Bxe3
- game 3, move 17... Nf5 (A02): -467 to -968, best Qe6
- game 4, move 18. g3 (A02): -25 to -472, best Rd2
- game 4, move 18... Rf7 (A01): 472 to 117, best Qxf3+
- game 4, move 26. Nf2 (A02): -178 to -736, best Kg3
- game 4, move 26... Rxh4 (A01): 736 to 225, best Rxf2+
- game 4, move 33. Nd5 (A02): -183 to -581, best Ne8+
