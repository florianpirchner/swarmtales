# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 36 | 64 | 6 | 6 | 2 | 0 |
| 1 Black A02 | 35 | 86 | 3 | 3 | 5 | 0 |
| 2 White A02 | 33 | 97 | 9 | 8 | 2 | 0 |
| 2 Black A01 | 33 | 58 | 4 | 7 | 1 | 0 |
| 3 White A01 | 21 | 146 | 8 | 2 | 4 | 0 |
| 3 Black A02 | 21 | 88 | 5 | 2 | 1 | 0 |
| 4 White A02 | 40 | 55 | 8 | 5 | 1 | 0 |
| 4 Black A01 | 40 | 58 | 4 | 4 | 2 | 0 |

## Blunders and missed mates

- game 1, move 10... Be6 (A02): 163 to -339, best exd4
- game 1, move 11... Rxe6 (A02): -61 to -393, best fxe6
- game 1, move 12. b3 (A01): 393 to -160, best d5
- game 1, move 12... Bc5 (A02): 160 to -434, best exd4
- game 1, move 15... Nd4 (A02): -353 to -726, best Re7
- game 1, move 18. Nxd4 (A01): 677 to 315, best h3
- game 1, move 20... Nxa4 (A02): -307 to -764, best Qd5
- game 2, move 18. Be2 (A02): -207 to -652, best Nd2
- game 2, move 18... Nc6 (A01): 652 to 150, best Nxf3+
- game 2, move 31. f5 (A02): -410 to -1000, best Kf3
- game 3, move 16. Rxc7 (A01): -35 to -712, best Na3
- game 3, move 18. Nf3 (A01): -693 to -1000, best Nf1
- game 3, move 18... Re1+ (A02): 1000 to -100, best Bxf3
- game 3, move 20. Nf3 (A01): 118 to -428, best Nc2
- game 3, move 21. Bxf3 (A01): -372 to -999, best Bd2
- game 4, move 11... Nxe4 (A01): 224 to -281, best Bg4
- game 4, move 13. Qd5 (A02): 267 to -216, best Qf3
- game 4, move 17... Re3 (A01): -213 to -917, best Qe4
