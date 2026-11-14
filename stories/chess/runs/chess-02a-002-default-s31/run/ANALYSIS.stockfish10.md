# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 40 | 276 | 7 | 8 | 11 | 0 |
| 1 Black A02 | 40 | 281 | 7 | 8 | 11 | 0 |
| 2 White A02 | 18 | 96 | 6 | 2 | 1 | 0 |
| 2 Black A01 | 18 | 26 | 2 | 2 | 0 | 0 |

## Blunders and missed mates

- game 1, move 21. Qb5 (A01): 117 to -1000, best Bg3
- game 1, move 21... Rb8 (A02): 1000 to -76, best axb5
- game 1, move 22. Rec1 (A01): 76 to -1000, best Qxa6
- game 1, move 22... Rc8 (A02): 1000 to -129, best axb5
- game 1, move 25... Qb6 (A02): -251 to -998, best c5
- game 1, move 26. Qxb6 (A01): 998 to 287, best Qxc8
- game 1, move 27. Rc4 (A01): 357 to -626, best Be3
- game 1, move 27... Rb8 (A02): 626 to -314, best dxc4
- game 1, move 28. Re2 (A01): 314 to -563, best Rb4
- game 1, move 28... Rbe8 (A02): 563 to -318, best dxc4
- game 1, move 29. Kh2 (A01): 318 to -566, best Rb4
- game 1, move 29... g5 (A02): 566 to -145, best dxc4
- game 1, move 30. Bxg5 (A01): 145 to -395, best Rb4
- game 1, move 30... f6 (A02): 395 to -200, best dxc4
- game 1, move 31. Bf4 (A01): 200 to -444, best Rb4
- game 1, move 31... fxe5 (A02): 444 to -98, best dxc4
- game 1, move 32. Be3 (A01): 98 to -503, best Rb4
- game 1, move 32... Bxd4 (A02): 503 to -120, best dxc4
- game 1, move 36. Rxd5 (A01): 171 to -567, best Rb4
- game 1, move 36... Rxf2 (A02): 567 to -281, best cxd5
- game 1, move 37. Rb5 (A01): 281 to -711, best Rd8+
- game 1, move 37... Kg7 (A02): 711 to -374, best cxb5
- game 2, move 18. Qd4 (A02): -155 to -1000, best b4
