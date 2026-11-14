# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 37 | 98 | 8 | 8 | 3 | 0 |
| 1 Black A02 | 37 | 71 | 9 | 5 | 2 | 0 |
| 2 White A02 | 40 | 238 | 8 | 6 | 13 | 0 |
| 2 Black A01 | 40 | 207 | 6 | 6 | 11 | 0 |
| 3 White A01 | 40 | 178 | 4 | 10 | 7 | 0 |
| 3 Black A02 | 40 | 162 | 1 | 13 | 6 | 0 |
| 4 White A02 | 26 | 128 | 13 | 2 | 1 | 0 |
| 4 Black A01 | 26 | 83 | 10 | 2 | 2 | 0 |

## Blunders and missed mates

- game 1, move 19... Nxe4 (A02): 63 to -318, best b5
- game 1, move 22. Rd1 (A01): 298 to -386, best Re2
- game 1, move 23. Be3 (A01): -380 to -792, best Ne1
- game 1, move 23... Bc7 (A02): 792 to 243, best exf3
- game 1, move 36. Kd3 (A01): -299 to -856, best Bc7
- game 2, move 14. Ng5 (A02): 236 to -121, best Nxe5
- game 2, move 19. Be3 (A02): 53 to -685, best Qe2
- game 2, move 21. Bc5 (A02): -599 to -1000, best Bg5
- game 2, move 24... Bd4 (A01): 918 to 502, best Qf6
- game 2, move 25. Rdc1 (A02): -502 to -850, best cxd4
- game 2, move 25... Qb6 (A01): 850 to 451, best Bb6
- game 2, move 26. Bd3 (A02): -451 to -955, best cxd4
- game 2, move 26... Qe6 (A01): 955 to 406, best Bxf2+
- game 2, move 27. Kh2 (A02): -406 to -938, best cxd4
- game 2, move 27... Rd8 (A01): 938 to 565, best Bxf2
- game 2, move 28. Be4 (A02): -565 to -970, best cxd4
- game 2, move 29... Qh4 (A01): 886 to 579, best Bb6
- game 2, move 30... Rd7 (A01): 705 to -583, best Qg5
- game 2, move 31. Bc6 (A02): 583 to -620, best gxh4
- game 2, move 31... Rd6 (A01): 620 to -346, best Bg1+
- game 2, move 32. Be4 (A02): 346 to -684, best gxh4
- game 2, move 32... Kh8 (A01): 684 to -574, best Qg5
- game 2, move 33. Kg2 (A02): 574 to -698, best gxh4
- game 2, move 33... Qf6 (A01): 698 to 381, best Qg5
- game 2, move 34. Rc2 (A02): -381 to -778, best cxd4
- game 2, move 34... Qe7 (A01): 778 to 428, best Bc5
- game 2, move 35. Bd3 (A02): -428 to -883, best cxd4
- game 2, move 36... Bd4 (A01): 993 to 428, best Qd7
- game 2, move 37. Rd1 (A02): -428 to -807, best cxd4
- game 3, move 11. Nxc6 (A01): 148 to -411, best Nd2
- game 3, move 11... Qe8 (A02): 411 to -794, best dxc6
- game 3, move 12. Bg5 (A01): 794 to 106, best Rxe8
- game 3, move 12... Qxe1+ (A02): -106 to -471, best Ne4
- game 3, move 13... Re8 (A02): -452 to -752, best dxc6
- game 3, move 14. Qxe8+ (A01): 752 to 120, best Ne5
- game 3, move 15. Ne5 (A01): 132 to -276, best Ne7+
- game 3, move 15... Bxe5 (A02): 276 to -104, best f6
- game 3, move 16... Nf6 (A02): -69 to -502, best d6
- game 3, move 17. Bxf6 (A01): 502 to 176, best exf6
- game 3, move 27. Kg3 (A01): 355 to -731, best exf6
- game 3, move 39... Rg3 (A02): 925 to -121, best d5
- game 3, move 40. Kc4 (A01): 121 to -944, best fxg3
- game 4, move 14... h6 (A01): 15 to -361, best Qd7
- game 4, move 25... Qg3 (A01): -353 to -1000, best Rb8
- game 4, move 26. Qd1 (A02): 1000 to -999, best fxg3
