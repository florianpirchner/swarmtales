# Runs of chess

One folder per run: `chess-<NN>a-<run>-<short-name>/`, with a `README.md` (the reviewed run report) and the full `run/` directory.

| Run | Date | Variant | Residents | Result | Cost |
|---|---|---|---|---|---:|
| [chess-02a-001-smoke](chess-02a-001-smoke/) | 2026-11-06 | `chess-p80`: 2 games, cap 80 half-moves, brain on, no legal list | Haiku | game 1 0-1 on material at the cap, game 2 drawn by threefold repetition; 3 refused moves in 158 half-moves; both sides missed mate in one back to back (P110-P112) | 0.15 USD |
| [chess-02a-002-default-s31](chess-02a-002-default-s31/) | 2026-11-06 | `chess-p80`, seed 31: default arm | Haiku | game 1 drawn on material at the cap (a queen hung for two moves, 22 blunders), game 2 A02 resigned a queen down; A01 1.5-0.5; engine ACPL 276/281 and 96/26 | 0.11 USD |
| [chess-02a-003-moves-s29](chess-02a-003-moves-s29/) | 2026-11-06 | `chess-moves-p80`, seed 29: legal moves listed | Haiku | A01 won both by resignation; the cleanest solo game (ACPL 64/76) | 0.11 USD |
| [chess-02a-004-moves-s31](chess-02a-004-moves-s31/) | 2026-11-06 | `chess-moves-p80`, seed 31: legal moves listed | Haiku | A02 won both by resignation (15. Qe5?? dxe5 in game 1) | 0.08 USD |
| [chess-02a-005-nobrain-s29](chess-02a-005-nobrain-s29/) | 2026-11-06 | `chess-nobrain-p80`, seed 29: no brain | Haiku | A01 won both by resignation (a melee of seven blunders in a row, then 14. Qd3?? cxd3) | 0.06 USD |
| [chess-02a-006-nobrain-s31](chess-02a-006-nobrain-s31/) | 2026-11-06 | `chess-nobrain-p80`, seed 31: no brain | Haiku | A02 won both by resignation; the reporter found the refusal-list leak (LH13, fixed) | 0.06 USD |
| [chess-04a-007-teams-s29](chess-04a-007-teams-s29/) | 2026-11-06 | `chess-teams-p80`, seed 29: two teams of two | Haiku | B won 0-1 on material at the cap, then a draw at the cap (ACPL 43/60); a queen en prise for four moves, unseen by four players; 138 team posts | 0.24 USD |
| [chess-02a-008-default-g4-s37](chess-02a-008-default-g4-s37/) | 2026-11-06 | `chess-g4-p80`, seed 37: default arm, four games | Haiku | A01 3-1; the first checkmate (game 1, after A01 missed Qxg7#); 13 queen blunders | 0.32 USD |
| [chess-02a-009-moves-g4-s37](chess-02a-009-moves-g4-s37/) | 2026-11-06 | `chess-moves-g4-p80`, seed 37: legal moves listed | Haiku | A02 3-1, four resignations; ACPL 86, one queen blunder | 0.19 USD |
| [chess-02a-010-threats-g4-s37](chess-02a-010-threats-g4-s37/) | 2026-11-06 | `chess-threats-g4-p80`, seed 37: loose pieces listed | Haiku | A01 3-1; ACPL 109, queen blunders 4; 18. Qxf4?? exf4 although the list said the queen was defended | 0.22 USD |
| [chess-02a-011-nobrain-g4-s37](chess-02a-011-nobrain-g4-s37/) | 2026-11-06 | `chess-nobrain-g4-p80`, seed 37: no brain | Haiku | A02 4-0, two checkmates; ACPL 191, worst in games 3-4 | 0.22 USD |
| [chess-04a-012-moves-teams-g4-s37](chess-04a-012-moves-teams-g4-s37/) | 2026-11-06 | `chess-moves-teams-g4-p80`, seed 37: teams with the legal list | Haiku | A 3-1; ACPL 132 (solo with the list 86) at 2.4 times the cost; two missed mates in a row | 0.46 USD |
| [chess-02a-013-default-g4-s41](chess-02a-013-default-g4-s41/) | 2026-11-07 | `chess-g4-p80`, seed 41 | Haiku | A01 2, A02 2 (cap, threefold repetition); ACPL 124 | 0.32 USD |
| [chess-02a-014-moves-g4-s41](chess-02a-014-moves-g4-s41/) | 2026-11-07 | `chess-moves-g4-p80`, seed 41 | Haiku | A01 1, A02 3 (cap, checkmate, resignations); ACPL 140 | 0.23 USD |
| [chess-02a-015-moves-threats-g4-s41](chess-02a-015-moves-threats-g4-s41/) | 2026-11-07 | `chess-moves-threats-g4-p80`, seed 41 | Haiku | A01 2, A02 2 (resignations); ACPL 78 | 0.24 USD |
| [chess-02a-016-nobrain-g4-s41](chess-02a-016-nobrain-g4-s41/) | 2026-11-07 | `chess-nobrain-g4-p80`, seed 41 | Haiku | A01 0.5, A02 3.5 (cap, resignations); ACPL 110 | 0.23 USD |
| [chess-02a-017-default-g4-s43](chess-02a-017-default-g4-s43/) | 2026-11-07 | `chess-g4-p80`, seed 43 | Haiku | A01 3, A02 1 (cap); ACPL 157 | 0.36 USD |
| [chess-02a-018-moves-g4-s43](chess-02a-018-moves-g4-s43/) | 2026-11-07 | `chess-moves-g4-p80`, seed 43 | Haiku | A01 4, A02 0 (checkmate, resignations); ACPL 108 | 0.20 USD |
| [chess-02a-019-moves-threats-g4-s43](chess-02a-019-moves-threats-g4-s43/) | 2026-11-07 | `chess-moves-threats-g4-p80`, seed 43 | Haiku | A01 2, A02 2 (resignations); ACPL 111 | 0.14 USD |
| [chess-02a-020-nobrain-g4-s43](chess-02a-020-nobrain-g4-s43/) | 2026-11-07 | `chess-nobrain-g4-p80`, seed 43 | Haiku | A01 2, A02 2 (cap, checkmate, resignations); ACPL 125 | 0.23 USD |
| [chess-02a-021-default-g4-s47-stopped](chess-02a-021-default-g4-s47-stopped/) | 2026-11-07 | `chess-g4-p80`, seed 47 | Haiku | stopped after 2 games (resignations); ACPL 98 | 0.09 USD |
| [chess-02a-022-moves-g4-s47-stopped](chess-02a-022-moves-g4-s47-stopped/) | 2026-11-07 | `chess-moves-g4-p80`, seed 47 | Haiku | stopped after 3 games (checkmate, resignations); ACPL 58 | 0.09 USD |
| [chess-02a-023-moves-threats-g4-s47-stopped](chess-02a-023-moves-threats-g4-s47-stopped/) | 2026-11-07 | `chess-moves-threats-g4-p80`, seed 47 | Haiku | stopped after 2 games (resignations); ACPL 108 | 0.10 USD |
| [chess-02a-024-nobrain-g4-s47-stopped](chess-02a-024-nobrain-g4-s47-stopped/) | 2026-11-07 | `chess-nobrain-g4-p80`, seed 47 | Haiku | stopped after 2 games (checkmate, resignations); ACPL 140 | 0.09 USD |
| [chess-02a-025-default-g4-s47](chess-02a-025-default-g4-s47/) | 2026-11-11 | `chess-g4-p80`, seed 47 | Haiku | A01 2, A02 2 (cap, resignations); ACPL 121 | 0.24 USD |
| [chess-02a-026-moves-g4-s47](chess-02a-026-moves-g4-s47/) | 2026-11-11 | `chess-moves-g4-p80`, seed 47 | Haiku | A01 1, A02 3 (checkmate, resignations); ACPL 135 | 0.27 USD |
| [chess-02a-027-moves-threats-g4-s47](chess-02a-027-moves-threats-g4-s47/) | 2026-11-11 | `chess-moves-threats-g4-p80`, seed 47 | Haiku | A01 2.5, A02 1.5 (cap, checkmate, resignations); ACPL 106 | 0.27 USD |
| [chess-02a-028-nobrain-g4-s47](chess-02a-028-nobrain-g4-s47/) | 2026-11-11 | `chess-nobrain-g4-p80`, seed 47 | Haiku | A01 1, A02 3 (resignations); ACPL 139 | 0.21 USD |
| [chess-02a-029-default-g4-s53](chess-02a-029-default-g4-s53/) | 2026-11-11 | `chess-g4-p80`, seed 53 | Haiku | A01 0.5, A02 3.5 (cap, resignations); ACPL 137 | 0.30 USD |
| [chess-02a-030-moves-g4-s53](chess-02a-030-moves-g4-s53/) | 2026-11-11 | `chess-moves-g4-p80`, seed 53 | Haiku | A01 0, A02 4 (checkmate, resignations); ACPL 102 | 0.19 USD |
| [chess-02a-031-moves-threats-g4-s53](chess-02a-031-moves-threats-g4-s53/) | 2026-11-11 | `chess-moves-threats-g4-p80`, seed 53 | Haiku | A01 2, A02 2 (cap, checkmate, resignations); ACPL 77 | 0.24 USD |
| [chess-02a-032-nobrain-g4-s53](chess-02a-032-nobrain-g4-s53/) | 2026-11-11 | `chess-nobrain-g4-p80`, seed 53 | Haiku | A01 1, A02 3 (cap, resignations); ACPL 124 | 0.17 USD |
| [chess-02a-033-coach-g4-s41](chess-02a-033-coach-g4-s41/) | 2026-11-11 | `chess-coach-g4-p80`, seed 41 | Haiku | A01 2.5, A02 1.5 (cap, checkmate, resignations); ACPL 171 | 0.28 USD |
| [chess-02a-034-moves-threats-coach-g4-s41](chess-02a-034-moves-threats-coach-g4-s41/) | 2026-11-11 | `chess-moves-threats-coach-g4-p80`, seed 41 | Haiku | A01 2, A02 2 (resignations); ACPL 85 | 0.13 USD |
| [chess-02a-035-coach-g4-s43](chess-02a-035-coach-g4-s43/) | 2026-11-11 | `chess-coach-g4-p80`, seed 43 | Haiku | A01 0.5, A02 3.5 (cap, checkmate, resignations); ACPL 146 | 0.27 USD |
| [chess-02a-036-moves-threats-coach-g4-s43](chess-02a-036-moves-threats-coach-g4-s43/) | 2026-11-11 | `chess-moves-threats-coach-g4-p80`, seed 43 | Haiku | A01 2, A02 2 (cap, checkmate, resignations); ACPL 84 | 0.21 USD |
| [chess-02a-037-coach-g4-s47](chess-02a-037-coach-g4-s47/) | 2026-11-11 | `chess-coach-g4-p80`, seed 47 | Haiku | A01 3, A02 1 (cap, resignations); ACPL 87 | 0.25 USD |
| [chess-02a-038-moves-threats-coach-g4-s47](chess-02a-038-moves-threats-coach-g4-s47/) | 2026-11-11 | `chess-moves-threats-coach-g4-p80`, seed 47 | Haiku | A01 2, A02 2 (resignations); ACPL 73 | 0.17 USD |
| [chess-02a-039-coach-g4-s53](chess-02a-039-coach-g4-s53/) | 2026-11-11 | `chess-coach-g4-p80`, seed 53 | Haiku | A01 2, A02 2 (cap, resignations); ACPL 157 | 0.28 USD |
| [chess-02a-040-moves-threats-coach-g4-s53](chess-02a-040-moves-threats-coach-g4-s53/) | 2026-11-11 | `chess-moves-threats-coach-g4-p80`, seed 53 | Haiku | A01 3, A02 1 (resignations); ACPL 68 | 0.14 USD |
| [chess-02a-041-default-g4-s41-sonnet](chess-02a-041-default-g4-s41-sonnet/) | 2026-11-11 | `chess-g4-p80`, seed 41 | Sonnet | A01 2, A02 2 (cap); ACPL 63 | 3.37 USD |
| [chess-02a-042-moves-threats-g4-s41-sonnet](chess-02a-042-moves-threats-g4-s41-sonnet/) | 2026-11-11 | `chess-moves-threats-g4-p80`, seed 41 | Sonnet | A01 3, A02 1 (cap); ACPL 69 | 3.53 USD |
| [chess-02a-043-default-g4-s41-opus](chess-02a-043-default-g4-s41-opus/) | 2026-11-11 | `chess-g4-p80`, seed 41 | Opus | A01 2, A02 2 (cap, resignations); ACPL 55 | 5.93 USD |
| [chess-02a-044-moves-threats-g4-s41-opus](chess-02a-044-moves-threats-g4-s41-opus/) | 2026-11-11 | `chess-moves-threats-g4-p80`, seed 41 | Opus | A01 2, A02 2 (cap); ACPL 81 | 6.87 USD |

## Comparison (2026-11-06)

Six comparison runs plus the smoke, all Haiku, two games per match, cap 80 half-moves. Engine numbers from
Stockfish 10 at depth 14 (`pnpm lab:chess`), over all non-forfeit moves of the arm. Two seeds per arm (one for
teams): read the direction, not the decimals.

| Arm | Runs | Games | ACPL | Blunders per 100 moves | Refused per 100 half-moves | Missed mates | Cost |
|---|---|---:|---:|---:|---:|---:|---:|
| default (brain, no list) | 001, 002 | 4 | 167 | 12.8 | 2.6 | 2 | 0.26 USD |
| `-moves` (legal list) | 003, 004 | 4 | 80 | 5.4 | 1.4 | 0 | 0.19 USD |
| `-nobrain` | 005, 006 | 4 | 144 | 14.6 | 1.8 | 0 | 0.11 USD |
| `-teams` | 007 | 2 | 98 | 8.8 | 2.5 | 2 | 0.24 USD |

The legal list halves the ACPL and the blunders (P114); the brain shows no effect in two-game matches (P115);
teams play better than solo seats without the list, at 2.3 times the cost (P116). Queen blunders decide most
games, and the opponent often does not take the queen (P113). All nine resignations were justified (engine
-774 to -1000 for the resigner).

## Four-game matches (2026-11-06, seed 37)

Five matches of four games each on the same seed, cap 80 half-moves, all Haiku, Stockfish 10 at depth 14.

| Arm | Run | ACPL | ACPL per game | Blunders per 100 moves | Queen blunders | Refused per 100 half-moves | Missed mates | Cost |
|---|---|---:|---|---:|---:|---:|---:|---:|
| default | 008 | 148 | 160, 197, 91, 145 | 15.4 | 13 | 4.0 | 1 | 0.32 USD |
| `-moves` | 009 | 86 | 98, 88, 89, 67 | 5.9 | 1 | 0.9 | 0 | 0.19 USD |
| `-threats` | 010 | 109 | 132, 129, 72, 94 | 9.2 | 4 | 1.2 | 0 | 0.22 USD |
| `-nobrain` | 011 | 191 | 145, 95, 264, 251 | 22.1 | 9 | 1.8 | 1 | 0.22 USD |
| teams + `-moves` | 012 | 132 | 92, 227, 150, 53 | 14.0 | 1 | 0.8 | 2 | 0.46 USD |

The legal list is still the strongest single aid (P114); the loose-piece list cuts the queen blunders by two thirds but not the ACPL as far (P117); over four games the brain shows an effect (148 against 191, P115); with the same information two-player teams play worse than one seat and cost 2.4 times as much (P116). Total 1.41 USD plus about 0.015 USD for the five reporter drafts.


## Five seeds, a coach, and Sonnet and Opus (2026-11-07 and 2026-11-11)

Haiku, four-game matches at cap 80 half-moves on seeds 37, 41, 43, 47 and 53 (the combined arm and the coach arms on 41-53), Stockfish 10 at depth 14 over every non-forfeit move. The confidence interval resamples whole matches (four to five per arm); the p values compare game ACPL between two arms by permutation (16 to 20 games per arm). The four stopped runs 021-024 (seed 47, container reclaimed on 2026-11-07) are recorded but not counted; seed 47 was played again in 025-028.

| Arm | Runs | Games | ACPL | 95% CI | ACPL by game 1 / 2 / 3 / 4 | Blunders per 100 moves | Queen blunders per game | Blunders the reply did not punish | Missed mates | Refused per 100 half-moves | Games at the cap | Cost per match |
|---|---|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| default | 008, 013, 017, 025, 029 | 20 | 138 | 126-149 | 150 / 165 / 88 / 138 | 12.8 | 2.5 | 54% | 5 | 2.8 | 14 | 0.31 USD |
| `-nobrain` | 011, 016, 020, 028, 032 | 20 | 138 | 119-164 | 153 / 111 / 154 / 131 | 14.7 | 1.9 | 58% | 10 | 3.0 | 6 | 0.21 USD |
| `-coach` | 033, 035, 037, 039 | 16 | 140 | 104-164 | 158 / 157 / 120 / 127 | 13.5 | 2.2 | 53% | 10 | 3.1 | 9 | 0.27 USD |
| `-moves` | 009, 014, 018, 026, 030 | 20 | 115 | 97-132 | 124 / 105 / 117 / 113 | 9.5 | 1.4 | 31% | 6 | 0.8 | 1 | 0.22 USD |
| `-moves-threats` | 015, 019, 027, 031 | 16 | 92 | 77-108 | 90 / 93 / 82 / 109 | 8.1 | 0.5 | 31% | 2 | 0.8 | 2 | 0.22 USD |
| `-moves-threats-coach` | 034, 036, 038, 040 | 16 | **78** | 71-85 | 87 / 87 / 67 / 74 | **4.8** | 0.7 | **3%** | 1 | 1.0 | 1 | 0.17 USD |

- **The brain has no effect on move quality** (P320): 138 with it and 138 without over 20 games each (p = 0.91). The seed-37 effect of P115 (148 against 191) was one noisy no-brain match; on seeds 41-53 the no-brain arm played as well or better. The brain arm thinks longer (768 output tokens per half-move against 596) and its games run to the cap more often (14 of 20 against 6), so a match costs 45% more.
- **Information on the board is what works** (P321): legal moves and loose pieces together cut the ACPL from 138 to 92 (p = 0.005 against default, 0.013 against no brain) and the queen blunders from 2.5 to 0.5 per game. The legal list alone gives 115 (p = 0.13).
- **Without the legal list most blunders go unpunished** (P322): in 54-58% of the blunders the reply blunders back (loss 300+), so a game is a random walk of hanging pieces; with the list 31%.
- **The coach helps only where the seat can act on it** (P323): without the lists its review changes nothing (140 against 138); with them ACPL 78 against 92 (p = 0.12) and blunders 4.8 against 8.1 per 100 moves, the best Haiku arm of the series, and almost every blunder was punished (1 of 37 left standing, against 23 of 75). The review names missed free captures, and 14 of 24 brains after a review quote a reviewed move or the coach (8 of 24 without the lists). Four seeds: a strong hint, not yet proof.
- 63 of the 64 resignations in runs 013-044 were justified (the engine at -300 or worse for the resigner); A01 resigned game 1 of 022 at -111. The best and worst matches of one arm differ by 30-80 ACPL, so a single four-game match says little.

### Sonnet and Opus (seed 41, one match each)

| Model, arm | Run | ACPL | ACPL by game | Blunders per 100 moves | Queen blunders | Games at the cap | Refused per 100 half-moves | Cost | Cost per 100 half-moves |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Haiku, default | 013 | 124 | 217, 74, 86, 116 | 9.8 | 4 | 3 | 3.2 | 0.32 USD | 0.10 USD |
| Haiku, `-moves-threats` | 015 | 78 | 112, 85, 43, 68 | 5.0 | 1 | 0 | 1.3 | 0.24 USD | 0.10 USD |
| Sonnet, default | 041 | 63 | 77, 65, 53, 58 | 1.9 | 0 | 4 | 2.5 | 3.37 USD | 1.05 USD |
| Sonnet, `-moves-threats` | 042 | 69 | 68, 79, 77, 52 | 2.8 | 3 | 4 | 0.0 | 3.53 USD | 1.10 USD |
| Opus, default | 043 | 55 | 70, 56, 65, 32 | 3.3 | 3 | 3 | 2.3 | 5.93 USD | 1.94 USD |
| Opus, `-moves-threats` | 044 | 81 | 72, 147, 37, 66 | 5.6 | 4 | 4 | 0.9 | 6.87 USD | 2.15 USD |

- **Sonnet and Opus play about twice as well as plain Haiku** (ACPL 55-69 against 124-138), with a third of the blunders, at 10 to 20 times the cost per half-move (P326). **Haiku with the lists and the coach (78) reaches their level at 4-8% of their cost per half-move.**
- **The lists do not help the stronger models** (Sonnet 69 against 63, Opus 81 against 55; one match each): they read the board themselves. Opus still left a queen hanging with the loose-piece list on the board, and the reply missed it (044 game 2: 29. Qb4?? Qf6??).
- **15 of the 16 games ran to the 80-half-move cap** (P328): strong models do not lose quickly, so the cap's material verdict decides their results. **Sonnet found the cap's blind spot** (LH17): on the 80th half-move it promoted d1=Q+ into a recapture that would never come and turned a 7-6 draw into a win (042 game 4); Opus planned the same grab in words (043).
- `--budget` was ignored by core stories (P327, fixed in this PR): the Opus runs cost 5.93 and 6.87 USD against caps of 6 and 4. A first Opus run of the default arm was stopped after its first requests (under 0.2 USD) and its directory deleted before it was recorded; run 043 replaced it.

Costs of this round: Haiku 2026-11-07 (013-024) 2.32 USD, Haiku 2026-11-11 (025-040) 3.62 USD, Sonnet and Opus 19.70 USD, reporter drafts about 0.15 USD (OpenRouter).
