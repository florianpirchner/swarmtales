# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A | 40 | 157 | 9 | 3 | 6 | 0 |
| 1 Black B | 40 | 131 | 6 | 3 | 6 | 2 |
| 2 White B | 40 | 43 | 6 | 4 | 1 | 0 |
| 2 Black A | 40 | 60 | 6 | 8 | 1 | 0 |

## Blunders and missed mates

- game 1, move 17... d5 (A03): 0 to -1000, best Qe7
- game 1, move 18. exd5 (A02): 1000 to 534, best Nxg5
- game 1, move 18... Ne7 (A04): -534 to -1000, best Qe7
- game 1, move 19. e4 (A01): 1000 to 160, best Nxg5
- game 1, move 19... Ng6 (A03): -160 to -1000, best Qf6
- game 1, move 20. g3 (A02): 1000 to 146, best Nxg5
- game 1, move 20... Nh4 (A04): -146 to -1000, best Qg4
- game 1, move 21. Nxh4 (A01): 1000 to 640, best Nxg5
- game 1, move 21... Qh5 (A03): -640 to -1000, best g6
- game 1, move 22. Nf5 (A02): 1000 to -738, best Qxh5
- game 1, move 32... Re6 (A04): 962 to 237, best Rf8
- game 1, move 34. Ng5 (A02): -262 to -1000, best dxe6
- game 1, move 36... Qf4+ (A04): 996 to 819, best Qe2+, missed a forced mate
- game 1, move 37... Rxf7 (A03): 999 to 1000, best Rh6#, missed a forced mate
- game 2, move 13. Nd5 (A03): 31 to -498, best Kh2
- game 2, move 13... Nxd5 (A01): 498 to 98, best exd5
