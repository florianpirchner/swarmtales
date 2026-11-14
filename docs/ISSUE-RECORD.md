# Issue record

One row per merged issue: what the work cost. The budget of milestones M0 to M2 and the kill criterion are counted
from this table (decision D4 in [`refactoring-before-release/DECISIONS.md`](refactoring-before-release/DECISIONS.md)).
Work without a row is not allowed.

## Budget for M0 to M2

| | Budget | Kill criterion fires above |
|---|---|---|
| Issues (M0 14, M1 37, M2 25; decisions A4 and A12) | 76 | 150 |
| Agent tokens, all kinds, cache reads included | 300 million | 600 million |
| Agent cost, where sessions are billed per token | 750 USD | 1500 USD |
| Live model spend | 10 USD | not a kill number; a run stops at its own budget |

The token budget assumes 6 million tokens per issue (builder 3.5, challenger 1.5, rework 1.0). After the first ten
merged issues the median of their recorded tokens replaces that number once; the rule is in D4, and the
recalibration is recorded in an issue.

## How to fill a row

- **A row** is one issue: the squash commit on `develop` whose subject starts with the issue id (decision A3), in
  merge order. A later commit with the same id is folded into the row of its issue or, from row 85 on, gets a row
  of its own that names the row of its issue. A review, a specification and a
  commit of the integrator without an id get a row of their own, so that every commit on `develop` is in the table.
- **Tokens (total)** come from the usage report of the sessions that worked on the issue (builder, challenger,
  rework), in millions with two decimals. Where a session reports the four kinds (input, output, cache read, cache
  write), name them in the note. Write "not recorded" only when no session report carries the issue, and say so in
  the note.
- **Wall time** is from the first commit of the issue's branch to the merge commit on `develop`, in hours; a dash
  where the branch does not give it. **Agent time** is the duration the sessions reported, summed, in hours.
- **Changed lines:** "Lines" is `git show --shortstat` of the commits, everything included. "Source", "Tests" and
  "Other" are added plus removed lines without generated and carried files: the API reports (`*.api.md`),
  `pnpm-lock.yaml`, `THIRD-PARTY-LICENSES.md`, the oracle files (`oracles/`) and the carried prompt files
  (`library/prompts/`, `mechanics/*/prompts/`). "Tests" are `*.test.ts` files and files under `test/`, "Source" the
  other script files, "Other" docs, configuration and data. The issue rule is at most 400 hand-written lines of
  source plus tests.
- **Cost** in USD, where the session is billed per token; otherwise a dash.

## Record

What the numbers of this table can and cannot say:

- **Tokens have no split.** A session report gives one total (all kinds summed as the session reported them), its
  tool uses and its duration; it gives no split into input, output, cache read and cache write. The table has one
  "Tokens (total)" column for that reason.
- **The integrator's own tokens are in no row:** merges, checks, briefs for builders, the fixes after a review and
  the commits without an issue id were made in the integrator's session, which has no report here.
- **A session is matched to a row by its name** ("Build M1-35 tic-tac-toe port" is M1-35). The sessions that match
  no row are listed under "Sessions without a row".
- **Wall time is short where a branch has one commit:** it then measures the wait for the merge, not the build. The
  agent time is the better number for the build.
- **The line columns are an upper bound of hand-written lines:** source that was carried from the old platform (the
  viewer, the ported mechanics, the chain) is not told apart from new source.
- **Cost is a dash in every row:** the sessions are not billed per token.

All merges are of 2026-11-14; the times are UTC. The table is complete up to commit `e1b77c2` of `rewrite/develop`
(M3-31); the rows 85 to 129 were written from the history by issue M3-31, the rows 130 to 132 by issue M2-27, whose
own commit has no row yet (owed, as the row of M3-31 was).

