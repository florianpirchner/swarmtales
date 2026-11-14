# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 118 | 6 | 11 | 3 | 0 |
| 1 Black A02 | 40 | 96 | 7 | 11 | 2 | 2 |
| 2 White A02 | 22 | 55 | 8 | 4 | 0 | 0 |
| 2 Black A01 | 21 | 107 | 8 | 5 | 1 | 0 |
| 3 White A01 | 27 | 173 | 4 | 5 | 6 | 0 |
| 3 Black A02 | 26 | 216 | 5 | 3 | 8 | 0 |
| 4 White A02 | 24 | 89 | 4 | 4 | 3 | 0 |
| 4 Black A01 | 23 | 135 | 3 | 6 | 2 | 0 |

## Blunders and missed mates

- game 1, move 15. Bd3 (A01): 185 to -445, best Nf1
- game 1, move 29... Qxf2+ (A02): 524 to -758, best Qa1+
- game 1, move 30. Kh1 (A01): 758 to -772, best Kxf2
- game 1, move 37... Qh2+ (A02): 995 to 594, best Re8+, missed a forced mate
- game 1, move 38. Ke3 (A01): -594 to -996, best Kxf1
- game 1, move 38... Rxf3+ (A02): 996 to 1000, best Re8+, missed a forced mate
- game 2, move 21... Qxb2 (A01): 45 to -1000, best Nc5
- game 3, move 10... Nc4 (A02): -38 to -599, best cxd4
- game 3, move 12... exd4 (A02): -527 to -878, best Bxf3
- game 3, move 13. cxd4 (A01): 878 to 533, best hxg4
- game 3, move 13... Re8 (A02): -533 to -903, best Bxf3
- game 3, move 14. Be3 (A01): 903 to 495, best hxg4
- game 3, move 14... Qb6 (A02): -495 to -1000, best Bxf3
- game 3, move 15. Nfe5 (A01): 1000 to 183, best Nxb6
- game 3, move 16. Raxd1 (A01): 222 to -455, best Nxb6
- game 3, move 16... Qxb2 (A02): 455 to -452, best Qc7
- game 3, move 17. Bd3 (A01): 452 to -418, best Nxb2
- game 3, move 18... Qa1 (A02): 592 to -386, best Qa4
- game 3, move 19... Bf8 (A02): -358 to -764, best cxd4
- game 3, move 20. Nxd6 (A01): 764 to 374, best Nf3
- game 3, move 20... Re6 (A02): -374 to -1000, best Bxd6
- game 4, move 16. Re2 (A02): -58 to -374, best f4
- game 4, move 17. Be3 (A02): -107 to -444, best Qd3
- game 4, move 19. Re2 (A02): -376 to -1000, best Qe2
- game 4, move 19... Nf4 (A01): 1000 to 281, best Qxh3
- game 4, move 23... Qxd4 (A01): 128 to -1000, best Qh6
