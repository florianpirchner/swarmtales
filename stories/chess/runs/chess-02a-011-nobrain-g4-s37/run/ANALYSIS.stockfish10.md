# Engine analysis

Stockfish 10 at depth 14 (`pnpm lab:chess`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.

| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |
|---|---:|---:|---:|---:|---:|---:|
| 1 White A01 | 35 | 163 | 9 | 6 | 4 | 0 |
| 1 Black A02 | 35 | 127 | 8 | 5 | 5 | 0 |
| 2 White A02 | 32 | 80 | 12 | 4 | 2 | 0 |
| 2 Black A01 | 31 | 111 | 4 | 7 | 4 | 0 |
| 3 White A01 | 30 | 281 | 6 | 3 | 10 | 0 |
| 3 Black A02 | 30 | 248 | 5 | 3 | 11 | 0 |
| 4 White A02 | 40 | 245 | 5 | 9 | 11 | 1 |
| 4 Black A01 | 39 | 258 | 5 | 9 | 13 | 0 |

## Blunders and missed mates

- game 1, move 16... Qd7 (A02): 11 to -389, best Nh5
- game 1, move 17. Ng3 (A01): 389 to -34, best Bxf4
- game 1, move 17... Bh4 (A02): 34 to -524, best Nd5
- game 1, move 18. Be3 (A01): 524 to -75, best Bxf4
- game 1, move 25. Qf2 (A01): -72 to -1000, best Qxb7
- game 1, move 25... Rxb3 (A02): 1000 to 315, best Rxf2
- game 1, move 26... Qe7 (A02): 368 to -526, best Qb5
- game 1, move 33... Qe5 (A02): -693 to -1000, best f6
- game 1, move 34. Rxf7 (A01): 1000 to -998, best Rxe5
- game 2, move 21... Bd5 (A01): 27 to -503, best g6
- game 2, move 22. Re1 (A02): 503 to 31, best exd5
- game 2, move 22... Rc4 (A01): -31 to -587, best Ba8
- game 2, move 23. Be3 (A02): 587 to -40, best exd5
- game 2, move 25... Rc2 (A01): -39 to -353, best Bf6
- game 2, move 28... Bg5 (A01): -352 to -844, best Bf6
- game 3, move 14. Qd3 (A01): 229 to -1000, best dxe5
- game 3, move 14... exd4 (A02): 1000 to -197, best cxd3
- game 3, move 15. Nxd4 (A01): 197 to -1000, best Qxc4
- game 3, move 15... Be6 (A02): 1000 to -208, best cxd3
- game 3, move 16... fxe6 (A02): 2 to -339, best cxd3
- game 3, move 17... Nd5 (A02): -332 to -813, best Kh8
- game 3, move 18. Qb3 (A01): 813 to 280, best exd5
- game 3, move 18... Qd7 (A02): -280 to -744, best Rb8
- game 3, move 19. Bd2 (A01): 744 to 224, best exd5
- game 3, move 19... Bf6 (A02): -224 to -736, best Nf4
- game 3, move 20. Rad1 (A01): 736 to 282, best exd5
- game 3, move 20... Rfe8 (A02): -282 to -765, best Ne7
- game 3, move 21. h3 (A01): 765 to 262, best exd5
- game 3, move 21... h6 (A02): -262 to -799, best Ne7
- game 3, move 22. Kh2 (A01): 799 to 367, best exd5
- game 3, move 22... Qc6 (A02): -367 to -749, best Be5+
- game 3, move 23. Rc1 (A01): 749 to 154, best exd5
- game 3, move 23... Nxc3 (A02): -154 to -508, best Nb6
- game 3, move 24... Nd5 (A02): -448 to -1000, best Qxa4
- game 3, move 25. exd5 (A01): 1000 to 680, best Rxc6
- game 3, move 26. Bc3 (A01): 686 to -914, best Qxd5
- game 4, move 8... Be6 (A01): -36 to -499, best Bg4
- game 4, move 9. Bxe6 (A02): 499 to 100, best d5
- game 4, move 10... Na5 (A01): -38 to -383, best exd5
- game 4, move 11... Nc4 (A01): -116 to -589, best O-O
- game 4, move 12. b3 (A02): 589 to -17, best Qa4+
- game 4, move 15. Nd4 (A02): 10 to -595, best Rf1
- game 4, move 15... Bxd4 (A01): 595 to 174, best Qh4
- game 4, move 16... Qf6 (A01): 251 to -177, best Qh4
- game 4, move 23... Rf5 (A01): -5 to -612, best exd5
- game 4, move 24. dxc6 (A02): 612 to 125, best exf5
- game 4, move 24... bxc6 (A01): -125 to -678, best Rf7
- game 4, move 25. g3 (A02): 678 to 6, best exf5
- game 4, move 25... Nd3 (A01): -6 to -707, best Rff8
- game 4, move 26... Nc5 (A01): -416 to -716, best Nb2
- game 4, move 27. Rfe1 (A02): 716 to 58, best exf5
- game 4, move 27... Kf7 (A01): -58 to -699, best Rff8
- game 4, move 28. Ne2 (A02): 699 to 35, best exf5
- game 4, move 37. Re5 (A02): 374 to -539, best Ree7
- game 4, move 37... Rb4 (A01): 539 to -359, best dxe5
- game 4, move 38. Kf2 (A02): 359 to -532, best Ree7
- game 4, move 38... Rf8 (A01): 532 to -421, best dxe5
- game 4, move 39. Kg2 (A02): 421 to -443, best Rg5
- game 4, move 39... Rf7 (A01): 443 to -999, best dxe5
- game 4, move 40. Rxf7 (A02): 999 to 356, best Re8#, missed a forced mate