| # | Issue | Title | Milestone | Commit | Merged | Tokens (total, M) | Cost (USD) | Wall time (h) | Agent time (h) | Lines | Source | Tests | Other | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | M0 root | Root of the rewritten platform: frame, gates and plan (issues 6 to 13 and 15 of `REWRITE.md` section 8, the empty packages of M1-00) | M0 | `89927a0` | 06:54 | 0.64 | - | - | 1.11 | +19302 -0 | 2574 | 1217 | 11558 | builder and challenger session; 24 working commits squashed |
| 2 | M1-03 | Contracts 3: run manifest | M1 | `ba283f8` | 07:05 | 0.10 | - | 0.09 | 0.13 | +321 -2 | 193 | 130 | 0 | one session |
| 3 | M1-01 | Contracts 1: kernel-facing types | M1 | `55d0049` | 07:09 | 0.16 | - | 0.10 | 0.18 | +1352 -2 | 1065 | 289 | 0 | one session |
| 4 | M1-02 | Contracts 2: game definition, prompt lookup, SwtError | M1 | `b9ad0ac` | 07:09 | 0.12 | - | 0.15 | 0.19 | +501 -2 | 288 | 215 | 0 | one session |
| 5 | M1-00 | Lint: a file in a package's test folder counts as a test for the exception rule | M1 | `37faae2` `7b9fd40` | 07:10 | not recorded | - | - | not recorded | +9 -2 | 5 | 0 | 6 | no session report carries this id; 2 commits |
| 6 | M1-04 | Carry: chain with genesis version 2, prompts, core replies | M1 | `e3be578` `3bf822a` | 07:14 | 0.23 | - | 0.11 | 0.25 | +3112 -10 | 1186 | 907 | 57 | one session; 2 commits |
| 7 | M0 oracles | Oracle files of the old platform for all fifteen games (issues 1 and 2) | M0 | `77e1e51` | 07:22 | 0.49 | - | - | 1.57 | +86961 -0 | 1 | 0 | 0 | builder and challenger session |
| 8 | M1-09 | engine: turns options and input arrangement | M1 | `3c02b4b` | 07:24 | 0.10 | - | 0.05 | 0.08 | +251 -0 | 104 | 147 | 0 | one session |
| 9 | M1-08 | sdk base: definers, error catalogue, load order | M1 | `8d14591` | 07:28 | 0.17 | - | 0.06 | 0.13 | +987 -0 | 581 | 190 | 0 | one session |
| 10 | M1-06 | Kernel base: part interfaces, random, revision, errors | M1 | `9d3ba51` | 07:30 | 0.18 | - | 0.09 | 0.17 | +685 -2 | 545 | 125 | 0 | one session |
| 11 | M1-05 | Contracts 4: schemas, kernel events, log checks | M1 | `1ee7a9f` | 07:35 | 0.14 | - | 0.16 | 0.23 | +806 -0 | 323 | 310 | 0 | one session |
| 12 | M1-20 | engine: turns | M1 | `f06391c` | 07:36 | 0.14 | - | 0.07 | 0.16 | +451 -4 | 169 | 245 | 0 | one session |
| 13 | M1-23 | Port 1: contract and rules files | M1 | `77919ef` | 07:40 | 0.14 | - | 0.07 | 0.14 | +664 -10 | 486 | 117 | 8 | one session |
| 14 | M1-07 | sdk types: mechanic types, context types, seams, game types | M1 | `1e9d78f` | 07:41 | 0.31 | - | 0.14 | 0.33 | +1749 -2 | 863 | 475 | 0 | one session |
| 15 | M1 wave 1 review | chain hardening, seed bound, prompt errors, errata | M1 | `fffebe4` | 07:45 | 0.29 | - | 0.29 | 0.40 | +1349 -167 | 436 | 981 | 91 | challenger session |
| 16 | M1-21 | engine: manifest builder | M1 | `3394b93` | 07:57 | 0.11 | - | 0.10 | 0.13 | +298 -2 | 133 | 150 | 0 | one session |
| 17 | M1-10 | Kernel: log, clock | M1 | `b837c64` | 08:00 | 0.12 | - | 0.14 | 0.17 | +460 -0 | 208 | 252 | 0 | one session |
| 18 | M1-11 | Kernel: actors, access, steps | M1 | `ce23cf4` | 08:02 | 0.12 | - | 0.17 | 0.21 | +503 -0 | 223 | 280 | 0 | one session |
| 19 | M1-15 | Kernel: lifecycle | M1 | `1c83839` | 08:04 | 0.13 | - | 0.19 | 0.25 | +432 -0 | 198 | 234 | 0 | one session |
| 20 | M1-14 | Kernel: slices, scheduler port | M1 | `c88186a` | 08:06 | 0.16 | - | 0.20 | 0.29 | +546 -0 | 240 | 306 | 0 | one session |
| 21 | M1-24 | CLI 1: game files and the installed table | M1 | `bd10e71` | 08:10 | 0.14 | - | 0.26 | 0.60 | +480 -3 | 325 | 156 | 2 | one session |
| 22 | M1-22 | runlog: sink, chain writer, folder, verify | M1 | `0bb9e71` | 08:24 | 0.16 | - | 0.49 | 0.38 | +712 -3 | 434 | 192 | 12 | one session |
| 23 | M1 wave 2 review | turns proofs, sdk codes M012 M014 M023, closed payloads, errata | M1 | `b02b806` | 08:25 | 0.28 | - | 0.57 | 0.57 | +269 -44 | 98 | 134 | 49 | challenger session |
| 24 | M1-12 | Kernel: dispatch | M1 | `81a8ff2` | 08:26 | 0.14 | - | 0.52 | 0.59 | +445 -0 | 181 | 264 | 0 | one session |
| 25 | M1-13 | Kernel: services, plugin port, loader, order | M1 | `9025781` | 08:27 | 0.15 | - | 0.51 | 0.51 | +528 -0 | 245 | 283 | 0 | one session |
| 26 | M1-16 | sdk: contexts, hooks, stage handlers, arguments | M1 | `ef2f3d6` | 08:28 | 0.18 | - | 0.49 | 0.54 | +683 -0 | 342 | 315 | 0 | one session |
| 27 | M1-17 | sdk: kit | M1 | `8492a8e` | 08:28 | 0.17 | - | 0.37 | 0.47 | +443 -0 | 196 | 237 | 0 | one session |
| 28 | M1-18 | sdk: defineGame, grants, tool names | M1 | `ba68369` | 08:29 | 0.14 | - | 0.41 | 0.45 | +622 -0 | 296 | 261 | 0 | one session |
| 29 | M1-19 | sdk: game validation, roster | M1 | `f3c18ae` | 08:30 | 0.16 | - | 0.58 | 0.60 | +635 -0 | 312 | 237 | 0 | one session |
| 30 | M0 spike paper | The mechanic spike paper (issue 14 of `REWRITE.md` section 8, decision A8) | M0 | `d5c3135` | 08:32 | 0.34 | - | - | 1.58 | +586 -0 | 0 | 0 | 586 | one session |
| 31 | M1-26 | sdk: defineMechanic | M1 | `0bd85d5` | 08:45 | 0.16 | - | 0.08 | 0.16 | +516 -0 | 285 | 221 | 0 | one session |
| 32 | M1-27 | sdk: resolveGame, texts | M1 | `2c3ac5d` | 08:48 | 0.16 | - | 0.12 | 0.21 | +537 -0 | 300 | 209 | 0 | one session |
| 33 | M1-25 | Kernel: assembly and budgets | M1 | `dc457d6` | 08:51 | 0.20 | - | 0.10 | 0.27 | +493 -4 | 221 | 269 | 0 | one session |
| 34 | M1 wave 3 review | port throws fail the run, one run_ended, tool in listener frames, errata | M1 | `3045ceb` | 08:58 | 0.30 | - | 0.27 | 0.35 | +603 -27 | 81 | 512 | 37 | challenger session |
| 35 | M1-37 | Catalogue codes and checks that wave 3 left as stand-ins | M1 | `a6f69dc` | 08:59 | 0.17 | - | 0.12 | 0.31 | +323 -110 | 254 | 114 | 27 | follow-up; one session |
| 36 | - | M1 kernel budget: the interim gate covers the fixes of the wave 3 review until M1-38 | M1 | `41c93a5` | 09:02 | not recorded | - | - | not recorded | +2 -2 | 0 | 4 | 0 | integrator's commit, no issue id |
| 37 | M1-28 | Viewer: carry, envelope reader | M1 | `35ee617` | 09:08 | 0.06 | - | 0.11 | 0.54 | +6971 -27 | 4818 | 872 | 385 | one session; the viewer source is carried and is inside the line columns |
| 38 | M1-29 | testkit: drivers, play, testKernel | M1 | `b884419` | 09:22 | 0.17 | - | 0.10 | 0.19 | +557 -1 | 290 | 193 | 0 | one session |
| 39 | M1-38 | Kernel: budget of 1380 lines and the open points of the kernel review | M1 | `bc7579f` | 09:30 | 0.19 | - | 0.11 | 0.36 | +514 -483 | 570 | 399 | 28 | follow-up; one session |
| 40 | M2 specification | M2 build specification, challenged; decisions A12 to A15 | M2 | `84c7ed1` | 09:31 | 0.45 | - | 0.56 | 0.72 | +1495 -0 | 0 | 0 | 1495 | author and challenger session |
| 41 | M1-30 | testkit: fixture mechanic, conformance | M1 | `d75c52d` | 09:37 | 0.15 | - | 0.14 | 0.19 | +445 -1 | 206 | 187 | 0 | one session |
| 42 | M1-31 | testkit: oracle runner | M1 | `f92ef22` | 09:42 | 0.19 | - | 0.13 | 0.28 | +949 -3 | 576 | 182 | 0 | one session |
| 43 | M1-32 | Port 2: team-channel, consensus | M1 | `a26f081` `68b2304` | 09:47 | 0.24 | - | 0.21 | 0.38 | +1254 -6 | 558 | 529 | 4 | one session; 2 commits |
| 44 | M2-00 | Scaffold of M2 | M2 | `cf9d2cc` | 09:56 | 0.16 | - | 0.13 | 0.19 | +1674 -23 | 128 | 59 | 473 | one session |
| 45 | M2-01 | Redaction (blocker) | M2 | `cdc5f73` | 09:58 | 0.11 | - | 0.23 | 0.25 | +325 -12 | 128 | 193 | 0 | one session |
| 46 | - | Docs: resume note of the rewrite | - | `10dd4d9` | 09:58 | not recorded | - | - | not recorded | +33 -0 | 0 | 0 | 33 | integrator's commit, no issue id |
| 47 | - | Layer check: a mechanic's test may import another mechanic whole (decision A16) | - | `758fce4` | 10:09 | not recorded | - | - | not recorded | +5 -2 | 3 | 0 | 4 | integrator's commit, no issue id |
| 48 | M1-34 | CLI 2: swt run --fake, --seed, swt log verify | M1 | `ddd92e5` | 10:10 | 0.16 | - | 0.38 | 0.33 | +494 -0 | 325 | 162 | 4 | one session |
| 49 | M1-33 | Port 3: grid-game, optimal-referee, strategy-brain | M1 | `64eaafd` | 10:11 | 0.31 | - | 0.67 | 0.77 | +2278 -9 | 1231 | 823 | 6 | one session |
| 50 | - | Resume note: old state frozen, tag still owed, M1 state | - | `0b65186` | 10:33 | not recorded | - | - | not recorded | +18 -16 | 0 | 0 | 34 | integrator's commit, no issue id |
| 51 | M1-35 | Port 4: tic-tac-toe teams and its oracle files | M1 | `4770f55` | 10:48 | 0.23 | - | 0.26 | 0.28 | +806 -40 | 269 | 514 | 57 | one session |
| 52 | M1-39 | oracle runner: options as written, pending replay driver; all nine tic-tac-toe oracle files match at level 3 | M1 | `129ce51` | 10:53 | not recorded | - | - | not recorded | +36 -60 | 35 | 57 | 2 | follow-up; no session report carries this id |
| 53 | M1-36 | Hello Game: toAct, sample, sample 1 | M1 | `79a24c9` | 11:03 | 0.15 | - | 0.08 | 0.14 | +151 -6 | 24 | 88 | 45 | one session |
| 54 | - | README status: two games play with a scripted player | - | `b4c3959` | 11:07 | not recorded | - | - | not recorded | +2 -2 | 0 | 0 | 4 | integrator's commit, no issue id |
| 55 | M1 milestone review | sdk input checks, seed bounds, verify of game and text files, four open findings held as failing tests | M1 | `3cf4df0` | 11:26 | 0.30 | - | 0.15 | 0.29 | +164 -18 | 56 | 126 | 0 | challenger session |
| 56 | M1-40 | The four open findings of the M1 review: roster as provider, briefings verified, oracle options with defaults, SWT-C010 | M1 | `c2ddb66` | 11:40 | 0.16 | - | 0.21 | 0.22 | +200 -75 | 180 | 75 | 11 | follow-up; one session |
| 57 | - | M1 done: the viewer opens a run of the command line; resume note | M1 | `ec4dab5` | 11:44 | not recorded | - | - | not recorded | +48 -10 | 0 | 35 | 23 | integrator's commit, no issue id |
| 58 | M2-02 | Contracts of M2: record source, limits and redact ports, model choice, pricing, metric definition, code letters E and T | M2 | `2348f61` | 11:49 | 0.15 | - | 2.03 | 0.37 | +314 -16 | 141 | 152 | 0 | one session |
| 59 | M2-05 | Kernel: records, external limits, redaction port; kernel 1381 code lines (gate 1420) | M2 | `6e6cee0` | 12:14 | 0.17 | - | 0.26 | 0.28 | +383 -30 | 135 | 275 | 1 | one session |
| 60 | M2-04 | Models base: key broker, X catalogue, resident records; lint runs in two processes | M2 | `9e049ac` | 12:21 | 0.14 | - | 0.44 | 0.43 | +688 -2 | 421 | 200 | 2 | one session |
| 61 | M2-07 | Models: provider adapters, model settings, request limits | M2 | `a4b86d8` | 12:37 | 0.15 | - | 0.19 | 0.25 | +675 -0 | 425 | 145 | 0 | one session |
| 62 | M2-03 | Lab base: experiment, results and noise-floor schemas, E catalogue, the committed rerun plan; decision A17 on the caps | M2 | `8527b6b` | 12:45 | 0.15 | - | 0.42 | 0.43 | +1466 -5 | 486 | 159 | 625 | one session |
| 63 | M2-08 | Models: source with the closed auth context, scripted source, cost meter | M2 | `481c694` `07fecd0` | 12:50 | 0.13 | - | 0.14 | 0.19 | +598 -0 | 322 | 198 | 3 | one session; 2 commits |
| 64 | M2-06 | sdk and engine: game families, metrics on the head, the manifest of a live run | M2 | `f400d4c` | 12:59 | 0.17 | - | 0.12 | 0.21 | +502 -45 | 332 | 158 | 0 | one session |
| 65 | - | Testkit: play takes params, record sources, outside limits and a redaction | - | `38ca40c` | 13:09 | not recorded | - | - | not recorded | +35 -2 | 15 | 22 | 0 | integrator's commit, no issue id |
| 66 | M2-09 | Models: the resident session | M2 | `4ed1f53` | 13:14 | 0.16 | - | 0.27 | 0.21 | +573 -1 | 283 | 236 | 0 | one session |
| 67 | M2-10 | Models: tools notice, system prompt, driver assembly; the resident prompts carried | M2 | `cb26c1c` | 13:28 | 0.17 | - | 0.17 | 0.21 | +546 -1 | 258 | 213 | 0 | one session |
| 68 | M2-11 | Port: draft-rounds | M2 | `1fbf81c` | 13:32 | 0.23 | - | 0.16 | 0.27 | +1506 -4 | 1116 | 272 | 7 | one session |
| 69 | M2-13 | Game: quarry matches its six oracle files at level 3; cut files in the oracle runner | M2 | `4d13dd3` | 13:47 | 0.19 | - | 0.18 | 0.22 | +672 -12 | 152 | 483 | 49 | one session |
| 70 | M2-12 | Port: econ-games | M2 | `a3caf4b` | 13:56 | 0.24 | - | 0.29 | 0.44 | +1699 -4 | 1084 | 218 | 7 | one session |
| 71 | M2-17 | Lab: statistics | M2 | `7978e9a` | 14:01 | 0.11 | - | 0.15 | 0.19 | +522 -0 | 345 | 134 | 0 | one session |
| 72 | M2-14 | Game: econ-lab matches its five oracle files at level 3 | M2 | `9c6ace0` | 14:07 | 0.12 | - | 0.14 | 0.15 | +443 -5 | 145 | 255 | 48 | one session |
| 73 | M2-16 | Lab: facts of a run | M2 | `2d51f75` | 14:21 | 0.12 | - | 0.26 | 0.31 | +431 -0 | 215 | 187 | 0 | one session |
| 74 | - | The lab package may use the testkit in its tests | - | `e562c9b` | 14:21 | not recorded | - | - | not recorded | +7 -0 | 0 | 0 | 3 | integrator's commit, no issue id |
| 75 | M2-15 | Additions: the metrics of three mechanics; quarry and econ-lab as game families | M2 | `419192c` | 14:25 | 0.19 | - | 0.24 | 0.28 | +619 -62 | 285 | 396 | 0 | one session |
| 76 | - | The games quarry and econ-lab declare typebox | - | `a6f8564` | 14:25 | not recorded | - | - | not recorded | +12 -4 | 0 | 0 | 10 | integrator's commit, no issue id |
| 77 | M2-18 | Lab: experiment plan, runner, comparability, analysis | M2 | `79abbb4` | 14:40 | 0.18 | - | 0.19 | 0.29 | +1065 -0 | 637 | 289 | 0 | one session |
| 78 | - | M2 errata F1 to F14 and decision A18 (budget outside the spec hash of an experiment) | M2 | `b2d8559` | 14:40 | not recorded | - | - | not recorded | +23 -1 | 0 | 0 | 24 | integrator's commit, no issue id |
| 79 | M2-20 | CLI 3: the live run; a game family runs from the command line with --set | M2 | `82c286b` | 14:49 | 0.19 | - | 0.34 | 0.28 | +747 -54 | 612 | 182 | 4 | one session |
| 80 | M2-19 | Lab: the run report and the series report | M2 | `021e1d5` | 14:55 | 0.11 | - | 0.17 | 0.22 | +499 -0 | 282 | 202 | 0 | one session |
| 81 | M2-21 | Canary test, leak scan, spend ledger | M2 | `f8acaac` | 15:11 | 0.20 | - | 0.24 | 0.33 | +526 -22 | 281 | 264 | 0 | one session |
| 82 | M2-23 | Mechanic README generator; the READMEs of the seven mechanics | M2 | `bfe388d` | 15:15 | 0.20 | - | 0.19 | 0.31 | +2395 -28 | 630 | 156 | 1637 | one session |
| 83 | M2 review B | the experiment runner holds its cap against a bad cost and an edited state file; analysis, exclusions and report fixes | M2 | `201aefc` | 15:22 | not recorded | - | - | not recorded | +176 -15 | - | - | - | challenger session; the line split is not counted |
| 84 | M2 review A | held keys redacted before patterns, flag values and limit reasons redacted, a model without a price refused before the folder is written | M2 | `0ac3e89` | 15:32 | not recorded | - | - | not recorded | +372 -10 | - | - | - | challenger session; the line split is not counted |
| 85 | - | Docs: issue record, games page, folder READMEs | - | `4a0f90b` | 15:43 | not recorded | - | - | not recorded | +268 -27 | 0 | 0 | 295 | integrator's commit, no issue id |
| 86 | M3 specification | M3 build specification, challenged; decisions A19 to A22; resume note and status lines | M3 | `51dd7cc` | 15:44 | not recorded | - | - | not recorded | +1103 -25 | 0 | 0 | 1128 | specification commit; the usage file ends before its sessions |
| 87 | M2-22 | CLI: swt report and swt experiment; the binding hash leaves budget and concurrency out (A18) | M2 | `a502d6c` | 15:48 | not recorded | - | 0.53 | not recorded | +533 -36 | 378 | 182 | 4 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 88 | M3-00 | Scaffold of M3: seven mechanic packages and the city slice game, empty | M3 | `f3a4ad4` | 15:57 | not recorded | - | 0.08 | not recorded | +1084 -0 | 119 | 0 | 705 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 89 | M2-22 | follow-up: the experiment test no longer depends on the folder of the checkout | M2 | `11a7e59` | 16:05 | not recorded | - | - | not recorded | +7 -4 | 0 | 11 | 0 | follow-up commit of row 87; kept as its own row |
| 90 | M3-07 | exile | M3 | `230bd91` | 16:23 | not recorded | - | 0.04 | not recorded | +438 -9 | 146 | 108 | 142 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 91 | M2-25 | Lab follow-ups of the reviews: duplicate seeds refused, shares with Wilson intervals, relative run folders, plan check, a refused run costs nothing | M2 | `1fe52a3` | 16:32 | not recorded | - | 0.54 | not recorded | +469 -167 | 470 | 158 | 0 | follow-up issue of the M2 reviews, beside the plan; tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 92 | M3-08 | decisions 1: propose and settle | M3 | `485387a` | 16:34 | not recorded | - | 0.06 | not recorded | +637 -9 | 227 | 112 | 179 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 93 | M2-26 | Money follow-ups of review A: the meter fails closed, the ledger pairs by id, the report in the canary scan, a confirmatory run needs a clean tree | M2 | `54930f2` | 16:59 | not recorded | - | 0.08 | not recorded | +367 -67 | 171 | 261 | 0 | follow-up issue of the M2 reviews, beside the plan; tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 94 | M3-04 | ledger | M3 | `fff2c21` | 17:00 | not recorded | - | 0.41 | not recorded | +1302 -9 | 426 | 436 | 185 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 95 | M3-05 | channels 1: board and notices | M3 | `5dc3075` | 17:02 | not recorded | - | 0.22 | not recorded | +1074 -9 | 610 | 189 | 192 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 96 | M2-26 | follow-up: the experiment command passes the source tree on; the tree helpers are exported | M2 | `c26f19f` | 17:06 | not recorded | - | - | not recorded | +5 -1 | 6 | 0 | 0 | follow-up commit of row 93; kept as its own row |
| 97 | M3-01 | Contracts of M3: Director uses, the model port, the snapshot file, the manifest field human | M3 | `03621a0` | 17:08 | not recorded | - | 0.09 | not recorded | +441 -9 | 167 | 204 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 98 | - | Lint runs as three processes: packages, mechanics, the rest | - | `669388a` | 17:18 | not recorded | - | - | not recorded | +1 -1 | 0 | 0 | 2 | integrator's commit, no issue id |
| 99 | M3-18 | humanHand | M3 | `725ca57` | 17:22 | not recorded | - | 0.63 | not recorded | +321 -7 | 60 | 104 | 152 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 100 | M3-02 | Kernel: resume hardening (O17) | M3 | `04ce094` | 17:36 | not recorded | - | 0.29 | not recorded | +51 -8 | 29 | 30 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 101 | M3-03 | turns: afterBlocks | M3 | `1a5abd0` | 17:37 | not recorded | - | 0.18 | not recorded | +213 -13 | 58 | 167 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 102 | M3-16 | models: the asker | M3 | `c7dbbf1` | 17:39 | not recorded | - | 0.21 | not recorded | +371 -0 | 178 | 181 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 103 | M3-12 | sdk: the actors human and director | M3 | `bd92379` | 17:40 | not recorded | - | 0.10 | not recorded | +224 -20 | 98 | 127 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 104 | M3-09 | decisions 2: amendDecision | M3 | `c46b5a6` | 17:41 | not recorded | - | 0.21 | not recorded | +259 -17 | 65 | 129 | 50 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 105 | M3-06 | channels 2: direct messages | M3 | `d1807ab` | 17:42 | not recorded | - | 0.13 | not recorded | +532 -37 | 266 | 164 | 84 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 106 | M3-09 | follow-up: the human test uses the sdk's actor human | M3 | `7071878` | 17:50 | not recorded | - | - | not recorded | +2 -13 | 0 | 15 | 0 | follow-up commit of row 104; kept as its own row |
| 107 | - | Econ Lab series: the report gives the share of locked tables per arm (shareAt 1, decision A10) | M2 | `4bb8d76` | 18:05 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 108 | M3-10 | The ledger listens | M3 | `5b105e3` | 18:07 | not recorded | - | 0.23 | not recorded | +125 -3 | 12 | 106 | 10 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 109 | M3-17 | runlog: snapshot file, resumed folder, continuity | M3 | `2327ef2` | 18:08 | not recorded | - | 0.10 | not recorded | +419 -37 | 283 | 140 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 110 | M3-11 | puzzles: deal, hold, burn | M3 | `ec4c654` | 18:10 | not recorded | - | 0.08 | not recorded | +1709 -7 | 931 | 261 | 187 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 111 | M3-19 | court | M3 | `a6692f2` | 18:11 | not recorded | - | 0.10 | not recorded | +690 -7 | 167 | 148 | 189 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 112 | M3-13 | sdk: defineDirector | M3 | `ff2efb4` | 18:12 | not recorded | - | 0.10 | not recorded | +700 -51 | 490 | 115 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 113 | M3-22 | testkit: replay | M3 | `b7de650` | 18:13 | not recorded | - | 0.10 | not recorded | +424 -0 | 227 | 173 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 114 | M3-25 | Oracle proofs 1: deal and burn | M3 | `a69f1cb` | 18:32 | not recorded | - | 0.03 | not recorded | +347 -1 | 134 | 138 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 115 | M3-14 | sdk: the plugin directors | M3 | `d5dbcb6` | 18:34 | not recorded | - | 0.05 | not recorded | +397 -7 | 239 | 142 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 116 | - | Resume note: state of 18:25 UTC | - | `b24bda6` | 18:41 | not recorded | - | - | not recorded | +17 -16 | 0 | 0 | 33 | integrator's commit, no issue id |
| 117 | M3-15 | engine: the Director's driver | M3 | `38f8e7b` | 18:47 | not recorded | - | 0.05 | not recorded | +290 -1 | 96 | 180 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 118 | M3-26 | Oracle proofs 2: ledger and talk | M3 | `8aa5ea1` | 18:49 | not recorded | - | 0.03 | not recorded | +402 -4 | 63 | 288 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 119 | M3-23 | The game city-slice | M3 | `3667ab3` | 19:01 | not recorded | - | 0.04 | not recorded | +1425 -5 | 206 | 1161 | 63 | tokens and agent time not recorded: the usage file ends before the sessions of this issue; the three committed timelines (data) are in "Tests" |
| 120 | M3-20 | Command line 1: the run loop, --hand, --snapshot-at | M3 | `16fb46a` | 19:09 | not recorded | - | 0.04 | not recorded | +640 -56 | 506 | 190 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 121 | M3-21 | Command line 2: swt resume | M3 | `6b7da27` | 19:26 | not recorded | - | 0.03 | not recorded | +447 -35 | 307 | 175 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 122 | M3-24 | The slice replays and resumes | M3 | `908f899` | 19:39 | not recorded | - | 0.04 | not recorded | +259 -0 | 0 | 259 | 0 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 123 | - | Decisions A23 (what equal means for a resumed log) and A24 (issue M3-32) | M3 | `3efd9af` | 19:39 | not recorded | - | - | not recorded | +3 -1 | 0 | 0 | 4 | integrator's commit, no issue id |
| 124 | M3-32 | The city slice plays under the fake driver | M3 | `7700c81` | 19:53 | not recorded | - | 0.03 | not recorded | +277 -53 | 85 | 234 | 11 | added by decision A24; tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 125 | - | City slice README: what the fake run plays | M3 | `e075b87` | 19:53 | not recorded | - | - | not recorded | +3 -2 | 0 | 0 | 5 | integrator's commit, no issue id |
| 126 | M3-27 | Viewer 1: the projection | M3 | `ff92e59` | 19:54 | not recorded | - | 0.09 | not recorded | +1221 -0 | 426 | 648 | 20 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 127 | M3-28 | Viewer 2: Directors and decisions | M3 | `d3d2990` | 20:07 | not recorded | - | 0.04 | not recorded | +374 -33 | 296 | 92 | 19 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 128 | M3-29 | Viewer 3: the human, the pause, the resume | M3 | `a4e7ea7` | 20:20 | not recorded | - | 0.03 | not recorded | +308 -18 | 199 | 100 | 27 | tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 129 | M2-24 | The gate of M2: both series keep their sign, 61 live runs for 1.60 USD | M2 | `0ea32af` | 20:27 | not recorded | - | 0.05 | not recorded | +307 -0 | 0 | 0 | 307 | tokens and agent time not recorded: the usage file ends before the sessions of this issue; the lines are the gate's report, the run indexes and the spend ledger (data); the run folders are on `data/runs` |
| 130 | M3-30 | Live smoke of the city slice: two runs for 0.0114 USD, no decision without a briefing | M3 | `da40e4a` | 20:39 | not recorded | - | - | not recorded | +30 -1 | 0 | 0 | 31 | tokens and agent time not recorded: the usage file ends before the sessions of this issue; the lines are the run index, the lesson rows P450 to P455 and the ledger of M3 (data); the run folders are on `data/runs`; row written by M2-27 |
| 131 | M3-31 | Gate of M3: exile alone, the softer check, the record | M3 | `e1b77c2` | 20:40 | not recorded | - | - | not recorded | +564 -82 | 0 | 186 | 460 | tokens and agent time not recorded: the usage file ends before the sessions of this issue; row written by M2-27 |
| 132 | M2 milestone review | read-only review of the gate by a challenger: every number of `M2-GATE.md` recomputed from the event logs, eight logs read, two loopholes found (LH18, LH19), five blocking fixes named | M2 | - | - | not recorded | - | - | not recorded | - | 0 | 0 | 0 | challenger session, no commit: the review changed nothing in either checkout; its five fixes are issue M2-27, whose own row is owed (the integrator adds it with the merge commit) |

