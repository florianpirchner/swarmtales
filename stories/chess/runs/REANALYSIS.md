# Re-analysis of the chess runs with the new reference engine

On 2026-11-14 the reference engine of the chess lab was changed from Stockfish 10 (`stockfish.js`, GPL-3.0) to
Garbochess-JS (`BSD-3-Clause`, one unmodified file under [`third_party/garbochess/`](../../../third_party/garbochess/)),
because the project takes no GPL and no other copyleft code. Centipawn loss is a distance on one engine's scale at
one depth, so every recorded game was scored again. This file is the record of that: what was run, the acceptance
gate, and the numbers before and after. The decision and the gate are specified in
[`docs/refactoring-before-release/06-chess-engine.md`](../../../docs/refactoring-before-release/06-chess-engine.md)
(sections 4 and 5).

## What was run

- **Input:** `run/events.jsonl` of all 57 run folders (the `move_played` events); nothing else. No model call, no money.
- **Old files, kept as measured:** `run/analysis.stockfish10.json` and `run/ANALYSIS.stockfish10.md` (Stockfish 10 at
  depth 14; renamed, not changed). They are numbers this project produced, not GPL material.
- **New files:** `run/analysis.json` and `run/ANALYSIS.md`, written by `pnpm lab:chess <run>/run` with Garbochess-JS at
  commit `4ff0f9e49a0041545b645e25d3d2da7af3b36a90` (SHA-256
  `b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c`). The header of every `analysis.json` names the
  engine, the commit, the hash and the depth.
- **This comparison:** `pnpm lab:chess:gate` (`lab/chess-reanalysis.ts`) reads both files of every run and rewrites
  the block between the markers below. It calls no engine.

## Depth and time

