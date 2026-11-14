# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 23 | 112 | 3 | 4 | 4 | 0 |
| 1 Black A02 | 23 | 62 | 2 | 3 | 2 | 0 |
| 2 White A02 | 39 | 190 | 10 | 5 | 6 | 1 |
| 2 Black A01 | 38 | 221 | 11 | 2 | 8 | 0 |
| 3 White A01 | 18 | 196 | 3 | 3 | 5 | 0 |
| 3 Black A02 | 18 | 162 | 6 | 1 | 4 | 0 |
| 4 White A02 | 40 | 148 | 7 | 9 | 6 | 0 |
| 4 Black A01 | 40 | 177 | 5 | 7 | 9 | 0 |

## Blunders and missed mates

- game 1, move 14. Nd5 (A01): -73 to -651, best Rc1
- game 1, move 15. Ne5 (A01): -614 to -996, best Rc1
- game 1, move 15... Bxe5 (A02): 996 to 621, best dxe5
- game 1, move 16. Qf3 (A01): -621 to -1000, best dxe5
- game 1, move 17... Rb8 (A02): 1000 to 618, best Qh4
- game 1, move 20. Qxd6 (A01): -579 to -1000, best b3
- game 2, move 19. Qb3 (A02): -62 to -469, best Qe4
- game 2, move 19... Nd3 (A01): 469 to 77, best Nxh3+
- game 2, move 24. Ng5 (A02): 18 to -664, best Na5
- game 2, move 24... Qd7 (A01): 664 to -726, best Qxg5
- game 2, move 25. Qb3 (A02): 726 to -1000, best Qxh7+
- game 2, move 25... Ne4 (A01): 1000 to -454, best Nxb3
- game 2, move 26. Nf3 (A02): 454 to -143, best Nxe4
- game 2, move 28. Qxb7 (A02): -169 to -676, best Qxd5
- game 2, move 29... Na5 (A01): 671 to 292, best Qxf3
- game 2, move 34... Qxb2 (A01): 484 to 163, best Qg3+
- game 2, move 35... Kg8 (A01): 200 to -999, best Kg6
- game 2, move 36. Qd5 (A02): 999 to -1000, best Qe8#, missed a forced mate
- game 2, move 37... Nb3 (A01): 1000 to -285, best exd5
- game 2, move 38... Kh8 (A01): -231 to -999, best Kf8
- game 3, move 4. O-O (A01): 83 to -434, best Bxc6
- game 3, move 4... Nf6 (A02): 434 to -161, best axb5
- game 3, move 5. d3 (A01): 161 to -459, best Bxc6
- game 3, move 5... Be7 (A02): 459 to -199, best axb5
- game 3, move 6. Nc3 (A01): 199 to -428, best Bxc6
- game 3, move 6... O-O (A02): 428 to -205, best axb5
- game 3, move 7. a4 (A01): 205 to -442, best Bxc6
- game 3, move 7... Na5 (A02): 442 to -11, best axb5
- game 3, move 17. Nh4 (A01): -23 to -557, best Qd2
- game 4, move 4. O-O (A02): 83 to -434, best Bxc6
- game 4, move 4... Nf6 (A01): 434 to -161, best axb5
- game 4, move 5. d3 (A02): 161 to -459, best Bxc6
- game 4, move 5... Be7 (A01): 459 to -199, best axb5
- game 4, move 6. Nbd2 (A02): 199 to -528, best Bxc6
- game 4, move 6... O-O (A01): 528 to -202, best axb5
- game 4, move 13. Be3 (A02): 30 to -869, best Qc3
- game 4, move 23... Bxa2 (A01): 1000 to 683, best Qf4
- game 4, move 24... Rad8 (A01): 722 to 61, best Bxb1
- game 4, move 29... Bb3 (A01): 116 to -199, best Re8
- game 4, move 30. c4 (A02): 199 to -359, best cxb3
- game 4, move 32... Bb3 (A01): 333 to -612, best Bxd1
- game 4, move 36... Kf8 (A01): -478 to -1000, best Bb5
- game 4, move 37. Rxb7 (A02): 1000 to 628, best Nxc4
- game 4, move 37... Ke8 (A01): -628 to -1000, best Bd5