## Sessions without a row

Sessions whose name matches no row of the record. By their names their work is the plan under
`docs/refactoring-before-release/` (inside the root commit) or landed on the old platform before the freeze (branch
`legacy`), which this table does not cover. Which commit holds which session's work is not recorded.

| Session | Tokens (total, M) | Agent time (h) |
|---|---|---|
| Experiment scientist paper | 0.20 | 0.16 |
| Game designer paper | 0.23 | 0.17 |
| Architect paper | 0.25 | 0.17 |
| Developer experience paper | 0.30 | 0.22 |
| Challenger critique | 0.24 | 0.16 |
| Chess engine licence research | 0.15 | 0.13 |
| Decision panel | 0.20 | 0.19 |
| REWRITE editor | 0.11 | 0.05 |
| M1 technical spec | 0.06 | 0.35 |
| M1 spec challenger | 0.14 | 0.53 |
| Noise floor runs | 0.23 | 1.28 |
| Chess engine swap | 0.28 | 3.86 |

## Totals

State at commit `e1b77c2`, 132 rows (131 commits and the milestone review of M2, which has no commit). The token
sums below are those of the first 82 rows: the usage file of the sessions ends there, and the rows 83 to 132 have
no number.

| | Planned | Merged | Note |
|---|---|---|---|
| M0 | 14 (A12) | not recorded per issue | 3 rows: the root commit squashes the issues of the frame, then the oracle files and the spike paper. The other M0 issues on the old state (the resume note names the noise floor and the chess engine) were merged on `legacy` and have no row |
| M1 | 37 (A12) | 37 | M1-00 to M1-36 |
| M2 | 25 (A12) | 25 | M2-00 to M2-24; the gate M2-24 merged last (row 129, [`M2-GATE.md`](M2-GATE.md): 61 live runs, 1.6022 USD of the live budget of 10 USD). Beside the plan: the follow-up issues M2-25 and M2-26 of the reviews, both merged, and M2-27, which closes the milestone review (row 132) and whose row is owed |
| Sum of M0 to M2 | 76 | 62 planned issues of M1 and M2, plus the 3 rows of M0. With the issues beside the plan (M1-37 to M1-40, M2-25 to M2-27): **72**, the number of kill check 1 | kill line 150. Every row with the milestone M0, M1 or M2 (reviews, the specification, follow-up and integrator commits included): 85, and 86 with the row of M2-27 |
| M3 | 32 (A19), 33 with M3-32 (A24) | 33 | M3-00 to M3-32 (rows 130 and 131 are the live smoke M3-30 and the gate M3-31). Stop line of A19: above 64 |

