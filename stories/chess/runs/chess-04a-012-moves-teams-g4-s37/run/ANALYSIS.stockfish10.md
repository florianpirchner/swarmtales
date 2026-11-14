# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A | 27 | 74 | 8 | 4 | 1 | 0 |
| 1 Black B | 26 | 112 | 6 | 5 | 2 | 0 |
| 2 White B | 40 | 226 | 0 | 8 | 12 | 2 |
| 2 Black A | 40 | 228 | 6 | 5 | 13 | 0 |
| 3 White A | 26 | 131 | 7 | 7 | 3 | 0 |
| 3 Black B | 25 | 170 | 4 | 7 | 4 | 0 |
| 4 White B | 40 | 57 | 16 | 4 | 1 | 0 |
| 4 Black A | 40 | 50 | 7 | 5 | 1 | 0 |

## Blunders and missed mates

- game 1, move 19... Bf6 (A03): -99 to -671, best Qe6
- game 1, move 21. Rg5+ (A01): 657 to -76, best Qh4
- game 1, move 25... Qxh3 (A03): 50 to -1000, best Rc8
- game 2, move 4. O-O (A04): 83 to -434, best Bxc6
- game 2, move 4... Nf6 (A02): 434 to -161, best axb5
- game 2, move 5. Re1 (A03): 161 to -427, best Bxc6
- game 2, move 5... Be7 (A01): 427 to -187, best axb5
- game 2, move 6. c3 (A04): 187 to -476, best Bxc6
- game 2, move 6... O-O (A02): 476 to -162, best axb5
- game 2, move 7. d4 (A03): 162 to -386, best Bxc6
- game 2, move 7... exd4 (A01): 386 to -72, best axb5
- game 2, move 8. cxd4 (A04): 72 to -416, best Bxc6
- game 2, move 8... Na5 (A02): 416 to -198, best axb5
- game 2, move 9... Bd6 (A01): -148 to -534, best d5
- game 2, move 10. Nbd2 (A04): 534 to 193, best e5
- game 2, move 10... Re8 (A02): -193 to -587, best Be7
- game 2, move 11. h3 (A03): 587 to 199, best e5
- game 2, move 11... c6 (A01): -199 to -672, best Be7
- game 2, move 12. Nc4 (A04): 672 to 77, best e5
- game 2, move 16... Ne4 (A02): 124 to -229, best Bf8
- game 2, move 21... Kf8 (A01): -34 to -997, best b6
- game 2, move 22. Be3 (A04): 997 to 2, best Bh6+, missed a forced mate
- game 2, move 24... Bb4 (A02): -129 to -997, best a5
- game 2, move 25. Rc1 (A03): 997 to 144, best Bh6+, missed a forced mate
- game 2, move 27. Rc6 (A03): 179 to -797, best Rc4
- game 2, move 31... Rb6 (A01): 1000 to 125, best Bxa6
- game 2, move 37. Bd4 (A03): 82 to -362, best Kf2
- game 2, move 37... Rc2 (A01): 362 to -54, best Rd3
- game 3, move 4. O-O (A02): 83 to -434, best Bxc6
- game 3, move 4... Nf6 (A04): 434 to -161, best axb5
- game 3, move 5. Re1 (A01): 161 to -427, best Bxc6
- game 3, move 5... d6 (A03): 427 to -116, best axb5
- game 3, move 6. d3 (A02): 116 to -494, best Bxc6+
- game 3, move 6... Be6 (A04): 494 to -93, best axb5
- game 3, move 25... Re3 (A03): -88 to -933, best Bf5
- game 4, move 32... Nxd7 (A02): 53 to -479, best Rxd7
- game 4, move 33. Bd4 (A03): 479 to -24, best Rd4
