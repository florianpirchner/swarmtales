# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 20 | 140 | 6 | 4 | 2 | 1 |
| 1 Black A02 | 19 | 195 | 4 | 3 | 3 | 0 |
| 2 White A02 | 35 | 110 | 12 | 6 | 2 | 0 |
| 2 Black A01 | 35 | 77 | 3 | 8 | 2 | 0 |
| 3 White A01 | 27 | 85 | 6 | 5 | 2 | 2 |
| 3 Black A02 | 26 | 118 | 3 | 5 | 5 | 0 |
| 4 White A02 | 21 | 119 | 6 | 6 | 1 | 0 |
| 4 Black A01 | 21 | 58 | 4 | 5 | 0 | 0 |

## Blunders and missed mates

- game 1, move 9... Nd6 (A02): 197 to -469, best d5
- game 1, move 10. Nc3 (A01): 469 to -576, best Bg5
- game 1, move 12... Nd2 (A02): 650 to 196, best N4a5
- game 1, move 18. Rxf7 (A01): -77 to -761, best Qd5
- game 1, move 18... Qe8 (A02): 761 to -998, best Rxf7
- game 1, move 19. Rxc7+ (A01): 998 to 920, best Rxg7+, missed a forced mate
- game 2, move 16... g5 (A01): 248 to -89, best Qb5
- game 2, move 17. Qg3 (A02): 89 to -1000, best f3
- game 2, move 25... Qf3 (A01): 1000 to -24, best Qc2
- game 2, move 35. Rc5 (A02): 0 to -841, best Rd2
- game 3, move 12... Bxb2 (A02): 107 to -403, best Bb6
- game 3, move 21... Nd5 (A02): -460 to -911, best Rd8
- game 3, move 22. Be3 (A01): 911 to 352, best Qxd5
- game 3, move 22... Nxe3 (A02): -352 to -656, best c5
- game 3, move 23... Qd6 (A02): -582 to -1000, best Re8
- game 3, move 25. Rc3 (A01): 999 to 656, best Re8#, missed a forced mate
- game 3, move 25... Qe4 (A02): -656 to -999, best Kh8
- game 3, move 26. Rxe4+ (A01): 999 to 1000, best Re8#, missed a forced mate
- game 4, move 21. Qb5 (A02): 120 to -1000, best Nxc6