Rows beside the plan: 34. Four follow-up issues of M1 (M1-37 to M1-40), four reviews of M1 (waves 1 to 3 and the
milestone), the specifications of M2 and M3, the reviews A and B and the milestone review of M2, the two follow-up
issues of M2 (M2-25, M2-26; the row of the third, M2-27, is owed), three follow-up commits with the id of their issue (rows 89, 96, 106), and sixteen commits of the
integrator without an issue id.

| | Recorded | Budget | Share |
|---|---|---|---|
| Agent tokens in rows (70 of 132 rows have a number, 62 are "not recorded") | 13.22 million | | |
| Agent tokens of the 12 sessions without a row | 2.38 million | | |
| Agent tokens, all 85 session reports | 15.60 million | 300 million | 5.2 % |
| Agent cost | - | 750 USD | the sessions are not billed per token, so the USD line of the kill criterion cannot be counted |
| Live model spend | 1.6022 USD (M2 gate, 61 runs, `games/m2-ledger.jsonl`) and 0.0114 USD (M3 smoke, 2 runs, `games/m3-ledger.jsonl`) on this platform; 0.72 USD before M2 on the old one (specification of M2, 8.5) | 10 USD | not a kill number |

**Kill check 1** (specification of M2, 8.6), recounted by M2-27 from the rows above and written into
[`M2-GATE.md`](M2-GATE.md): 72 issues of M0 to M2 against 150; 15.60 million recorded tokens against 600 million
(a lower bound, see below); no agent cost in USD. It does not fire.

