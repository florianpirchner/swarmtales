# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 22 | 101 | 3 | 3 | 3 | 0 |
| 1 Black A02 | 21 | 140 | 2 | 7 | 3 | 0 |
| 2 White A02 | 40 | 93 | 5 | 8 | 3 | 0 |
| 2 Black A01 | 40 | 118 | 8 | 8 | 5 | 0 |
| 3 White A01 | 40 | 45 | 10 | 3 | 1 | 1 |
| 3 Black A02 | 40 | 62 | 4 | 3 | 3 | 0 |
| 4 White A02 | 40 | 89 | 5 | 8 | 2 | 1 |
| 4 Black A01 | 40 | 82 | 5 | 9 | 2 | 0 |

## Blunders and missed mates

- game 1, move 11. Qxd4 (A01): 379 to -172, best Bg5
- game 1, move 11... bxc6 (A02): 172 to -189, best dxc6
- game 1, move 12. b4 (A01): 189 to -357, best Bh6
- game 1, move 13. Qe4 (A01): -327 to -637, best Rxe6
- game 1, move 14... Nf4 (A02): 620 to -243, best Rb8
- game 1, move 20... Qxa2 (A02): -310 to -741, best d6
- game 2, move 4. O-O (A02): 83 to -434, best Bxc6
- game 2, move 4... Nf6 (A01): 434 to -161, best axb5
- game 2, move 5. d3 (A02): 161 to -459, best Bxc6
- game 2, move 5... Be7 (A01): 459 to -199, best axb5
- game 2, move 6. Nc3 (A02): 199 to -428, best Bxc6
- game 2, move 6... O-O (A01): 428 to -205, best axb5
- game 2, move 13... Nxe4 (A01): -179 to -615, best Re8
- game 2, move 25... Kg8 (A01): -568 to -1000, best Kxe7
- game 3, move 15... Nd4 (A02): 131 to -434, best Rxa2
- game 3, move 19... Rxe4 (A02): -485 to -1000, best c6
- game 3, move 26. Qxb7+ (A01): 1000 to 450, best Rfd1
- game 3, move 26... Qe7 (A02): -450 to -1000, best Qxb7
- game 3, move 36. Re5+ (A01): 992 to 1000, best Rxg7+, missed a forced mate
- game 4, move 9. Nd5 (A02): -17 to -478, best d4
- game 4, move 9... Bd6 (A01): 478 to 34, best Nxd5
- game 4, move 14... Qe6 (A01): 143 to -822, best Re8
- game 4, move 33. Qxd5+ (A02): 998 to -350, best Qg4+, missed a forced mate