**Depth 10**, the default of the paper, was kept after the one calibration it allows ("if the median time per
position is above 1 s, the default goes to 9").

| Measurement | Positions | Depth | Median | 90th percentile | Maximum | Projected for all 13,933 positions |
|---|---:|---:|---:|---:|---:|---:|
| wall time, every 140th recorded position | 100 | 6 | 78 ms | 182 ms | 1.5 s | 0.4 h |
| wall time, the same sample | 100 | 7 | 117 ms | 336 ms | 0.9 s | 0.6 h |
| wall time, the same sample | 100 | 8 | 249 ms | 646 ms | 1.8 s | 1.4 h |
| wall time, the same sample | 100 | 9 | 453 ms | 1.2 s | 2.3 s | 2.3 h |
| wall time, the same sample | 100 | 10 | 806 ms | 2.8 s | 5.0 s | 4.7 h |
| **CPU time**, every 70th recorded position | 199 | 10 | **719 ms** | 2.1 s | 4.0 s | **3.8 CPU-hours** |
| the full re-analysis, wall time per search | 13,906 | 10 | 1,097 ms | 3.6 s | 97.6 s | 6.5 h of search time, 3 h 17 min on the clock |

- The machine was shared: 4 cores, a load average of 5 to 13 from other work during every measurement, and the
  re-analysis ran as two processes at `nice 10`. Wall time on it overstates the engine's cost; the CPU-time row is
  the one that does not depend on the neighbours, and it is under one second. **That is a judgement:** the wall
  median of the full run is 1.1 s, and a strict reading of the rule on that number would give depth 9. Depth 9 would
  cost about half (2.3 h projected) and can be run with `pnpm lab:chess <run>/run --depth 9`; the default
  (`DEFAULT_DEPTH` in `lab/chess-engine.ts`) must not be raised after this baseline.
- A search has no time limit (that is what makes it reproducible), so single positions can take long: the slowest
  one took 97.6 s on the loaded machine.
- **Reproducible on this machine:** two runs (005 and 022) were analysed a second time, hours later and under another
  load; `analysis.json` and `ANALYSIS.md` are identical byte for byte. The golden test fixes score, best move and
  node count of 32 positions at depth 6, forward, backward and twice in a row.
- Engine speed in Node 26: about 0.7 million nodes per second on one core, when the file is compiled as one function
  (`lab/chess-engine.ts`). Run as a plain script in a `node:vm` context, as the paper sketched, it is about fifty
  times slower (start position at depth 6: 2.5 s against 0.3 s, the same 38,831 nodes).

## Acceptance gate

<!-- generated:gate -->

Runs compared: 57 (211 games, 13722 half-moves, 13933 positions). New analysis at depth 10; old analysis: Stockfish 10 at depth 14.

| Gate | Rule | Result | Verdict |
|---|---|---|---|
| 1 | every position analysed without an error, every best move legal by chess.js | 0 runs without a new analysis; 0 of 13722 best moves illegal; the recorded moves are the same in both files; 27 of the 211 final positions are mates or draws on the board and were scored without a search, 3 more ended by repetition and were searched (13906 searches) | **pass** |
| 2a | Spearman rank correlation of old and new ACPL per game and side at least 0.9 | 0.959 over 422 game sides | **pass** |
| 2b | order of the arms default, lists, lists and coach in the five-seed table unchanged | old: `-moves-threats-coach` < `-moves-threats` < default; new: `-moves-threats-coach` < `-moves-threats` < default (all six arms, old: `-moves-threats-coach` < `-moves-threats` < `-moves` < default < `-nobrain` < `-coach`; new: `-moves-threats-coach` < `-moves-threats` < `-moves` < default < `-nobrain` < `-coach`) | **pass** |
| 3 | at least 85% of the old blunders (300+) are still mistakes or blunders (100+) | 1475 of 1523 (96.8%); 1294 are still blunders (300+) | **pass** |

**Gate as a whole: passed.**

The other direction, for information: the new engine flags 1374 blunders (300+), of which 1369 (99.6%) were mistakes or blunders (100+) for Stockfish.

### The arms of the five-seed table, before and after

ACPL over every non-forfeit move of the arm; the interval resamples whole matches (10,000 draws, fixed seed).

| Arm | Runs | Games | ACPL old | 95% CI old | ACPL new | 95% CI new | Blunders per 100 moves old | new | Missed mates old | new |
|---|---|---:|---:|---|---:|---|---:|---:|---:|---:|
| default | 008, 013, 017, 025, 029 | 20 | 138 | 125-149 | 91 | 76-105 | 12.8 | 11.9 | 5 | 5 |
| `-nobrain` | 011, 016, 020, 028, 032 | 20 | 138 | 118-165 | 101 | 84-127 | 14.7 | 13.8 | 10 | 11 |
| `-coach` | 033, 035, 037, 039 | 16 | 140 | 105-165 | 104 | 73-126 | 13.5 | 12.9 | 10 | 12 |
| `-moves` | 009, 014, 018, 026, 030 | 20 | 115 | 96-132 | 77 | 60-95 | 9.5 | 8.2 | 6 | 8 |
| `-moves-threats` | 015, 019, 027, 031 | 16 | 92 | 77-108 | 54 | 45-65 | 8.1 | 7.0 | 2 | 2 |
| `-moves-threats-coach` | 034, 036, 038, 040 | 16 | 78 | 71-84 | 40 | 35-44 | 4.8 | 4.1 | 1 | 1 |

### Every run, before and after

| Run | Half-moves counted | ACPL old | ACPL new | Blunders old | Blunders new | Missed mates old | Missed mates new |
|---|---:|---:|---:|---:|---:|---:|---:|
| chess-02a-001-smoke | 158 | 135 | 90 | 12 | 12 | 2 | 2 |
| chess-02a-002-default-s31 | 116 | 211 | 158 | 23 | 23 | 0 | 0 |
| chess-02a-003-moves-s29 | 123 | 83 | 50 | 7 | 6 | 0 | 0 |
| chess-02a-004-moves-s31 | 99 | 77 | 46 | 5 | 5 | 0 | 0 |
| chess-02a-005-nobrain-s29 | 77 | 138 | 109 | 14 | 14 | 0 | 0 |
| chess-02a-006-nobrain-s31 | 87 | 149 | 95 | 10 | 8 | 0 | 0 |
| chess-02a-008-default-g4-s37 | 298 | 148 | 101 | 46 | 41 | 1 | 1 |
| chess-02a-009-moves-g4-s37 | 219 | 86 | 55 | 13 | 11 | 0 | 0 |
| chess-02a-010-threats-g4-s37 | 249 | 109 | 55 | 23 | 14 | 0 | 0 |
| chess-02a-011-nobrain-g4-s37 | 272 | 191 | 151 | 60 | 56 | 1 | 1 |
| chess-02a-013-default-g4-s41 | 317 | 124 | 69 | 31 | 30 | 0 | 0 |
| chess-02a-014-moves-g4-s41 | 201 | 140 | 88 | 28 | 21 | 0 | 0 |
| chess-02a-015-moves-threats-g4-s41 | 238 | 78 | 41 | 12 | 9 | 0 | 0 |
| chess-02a-016-nobrain-g4-s41 | 276 | 111 | 84 | 33 | 30 | 5 | 6 |
| chess-02a-017-default-g4-s43 | 320 | 157 | 109 | 49 | 42 | 1 | 1 |
| chess-02a-018-moves-g4-s43 | 204 | 108 | 71 | 17 | 15 | 3 | 3 |
| chess-02a-019-moves-threats-g4-s43 | 164 | 111 | 64 | 14 | 10 | 0 | 0 |
| chess-02a-020-nobrain-g4-s43 | 280 | 125 | 83 | 35 | 35 | 2 | 2 |
| chess-02a-021-default-g4-s47-stopped | 127 | 98 | 53 | 8 | 8 | 0 | 0 |
| chess-02a-022-moves-g4-s47-stopped | 129 | 58 | 29 | 3 | 4 | 0 | 0 |
| chess-02a-023-moves-threats-g4-s47-stopped | 123 | 108 | 69 | 13 | 12 | 3 | 3 |
| chess-02a-024-nobrain-g4-s47-stopped | 141 | 140 | 92 | 14 | 8 | 2 | 2 |
| chess-02a-025-default-g4-s47 | 271 | 121 | 71 | 25 | 26 | 2 | 2 |
| chess-02a-026-moves-g4-s47 | 257 | 135 | 106 | 33 | 32 | 2 | 4 |
| chess-02a-027-moves-threats-g4-s47 | 270 | 106 | 66 | 31 | 26 | 2 | 2 |
| chess-02a-028-nobrain-g4-s47 | 265 | 139 | 99 | 40 | 37 | 0 | 0 |
| chess-02a-029-default-g4-s53 | 304 | 137 | 101 | 42 | 41 | 1 | 1 |
| chess-02a-030-moves-g4-s53 | 206 | 102 | 60 | 12 | 10 | 1 | 1 |
| chess-02a-031-moves-threats-g4-s53 | 259 | 77 | 49 | 18 | 20 | 0 | 0 |
| chess-02a-032-nobrain-g4-s53 | 223 | 124 | 87 | 25 | 23 | 2 | 2 |
| chess-02a-033-coach-g4-s41 | 284 | 171 | 131 | 48 | 46 | 1 | 1 |
| chess-02a-034-moves-threats-coach-g4-s41 | 160 | 85 | 43 | 5 | 5 | 0 | 0 |
| chess-02a-035-coach-g4-s43 | 265 | 146 | 122 | 33 | 37 | 7 | 9 |
| chess-02a-036-moves-threats-coach-g4-s43 | 231 | 84 | 40 | 11 | 10 | 1 | 1 |
| chess-02a-037-coach-g4-s47 | 278 | 87 | 58 | 18 | 18 | 0 | 0 |
| chess-02a-038-moves-threats-coach-g4-s47 | 206 | 73 | 44 | 12 | 11 | 0 | 0 |
| chess-02a-039-coach-g4-s53 | 282 | 157 | 106 | 51 | 42 | 2 | 2 |
| chess-02a-040-moves-threats-coach-g4-s53 | 175 | 68 | 33 | 9 | 6 | 0 | 0 |
| chess-02a-041-default-g4-s41-sonnet | 320 | 63 | 22 | 6 | 4 | 0 | 0 |
| chess-02a-042-moves-threats-g4-s41-sonnet | 320 | 69 | 28 | 9 | 5 | 0 | 0 |
| chess-02a-043-default-g4-s41-opus | 306 | 55 | 26 | 10 | 6 | 0 | 0 |
| chess-02a-044-moves-threats-g4-s41-opus | 320 | 81 | 44 | 18 | 14 | 0 | 0 |
| chess-02a-045-default-g4-s41-r2 | 286 | 151 | 111 | 45 | 41 | 0 | 0 |
| chess-02a-046-fresh-g4-s41-r2 | 261 | 132 | 99 | 29 | 26 | 2 | 2 |
| chess-02a-047-compact-g4-s41-r2 | 243 | 153 | 113 | 44 | 44 | 0 | 1 |
| chess-02a-048-fresh-compact-g4-s41-r2 | 283 | 87 | 57 | 22 | 21 | 2 | 4 |
| chess-02a-049-fresh-compact-g4-s43-r2 | 301 | 162 | 131 | 45 | 39 | 6 | 7 |
| chess-02a-050-fresh-compact-g4-s47-r2 | 319 | 96 | 63 | 28 | 23 | 0 | 0 |
| chess-02a-051-fresh-compact-g4-s53-r2 | 299 | 129 | 93 | 36 | 28 | 0 | 0 |
| chess-02a-052-fresh-compact-low-g4-s41-r2 | 239 | 164 | 127 | 44 | 41 | 1 | 2 |
| chess-02a-053-fresh-compact-low-g4-s43-r2 | 296 | 157 | 112 | 60 | 53 | 0 | 0 |
| chess-02a-054-fresh-compact-low-g4-s47-r2 | 292 | 174 | 138 | 61 | 57 | 0 | 0 |
| chess-02a-055-fresh-compact-low-g4-s53-r2 | 293 | 185 | 140 | 69 | 65 | 7 | 7 |
| chess-02a-056-fresh-compact-settle-g4-s41-sonnet-r2 | 349 | 88 | 43 | 26 | 15 | 2 | 2 |
| chess-02a-057-compact-settle-g4-s41-sonnet-r2 | 415 | 97 | 64 | 37 | 33 | 1 | 1 |
| chess-04a-007-teams-s29 | 160 | 98 | 95 | 14 | 19 | 2 | 3 |
| chess-04a-012-moves-teams-g4-s37 | 264 | 133 | 89 | 37 | 36 | 2 | 2 |

<!-- /generated:gate -->

## Reading the result

- **The gate passed**, with room: rank correlation 0.959 (needed 0.9), 96.8% of the old blunders still flagged
  (needed 85%), every best move legal, the order of all six arms unchanged.
- **The scale moved.** The new engine's ACPL is lower in every arm and in every run (default arm 91, before 138; the
  best arm 40, before 78). It searches less deep and its evaluation is simpler, so it does not see the small losses
  that Stockfish saw; the blunders, which carry the metric, it sees almost all (1,294 of 1,523 are still 300+, 1,475
  still 100+, and 99.6% of its own blunders were mistakes or blunders for Stockfish). **Old and new numbers must not
  be compared or mixed**; [README.md](README.md) shows the new ones only.