The recorded sum leaves out the integrator's session, every session after row 82 (the rest of M2 and all of M3)
and counts each session as it reported itself, so it is a lower bound of what the work used. The median of the 70
rows with a number is 0.16 million tokens, the largest row 0.64 million. The one recalibration of D4 (the median of
the first ten merged issues replaces the 6 million per issue) is not done yet; it needs its issue.

## The gate of M3

The six done-whens of `refactoring-before-release/10-m3-spec.md` and the test that proves each. All of them run
offline, in `pnpm check`. The milestone is closed by its review, after M2 is closed (the gate of M2, M2-24, was merged at 20:27 while
this was written; its milestone review is open). The live smoke of M3 (M3-30, which does not gate) is run by
another session and was open when this was written.

| # | Done when | Proven by |
|---|---|---|
| 1 | the slice plays and the whole run equals a committed timeline | `games/city-slice/test/city-slice.test.ts`: "plays twelve ticks and the whole log equals the committed timeline" (seeds 7 and 11, the variant `amended`) and the seven moments by name |
| 2 | replay from the game and `events.jsonl` alone gives the same log | `games/city-slice/test/replay-resume.test.ts`: "done-when 2: replay writes the committed timeline again ..." and its failing twin "a log with one input changed is not replayed equal"; from run folders: `apps/cli/test/city-slice.test.ts`, "done-when 2 from run folders" |
| 3 | a run stopped at a snapshot and resumed gives the straight log; `swt log verify` proves the continuity | in process: `replay-resume.test.ts`, "done-when 3, in process"; through `swt run`, `swt resume` and `swt log verify --previous`: `apps/cli/test/city-slice.test.ts` (equal as decision A23 reads it) |
| 4 | `exile` names no other game mechanic | `scripts/gates/exile-alone.test.ts` (this issue): the manifest, every import and every string of `mechanics/exile/src/`, and the head's empty `requires` and `uses`; it fails on fourteen fixtures in which `exile` names `puzzles` or another mechanic |
| 5 | no service cycle | `games/city-slice/test/city-slice.test.ts`: "resolves without a cycle of services, in the game's own order, and no optional use had to wait" |
| 6 | the softer check is answered in writing | the next section |

