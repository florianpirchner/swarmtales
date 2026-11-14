# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 93 | 2 | 5 | 3 | 0 |
| 1 Black A02 | 40 | 68 | 5 | 3 | 2 | 2 |
| 2 White A02 | 22 | 15 | 1 | 1 | 0 | 0 |
| 2 Black A01 | 21 | 61 | 1 | 0 | 1 | 0 |
| 3 White A01 | 27 | 131 | 2 | 2 | 6 | 0 |
| 3 Black A02 | 26 | 174 | 1 | 2 | 8 | 0 |
| 4 White A02 | 24 | 46 | 3 | 1 | 1 | 0 |
| 4 Black A01 | 23 | 90 | 1 | 0 | 2 | 0 |

## Blunders and missed mates

- game 1, move 15. Bd3 (A01): 41 to -491, best Nc4
- game 1, move 29... Qxf2+ (A02): 458 to -689, best b5
- game 1, move 30. Kh1 (A01): 689 to -652, best Kxf2
- game 1, move 37... Qh2+ (A02): 995 to 376, best Re8+, missed a forced mate
- game 1, move 38. Ke3 (A01): -376 to -996, best Kxf1
- game 1, move 38... Rxf3+ (A02): 996 to 1000, best Re8+, missed a forced mate
- game 2, move 21... Qxb2 (A01): 31 to -1000, best Nc5
- game 3, move 10... Nc4 (A02): 8 to -463, best cxd4
- game 3, move 12... exd4 (A02): -513 to -871, best Be6
- game 3, move 13. cxd4 (A01): 871 to 538, best hxg4
- game 3, move 13... Re8 (A02): -538 to -933, best Bxf3
- game 3, move 14. Be3 (A01): 933 to 548, best hxg4
- game 3, move 14... Qb6 (A02): -548 to -1000, best Bh5
- game 3, move 15. Nfe5 (A01): 1000 to 44, best Nxb6
- game 3, move 16. Raxd1 (A01): 40 to -286, best Nxb6
- game 3, move 16... Qxb2 (A02): 286 to -462, best Qc7
- game 3, move 17. Bd3 (A01): 462 to -237, best Nxb2
- game 3, move 18... Qa1 (A02): 317 to -480, best Qa4
- game 3, move 19... Bf8 (A02): -487 to -806, best cxd4
- game 3, move 20. Nxd6 (A01): 806 to 465, best Nf3
- game 3, move 20... Re6 (A02): -465 to -1000, best Bxd6
- game 4, move 19. Re2 (A02): -186 to -879, best Nd2
- game 4, move 19... Nf4 (A01): 879 to 103, best Re6
- game 4, move 23... Qxd4 (A01): 52 to -1000, best Qg6+