- **Five statements of the runs index changed**, and are marked there: the coach on top of the lists is now a
  nominally significant gain (p = 0.018, before 0.12); `-fresh -compact` is no longer better than the default
  (86 against 88, before 119 against 135); the legal list and the loose-piece list are level on seed 37 (55 each,
  before 86 against 109); Haiku with lists and coach (40) reaches Opus with the lists (44) but not Sonnet (22-28);
  teams without the list have a lower ACPL than solo seats but hardly fewer blunders. The main findings stand: no
  brain effect that the sample can show (p = 0.49), the two lists together are what works (p = 0.014 and 0.003),
  thinking low plays worse (129 against 86).
- **Missed mates** are close but not the same: 77 over all runs, before 66. In no run the new engine counts fewer,
  and in none more than 2 above the old count: at depth 10 it reports some forced mates that Stockfish's last
  iteration at depth 14 did not report as a mate score.
- **A baseline for the rewrite.** Row 5 of the baseline table in
  [`02-experiment-science.md`](../../../docs/refactoring-before-release/02-experiment-science.md) was measured with
  Stockfish (default 138, lists 92, lists and coach 78; band "default 115-160; lists at least 23 lower"). Measured
  with the new engine the same matches give **default 91 (95% CI 76-105), lists 54 (45-65), lists and coach 40
  (35-44)**; the difference default minus lists is 37. That file was not edited here; a new band is a decision of
  the experiment paper's owner (a proposal: default 75-105, lists at least 20 lower).

## Not verified

- **A second machine.** The paper asks for the full re-analysis on two machines (Linux x64 and macOS arm64) with a
  byte-for-byte comparison. Only one machine was available (Linux x64, Node 26). What was checked instead is listed
  under "Depth and time". The golden test with node counts (`test/stories/chess-engine.test.ts`) is the check that
  runs on every other machine.
- **The engine's strength.** No rating was measured. The gate compares it with Stockfish 10 on these games only.
