# Runs of chess

One folder per run: `chess-<NN>a-<run>-<short-name>/`, with a `README.md` (the reviewed run report) and the full `run/` directory.

**Engine numbers (2026-11-14).** Every engine number on this page (ACPL, blunders, missed mates, intervals, p values)
is from **Garbochess-JS at depth 10** (`pnpm lab:chess`, a vendored BSD-3-Clause engine), recomputed from the recorded
moves on 2026-11-14. Until then the page showed Stockfish 10 at depth 14; that engine was removed because of its
licence (GPL-3.0). The new engine is weaker and sees less, so its ACPL is lower throughout (default arm 91, before
138): **numbers of the two engines are not comparable, and no table here mixes them.** The order of the arms did not
change; five statements did, and they are marked "changed with the new engine" below. The old numbers, the gate that
the new engine had to pass and a table of every run before and after are in [REANALYSIS.md](REANALYSIS.md); the old
files stay in each run as `run/analysis.stockfish10.json`. The run READMEs keep their Stockfish numbers and say so.
Counts that need no engine (results, refused moves, requests, tokens, cost) are unchanged.

Runtime: the runtime revision a run played on ([docs/RUNTIME-REVISIONS.md](../../../docs/RUNTIME-REVISIONS.md)); runs of different revisions are not compared without saying so.

