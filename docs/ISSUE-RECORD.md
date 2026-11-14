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
  merge order. A later commit with the same id is folded into the row of its issue. A review, a specification and a
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

All merges are of 2026-11-14; the times are UTC. The table is complete up to commit `bfe388d` of `rewrite/develop`.

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

State at commit `bfe388d`, 82 rows.

| | Planned (A12) | Merged | Note |
|---|---|---|---|
| M0 | 14 | not recorded per issue | 3 rows: the root commit squashes the issues of the frame, then the oracle files and the spike paper. The other M0 issues on the old state (the resume note names the noise floor and the chess engine) were merged on `legacy` and have no row |
| M1 | 37 | 37 | M1-00 to M1-36 |
| M2 | 25 | 23 | M2-00 to M2-21 and M2-23; M2-22 and M2-24 are open |
| Sum | 76 | 60 of M1 and M2, plus the 3 rows of M0 | kill line 150 |

Rows beside the plan: 19. Four follow-up issues of M1 (M1-37 to M1-40), four reviews of M1 (waves 1 to 3 and the
milestone), the specification of M2, and ten commits of the integrator without an issue id.

| | Recorded | Budget | Share |
|---|---|---|---|
| Agent tokens in rows (70 of 82 rows have a number, 12 are "not recorded") | 13.22 million | | |
| Agent tokens of the 12 sessions without a row | 2.38 million | | |
| Agent tokens, all 85 session reports | 15.60 million | 300 million | 5.2 % |
| Agent cost | - | 750 USD | the sessions are not billed per token |

The recorded sum leaves out the integrator's session and counts each session as it reported itself, so it is a lower
bound of what the work used. The median of the 70 rows with a number is 0.16 million tokens, the largest row 0.64
million. The one recalibration of D4 (the median of the first ten merged issues replaces the 6 million per issue)
is not done yet; it needs its issue.
