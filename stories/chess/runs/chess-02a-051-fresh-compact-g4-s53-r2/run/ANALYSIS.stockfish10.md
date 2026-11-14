# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 37 | 159 | 5 | 8 | 8 | 0 |
| 1 Black A02 | 36 | 189 | 4 | 6 | 7 | 0 |
| 2 White A02 | 40 | 105 | 6 | 14 | 3 | 0 |
| 2 Black A01 | 40 | 75 | 4 | 8 | 2 | 0 |
| 3 White A01 | 40 | 192 | 9 | 9 | 6 | 0 |
| 3 Black A02 | 40 | 160 | 4 | 7 | 6 | 0 |
| 4 White A02 | 33 | 86 | 8 | 2 | 3 | 0 |
| 4 Black A01 | 33 | 58 | 2 | 8 | 1 | 0 |

## Blunders and missed mates

- game 1, move 4. O-O (A01): 83 to -434, best Bxc6
- game 1, move 4... Nf6 (A02): 434 to -161, best axb5
- game 1, move 5. Re1 (A01): 161 to -427, best Bxc6
- game 1, move 5... Be7 (A02): 427 to -187, best axb5
- game 1, move 6. Nxe5 (A01): 187 to -372, best Bxc6
- game 1, move 15. Qd2 (A01): -388 to -706, best Re3
- game 1, move 15... Bxc3 (A02): 706 to 312, best Nd5
- game 1, move 21... Ne3 (A02): 591 to 90, best Be6
- game 1, move 32. Rd7 (A01): -137 to -755, best Rb4
- game 1, move 32... Qf3 (A02): 755 to -1000, best Bxg2+
- game 1, move 33. Qxf3 (A01): 1000 to 220, best gxf3
- game 1, move 34. h3 (A01): 244 to -99, best gxf3
- game 1, move 34... Re8 (A02): 99 to -269, best Be4
- game 1, move 35. Bf2 (A01): 269 to -130, best gxf3
- game 1, move 35... Re2 (A02): 130 to -998, best Bc6
- game 2, move 23. Qxd4 (A02): -110 to -443, best Qc2
- game 2, move 25... Rd2 (A01): 446 to 143, best c6
- game 2, move 26. Rb1 (A02): -143 to -479, best Rxc7
- game 2, move 37... Rf3 (A01): 992 to 126, best a5
- game 2, move 38. Be4 (A02): -126 to -953, best gxf3
- game 3, move 12... Nxd4 (A02): 148 to -308, best Rxf3
- game 3, move 21. Qf4 (A01): 395 to -1000, best Qb3
- game 3, move 21... Rd7 (A02): 1000 to -392, best Rxf4
- game 3, move 22. Rxd4 (A01): 392 to -301, best Qg4
- game 3, move 22... Rxd4 (A02): 301 to -137, best cxd4
- game 3, move 23... Rd8 (A02): -98 to -1000, best cxd4
- game 3, move 24. Nf3 (A01): 1000 to 508, best Nxc6
- game 3, move 26... h5 (A02): -506 to -847, best Qc4
- game 3, move 29. Qxf8+ (A01): 665 to -291, best Qe4
- game 3, move 38. Rd1 (A01): -444 to -1000, best Ra1
- game 3, move 39... Qg4 (A02): 1000 to -385, best Qd2
- game 3, move 40. Nf3 (A01): 385 to -1000, best hxg4
- game 4, move 24... Rxd3 (A01): -286 to -829, best Rf6
- game 4, move 25. Re3 (A02): 829 to -12, best Bxd3
- game 4, move 26. b3 (A02): 84 to -341, best Rf3
- game 4, move 28. Be6 (A02): -280 to -849, best Rf1
