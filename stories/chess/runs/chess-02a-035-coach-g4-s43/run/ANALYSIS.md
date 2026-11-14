# Engine analysis

Garbochess-JS at depth 10 (`pnpm lab:chess`; commit 4ff0f9e, BSD-3-Clause), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 20 | 164 | 1 | 0 | 4 | 5 |
| 1 Black A02 | 20 | 112 | 1 | 1 | 5 | 0 |
| 2 White A02 | 40 | 254 | 3 | 1 | 11 | 0 |
| 2 Black A01 | 40 | 252 | 2 | 1 | 12 | 2 |
| 3 White A01 | 40 | 60 | 7 | 1 | 1 | 0 |
| 3 Black A02 | 40 | 36 | 6 | 3 | 1 | 0 |
| 4 White A02 | 33 | 27 | 1 | 2 | 1 | 2 |
| 4 Black A01 | 32 | 56 | 0 | 3 | 2 | 0 |

## Blunders and missed mates

- game 1, move 10... Nc4 (A02): -1 to -450, best Qc7
- game 1, move 11... Nxe4 (A02): -453 to -759, best b5
- game 1, move 12. Qd3 (A01): 759 to 375, best Bxe4
- game 1, move 12... Bf5 (A02): -375 to -682, best f5
- game 1, move 13. Re1 (A01): 682 to 298, best Qe2
- game 1, move 13... Nf6 (A02): -298 to -853, best Nxf2
- game 1, move 15. Nfxe5 (A01): 999 to 1000, best Qxh7#, missed a forced mate
- game 1, move 16. Rxe5 (A01): 999 to 675, best Qxh7#, missed a forced mate
- game 1, move 16... Nb6 (A02): -675 to -999, best g6
- game 1, move 17. Nxb6 (A01): 999 to 1000, best Qxh7#, missed a forced mate
- game 1, move 18. Rxe7 (A01): 999 to 1000, best Qxh7#, missed a forced mate
- game 1, move 19. Rxe8+ (A01): 998 to 1000, best Qxf7+, missed a forced mate
- game 1, move 20. Qd7 (A01): 1000 to -999, best Qxh7+
- game 2, move 16. Ng4 (A02): -58 to -693, best Nxc6
- game 2, move 17... Bd7 (A01): 660 to 77, best Bxg4
- game 2, move 18. Re4 (A02): -77 to -715, best Nxf6+
- game 2, move 18... Re8 (A01): 715 to 77, best Bxg4
- game 2, move 20. Qe4 (A02): -106 to -1000, best Nxf6+
- game 2, move 20... Bd7 (A01): 1000 to 85, best dxe4
- game 2, move 21. Ne5 (A02): -85 to -1000, best Nxf6+
- game 2, move 21... Bxe5 (A01): 1000 to 118, best dxe4
- game 2, move 24. Qc2 (A02): -108 to -999, best Qb1
- game 2, move 24... g6 (A01): 999 to 11, best Qe1#, missed a forced mate
- game 2, move 25... Qa3 (A01): 12 to -1000, best Qxd2
- game 2, move 26. Qc3 (A02): 1000 to -93, best bxa3
- game 2, move 29. Qc4 (A02): -81 to -1000, best Qxb6
- game 2, move 29... c6 (A01): 1000 to 174, best dxc4
- game 2, move 30. Bxh6 (A02): -174 to -1000, best Qc3
- game 2, move 30... Kh7 (A01): 1000 to 224, best dxc4
- game 2, move 31. Bf4 (A02): -224 to -1000, best Qc1
- game 2, move 31... Bf5 (A01): 1000 to 85, best dxc4
- game 2, move 32. g4 (A02): -85 to -1000, best Qc3
- game 2, move 32... Be4 (A01): 1000 to 88, best dxc4
- game 2, move 33. Kh2 (A02): -88 to -1000, best Qc3
- game 2, move 34... Bf3 (A01): 999 to 682, best Qg2#, missed a forced mate
- game 2, move 35... Qe2 (A01): 691 to 76, best Qxd4+
- game 3, move 18... Nxe4 (A02): 21 to -359, best d5
- game 3, move 23. Qa4 (A01): 621 to -797, best Nxe5
- game 4, move 16... Bd8 (A01): -37 to -857, best Bf6
- game 4, move 20. Bxf6 (A02): 1000 to 587, best Rxa8
- game 4, move 23... Rd2 (A01): -609 to -1000, best Re8
- game 4, move 30. Rxb7 (A02): 995 to 1000, best Ke2, missed a forced mate
- game 4, move 31. Rb6 (A02): 996 to 1000, best h4, missed a forced mate
