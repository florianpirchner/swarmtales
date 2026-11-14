# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 20 | 173 | 2 | 5 | 2 | 5 |
| 1 Black A02 | 20 | 130 | 2 | 6 | 3 | 0 |
| 2 White A02 | 40 | 285 | 7 | 5 | 11 | 0 |
| 2 Black A01 | 40 | 282 | 4 | 7 | 11 | 2 |
| 3 White A01 | 40 | 81 | 11 | 3 | 2 | 0 |
| 3 Black A02 | 40 | 53 | 4 | 8 | 1 | 0 |
| 4 White A02 | 33 | 53 | 6 | 5 | 1 | 0 |
| 4 Black A01 | 32 | 88 | 3 | 7 | 2 | 0 |

## Blunders and missed mates

- game 1, move 10... Nc4 (A02): -56 to -527, best b5
- game 1, move 11... Nxe4 (A02): -488 to -800, best b5
- game 1, move 12. Qd3 (A01): 800 to 376, best Bxe4
- game 1, move 13... Nf6 (A02): -257 to -871, best Nxf2
- game 1, move 15. Nfxe5 (A01): 999 to 995, best Qxh7#, missed a forced mate
- game 1, move 16. Rxe5 (A01): 999 to 783, best Qxh7#, missed a forced mate
- game 1, move 17. Nxb6 (A01): 999 to 1000, best Qxh7#, missed a forced mate
- game 1, move 18. Rxe7 (A01): 999 to 1000, best Qxh7#, missed a forced mate
- game 1, move 19. Rxe8+ (A01): 998 to 1000, best Qxf7+, missed a forced mate
- game 1, move 20. Qd7 (A01): 1000 to -999, best Qxh7+
- game 2, move 16. Ng4 (A02): 19 to -734, best Rac1
- game 2, move 17... Bd7 (A01): 665 to 17, best Bxg4
- game 2, move 18. Re4 (A02): -17 to -750, best Ne5
- game 2, move 18... Re8 (A01): 750 to 35, best Bxg4
- game 2, move 20. Qe4 (A02): -54 to -1000, best Ne5
- game 2, move 20... Bd7 (A01): 1000 to 84, best dxe4
- game 2, move 21. Ne5 (A02): -84 to -1000, best Nxf6+
- game 2, move 21... Bxe5 (A01): 1000 to 99, best dxe4
- game 2, move 24. Qc2 (A02): -150 to -999, best Qb1
- game 2, move 24... g6 (A01): 999 to -3, best Qe1#, missed a forced mate
- game 2, move 25... Qa3 (A01): 21 to -1000, best Qxd2
- game 2, move 26. Qc3 (A02): 1000 to -13, best bxa3
- game 2, move 29. Qc4 (A02): -96 to -1000, best Qxb6
- game 2, move 29... c6 (A01): 1000 to 114, best dxc4
- game 2, move 30. Bxh6 (A02): -114 to -1000, best Qc3
- game 2, move 30... Kh7 (A01): 1000 to 174, best dxc4
- game 2, move 31. Bf4 (A02): -174 to -1000, best Qc1
- game 2, move 31... Bf5 (A01): 1000 to 31, best dxc4
- game 2, move 32. g4 (A02): -31 to -1000, best Qc3
- game 2, move 32... Be4 (A01): 1000 to 81, best dxc4
- game 2, move 33. Kh2 (A02): -81 to -1000, best Qc3
- game 2, move 34... Bf3 (A01): 999 to 829, best Qg2#, missed a forced mate
- game 2, move 35... Qe2 (A01): 804 to 0, best Qxd4+
- game 3, move 15. Qd2 (A01): 154 to -146, best Nxe5
- game 3, move 18... Nxe4 (A02): -7 to -455, best d5
- game 3, move 23. Qa4 (A01): 746 to -982, best Nxe5
- game 4, move 16... Bd8 (A01): 80 to -907, best Bf6
- game 4, move 20. Bxf6 (A02): 1000 to 611, best Rxa8
- game 4, move 23... Rd2 (A01): -613 to -1000, best Re8
