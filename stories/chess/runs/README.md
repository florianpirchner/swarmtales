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