| Run | Date | Runtime | Variant | Residents | Result | Cost |
|---|---| --- |---|---|---|---:|
| [chess-02a-001-smoke](chess-02a-001-smoke/) | 2026-11-06 | r1 | `chess-p80`: 2 games, cap 80 half-moves, brain on, no legal list | Haiku | game 1 0-1 on material at the cap, game 2 drawn by threefold repetition; 3 refused moves in 158 half-moves; both sides missed mate in one back to back (P110-P112) | 0.15 USD |
| [chess-02a-002-default-s31](chess-02a-002-default-s31/) | 2026-11-06 | r1 | `chess-p80`, seed 31: default arm | Haiku | game 1 drawn on material at the cap (a queen hung for two moves, 22 blunders), game 2 A02 resigned a queen down; A01 1.5-0.5; engine ACPL 212/217 and 61/3 | 0.11 USD |
| [chess-02a-003-moves-s29](chess-02a-003-moves-s29/) | 2026-11-06 | r1 | `chess-moves-p80`, seed 29: legal moves listed | Haiku | A01 won both by resignation; the cleanest solo game (ACPL 31/51) | 0.11 USD |
| [chess-02a-004-moves-s31](chess-02a-004-moves-s31/) | 2026-11-06 | r1 | `chess-moves-p80`, seed 31: legal moves listed | Haiku | A02 won both by resignation (15. Qe5?? dxe5 in game 1) | 0.08 USD |
| [chess-02a-005-nobrain-s29](chess-02a-005-nobrain-s29/) | 2026-11-06 | r1 | `chess-nobrain-p80`, seed 29: no brain | Haiku | A01 won both by resignation (a melee of seven blunders in a row, then 14. Qd3?? cxd3) | 0.06 USD |
| [chess-02a-006-nobrain-s31](chess-02a-006-nobrain-s31/) | 2026-11-06 | r1 | `chess-nobrain-p80`, seed 31: no brain | Haiku | A02 won both by resignation; the reporter found the refusal-list leak (LH13, fixed) | 0.06 USD |
| [chess-04a-007-teams-s29](chess-04a-007-teams-s29/) | 2026-11-06 | r1 | `chess-teams-p80`, seed 29: two teams of two | Haiku | B won 0-1 on material at the cap, then a draw at the cap (ACPL 27/42); a queen en prise for four moves, unseen by four players; 138 team posts | 0.24 USD |
| [chess-02a-008-default-g4-s37](chess-02a-008-default-g4-s37/) | 2026-11-06 | r1 | `chess-g4-p80`, seed 37: default arm, four games | Haiku | A01 3-1; the first checkmate (game 1, after A01 missed Qxg7#); 12 queen blunders | 0.32 USD |
| [chess-02a-009-moves-g4-s37](chess-02a-009-moves-g4-s37/) | 2026-11-06 | r1 | `chess-moves-g4-p80`, seed 37: legal moves listed | Haiku | A02 3-1, four resignations; ACPL 55, one queen blunder | 0.19 USD |
| [chess-02a-010-threats-g4-s37](chess-02a-010-threats-g4-s37/) | 2026-11-06 | r1 | `chess-threats-g4-p80`, seed 37: loose pieces listed | Haiku | A01 3-1; ACPL 55, queen blunders 3; 18. Qxf4?? exf4 although the list said the queen was defended | 0.22 USD |
| [chess-02a-011-nobrain-g4-s37](chess-02a-011-nobrain-g4-s37/) | 2026-11-06 | r1 | `chess-nobrain-g4-p80`, seed 37: no brain | Haiku | A02 4-0, two checkmates; ACPL 151, worst in games 3-4 | 0.22 USD |
| [chess-04a-012-moves-teams-g4-s37](chess-04a-012-moves-teams-g4-s37/) | 2026-11-06 | r1 | `chess-moves-teams-g4-p80`, seed 37: teams with the legal list | Haiku | A 3-1; ACPL 89 (solo with the list 55) at 2.4 times the cost; two missed mates in a row | 0.46 USD |
| [chess-02a-013-default-g4-s41](chess-02a-013-default-g4-s41/) | 2026-11-07 | r1 | `chess-g4-p80`, seed 41 | Haiku | A01 2, A02 2 (cap, threefold repetition); ACPL 69 | 0.32 USD |
| [chess-02a-014-moves-g4-s41](chess-02a-014-moves-g4-s41/) | 2026-11-07 | r1 | `chess-moves-g4-p80`, seed 41 | Haiku | A01 1, A02 3 (cap, checkmate, resignations); ACPL 88 | 0.23 USD |
| [chess-02a-015-moves-threats-g4-s41](chess-02a-015-moves-threats-g4-s41/) | 2026-11-07 | r1 | `chess-moves-threats-g4-p80`, seed 41 | Haiku | A01 2, A02 2 (resignations); ACPL 41 | 0.24 USD |
| [chess-02a-016-nobrain-g4-s41](chess-02a-016-nobrain-g4-s41/) | 2026-11-07 | r1 | `chess-nobrain-g4-p80`, seed 41 | Haiku | A01 0.5, A02 3.5 (cap, resignations); ACPL 84 | 0.23 USD |
| [chess-02a-017-default-g4-s43](chess-02a-017-default-g4-s43/) | 2026-11-07 | r1 | `chess-g4-p80`, seed 43 | Haiku | A01 3, A02 1 (cap); ACPL 109 | 0.36 USD |
| [chess-02a-018-moves-g4-s43](chess-02a-018-moves-g4-s43/) | 2026-11-07 | r1 | `chess-moves-g4-p80`, seed 43 | Haiku | A01 4, A02 0 (checkmate, resignations); ACPL 71 | 0.20 USD |
| [chess-02a-019-moves-threats-g4-s43](chess-02a-019-moves-threats-g4-s43/) | 2026-11-07 | r1 | `chess-moves-threats-g4-p80`, seed 43 | Haiku | A01 2, A02 2 (resignations); ACPL 64 | 0.14 USD |
| [chess-02a-020-nobrain-g4-s43](chess-02a-020-nobrain-g4-s43/) | 2026-11-07 | r1 | `chess-nobrain-g4-p80`, seed 43 | Haiku | A01 2, A02 2 (cap, checkmate, resignations); ACPL 83 | 0.23 USD |
| [chess-02a-021-default-g4-s47-stopped](chess-02a-021-default-g4-s47-stopped/) | 2026-11-07 | r1 | `chess-g4-p80`, seed 47 | Haiku | stopped after 2 games (resignations); ACPL 53 | 0.09 USD |
| [chess-02a-022-moves-g4-s47-stopped](chess-02a-022-moves-g4-s47-stopped/) | 2026-11-07 | r1 | `chess-moves-g4-p80`, seed 47 | Haiku | stopped after 3 games (checkmate, resignations); ACPL 29 | 0.09 USD |
| [chess-02a-023-moves-threats-g4-s47-stopped](chess-02a-023-moves-threats-g4-s47-stopped/) | 2026-11-07 | r1 | `chess-moves-threats-g4-p80`, seed 47 | Haiku | stopped after 2 games (resignations); ACPL 69 | 0.10 USD |
| [chess-02a-024-nobrain-g4-s47-stopped](chess-02a-024-nobrain-g4-s47-stopped/) | 2026-11-07 | r1 | `chess-nobrain-g4-p80`, seed 47 | Haiku | stopped after 2 games (checkmate, resignations); ACPL 92 | 0.09 USD |
| [chess-02a-025-default-g4-s47](chess-02a-025-default-g4-s47/) | 2026-11-11 | r1 | `chess-g4-p80`, seed 47 | Haiku | A01 2, A02 2 (cap, resignations); ACPL 71 | 0.24 USD |
| [chess-02a-026-moves-g4-s47](chess-02a-026-moves-g4-s47/) | 2026-11-11 | r1 | `chess-moves-g4-p80`, seed 47 | Haiku | A01 1, A02 3 (checkmate, resignations); ACPL 106 | 0.27 USD |
| [chess-02a-027-moves-threats-g4-s47](chess-02a-027-moves-threats-g4-s47/) | 2026-11-11 | r1 | `chess-moves-threats-g4-p80`, seed 47 | Haiku | A01 2.5, A02 1.5 (cap, checkmate, resignations); ACPL 66 | 0.27 USD |
| [chess-02a-028-nobrain-g4-s47](chess-02a-028-nobrain-g4-s47/) | 2026-11-11 | r1 | `chess-nobrain-g4-p80`, seed 47 | Haiku | A01 1, A02 3 (resignations); ACPL 99 | 0.21 USD |
| [chess-02a-029-default-g4-s53](chess-02a-029-default-g4-s53/) | 2026-11-11 | r1 | `chess-g4-p80`, seed 53 | Haiku | A01 0.5, A02 3.5 (cap, resignations); ACPL 101 | 0.30 USD |
| [chess-02a-030-moves-g4-s53](chess-02a-030-moves-g4-s53/) | 2026-11-11 | r1 | `chess-moves-g4-p80`, seed 53 | Haiku | A01 0, A02 4 (checkmate, resignations); ACPL 60 | 0.19 USD |
| [chess-02a-031-moves-threats-g4-s53](chess-02a-031-moves-threats-g4-s53/) | 2026-11-11 | r1 | `chess-moves-threats-g4-p80`, seed 53 | Haiku | A01 2, A02 2 (cap, checkmate, resignations); ACPL 49 | 0.24 USD |
| [chess-02a-032-nobrain-g4-s53](chess-02a-032-nobrain-g4-s53/) | 2026-11-11 | r1 | `chess-nobrain-g4-p80`, seed 53 | Haiku | A01 1, A02 3 (cap, resignations); ACPL 87 | 0.17 USD |
| [chess-02a-033-coach-g4-s41](chess-02a-033-coach-g4-s41/) | 2026-11-11 | r1 | `chess-coach-g4-p80`, seed 41 | Haiku | A01 2.5, A02 1.5 (cap, checkmate, resignations); ACPL 131 | 0.28 USD |
| [chess-02a-034-moves-threats-coach-g4-s41](chess-02a-034-moves-threats-coach-g4-s41/) | 2026-11-11 | r1 | `chess-moves-threats-coach-g4-p80`, seed 41 | Haiku | A01 2, A02 2 (resignations); ACPL 43 | 0.13 USD |
| [chess-02a-035-coach-g4-s43](chess-02a-035-coach-g4-s43/) | 2026-11-11 | r1 | `chess-coach-g4-p80`, seed 43 | Haiku | A01 0.5, A02 3.5 (cap, checkmate, resignations); ACPL 122 | 0.27 USD |
| [chess-02a-036-moves-threats-coach-g4-s43](chess-02a-036-moves-threats-coach-g4-s43/) | 2026-11-11 | r1 | `chess-moves-threats-coach-g4-p80`, seed 43 | Haiku | A01 2, A02 2 (cap, checkmate, resignations); ACPL 40 | 0.21 USD |
| [chess-02a-037-coach-g4-s47](chess-02a-037-coach-g4-s47/) | 2026-11-11 | r1 | `chess-coach-g4-p80`, seed 47 | Haiku | A01 3, A02 1 (cap, resignations); ACPL 58 | 0.25 USD |
| [chess-02a-038-moves-threats-coach-g4-s47](chess-02a-038-moves-threats-coach-g4-s47/) | 2026-11-11 | r1 | `chess-moves-threats-coach-g4-p80`, seed 47 | Haiku | A01 2, A02 2 (resignations); ACPL 44 | 0.17 USD |
| [chess-02a-039-coach-g4-s53](chess-02a-039-coach-g4-s53/) | 2026-11-11 | r1 | `chess-coach-g4-p80`, seed 53 | Haiku | A01 2, A02 2 (cap, resignations); ACPL 106 | 0.28 USD |
| [chess-02a-040-moves-threats-coach-g4-s53](chess-02a-040-moves-threats-coach-g4-s53/) | 2026-11-11 | r1 | `chess-moves-threats-coach-g4-p80`, seed 53 | Haiku | A01 3, A02 1 (resignations); ACPL 33 | 0.14 USD |
| [chess-02a-041-default-g4-s41-sonnet](chess-02a-041-default-g4-s41-sonnet/) | 2026-11-11 | r1 | `chess-g4-p80`, seed 41 | Sonnet | A01 2, A02 2 (cap); ACPL 22 | 3.37 USD |
| [chess-02a-042-moves-threats-g4-s41-sonnet](chess-02a-042-moves-threats-g4-s41-sonnet/) | 2026-11-11 | r1 | `chess-moves-threats-g4-p80`, seed 41 | Sonnet | A01 3, A02 1 (cap); ACPL 28 | 3.53 USD |
| [chess-02a-043-default-g4-s41-opus](chess-02a-043-default-g4-s41-opus/) | 2026-11-11 | r1 | `chess-g4-p80`, seed 41 | Opus | A01 2, A02 2 (cap, resignations); ACPL 26 | 5.93 USD |
| [chess-02a-044-moves-threats-g4-s41-opus](chess-02a-044-moves-threats-g4-s41-opus/) | 2026-11-11 | r1 | `chess-moves-threats-g4-p80`, seed 41 | Opus | A01 2, A02 2 (cap); ACPL 44 | 6.87 USD |
| [chess-02a-045-default-g4-s41-r2](chess-02a-045-default-g4-s41-r2/) | 2026-11-12 | r2 | `chess-g4-p80`, seed 41: the r2 baseline | Haiku | A01 2, A02 2 (cap, checkmate, resignation); ACPL 111; 1.13 requests per half-move (013: 1.48) | 0.21 USD |
| [chess-02a-046-fresh-g4-s41-r2](chess-02a-046-fresh-g4-s41-r2/) | 2026-11-12 | r2 | `chess-fresh-g4-p80`, seed 41: fresh context per half-move | Haiku | A01 3, A02 1; ACPL 99; 1,620 output tokens per half-move (P340) | 0.28 USD |
| [chess-02a-047-compact-g4-s41-r2](chess-02a-047-compact-g4-s41-r2/) | 2026-11-12 | r2 | `chess-compact-g4-p80`, seed 41: compact board | Haiku | A01 1, A02 3 (four resignations); ACPL 113 (P341) | 0.17 USD |
| [chess-02a-048-fresh-compact-g4-s41-r2](chess-02a-048-fresh-compact-g4-s41-r2/) | 2026-11-12 | r2 | `chess-fresh-compact-g4-p80`, seed 41 | Haiku | A01 2.5, A02 1.5; ACPL 57 | 0.30 USD |
| [chess-02a-049-fresh-compact-g4-s43-r2](chess-02a-049-fresh-compact-g4-s43-r2/) | 2026-11-12 | r2 | `chess-fresh-compact-g4-p80`, seed 43 | Haiku | A01 2.5, A02 1.5; ACPL 131 | 0.33 USD |
| [chess-02a-050-fresh-compact-g4-s47-r2](chess-02a-050-fresh-compact-g4-s47-r2/) | 2026-11-12 | r2 | `chess-fresh-compact-g4-p80`, seed 47 | Haiku | A01 2, A02 2 (four at the cap); ACPL 63 | 0.34 USD |
| [chess-02a-051-fresh-compact-g4-s53-r2](chess-02a-051-fresh-compact-g4-s53-r2/) | 2026-11-12 | r2 | `chess-fresh-compact-g4-p80`, seed 53 | Haiku | A01 3, A02 1; ACPL 93 | 0.32 USD |
| [chess-02a-052-fresh-compact-low-g4-s41-r2](chess-02a-052-fresh-compact-low-g4-s41-r2/) | 2026-11-13 | r2 | `chess-fresh-compact-g4-p80`, seed 41, `--thinking low` | Haiku | A01 0, A02 4; ACPL 127 (P342) | 0.18 USD |
| [chess-02a-053-fresh-compact-low-g4-s43-r2](chess-02a-053-fresh-compact-low-g4-s43-r2/) | 2026-11-13 | r2 | `chess-fresh-compact-g4-p80`, seed 43, `--thinking low` | Haiku | A01 0.5, A02 3.5; ACPL 112 | 0.22 USD |
| [chess-02a-054-fresh-compact-low-g4-s47-r2](chess-02a-054-fresh-compact-low-g4-s47-r2/) | 2026-11-13 | r2 | `chess-fresh-compact-g4-p80`, seed 47, `--thinking low` | Haiku | A01 2, A02 2; ACPL 138 | 0.21 USD |
| [chess-02a-055-fresh-compact-low-g4-s53-r2](chess-02a-055-fresh-compact-low-g4-s53-r2/) | 2026-11-13 | r2 | `chess-fresh-compact-g4-p80`, seed 53, `--thinking low` | Haiku | A01 1, A02 3; ACPL 140 | 0.21 USD |
| [chess-02a-056-fresh-compact-settle-g4-s41-sonnet-r2](chess-02a-056-fresh-compact-settle-g4-s41-sonnet-r2/) | 2026-11-13 | r2 | `chess-fresh-compact-settle-g4` (cap 160), seed 41 | Sonnet | A01 2.5, A02 1.5 (two resignations, repetition, checkmate; no game at the cap); ACPL 43; 0.81 USD per 100 half-moves (P343, P344) | 2.81 USD |
| [chess-02a-057-compact-settle-g4-s41-sonnet-r2](chess-02a-057-compact-settle-g4-s41-sonnet-r2/) | 2026-11-13 | r2 | `chess-compact-settle-g4` (cap 160), seed 41: context kept, the baseline for 056 | Sonnet | A01 3, A02 1 (three resignations, checkmate; no game at the cap); ACPL 64; 0.74 USD per 100 half-moves (P343) | 3.05 USD |

## Comparison (2026-11-06)

Six comparison runs plus the smoke, all Haiku, two games per match, cap 80 half-moves. Engine numbers from
Garbochess-JS at depth 10 (`pnpm lab:chess`), over all non-forfeit moves of the arm. Two seeds per arm (one for
teams): read the direction, not the decimals.

| Arm | Runs | Games | ACPL | Blunders per 100 moves | Refused per 100 half-moves | Missed mates | Cost |
|---|---|---:|---:|---:|---:|---:|---:|
| default (brain, no list) | 001, 002 | 4 | 119 | 12.8 | 2.6 | 2 | 0.26 USD |
| `-moves` (legal list) | 003, 004 | 4 | 48 | 5.0 | 1.4 | 0 | 0.19 USD |
| `-nobrain` | 005, 006 | 4 | 101 | 13.4 | 1.8 | 0 | 0.11 USD |
| `-teams` | 007 | 2 | 95 | 11.9 | 2.5 | 3 | 0.24 USD |

The legal list more than halves the ACPL and the blunders (P114); the brain shows no effect in two-game matches (P115);
teams have a lower ACPL than solo seats without the list (95 against 119) at 2.3 times the cost, but hardly fewer
blunders (11.9 against 12.8 per 100 moves; P116; **changed with the new engine**: Stockfish had 98 against 167 and
8.8 against 12.8). Queen blunders decide most games, and the opponent often does not take the queen (P113). All
nine resignations were justified (engine -848 to -1000 for the resigner).

## Four-game matches (2026-11-06, seed 37)

Five matches of four games each on the same seed, cap 80 half-moves, all Haiku, Garbochess-JS at depth 10.

| Arm | Run | ACPL | ACPL per game | Blunders per 100 moves | Queen blunders | Refused per 100 half-moves | Missed mates | Cost |
|---|---|---:|---|---:|---:|---:|---:|---:|
| default | 008 | 101 | 119, 137, 56, 95 | 13.8 | 12 | 4.0 | 1 | 0.32 USD |
| `-moves` | 009 | 55 | 65, 49, 82, 26 | 5.0 | 1 | 0.9 | 0 | 0.19 USD |
| `-threats` | 010 | 55 | 87, 49, 37, 51 | 5.6 | 3 | 1.2 | 0 | 0.22 USD |
| `-nobrain` | 011 | 151 | 117, 67, 229, 188 | 20.6 | 8 | 1.8 | 1 | 0.22 USD |
| teams + `-moves` | 012 | 89 | 51, 181, 92, 21 | 13.6 | 1 | 0.8 | 2 | 0.46 USD |

The legal list and the loose-piece list are level on this seed (ACPL 55 each, 5.0 and 5.6 blunders per 100 moves; **changed with the new engine**: Stockfish had the legal list ahead, 86 against 109, P114, P117); the loose-piece list cuts the queen blunders from 12 to 3; over four games the brain shows an effect (101 against 151, P115; not confirmed on five seeds, P320); with the same information two-player teams play worse than one seat (89 against 55) and cost 2.4 times as much (P116). Total 1.41 USD plus about 0.015 USD for the five reporter drafts.


## Five seeds, a coach, and Sonnet and Opus (2026-11-07 and 2026-11-11)

Haiku, four-game matches at cap 80 half-moves on seeds 37, 41, 43, 47 and 53 (the combined arm and the coach arms on 41-53), Garbochess-JS at depth 10 over every non-forfeit move. The confidence interval resamples whole matches (four to five per arm; 10,000 draws); the p values compare game ACPL between two arms by permutation (16 to 20 games per arm; 20,000 permutations; both from `pnpm lab:chess:gate --tables`, fixed seeds). The four stopped runs 021-024 (seed 47, container reclaimed on 2026-11-07) are recorded but not counted; seed 47 was played again in 025-028.

| Arm | Runs | Games | ACPL | 95% CI | ACPL by game 1 / 2 / 3 / 4 | Blunders per 100 moves | Queen blunders per game | Blunders the reply did not punish | Missed mates | Refused per 100 half-moves | Games at the cap | Cost per match |
|---|---|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| default | 008, 013, 017, 025, 029 | 20 | 91 | 76-105 | 103 / 121 / 43 / 89 | 11.9 | 2.5 | 55% | 5 | 2.8 | 14 | 0.31 USD |
| `-nobrain` | 011, 016, 020, 028, 032 | 20 | 101 | 84-127 | 122 / 76 / 117 / 87 | 13.8 | 1.7 | 59% | 11 | 3.0 | 6 | 0.21 USD |
| `-coach` | 033, 035, 037, 039 | 16 | 104 | 73-126 | 119 / 125 / 88 / 91 | 12.9 | 2.1 | 58% | 12 | 3.1 | 9 | 0.27 USD |
| `-moves` | 009, 014, 018, 026, 030 | 20 | 77 | 60-95 | 86 / 64 / 89 / 67 | 8.2 | 1.1 | 34% | 8 | 0.8 | 1 | 0.22 USD |
| `-moves-threats` | 015, 019, 027, 031 | 16 | 54 | 45-65 | 56 / 54 / 53 / 61 | 7.0 | 0.5 | 28% | 2 | 0.8 | 2 | 0.22 USD |
| `-moves-threats-coach` | 034, 036, 038, 040 | 16 | **40** | 35-44 | 48 / 50 / 32 / 34 | **4.1** | 0.8 | **3%** | 1 | 1.0 | 1 | 0.17 USD |

- **The brain has no effect on move quality that this sample can show** (P320): 91 with it and 101 without over 20 games each (p = 0.49; the intervals 76-105 and 84-127 overlap widely). Half of the difference is the seed-37 effect of P115 (101 against 151), one noisy no-brain match; on seeds 41-53 the two arms are close (default 69, 109, 71, 101; no brain 84, 83, 99, 87). The brain arm thinks longer (768 output tokens per half-move against 596) and its games run to the cap more often (14 of 20 against 6), so a match costs 45% more.
- **Information on the board is what works** (P321): legal moves and loose pieces together cut the ACPL from 91 to 54 (p = 0.014 against default, 0.003 against no brain) and the queen blunders from 2.5 to 0.5 per game. The legal list alone gives 77 (p = 0.34).
- **Without the legal list most blunders go unpunished** (P322): in 55-59% of the blunders the reply blunders back (loss 300+), so a game is a random walk of hanging pieces; with the list 28-34%.
- **The coach helps only where the seat can act on it** (P323): without the lists its review does not help (104 against 91, p = 0.35); with them ACPL 40 against 54 (p = 0.018; **changed with the new engine**: Stockfish had 78 against 92, p = 0.12) and blunders 4.1 against 7.0 per 100 moves, the best Haiku arm of the series, and almost every blunder was punished (1 of 32 left standing, against 18 of 65). The review names missed free captures, and 14 of 24 brains after a review quote a reviewed move or the coach (8 of 24 without the lists). Four seeds: a strong hint, not yet proof.
- All resignations in runs 013-044 but one were justified (the engine at -300 or worse for the resigner); A01 resigned game 1 of 022 at -73. The best and worst matches of one arm differ by 11 to 73 ACPL (40 or more in every arm without both lists), so a single four-game match says little.

### Sonnet and Opus (seed 41, one match each)

| Model, arm | Run | ACPL | ACPL by game | Blunders per 100 moves | Queen blunders | Games at the cap | Refused per 100 half-moves | Cost | Cost per 100 half-moves |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Haiku, default | 013 | 69 | 151, 44, 15, 65 | 9.5 | 6 | 3 | 3.2 | 0.32 USD | 0.10 USD |
| Haiku, `-moves-threats` | 015 | 41 | 60, 40, 25, 38 | 3.8 | 1 | 0 | 1.3 | 0.24 USD | 0.10 USD |
| Sonnet, default | 041 | 22 | 40, 20, 12, 14 | 1.3 | 0 | 4 | 2.5 | 3.37 USD | 1.05 USD |
| Sonnet, `-moves-threats` | 042 | 28 | 32, 37, 30, 13 | 1.6 | 1 | 4 | 0.0 | 3.53 USD | 1.10 USD |
| Opus, default | 043 | 26 | 47, 28, 15, 16 | 2.0 | 2 | 3 | 2.3 | 5.93 USD | 1.94 USD |
| Opus, `-moves-threats` | 044 | 44 | 39, 99, 13, 27 | 4.4 | 4 | 4 | 0.9 | 6.87 USD | 2.15 USD |

- **Sonnet and Opus play two to four times as well as plain Haiku** (ACPL 22-44 against 69-91), with far fewer blunders (1.3-4.4 against 9.5-11.9 per 100 moves), at 10 to 20 times the cost per half-move (P326). **Haiku with the lists and the coach (40) reaches the level of Opus with the lists (44) at 4-8% of the cost per half-move, but not that of Sonnet (22-28) or of Opus without the lists (26)** (**changed with the new engine**: with Stockfish it reached the level of all four, 78 against 55-81).
- **The lists do not help the stronger models** (Sonnet 28 against 22, Opus 44 against 26; one match each): they read the board themselves. Opus still left a queen hanging with the loose-piece list on the board, and the reply missed it (044 game 2: 29. Qb4?? Qf6??).
- **15 of the 16 games ran to the 80-half-move cap** (P328): strong models do not lose quickly, so the cap's material verdict decides their results. **Sonnet found the cap's blind spot** (LH17): on the 80th half-move it promoted d1=Q+ into a recapture that would never come and turned a 7-6 draw into a win (042 game 4); Opus planned the same grab in words (043).
- `--budget` was ignored by core stories (P327, fixed in this PR): the Opus runs cost 5.93 and 6.87 USD against caps of 6 and 4. A first Opus run of the default arm was stopped after its first requests (under 0.2 USD) and its directory deleted before it was recorded; run 043 replaced it.

Costs of this round: Haiku 2026-11-07 (013-024) 2.32 USD, Haiku 2026-11-11 (025-040) 3.62 USD, Sonnet and Opus 19.70 USD, reporter drafts about 0.15 USD (OpenRouter).

## Runtime r2, a fresh context and a compact board (2026-11-12)

Haiku, four-game matches at cap 80 half-moves, runtime r2 (P329: a played move no longer wakes the seat to answer it). Engine numbers as above (Garbochess-JS at depth 10). The r1 rows are the default arm of the five-seed table, same seeds; r1 and r2 are not the same runtime, so read the direction.

| Arm | Runs | Seeds | ACPL by seed | Mean ACPL | Requests per half-move | Output tokens per half-move | Context, mean | USD per 100 half-moves |
|---|---|---|---|---:|---:|---:|---:|---:|
| default, r1 | 013, 017, 025, 029 | 41, 43, 47, 53 | 69, 109, 71, 101 | 88 | 1.41-1.48 | 620-870 | 26-34k | 0.087-0.112 |
| default, r2 | 045 | 41 | 111 | 111 | 1.13 | 621 | 24k | 0.074 |
| `-compact` | 047 | 41 | 113 | 113 | 1.16 | 675 | 18k | 0.068 |
| `-fresh` | 046 | 41 | 99 | 99 | 1.19 | 1,620 | 2.9k | 0.108 |
| `-fresh -compact` | 048-051 | 41, 43, 47, 53 | 57, 131, 63, 93 | **86** | 1.18-1.22 | 1,585-1,693 | 2.7-2.8k | 0.104-0.109 |

- **The r2 fix works** (P329): 1.13 requests per half-move against 1.48, a quarter cheaper per half-move on the same seed.
- **A fresh context does not save money with Haiku** (P340): the context falls from 24-34k to under 3k tokens, but the model thinks 2.3 times as long without its earlier thoughts, and output costs 50 times a cached input token. For Opus, whose output is already 36-42% of its cost, `-fresh` would likely cost more, not less.
- **Play is no better with `-fresh -compact`** (**changed with the new engine**): ACPL 86 against 88 on the same four seeds (paired difference 2, SE about 8; Stockfish had 119 against 135, paired difference 16, SE about 9, which was read as a little better). The compact board alone does nothing (113 against 111, P341).

Cost of this round: 1.94 USD (Haiku) plus about 0.04 USD for the reporter drafts (OpenRouter).

## Thinking low, and a first Sonnet match on a fresh context (2026-11-13)

Runtime r2. Haiku `-fresh -compact` at cap 80 with `--thinking low` on the four seeds of 048-051, and one Sonnet match `-fresh -compact -settle` at cap 160 on seed 41 as a test before Opus.

| Arm | Runs | Seeds | ACPL by seed | Mean ACPL | Output tokens per half-move | Context, mean | USD per 100 half-moves |
|---|---|---|---|---:|---:|---:|---:|
| Haiku `-fresh -compact`, medium | 048-051 | 41, 43, 47, 53 | 57, 131, 63, 93 | 86 | 1,585-1,693 | 2.7-2.8k | 0.104-0.109 |
| Haiku `-fresh -compact`, low | 052-055 | 41, 43, 47, 53 | 127, 112, 138, 140 | **129** | 977-1,030 | 2.6k | 0.071-0.074 |
| Sonnet default, cap 80, r1 | 041 | 41 | 22 | 22 | 373 | 25k | 1.05 |
| Sonnet `-fresh -compact -settle`, cap 160 | 056 | 41 | 43 | 43 | 394 | 2.5k | 0.81 |
| Sonnet `-compact -settle`, cap 160, context kept | 057 | 41 | 64 | 64 | 325 | 20.5k | 0.74 |

- **Thinking low is cheaper and plays worse** (P342): output down by a third, cost per half-move down by a third, ACPL up by 43 on the same four seeds (worse on three seeds, better by 19 on seed 43). Keep medium for chess.
- **Sonnet does not think longer on a fresh context** (P343), unlike Haiku: 394 against 373 output tokens per half-move. Against the fair baseline (057: same cap, same seed, context kept) it plays no worse: ACPL 43 against 64, 4.3 against 8.0 blunders per 100 moves. The ACPL of 22 in 041 came from games cut at move 40, middlegame only. But `-fresh` is not cheaper either: 0.81 against 0.74 USD per 100 half-moves, because of the cache writes.
- **Half of the fresh-context cost is cache writes** (P344): the position is written to the cache on every half-move and never read again.
- **160 half-moves is enough for Sonnet here** (P328): no game reached the cap, so `-settle` was not used.

Cost of this round: 0.82 USD (Haiku) plus 2.81 USD (056) plus 3.05 USD (057) plus about 0.05 USD for the reporter drafts.