## The softer check of M3

`REWRITE.md` section 7: "if the City slice needs a kernel change that the tabletop games did not need, the kernel
API is not frozen and M4 waits." Done-when 6 of the M3 specification asks for the answer in writing
(`10-m3-spec.md` section 10). Measured at commit `a4e7ea7` with the counter of the budget gate
(`scripts/lib/budget.ts`; the kernel's own gate `packages/kernel/test/budget.test.ts` counts the same 1393):

| | Before M3 (`0ac3e89`) | After M3 | Added | Planned by the specification | Limit |
|---|---|---|---|---|---|
| `kernel` | 1381 | 1393 | 12 | at most 15, at most 1396 | gate 1420, hard 1500 |
| `sdk` | 1705 | 2065 | 360 | about 330, about 2035 | |
| `engine` | 293 | 360 | 67 | about 230, about 523 | |
| kernel + sdk + engine | 3379 | 3818 | 439 | about 575, about 3954 | 4100 (A20): 282 left |
| Issues of M3 | | 33 planned (32, and M3-32 by A24); 32 merged with M3-31, M3-30 open | | 32 | stop above 64 (A19) |

**Which kernel lines M3 added.** All 12 are of one issue, M3-02 (row 100, erratum O17): the function `restore`
in `packages/kernel/src/kernel.ts` and the factory `noResume` of the code `SWT-R021` in `errors.ts`. After
`restoreKernel` the kernel refuses a snapshot that is older than its log, that holds a suspension of a plugin that
is not loaded, or that locks a tool no loaded plugin has. No other issue of M3 touched `packages/kernel/src`.

**Would the tabletop games have needed them?** They could have used them and nothing of the slice forced them: the
three checks read input that any game can give (a snapshot edited by hand or taken from another game), and every
game resumes through the same `createKernel(definition, {}, { snapshot, log })`. They
add no mechanism and no extension point. The kernel's API report (`packages/kernel/kernel.api.md`) and the kernel
contracts (`packages/contracts/src/kernel/`) have no changed line between `0ac3e89` and `a4e7ea7`.

**What the slice needed and where it lives instead.** The Director (actor, queue, driver), the decision window, the
Human Hand, the pause, the snapshot file, the resume marker and replay cost 0 kernel lines; they use the extension
points the table of section 10 of the specification names. The two places where the specification expected a
possible gap closed without the kernel: a `turnInputs` hook may emit (M3-06), and `Kernel.submit` takes the actor
`human`, which no scheduler activates (M3-12). No builder reported a missing extension point. What M3 did change
outside the kernel is in the errata `refactoring-before-release/10-m3-spec-errata.md`: `MechanicContext.actors`
and `Setup.actors` in the sdk (G2) are the one addition to an authoring interface that a mechanic asked for.

**Answer.** The City slice needed no kernel change that the tabletop games did not need. The check passes; the
kernel interface stands and M4 does not wait. The reserved returns of M1 1.4 were not taken (decision 20 of the
specification, A20). Limits of this answer: the slice is six scripted residents and seven cut mechanics, not the
City; the judge, hooks for blocks above 1 and a stop inside a tick are M5 and are the next test of the same
question.
