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
  "Tokens (total)" column for that reason. The rows of M4 (171 to 228) take the one total that the notice of a
  finished builder session gives (its token count and its duration); it names no kinds either.
- **The integrator's own tokens are in no row:** merges, checks, briefs for builders, the fixes after a review and
  the commits without an issue id were made in the integrator's session, which has no report here. In M4 that holds
  for both integrator sessions: their tokens are not split per issue, and the follow-up, prep and decision commits
  they made say "not recorded".
- **A session is matched to a row by its name** ("Build M1-35 tic-tac-toe port" is M1-35). The sessions that match
  no row are listed under "Sessions without a row".
- **Wall time is short where a branch has one commit:** it then measures the wait for the merge, not the build. The
  agent time is the better number for the build.
- **The line columns are an upper bound of hand-written lines:** source that was carried from the old platform (the
  viewer, the ported mechanics, the chain) is not told apart from new source.
- **Cost is a dash in every row:** the sessions are not billed per token.

The merges of the rows 1 to 163 are of 2026-11-14, those of the rows 164 to 313 of 2026-11-15, those of the rows
314 to 418 of 2026-11-16 and those of the rows 419 to 429 of 2026-11-21, those of the rows 430 and 431 of 2026-11-23 and those of the rows 432 and
433 of 2026-11-24; the times are UTC.
The table is complete up to commit `c138860` of `rewrite/develop` (M6-29, row 433); the rows 85 to
129 were written from the history by issue M3-31, the rows 130 to 132 by issue M2-27, the rows 133 to 135 by issue
M3-34, the rows 136 to 143 by issue M4-00, the rows 144 to 231 by issue M4-63 (its two parts), the rows 236 and
237 (with the commit of row 235) by issue M5-00, and the rows 238 to 280 (M5-00's own row 239 among them) by the
integrator's record commit after `c7c6ef6`, the rows 281 to 378 by issue M5-57, the gate of M5, from the history,
and the rows 380 to 433 by issue M6-30, the gate of M6, from the history, in the way of the rows 281 to 378 (below).
The commit id and the merge time of row 231 are those of the integrator's squash commit, which this row cannot name; the
integrator fills them with the merge, as the rows of M3-31, M2-27, M3-34 and M4-00 were filled. Row 379, the gate of
M5, waited for its squash commit in the same way, and row 434, the gate of M6, waits for its own.

How the rows of M5 were filled. Each builder session ended with a notice that names the issue ("Build M5-13 channels
2") and gives the session's tokens and duration; the rows take them, one session per issue, the last notice where a
session sent two. Three notices give a low count against their tool uses (rows 249, 276, 280); the rows take them as
given. M5-59 and M5-63 were made in the integrator's session, which has no report here, so they say "not recorded".
No challenger session is among the notices. The lines follow the rule above: API reports, `pnpm-lock.yaml` and the
carried prompt files are in "Lines" but not in "Source", "Tests" or "Other", and the note says how many were left
out where they are many; in the ports, "Source" holds logic carried from `legacy`. Wall time is a dash, as in M4.
The rows 281 to 378 were written by the gate issue M5-57 from `git log` alone: the merge time is the commit time of
the squash commit, the lines are `git show --numstat` split by the rule above (the note names the lines left out
where they are more than 100), and the frozen surface (`scripts/api-freeze/frozen.json`, `scripts/api-freeze/surface/`)
counts as "Other". The notices of their builder sessions went to the integrator's session and did not reach the
session of M5-57, so tokens and agent time say "not recorded"; the integrator may fill them from its notices. Wall
time is a dash: the squash merge leaves no first commit of a branch (the rule above), and `git log` gives only the
merge. A commit whose subject starts with the id of a row before it is a follow-up and names that row; the parts of
the live issues M5-53 and M5-55 that were played after a decision are rows of their own with the run and its cost.

How the rows after M5's gate were filled (rows 380 to 433: the close of M5 after its review, the specification of M6
with its challenge, and M6). The gate issue M6-30 wrote them as M5-57 wrote the rows 281 to 378: from `git log` of
`ab0d283..c138860` alone, one row per commit, the merge time the commit time of the squash commit, the lines
`git show --numstat` split by the rule above. No builder notice reached the session of M6-30, so every row says "not
recorded" for tokens and agent time; the integrator may fill them from its notices. The decisions A141 to A153, A155
and A157 to A159 have no commit of their own: the integrator wrote them into the squash commits of the issues they follow. Where
an issue's "Source" plus "Tests" passes 400, the note says so. These columns count every added and removed line,
TSDoc and blank lines included, so they are an upper bound of the 400-line rule, which the builders counted in code
lines; two decisions record a count: A140 (M6-17, 434 hand-written lines, over the limit) and A147 (M6-07, generated
`package.json` lines). The renamed files of M6-06 are the script's output (4.4).

How the rows of M4 were filled. The lines come from `git show --shortstat` and `git show --numstat` of each commit,
split by the rule above; row 209 also leaves out the vendored chess engine, which is carried. The builders of M4 ran
in two integrator sessions. The first ran until the weekly usage limit of its model on 2026-11-15; no report of its
builder sessions is here, so the rows 144 to 170 (merged before 05:32 UTC) say "not recorded". The second started at
05:32 UTC; each of its builder sessions ended with a notice that names the issue ("Build M4-23 Harbor Lights game")
and gives the session's tokens and duration, and the rows 171 to 231 take them, one session per issue. Three sessions
sent two notices (they waited on their own background work); the numbers of a notice are of the whole session so far,
so the last is taken. No challenger session is among the notices of the second session. Wall time is a dash in every
row of M4: a builder's branch is removed after the merge, so its first commit is not known.

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
| 132 | M2 milestone review | read-only review of the gate by a challenger: every number of `M2-GATE.md` recomputed from the event logs, eight logs read, two loopholes found (LH18, LH19), five blocking fixes named | M2 | - | - | not recorded | - | - | not recorded | - | 0 | 0 | 0 | challenger session, no commit: the review changed nothing in either checkout; its five fixes are issue M2-27 (row 134) |
| 133 | - | Decisions A25 (the integrator pushes the data branch) and A26 (issue M3-33) | M3 | `a380815` | 20:46 | not recorded | - | - | not recorded | +3 -1 | 0 | 0 | 4 | integrator's commit, no issue id; A25 is a decision about the data of M2, A26 adds an issue to M3; row written by M3-34 |
| 134 | M2-27 | Close the review of M2: findings, loopholes, the record | M2 | `7b2a862` | 20:51 | not recorded | - | - | not recorded | +172 -44 | 2 | 0 | 214 | follow-up issue of the milestone review of M2 (row 132); tokens and agent time not recorded: the usage file ends before the sessions of this issue; row written by M3-34 |
| 135 | M3 milestone review | read-only review of the gate by a challenger at commit `e1b77c2`: the six done-whens run again, the resume tried from every boundary in process (64 cases) and through the command line (66 cases), two failures found (a Director asked after a command-line resume, the fix text of `SWT-X009`), six blocking fixes named | M3 | - | - | not recorded | - | - | not recorded | - | 0 | 0 | 0 | challenger session, no commit; its fixes 1 to 5 are issue M3-34, whose own row is owed (the integrator adds it with the merge commit); fix 6 is issue M3-33 (A26), open when this was written |
| 136 | - | M2 gate: check 2 recorded | M2 | `e474c83` | 20:57 | not recorded | - | - | not recorded | +1 -1 | 0 | 0 | 2 | integrator's commit, no issue id |
| 137 | M3-33 | City slice: a briefed variant for the live smoke | M3 | `53c3597` | 21:02 | not recorded | - | - | not recorded | +412 -47 | 200 | 168 | 83 | added by decision A26, beside the plan; tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 138 | M3-34 | Close the review of M3: decisions on the plain form, the resume truth, the record | M3 | `6b010bb` | 21:10 | not recorded | - | - | not recorded | +144 -143 | 111 | 22 | 123 | follow-up issue of the milestone review of M3 (row 135); tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 139 | M3-30 | follow-up: the briefed live run of the city slice; the residents play and agree not to vote; decision A28 closes M3 | M3 | `936e8de` | 21:18 | not recorded | - | - | not recorded | +35 -11 | 0 | 0 | 46 | follow-up commit of row 130; kept as its own row; the lines are the run index, the ledger, the lessons and the decision |
| 140 | - | Decision A29: the cures of LH18 and LH19 as options, with a small series each | M2 | `0ecabab` | 21:18 | not recorded | - | - | not recorded | +2 -1 | 0 | 0 | 3 | integrator's commit, no issue id |
| 141 | M2-28 | Quarry: open quarries frozen per step (LH18) | M2 | `7652062` | 21:33 | not recorded | - | - | not recorded | +321 -19 | 48 | 163 | 128 | added by decision A29, beside the plan and beside M4; tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 142 | M2-29 | No results of earlier games without a brain (LH19) | M2 | `7f63888` | 21:42 | not recorded | - | - | not recorded | +370 -32 | 49 | 179 | 170 | added by decision A29, beside the plan and beside M4; tokens and agent time not recorded: the usage file ends before the sessions of this issue |
| 143 | M4 specification | M4 build specification, challenged: ten tabletop games, the scheduler sample, 64 issues; decisions A30 to A41 | M4 | `77d0307` | 21:43 | not recorded | - | - | not recorded | +1368 -1 | 0 | 0 | 1369 | specification commit; the usage file ends before its sessions |
| 144 | M4-00 | Scaffold of M4 | M4 | `2b6e292` | 21:57 | not recorded | - | - | not recorded | +3008 -94 | 283 | 0 | 1971 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here; the scaffold; it writes the rows 136 to 143 |
| 145 | M4-18 | Oracle additions: hold'em, Harbor Lights, Ember Tricks | M4 | `b53ff40` | 21:59 | not recorded | - | - | not recorded | +1745 -13 | 0 | 0 | 0 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here; the lines are oracle files only |
| 146 | M4-17 | Oracle additions: chess | M4 | `12ae02c` | 22:15 | not recorded | - | - | not recorded | +2341 -26 | 0 | 0 | 0 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here; the lines are oracle files only |
| 147 | M4-11 | Mechanic READMEs: outputs in the service tables | M4 | `f26bc1b` | 22:19 | not recorded | - | - | not recorded | +66 -14 | 25 | 18 | 37 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 148 | M4-01 | No log position 1: decisions | M4 | `8ee8d6e` | 22:22 | not recorded | - | - | not recorded | +52 -46 | 28 | 43 | 19 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 149 | M4-16 | The activation hooks | M4 | `c3f7b2b` | 22:25 | not recorded | - | - | not recorded | +238 -4 | 31 | 207 | 0 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 150 | M4-21 | Port: card-table | M4 | `c5bf1a1` | 22:28 | not recorded | - | - | not recorded | +1055 -9 | 410 | 226 | 164 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 151 | - | card-table README: outputs in the service table | M4 | `d32c8bf` | 22:38 | not recorded | - | - | not recorded | +1 -1 | 0 | 0 | 2 | integrator's commit, no issue id; follow-up of row 150 (M4-21) without the id |
| 152 | M4-05 | Command line 1: swt replay, swt scan | M4 | `5739f0b` | 23:02 | not recorded | - | - | not recorded | +348 -3 | 213 | 138 | 0 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 153 | M2-30 | The cures of LH18 and LH19, measured: both effects stay without the loophole | M2 | `69b3c97` | 23:07 | not recorded | - | - | not recorded | +320 -11 | 0 | 0 | 331 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here; added by decision A29, beside the plan and beside M4; live spend 0.6515 USD, 24 runs (`games/a29-ledger.jsonl`, `docs/M2-CURES.md`), played on the code of `77d0307`; the run folders are on `data/runs` |
| 154 | M4-02 | No log position 2: the Directors | M4 | `b158a5b` | 23:10 | not recorded | - | - | not recorded | +684 -337 | 171 | 270 | 557 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here; raises the runtime revision to 4 with M4-01 (row 148); the tag `runtime-r4` is owed (errata H41) |
| 155 | M4-25 | Port: clue-grid | M4 | `3bbaa66` | 23:12 | not recorded | - | - | not recorded | +2409 -8 | 1428 | 390 | 383 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 156 | M4-22 | Port: hint-towers | M4 | `ac369c1` | 23:12 | not recorded | - | - | not recorded | +2257 -8 | 1334 | 412 | 346 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 157 | M4-27 | Port: chess 1 | M4 | `cb1ca13` | 23:12 | not recorded | - | - | not recorded | +2176 -8 | 1294 | 365 | 345 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 158 | M4-19 | Port: liars-dice | M4 | `9355d18` | 23:12 | not recorded | - | - | not recorded | +2458 -9 | 1230 | 311 | 337 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 159 | - | Lint in groups of eight folders: one process over all mechanics ran out of its heap | M4 | `5b19dfe` | 23:18 | not recorded | - | - | not recorded | +34 -2 | 31 | 3 | 2 | integrator's commit, no issue id |
| 160 | M4-04 | sample functions for the mechanics ported before M4 | M4 | `2d3902f` | 23:18 | not recorded | - | - | not recorded | +268 -34 | 147 | 128 | 15 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 161 | - | liars-dice API report regenerated | M4 | `46fe177` | 23:38 | not recorded | - | - | not recorded | +38 -38 | 0 | 0 | 0 | integrator's commit, no issue id; the lines are an API report only |
| 162 | - | Decision A42: issue M4-64, a lock on another mechanic's tool | M4 | `99bbc8f` | 23:38 | not recorded | - | - | not recorded | +2 -1 | 0 | 0 | 3 | integrator's commit, no issue id; decision A42 adds M4-64 |
| 163 | M4-07 | Command line 2: swt --help, the hand's lines, fix texts | M4 | `326392a` | 23:39 | not recorded | - | - | not recorded | +572 -40 | 300 | 101 | 211 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 164 | M4-08 | Lab: facts per actor, n per arm, the guardrail, the started line | M4 | `563f21e` | 00:15 | not recorded | - | - | not recorded | +246 -59 | 188 | 86 | 13 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 165 | M4-41 | Port: morris | M4 | `12b4152` | 00:15 | not recorded | - | - | not recorded | +2663 -14 | 1504 | 327 | 263 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 166 | - | API reports regenerated after the merges | M4 | `7085906` | 00:21 | not recorded | - | - | not recorded | +38 -38 | 0 | 0 | 0 | integrator's commit, no issue id; the lines are API reports only |
| 167 | M4-45 | Port: convoy 2 | M4 | `05bebdf` | 00:42 | not recorded | - | - | not recorded | +3123 -8 | 1741 | 392 | 435 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here; holds M4-44 too, which has no commit of its own (errata H32) |
| 168 | M4-42 | Port: morris-referee | M4 | `93a729f` | 00:42 | not recorded | - | - | not recorded | +519 -7 | 108 | 234 | 154 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 169 | M4-06 | Standing checks: replay and resume from every boundary for every game | M4 | `2b77fed` | 00:42 | not recorded | - | - | not recorded | +500 -0 | 133 | 350 | 0 | built while the first integrator session of M4 ran (before 2026-11-15 05:32 UTC); its session reports are not here |
| 170 | - | API reports regenerated after the merges | M4 | `b4bc00f` | 00:44 | not recorded | - | - | not recorded | +38 -38 | 0 | 0 | 0 | integrator's commit, no issue id; the lines are API reports only |
| 171 | M4-64 | A lock on another mechanic's tool by its bare name | M4 | `7f85584` | 05:45 | 0.15 | - | - | 0.16 | +60 -26 | 46 | 28 | 9 | one builder session; added by decision A42, beside the plan |
| 172 | M4-23 | Game: Harbor Lights, the arms of the series | M4 | `4c6fbd9` | 05:48 | 0.22 | - | - | 0.21 | +592 -10 | 210 | 312 | 80 | one builder session |
| 173 | M4-20 | Game: liar's dice and its oracle files | M4 | `8a1c200` | 05:49 | 0.25 | - | - | 0.22 | +551 -13 | 155 | 312 | 86 | one builder session |
| 174 | M4-37 | Port: holdem 1 | M4 | `6a23493` | 05:49 | 0.23 | - | - | 0.24 | +1850 -4 | 1110 | 277 | 7 | one builder session |
| 175 | M4-47 | Port: salt-market 1 | M4 | `c5419cb` | 05:52 | 0.30 | - | - | 0.29 | +2629 -4 | 1520 | 347 | 6 | one builder session |
| 176 | M4-26 | Game: Lanterns and its oracle files | M4 | `4256744` | 05:55 | 0.21 | - | - | 0.15 | +537 -7 | 141 | 329 | 74 | one builder session |
| 177 | - | Decision A43: issue M4-65, state in schema key order after a resume | M4 | `8927d15` | 05:55 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id; decision A43 adds M4-65 |
| 178 | M4-24 | Harbor Lights: the crew arm and the options | M4 | `95d42b2` | 05:56 | 0.13 | - | - | 0.10 | +98 -36 | 2 | 105 | 27 | one builder session |
| 179 | M4-29 | Game: chess and the five files that exist | M4 | `d8f1794` | 06:01 | 0.19 | - | - | 0.18 | +527 -8 | 150 | 295 | 85 | one builder session |
| 180 | M4-38 | Port: holdem 2 | M4 | `8573a4d` | 06:02 | 0.20 | - | - | 0.20 | +1252 -23 | 588 | 251 | 327 | one builder session |
| 181 | M4-48 | Port: salt-market 2 | M4 | `c13daf8` | 06:05 | 0.24 | - | - | 0.20 | +1638 -71 | 587 | 274 | 548 | one builder session |
| 182 | M4-65 | State in schema key order after a resume (A43) | M4 | `843b5fd` | 06:15 | 0.16 | - | - | 0.30 | +177 -28 | 56 | 78 | 0 | one builder session; added by decision A43, beside the plan |
| 183 | M4-39 | Game: hold'em and the five files that exist | M4 | `c050b69` | 06:15 | 0.17 | - | - | 0.20 | +576 -12 | 159 | 328 | 88 | one builder session |
| 184 | M4-28 | Port: chess 2: teams, lists, threats, the coach | M4 | `b571d3c` | 06:15 | 0.18 | - | - | 0.22 | +191 -41 | 8 | 202 | 22 | one builder session |
| 185 | M4-31 | Additions: Harbor Lights and Lanterns | M4 | `3040042` | 06:16 | 0.19 | - | - | 0.32 | +436 -15 | 113 | 323 | 15 | one builder session |
| 186 | - | Resume note: the state of M4 after the change of integrator session | M4 | `16ca326` | 06:30 | not recorded | - | - | not recorded | +17 -0 | 0 | 0 | 17 | integrator's commit, no issue id; the resume note after the change of integrator session |
| 187 | M4-46 | Game: Convoy and its oracle files | M4 | `0a7a0a6` | 06:39 | 0.16 | - | - | 0.15 | +546 -8 | 134 | 336 | 80 | one builder session |
| 188 | M4-30 | Chess: the variants | M4 | `0669176` | 06:40 | 0.17 | - | - | 0.16 | +240 -79 | 127 | 138 | 48 | one builder session |
| 189 | M4-35 | Port: sealed-auction | M4 | `8e22083` | 06:45 | 0.24 | - | - | 0.25 | +2055 -8 | 972 | 295 | 292 | one builder session |
| 190 | M4-33 | Port: trick-play | M4 | `07d027a` | 06:49 | 0.30 | - | - | 0.33 | +2393 -9 | 1347 | 430 | 385 | one builder session |
| 191 | M4-32 | Additions: chess | M4 | `5a7565a` | 06:50 | 0.17 | - | - | 0.16 | +297 -44 | 148 | 186 | 7 | one builder session |
| 192 | - | Decision A44: turns without a call as a run fact; replay helpers into the testkit | M4 | `e71d2d8` | 06:50 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id; decision A44 |
| 193 | M4-43 | Game: nine men's morris and its oracle files | M4 | `1997ab8` | 06:52 | 0.20 | - | - | 0.36 | +679 -12 | 236 | 361 | 90 | one builder session |
| 194 | M4-49 | Game: Salt Market and its oracle files | M4 | `abea0c7` | 06:53 | 0.19 | - | - | 0.19 | +651 -10 | 134 | 301 | 81 | one builder session |
| 195 | M4-36 | Game: Blind Bid and its oracle files | M4 | `675d5bd` | 06:55 | 0.16 | - | - | 0.16 | +488 -8 | 134 | 276 | 83 | one builder session |
| 196 | M4-40 | Hold'em: the aid and mixed tables | M4 | `3c9f3e8` | 06:59 | 0.13 | - | - | 0.09 | +135 -38 | 31 | 113 | 25 | one builder session |
| 197 | M4-34 | Game: Ember Tricks and its oracle files | M4 | `bd65302` | 07:01 | 0.19 | - | - | 0.17 | +628 -9 | 191 | 361 | 78 | one builder session |
| 198 | M4-09 | Report and result lines | M4 | `c6157fc` | 07:03 | 0.19 | - | - | 0.21 | +193 -48 | 157 | 72 | 4 | one builder session |
| 199 | M4-66 | Key order after a resume, the rest (A43) | M4 | `617c742` | 07:16 | 0.16 | - | - | 0.35 | +97 -55 | 54 | 98 | 0 | one builder session; added by decision A45 (the second half of A43), beside the plan |
| 200 | M4-10 | docs/reference/errors.md, generated and gated | M4 | `7083053` | 07:16 | 0.18 | - | - | 0.19 | +1275 -0 | 415 | 90 | 770 | one builder session; "Other" holds the generated page `docs/reference/errors.md` |
| 201 | M4-58 | The rerun plan of M4 and its specs | M4 | `5b6336a` | 07:17 | 0.21 | - | - | 0.30 | +576 -15 | 64 | 77 | 447 | one builder session |
| 202 | M4-50 | Additions: liar's dice and Blind Bid | M4 | `759e194` | 07:26 | 0.25 | - | - | 0.45 | +818 -261 | 368 | 604 | 22 | one builder session |
| 203 | M4-53 | parallel 1: the sample scheduler (A30, A35) | M4 | `7156ef2` | 07:27 | 0.17 | - | - | 0.24 | +502 -6 | 238 | 257 | 11 | one builder session |
| 204 | M4-14 | Sample 6: own Director, with its tutorial | M4 | `6f3f22c` | 07:28 | 0.19 | - | - | 0.19 | +617 -5 | 210 | 169 | 243 | one builder session |
| 205 | M4-15 | The brain's option | M4 | `c1710a1` | 07:30 | 0.10 | - | - | 0.22 | +35 -5 | 13 | 23 | 3 | one builder session; the session reported twice (it waited on its own background work), the last report is taken |
| 206 | M4-52 | Additions: nine men's morris and Convoy (Salt Market split to M4-67) | M4 | `9a898e2` | 07:48 | 0.21 | - | - | 0.32 | +537 -45 | 268 | 288 | 26 | one builder session; the session reported twice (it waited on its own background work), the last report is taken |
| 207 | - | Decision A45: M4-52 split, issue M4-67 | M4 | `d6828da` | 07:48 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id; decision A45 splits M4-52 and adds M4-67 |
| 208 | M4-51 | Additions: Ember Tricks and hold'em | M4 | `8257d73` | 07:49 | 0.20 | - | - | 0.33 | +526 -27 | 199 | 332 | 22 | one builder session |
| 209 | M4-56 | Chess analysis: the vendored engine | M4 | `a117951` | 07:51 | 0.18 | - | - | 0.21 | +3663 -6 | 665 | 289 | 92 | one builder session; the line columns leave out `third_party/garbochess/garbochess.js` (2515 lines, carried from `legacy`); "Lines" holds it |
| 210 | M4-54 | Parallel scheduler 2: replay by the close line, resume by replay | M4 | `f7f29c1` | 07:51 | 0.16 | - | - | 0.40 | +301 -27 | 98 | 228 | 0 | one builder session |
| 211 | M4-12 | Docs chores: quarry and econ-lab READMEs, RESUME, design checklist | M4 | `7c48fb4` | 07:56 | 0.11 | - | - | 0.07 | +62 -12 | 0 | 0 | 74 | one builder session |
| 212 | M4-12 follow-up | the brain's retro is after each game but the last, in five game READMEs | M4 | `1c423dc` | 07:57 | not recorded | - | - | not recorded | +5 -5 | 0 | 0 | 10 | integrator's commit; follow-up of row 211 (M4-12) |
| 213 | M4-57 | Viewer: ticks, overlapping activations | M4 | `62f203a` | 08:03 | 0.20 | - | - | 0.18 | +436 -47 | 115 | 192 | 173 | one builder session |
| 214 | M4-55 | parallel 3: the sample game, the tutorial | M4 | `054781a` | 08:06 | 0.15 | - | - | 0.23 | +607 -4 | 90 | 144 | 377 | one builder session |
| 215 | M4-67 | Additions: Salt Market and the Referee of morris (A45) | M4 | `37c8043` | 08:09 | 0.16 | - | - | 0.27 | +431 -55 | 258 | 207 | 21 | one builder session; added by decision A45, beside the plan |
| 216 | M4-03 | Gates: base alone, unused dependencies, plain mechanic, kernel words | M4 | `2123c5d` | 08:10 | 0.14 | - | - | 0.14 | +656 -118 | 2 | 503 | 151 | one builder session; merged after M4-50 to M4-52 and M4-67 (errata H17) |
| 217 | M4-62 | GAMES.md complete, the overview generated | M4 | `e94ceea` | 08:13 | 0.15 | - | - | 0.25 | +474 -50 | 328 | 68 | 128 | one builder session |
| 218 | M4-13 | Sample 5: own mechanic, with its tutorial | M4 | `f5b97d1` | 08:29 | 0.23 | - | - | 0.29 | +818 -6 | 217 | 207 | 397 | one builder session |
| 219 | M4-63 prep | lint every workspace root in groups | M4 | `39165b2` | 08:41 | not recorded | - | - | not recorded | +3 -3 | 6 | 0 | 0 | integrator's commit; prep of M4-63, whose own row is owed (the integrator adds it with the merge) |
| 220 | M4-63 prep | API reports of decisions and liar's dice current | M4 | `7ea5ea1` | 08:52 | not recorded | - | - | not recorded | +149 -42 | 0 | 0 | 0 | integrator's commit; prep of M4-63, as row 219; the lines are API reports only |
| 221 | M4-60 | Live smokes 1 | M4 | `5d162e6` | 10:38 | 0.28 | - | - | 1.77 | +81 -0 | 0 | 0 | 81 | one session for M4-60 and M4-61 (row 222); live: six runs, 0.2685 USD (`games/m4-ledger.jsonl`), revision 4; the run folders are on `data/runs` |
| 222 | M4-61 | Live smokes 2 | M4 | `827675b` | 10:38 | in row 221 | - | - | in row 221 | +69 -0 | 0 | 0 | 69 | played and written by the session of row 221 (M4-60 and M4-61 together); live: four runs, 0.5932 USD (`games/m4-ledger.jsonl`), revision 4 |
| 223 | M4-61 follow-up | the data commit of the smokes in the runs indexes | M4 | `7bd6e87` | 10:39 | not recorded | - | - | not recorded | +10 -10 | 0 | 0 | 20 | integrator's commit; follow-up of row 222 (M4-61); the ten folders are on `data/runs` at `024119a1` |
| 224 | - | Decision A46: the findings of the M4 smokes, issues M4-68 to M4-71 | M4 | `b58aac5` | 10:40 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id; decision A46 adds M4-68 to M4-71 |
| 225 | M4-68 | Replay takes the cost cap from the log; the cap is not passed (A46) | M4 | `6d1a685` | 11:00 | 0.16 | - | - | 0.23 | +550 -34 | 116 | 130 | 325 | one builder session; added by decision A46, beside the plan; raises the runtime revision to 5 (tag `runtime-r5` owed) |
| 226 | M4-69 | Option quietEnds: no answer wake after a call that ends a seat's part (A46) | M4 | `9e7c8a8` | 11:02 | 0.23 | - | - | 0.33 | +329 -49 | 91 | 250 | 33 | one builder session; added by decision A46, beside the plan |
| 227 | M4-70 | Salt Market option markOwnOffers, with its live check (A46) | M4 | `fcec4aa` | 11:14 | 0.17 | - | - | 0.53 | +175 -10 | 77 | 93 | 13 | one builder session; added by decision A46, beside the plan; live check run 0.1746 USD (`games/m4-ledger.jsonl`) |
| 228 | M4-71 | The full check fits its budget again (A46) | M4 | `41e6371` | 13:26 | 0.23 | - | - | 2.41 | +408 -242 | 264 | 227 | 15 | one builder session; the session reported twice (it waited on its own background work), the last report is taken; added by decision A46, beside the plan; `pnpm check` 549.3 s of 600 s |
| 229 | M4-63 part 1 | the errata of the M4 specification, the issue record of M4 | M4 | `d7f4eb0` | 13:37 | 0.21 | - | - | 0.17 | +209 -27 | 0 | 0 | 236 | one builder session ("M4-63 part 1 errata, record", 213,358 tokens); the first part of the gate, whose second part is row 231 |
| 230 | M4-59 | The three series of D11: both signs kept, chess 1.209 requests per half-move | M4 | `cfa3676` | 13:43 | 0.36 | - | - | 6.40 | +439 -12 | 0 | 0 | 451 | one session ("Run M4-59 live series", 356,263 tokens, 6.40 h, most of it waiting on the runs); live: 52 runs, 4.0901 USD (`games/m4-ledger.jsonl`), runtime revision 4 on the code of `5b6336a` (errata H41); the run folders are on `data/runs` at `570801d`; "Other" holds the 104 ledger lines; the write-up is [`M4-GATE.md`](M4-GATE.md) |
| 231 | M4-63 | Gate of M4: the nine done-whens, the softer check, the errata, the resume note | M4 | `1651f35` | 14:01 | 0.21 | - | - | 0.56 | +172 -36 | 0 | 0 | 208 | one builder session (214483 tokens, 0.56 h by its last notice); the four kinds are not in the notice |
| 232 | M4-63 | Follow-up: the commit id of row 231 | M4 | `4de7a92` | 14:03 | in row 231 | - | - | - | +1 -1 | 0 | 0 | 1 | integrator's follow-up, folded into row 231's work |
| 233 | - | M4 review: the challenger's findings, one held as a failing test | M4 | `020f73c` | 14:20 | 0.34 | - | - | 0.36 | +267 -0 | 0 | 75 | 192 | one challenger session (342518 tokens); no blocker, no port difference from `legacy`; `docs/M4-REVIEW.md` |
| 234 | - | Decision A47: the review of M4, issue M4-72 | M4 | `e3792ac` | 14:21 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id; decision A47 adds M4-72 |
| 235 | M4-72 | Close the review of M4: a closed meter is logged, the cap's limits named, the definition frozen | M4 | `390448d` | 14:37 | 0.16 | - | - | 0.24 | +117 -37 | 62 | 32 | 29 | one builder session (161813 tokens); runtime revision 6 (the tag `runtime-r6` is owed); added by decision A47, beside the plan; sdk 2107 lines |
| 236 | - | Resume note: M4 closed, the tag runtime-r6 owed | M4 | `17a33a4` | 14:38 | not recorded | - | - | not recorded | +2 -2 | 0 | 0 | 4 | integrator's commit, no issue id; row written by M5-00 |
| 237 | M5 specification | M5 build specification, challenged: Whispers and the City of Keys, 58 issues; decisions A48 to A63 | M5 | `c5daac3` | 14:59 | not recorded | - | - | not recorded | +1263 -0 | 0 | 0 | 1263 | specification commit, its sessions not recorded; row written by M5-00 |
| 238 | M5-11 | Oracle additions: holdout of Whispers, the seal and the classifier of the City | M5 | `8435ff7` | 15:20 | 0.25 | - | - | 0.33 | +3464 -41 | 0 | 0 | 0 | one builder session (249014 tokens); the lines are oracle files only |
| 239 | M5-00 | Scaffold of M5 | M5 | `bd95c1d` | 15:34 | 0.27 | - | - | 0.34 | +1869 -23 | 349 | 182 | 1109 | one builder session (271309 tokens); wrote the rows 236 and 237 and the budgets at the start of M5; 252 lines of API reports and lockfile left out |
| 240 | M5-12 | Port: ledger 2: names through identity, the receipt through receipt-source | M5 | `fbb56f5` | 15:50 | 0.20 | - | - | 0.23 | +273 -30 | 38 | 187 | 31 | one builder session (198682 tokens) |
| 241 | M5-01 | The hook runEnded | M5 | `abb7d14` | 15:56 | 0.18 | - | - | 0.34 | +128 -32 | 66 | 77 | 14 | one builder session (177004 tokens); kernel +7 ("The kernel gate of M5" below) |
| 242 | - | Decision A64: the coming receipt id, DM_LIMIT in channels | M5 | `a5e8dd6` | 15:56 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 243 | M5-02 | Staged calls 1: the kernel | M5 | `cf8742e` | 16:02 | 0.23 | - | - | 0.43 | +383 -25 | 106 | 281 | 5 | one builder session (225027 tokens); kernel +37 |
| 244 | M5-08 | Live resume 1: the sessions in the snapshot | M5 | `681c4bf` | 16:09 | 0.26 | - | - | 0.51 | +712 -37 | 390 | 286 | 12 | one builder session (264412 tokens) |
| 245 | M5-13 | Port: channels 2: groups and the treasury | M5 | `74a183f` | 16:28 | 0.31 | - | - | 0.41 | +2148 -30 | 1302 | 217 | 284 | one builder session (312954 tokens); ported source; 375 lines of API reports, carried prompts and lockfile left out |
| 246 | M5-04 | The stage review: guard and consult merged, the lane held | M5 | `816903d` | 16:41 | 0.37 | - | - | 1.01 | +811 -79 | 445 | 360 | 12 | one builder session (368818 tokens); kernel +26, sdk +27, engine +19, booked by decision A66 |
| 247 | M5-15 | Port: exile 2: the gate, ransom, last will | M5 | `d3b3362` | 16:47 | 0.37 | - | - | 0.59 | +1839 -113 | 802 | 473 | 218 | one builder session (374690 tokens); ported source; 459 lines of API reports, carried prompts and lockfile left out |
| 248 | M5-05 | The kernel gate at the measured count, 1472 | M5 | `0bacb02` | 16:47 | 0.12 | - | - | 0.08 | +66 -12 | 0 | 56 | 22 | one builder session (119278 tokens); the gate set to the measured 1472 (erratum J30) |
| 249 | M5-19 | Port: progression 1: levels, doors, submitSolution, the looks | M5 | `f682c3a` | 16:50 | 0.08 | - | - | 0.58 | +2724 -12 | 1133 | 383 | 339 | one builder session (81097 tokens by its notice, 188 tool uses); ported source; 881 lines of API reports, carried prompts and lockfile left out |
| 250 | M5-58 | Licence: the whole repository under the Sustainable Use License with Additional Terms | M5 | `28d3a7c` | 16:52 | 0.16 | - | - | 0.21 | +1407 -1438 | 1252 | 906 | 687 | one builder session (159174 tokens); added by decisions A65 and A68, beside the plan; most source and test lines are the changed SPDX header of every file, not hand-written logic |
| 251 | M5-59 | Break the package cycle exile, channels, ledger: the service notices | M5 | `3f0fa67` | 17:30 | not recorded | - | - | not recorded | +492 -92 | 63 | 60 | 59 | made in the integrator's session, which has no report here (erratum J36); added by decision A68, beside the plan; 402 lines of API reports and lockfile left out |
| 252 | M5-03 | Staged calls 2: ctx.stage, the typed then, replay | M5 | `3561616` | 17:31 | 0.33 | - | - | 0.97 | +310 -45 | 166 | 141 | 12 | one builder session (327917 tokens) |
| 253 | M5-06 | Directors 1: every n ticks, facts, reviews | M5 | `54b8b6d` | 17:31 | 0.23 | - | - | 0.49 | +247 -29 | 121 | 130 | 3 | one builder session (230663 tokens) |
| 254 | M5-14 | Port: channels 3: the DM window, defy, names and marks in the replies | M5 | `a4d27e6` | 17:32 | 0.36 | - | - | 0.51 | +815 -98 | 495 | 220 | 129 | one builder session (363638 tokens); the note desk split off as M5-60 (A68) |
| 255 | M5-10 | Oracle harness for the story games | M5 | `334b75c` | 17:33 | 0.31 | - | - | 0.60 | +441 -66 | 249 | 243 | 6 | one builder session (306465 tokens); decisions A67 and A68 in the commit |
| 256 | M5-14 | The API report of progression after the dmRecords fields | M5 | `1bb8d66` | 17:42 | in row 254 | - | - | - | +5 -3 | 0 | 0 | 0 | integrator's follow-up of row 254 (M5-14); the lines are API reports only |
| 257 | M5-61 | turns: the old arena's draw as order "arena" | M5 | `a8e631e` | 18:04 | 0.12 | - | - | 0.12 | +94 -23 | 11 | 103 | 1 | one builder session (115215 tokens); added by decision A67, beside the plan |
| 258 | M5-62 | The licence gate as its own required CI job on every pull request and push | M5 | `5d4fc2a` | 18:04 | 0.11 | - | - | 0.08 | +135 -9 | 39 | 32 | 73 | one builder session (109382 tokens); added by decision A69, beside the plan |
| 259 | M5-25 | Port: petitions | M5 | `2f75190` | 18:05 | 0.23 | - | - | 0.25 | +1342 -10 | 448 | 193 | 266 | one builder session (232731 tokens); ported source; 445 lines of API reports, carried prompts and lockfile left out |
| 260 | M5-63 | Kernel: run the calls a runEnded hook stages | M5 | `bb841b3` | 18:06 | not recorded | - | - | not recorded | +13 -6 | 4 | 8 | 7 | made in the integrator's session, which has no report here; added by decision A70, beside the plan; kernel 1473, the gate raised by one; no runtime revision |
| 261 | M5-60 | Port: channels 4: the note desk | M5 | `f1b1555` | 18:07 | 0.25 | - | - | 0.29 | +831 -23 | 438 | 202 | 99 | one builder session (251071 tokens); split from M5-14 by decision A68, beside the plan; 115 lines of API reports and carried prompts left out |
| 262 | M5-21 | Port: receipts 1: receipt_issued, showReceipt, quoteDms; provides receipt-source | M5 | `a85af8e` | 18:07 | 0.31 | - | - | 0.38 | +1639 -15 | 544 | 311 | 232 | one builder session (305410 tokens); ported source; 567 lines of API reports, carried prompts and lockfile left out |
| 263 | M5-20 | Port: progression 2: acts, tool locks per level, the ranking service, runEnded | M5 | `73fdef6` | 18:08 | 0.36 | - | - | 0.41 | +1088 -68 | 361 | 305 | 93 | one builder session (363052 tokens); 397 lines of API reports and carried prompts left out |
| 264 | M5-07 | Directors 2: a Director that acts by tool use | M5 | `1b6e724` | 18:11 | 0.29 | - | - | 0.41 | +489 -36 | 306 | 172 | 15 | one builder session (288389 tokens) |
| 265 | M5-33 | Port: arena: the stop rules, round_end, the act brake, run_start and run_end | M5 | `46c0c52` | 18:43 | 0.28 | - | - | 0.35 | +1595 -10 | 485 | 227 | 251 | one builder session (280954 tokens); ported source; 642 lines of API reports and lockfile left out |
| 266 | M5-31 | Port: script 1: the rules, the triggers, directorMinute as a staged call | M5 | `8afbc8b` | 18:46 | 0.31 | - | - | 0.41 | +2959 -9 | 940 | 172 | 238 | one builder session (311304 tokens); ported source; 1618 lines of API reports, carried prompts and lockfile left out |
| 267 | M5-09 | Live resume 2: swt resume --budget, --pause-on | M5 | `7819684` | 18:47 | 0.25 | - | - | 0.41 | +536 -85 | 469 | 110 | 42 | one builder session (252773 tokens); the session reported twice, the last report is taken |
| 268 | M5-17 | Port: marks (class game) | M5 | `73b6ccc` | 18:49 | 0.33 | - | - | 0.45 | +1912 -15 | 614 | 498 | 228 | one builder session (331412 tokens); ported source; 587 lines of API reports, carried prompts and lockfile left out |
| 269 | M5-18 part 1 | Port: puzzles 2, part 1: level-pieces, the standing from progression, the service deal, the note check | M5 | `8acd840` | 18:50 | 0.30 | - | - | 0.46 | +956 -61 | 578 | 166 | 104 | one builder session (302479 tokens); its second half is M5-64 (A71, in the commit) |
| 270 | M5-62 | The licence job's check name matches the owner's ruleset: "Licence gate" | M5 | `175e294` | 18:54 | in row 258 | - | - | - | +5 -5 | 0 | 2 | 8 | integrator's follow-up of row 258 (M5-62) |
| 271 | M5-22 | Port: receipts 2: blame, minRun, and the channels and status gaps | M5 | `8116d56` | 19:03 | 0.36 | - | - | 0.67 | +1731 -54 | 604 | 254 | 117 | one builder session (359754 tokens); the session reported twice, the last report is taken; ported source; 810 lines of API reports, carried prompts and lockfile left out |
| 272 | M5-24 | Port: cast: STEWARD and the collections, escrow through ledger | M5 | `26978fc` | 19:10 | 0.29 | - | - | 0.33 | +1944 -15 | 519 | 357 | 304 | one builder session (292209 tokens); ported source; 779 lines of API reports, carried prompts and lockfile left out; decision A72 (M5-65) in the commit |
| 273 | M5-27 | Port: standoff 1: pieces held for others, the hand-over in text, claimPiece, the city's shop, the listener to exile.exiled | M5 | `a00116b` | 19:13 | 0.32 | - | - | 0.35 | +2044 -12 | 816 | 215 | 231 | one builder session (318949 tokens); ported source; 794 lines of API reports, carried prompts and lockfile left out |
| 274 | M5-34 | Directors: the gamemaker 1: the head, the report from the facts, the system text | M5 | `fbf018a` | 19:15 | 0.37 | - | - | 0.45 | +2636 -7 | 1470 | 497 | 51 | one builder session (368817 tokens); ported source; 625 lines of API reports, carried prompts and lockfile left out; decision A73 in the commit |
| 275 | M5-35 erratum | the gamemaker 2 needs facts and a quiet trigger first | M5 | `7e2efd2` | 19:21 | 0.16 | - | - | 0.08 | +2 -0 | 0 | 0 | 2 | integrator's commit; the builder session of M5-35 (161570 tokens) stopped before code (erratum J131); decision A74 adds M5-66 and M5-67; M5-35 itself is not merged |
| 276 | M5-29 | Port: standoff-tribunal 1: the blockers as facts, the call and the grace, the notes through channels | M5 | `ed17b3e` | 19:24 | 0.09 | - | - | 0.53 | +3429 -10 | 1425 | 446 | 329 | one builder session (87527 tokens by its notice, 188 tool uses); merged at 668 hand-written lines (A75); ported source; 1239 lines of API reports, carried prompts and lockfile left out |
| 277 | M5-32 | Port: script 2: the actions, standings_published, director_skipped | M5 | `f535cf6` | 19:32 | 0.29 | - | - | 0.32 | +1109 -218 | 423 | 272 | 71 | one builder session (293601 tokens); ported source; 561 lines of API reports, carried prompts and lockfile left out; decision A76 in the commit |
| 278 | M5-28 | Port: standoff 2: the ultimatum, its settlement and seizure, the gamemaker's facts | M5 | `3babd18` | 19:36 | 0.31 | - | - | 0.35 | +1486 -61 | 702 | 437 | 86 | one builder session (311420 tokens); ported source; 322 lines of API reports and carried prompts left out; decision A77 in the commit |
| 279 | M5-66 | progression: the facts section and tracks of the gamemaker's report | M5 | `d787cc1` | 19:38 | 0.18 | - | - | 0.22 | +416 -8 | 201 | 161 | 10 | one builder session (181213 tokens); added by decisions A73 and A74, beside the plan |
| 280 | M5-26 | Port: whispers: the whisperer, its duty, forgeReceipt, the popularity vote | M5 | `c7c6ef6` | 19:39 | 0.08 | - | - | 0.57 | +3277 -10 | 1474 | 356 | 335 | one builder session (75931 tokens by its notice, 179 tool uses); merged at about 560 hand-written source lines (A78); ported source; 1122 lines of API reports, carried prompts and lockfile left out |
| 281 | M5-64 | Port: puzzles 2, part 2: additive levels, the hand-over guard, the gamemaker's facts | M5 | `e86573c` | 19:49 | not recorded | - | - | not recorded | +1597 -177 | 1108 | 247 | 146 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A71, beside the plan; 273 lines of API reports, oracle files, carried prompts or lockfile left out |
| 282 | M5-64 follow-up | the stand-in deal of the receipts test answers revealFactor | M5 | `216a7aa` | 19:49 | not recorded | - | - | not recorded | +1 -1 | 0 | 2 | 0 | integrator's follow-up of row 281 (M5-64); tokens not recorded |
| 283 | M5-67 | Directors: a quiet trigger, the facts residents, active and notes (A74) | M5 | `f961e2b` | 19:56 | not recorded | - | - | not recorded | +231 -35 | 74 | 172 | 17 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A74, beside the plan |
| 284 | - | Issue record: the rows of the merged M5 issues | M5 | `8e9286f` | 19:56 | not recorded | - | - | not recorded | +57 -5 | 0 | 0 | 62 | integrator's commit, no issue id |
| 285 | M5-65 | channels, cast: direct messages to a figure (figures), deliver | M5 | `a99a143` | 19:59 | not recorded | - | - | not recorded | +460 -31 | 179 | 144 | 36 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A72, beside the plan; 132 lines of API reports, oracle files, carried prompts or lockfile left out |
| 286 | M5-23 | Port: motives: the deal, the whisperer's character through whispers, the core-motive check of a note | M5 | `d244d0c` | 20:00 | not recorded | - | - | not recorded | +1689 -10 | 739 | 257 | 254 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 449 lines of API reports, oracle files, carried prompts or lockfile left out |
| 287 | M5-30 | Port: standoff-tribunal 2: the votes, the lot, the strike through exile | M5 | `0998a56` | 20:05 | not recorded | - | - | not recorded | +2403 -168 | 657 | 1706 | 89 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 119 lines of API reports, oracle files, carried prompts or lockfile left out |
| 288 | M5-36 | Directors: the Confessor, with the mechanic interpretations | M5 | `715cc9c` | 20:10 | not recorded | - | - | not recorded | +2559 -6 | 514 | 1553 | 199 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 299 lines of API reports, oracle files, carried prompts or lockfile left out |
| 289 | M5-37 | the README section, the API report, the schema checks in the tests | M5 | `7803cb6` | 20:16 | not recorded | - | - | not recorded | +925 -2 | 348 | 223 | 43 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 313 lines of API reports, oracle files, carried prompts or lockfile left out |
| 290 | M5-69 | script: dm through channels.deliver, revealFactor through deal; the tick start after standoff | M5 | `5a1be5a` | 20:20 | not recorded | - | - | not recorded | +317 -72 | 56 | 213 | 34 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A76, beside the plan |
| 291 | M5-71 | puzzles: provide holdout-pieces for standoff-tribunal | M5 | `eb0a4e3` | 20:23 | not recorded | - | - | not recorded | +290 -11 | 86 | 140 | 32 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A82, beside the plan |
| 292 | - | API reports: regenerated after the merges of M5-64 to M5-71 | M5 | `930e953` | 20:25 | not recorded | - | - | not recorded | +151 -51 | 0 | 0 | 0 | integrator's commit, no issue id; 202 lines of API reports, oracle files, carried prompts or lockfile left out |
| 293 | M5-35 | Directors: the gamemaker 2: tracks, notes, budget line, the events since the last look | M5 | `b2a384c` | 20:26 | not recorded | - | - | not recorded | +699 -47 | 416 | 288 | 8 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 294 | M5-68 | cap-exemption: the holdout's exemption from the DM cap | M5 | `95386a4` | 20:29 | not recorded | - | - | not recorded | +295 -32 | 65 | 201 | 36 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A75, beside the plan |
| 295 | M5-16 | Port: names (class game): chooseName, the city's names at the deadline, provides identity | M5 | `caee19c` | 20:31 | not recorded | - | - | not recorded | +1669 -32 | 439 | 325 | 244 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 693 lines of API reports, oracle files, carried prompts or lockfile left out |
| 296 | M5-70 erratum | erratum: the resident system text needs the City parts and a character fact | M5 | `ea664f5` | 20:31 | not recorded | - | - | not recorded | +3 -1 | 0 | 0 | 4 | integrator's commit; the first builder session of M5-70 stopped before code (the resident system text needs the City parts and a character fact); decision A81 adds M5-70, A86 rescopes it |
| 297 | - | API reports: regenerated after M5-16; decision A87 on their unstable union order | M5 | `dc3c7dc` | 20:41 | not recorded | - | - | not recorded | +51 -50 | 0 | 0 | 1 | integrator's commit, no issue id |
| 298 | M5-74 | api reports: sort string-literal unions so a report changes only with the API | M5 | `33bc440` | 20:57 | not recorded | - | - | not recorded | +448 -194 | 162 | 92 | 224 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A87, beside the plan; 164 lines of API reports, oracle files, carried prompts or lockfile left out |
| 299 | M5-72 | city-directors: the check of a private thought in a Director's note | M5 | `eff7838` | 21:08 | not recorded | - | - | not recorded | +325 -10 | 194 | 118 | 18 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A83, beside the plan |
| 300 | M5-40 | Port: goals: the deal per act, the void goal at an exile, the payout at the act's end, the goal check of a note | M5 | `835518e` | 21:10 | not recorded | - | - | not recorded | +2165 -10 | 760 | 367 | 241 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 807 lines of API reports, oracle files, carried prompts or lockfile left out |
| 301 | M5-41 | tribunal 1: the schedule, the call, the vote, the result, the gate | M5 | `8d55ecc` | 21:22 | not recorded | - | - | not recorded | +3451 -34 | 1517 | 159 | 449 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 1360 lines of API reports, oracle files, carried prompts or lockfile left out |
| 302 | M5-70 | the resident system text: the deal in start, prompt.frame and prompt.character, the prompts after the kernel, the City order | M5 | `42afd6b` | 21:33 | not recorded | - | - | not recorded | +595 -62 | 310 | 134 | 33 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decisions A81 and A86, beside the plan; the variable is the prompts (carried byte for byte) |
| 303 | - | API report of standoff: the field order of ultimatums as the build prints it | M5 | `dff38b4` | 21:42 | not recorded | - | - | not recorded | +1 -1 | 0 | 0 | 0 | integrator's commit, no issue id |
| 304 | - | Decision A90: the API reports also flip the field order of inferred object types | M5 | `288a685` | 21:51 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 305 | M5-75 | api reports: sort the members of object type literals so a report changes only with the API | M5 | `a4127c6` | 22:05 | not recorded | - | - | not recorded | +10399 -10214 | 142 | 53 | 0 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A90, beside the plan; 20418 lines of API reports, oracle files, carried prompts or lockfile left out |
| 306 | M5-42 | tribunal 2: the faction draft (nominate, join, refuse, the leaders, the bloc bonus) | M5 | `20d8803` | 22:13 | not recorded | - | - | not recorded | +1103 -53 | 629 | 201 | 90 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 236 lines of API reports, oracle files, carried prompts or lockfile left out |
| 307 | M5-44 | Port: seal: the auction, the strike through exile, the listener to the tribunal's events, the expiry | M5 | `f9f27ba` | 22:17 | not recorded | - | - | not recorded | +2261 -10 | 807 | 421 | 291 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 752 lines of API reports, oracle files, carried prompts or lockfile left out |
| 308 | M5-38 | game whispers: the family, the story data, the compose step, the oracle files at level 3 | M5 | `9402157` | 22:46 | not recorded | - | - | not recorded | +1849 -31 | 1294 | 291 | 203 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 309 | M5-43 | tribunal 3: scheduleTribunal, the act's end, the views as facts, tribunal.missing for the seal | M5 | `1a6a468` | 22:49 | not recorded | - | - | not recorded | +10397 -87 | 557 | 9649 | 83 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 195 lines of API reports, oracle files, carried prompts or lockfile left out |
| 310 | M5-77 | progression: task-lines under the door-open notice, tribunal.section pinned | M5 | `51b70a0` | 23:25 | not recorded | - | - | not recorded | +280 -51 | 152 | 82 | 35 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A92, beside the plan |
| 311 | M5-39 | whispers 2: the holdout file, the fake run with the Directors, the prompt pins, the old story tests | M5 | `390f36e` | 23:34 | not recorded | - | - | not recorded | +1768 -21 | 7 | 1732 | 32 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 312 | M5-76 | samples: defy, blame, payRansom and lastWill for the fake driver | M5 | `a61c65c` | 23:44 | not recorded | - | - | not recorded | +253 -24 | 138 | 127 | 12 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A92, beside the plan |
| 313 | - | M5 decisions: A94, issues M5-78 to M5-81 after the reports of M5-39 and M5-76 | M5 | `a53df26` | 23:45 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 314 | M5-81 | resident prompts: the City, the persona and the brief from the game's prompt | M5 | `03c56bf` | 00:06 | not recorded | - | - | not recorded | +165 -32 | 132 | 41 | 9 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A94, beside the plan |
| 315 | M5-80 | prompts: old descriptions of transferPoints and sendDM carried back | M5 | `4973908` | 00:07 | not recorded | - | - | not recorded | +21 -21 | 4 | 29 | 5 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A94, beside the plan |
| 316 | - | M5 decisions: A95, the seeded persona in motives, issue M5-82 | M5 | `415812c` | 00:07 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 317 | M5-79 | testkit: the same answerers of the review stage on both sides of the standing checks | M5 | `61c9480` | 00:15 | not recorded | - | - | not recorded | +169 -36 | 112 | 76 | 4 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A94, beside the plan |
| 318 | - | M5 decisions: A96, the seal's tick-start order, issue M5-83 | M5 | `c05fe57` | 00:15 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 319 | M5-78 | fake run: the offline asker writes no count, the look resumes like a resident | M5 | `273ac0a` | 00:29 | not recorded | - | - | not recorded | +297 -273 | 12 | 556 | 2 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A94, beside the plan |
| 320 | M5-83 | seal: the tick no longer names progression, so seal, standoff and the door clock load together | M5 | `fc2dbf3` | 00:31 | not recorded | - | - | not recorded | +104 -4 | 8 | 90 | 7 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A96, beside the plan |
| 321 | M5-82 | motives: the seeded persona of the old assignPersonas, Whispers' prompt wired | M5 | `1db08ca` | 00:33 | not recorded | - | - | not recorded | +274 -14 | 103 | 130 | 16 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A95, beside the plan |
| 322 | - | M5 decisions: A97, the command-line resumes of a long run, issue M5-84 | M5 | `c6ea789` | 00:44 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 323 | M5-45 | city 1: the City of Keys game, Act I at level 3 | M5 | `6a2703c` | 01:01 | not recorded | - | - | not recorded | +4910 -29 | 3075 | 1609 | 158 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 324 | - | M5 decisions: A98, the goals status name and the figure's persona, issues M5-85 and M5-86 | M5 | `7ae760f` | 01:01 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 325 | M5-52 | rerun plan of M5: the runs and caps of section 7, the manifests' model lines, the ledger | M5 | `bd0ee26` | 01:09 | not recorded | - | - | not recorded | +129 -0 | 0 | 0 | 129 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 326 | M5-85 | goals: the status names the target by its chosen name | M5 | `4ef13f7` | 01:13 | not recorded | - | - | not recorded | +68 -22 | 8 | 71 | 6 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A98, beside the plan |
| 327 | M5-84 | cli standing parts: resume a long run from the first, the middle and the last boundary | M5 | `9738151` | 01:16 | not recorded | - | - | not recorded | +18 -13 | 0 | 30 | 1 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A97, beside the plan |
| 328 | M5-86 | motives: the persona of a figure's profession | M5 | `0daf49d` | 01:19 | not recorded | - | - | not recorded | +169 -26 | 74 | 95 | 14 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A98, beside the plan |
| 329 | M5-46 | city 2: act1-s11, the resumed file and the burn file | M5 | `6321d2e` | 01:20 | not recorded | - | - | not recorded | +218 -37 | 63 | 140 | 22 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 330 | - | M5 decisions: A99, the check budget, issue M5-87 | M5 | `9000f57` | 01:31 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 331 | M5-53 | live: the first Whispers run, read as a smoke; run 2 held | M5 | `a3da31c` | 01:52 | not recorded | - | - | not recorded | +50 -11 | 0 | 0 | 61 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; live: run 1 of the plan, 0.9517 USD (`games/m5-ledger.jsonl`), runtime revision 6; read as the smoke (A100) |
| 332 | - | M5 decisions: A100, run 1 read as the smoke, issues M5-88 and M5-89 | M5 | `7445759` | 01:52 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 333 | M5-47 | city 3: Act II by projection, the wall and the feast | M5 | `e5ac8a3` | 01:58 | not recorded | - | - | not recorded | +407 -3 | 0 | 380 | 21 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 334 | M5-88 | models: read a Director's answer as the last object that fits its schema | M5 | `0296262` | 02:04 | not recorded | - | - | not recorded | +193 -23 | 121 | 91 | 2 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A100, beside the plan |
| 335 | M5-48 | city 4: the cast, the direction dials, the fake run, --pause-on, the card | M5 | `64f438f` | 02:21 | not recorded | - | - | not recorded | +307 -31 | 58 | 253 | 27 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 336 | - | M5 decisions: A101, issue M5-90 | M5 | `2857d6d` | 02:22 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 337 | M5-87 | standing parts: share the fake and straight runs, deal the checks in units; morris resumes its game file's fake run | M5 | `922a92d` | 02:36 | not recorded | - | - | not recorded | +302 -43 | 0 | 344 | 1 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A99, beside the plan |
| 338 | M5-90 | motives figurePersonas (old led), tribunal scheduleTribunal sample | M5 | `420483e` | 02:49 | not recorded | - | - | not recorded | +137 -28 | 69 | 82 | 11 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A101, beside the plan |
| 339 | M5-89 | confessor, manifest: no request for a round without statements, no model for script | M5 | `d022725` | 02:52 | not recorded | - | - | not recorded | +127 -11 | 31 | 93 | 11 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A100, beside the plan |
| 340 | M5-49 | Additions: the metrics of Whispers and the City for the facts table | M5 | `1a685a0` | 02:59 | not recorded | - | - | not recorded | +612 -20 | 335 | 222 | 75 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 341 | - | M5 decisions: A102, the test time and the guard's cost, issues M5-91 and M5-92 | M5 | `578e65d` | 03:25 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 342 | M5-53 run 2 | live: run 2 of Whispers (rumours only), runtime r7 | M5 | `77fd920` | 03:49 | not recorded | - | - | not recorded | +25 -8 | 0 | 0 | 33 | the second part of M5-53, played after M5-88 and M5-89 (A100, A103); tokens not recorded; live: run 2 of the plan, 0.2145 USD, runtime revision 7 |
| 343 | - | M5 decisions: A103, after run 2 of Whispers | M5 | `73b002c` | 03:49 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 344 | M5-50 | API freeze 1: the surface | M5 | `c9b7f2b` | 04:00 | not recorded | - | - | not recorded | +700 -258 | 258 | 0 | 187 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 513 lines of API reports, oracle files, carried prompts or lockfile left out |
| 345 | M5-91 | review cost: charge a review's requests to the answering Director | M5 | `ebc334e` | 04:09 | not recorded | - | - | not recorded | +144 -20 | 85 | 69 | 5 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A102, beside the plan |
| 346 | - | M5 decisions: A104, the internal exports, M5-51's paths, issues for after the baseline | M5 | `4a3ed0c` | 04:09 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 347 | - | docs: P480 and P486 point to the issues for after the baseline (A104) | M5 | `61957ad` | 04:09 | not recorded | - | - | not recorded | +2 -2 | 0 | 0 | 4 | integrator's commit, no issue id |
| 348 | M5-94 | api reports: an @internal export leaves the report | M5 | `aaac02b` | 04:27 | not recorded | - | - | not recorded | +98 -962 | 84 | 17 | 4 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A104, beside the plan; 955 lines of API reports, oracle files, carried prompts or lockfile left out |
| 349 | M5-56 | docs chores: game and Director READMEs, the reference of stages and Directors, checklist line 64 | M5 | `a235bd0` | 04:37 | not recorded | - | - | not recorded | +281 -35 | 0 | 0 | 316 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 350 | M5-92 | standing checks: one command-line resume of a long run, eight sampled boundaries | M5 | `d5b5ac2` | 04:50 | not recorded | - | - | not recorded | +58 -44 | 11 | 90 | 1 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A102, beside the plan |
| 351 | M5-51 | api freeze: frozen.json, the gate, pnpm api:freeze --write | M5 | `da28849` | 04:54 | not recorded | - | - | not recorded | +2631 -6 | 637 | 167 | 1821 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 352 | M5-51 follow-up | api freeze: frozen.json recorded on the develop head | M5 | `c724fcd` | 04:54 | not recorded | - | - | not recorded | +25 -25 | 0 | 0 | 50 | integrator's follow-up of row 351 (M5-51): `pnpm api:freeze --write` on the develop head; tokens not recorded |
| 353 | - | A105: M5-95, unused base-mechanic exports internal, two schemas exported | M5 | `b04cd6d` | 04:55 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 354 | M5-95 | api freeze: unused base-mechanic exports internal, two schemas exported | M5 | `dcb8fda` | 05:17 | not recorded | - | - | not recorded | +512 -705 | 62 | 0 | 453 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A105, beside the plan; 702 lines of API reports, oracle files, carried prompts or lockfile left out |
| 355 | M5-95 follow-up | api freeze: frozen.json recorded on the develop head | M5 | `17f6286` | 05:17 | not recorded | - | - | not recorded | +27 -27 | 0 | 0 | 54 | integrator's follow-up of row 354 (M5-95): `pnpm api:freeze --write` on the develop head; tokens not recorded |
| 356 | - | A106: M5-96, exile and ledger contracts in their reports | M5 | `53ca918` | 05:18 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 357 | M5-96 | api freeze: exile and ledger contracts in their reports, stale report imports dropped | M5 | `106b459` | 05:33 | not recorded | - | - | not recorded | +440 -66 | 36 | 10 | 86 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A106, beside the plan; 374 lines of API reports, oracle files, carried prompts or lockfile left out |
| 358 | M5-96 follow-up | api freeze: frozen.json recorded on the develop head | M5 | `cbfb34d` | 05:33 | not recorded | - | - | not recorded | +27 -27 | 0 | 0 | 54 | integrator's follow-up of row 357 (M5-96): `pnpm api:freeze --write` on the develop head; tokens not recorded |
| 359 | - | A107: M5-97, command-line resumes from three boundaries | M5 | `dd5fc04` | 05:44 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 360 | M5-97 | errata J297: the cold check after the cut | M5 | `10100b8` | 06:13 | not recorded | - | - | not recorded | +22 -22 | 0 | 43 | 1 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A107, beside the plan |
| 361 | - | A108: M5-98, one play per game on the command line, lint grouping measured | M5 | `d6c4e2d` | 06:13 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 362 | M5-98 | standing checks: one play per game, one Whispers variant resumed, run cache without build output | M5 | `6b88096` | 07:58 | not recorded | - | - | not recorded | +104 -71 | 32 | 142 | 1 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A108, beside the plan |
| 363 | - | A109: M5-99, lint types against declarations | M5 | `4963e97` | 08:09 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 364 | M5-99 | errata J299: lint against declarations measured, reverted | M5 | `29a6188` | 09:06 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A109, beside the plan |
| 365 | - | A110: the live plan goes on, M5-100 one program for typecheck and lint | M5 | `1ffa813` | 09:06 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 366 | M5-54 | live: the City Act I base, runtime r7 | M5 | `8748174` | 09:21 | not recorded | - | - | not recorded | +46 -1 | 0 | 0 | 47 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; live: run 3 of the plan, the Act I base, 0.0686 USD, runtime revision 7 |
| 367 | M5-54 follow-up | errata numbered J300 to J302 | M5 | `9a34e18` | 09:26 | not recorded | - | - | not recorded | +3 -3 | 0 | 0 | 6 | integrator's follow-up of row 366 (M5-54); tokens not recorded |
| 368 | M5-55 | live: the Act II check resume played no tick | M5 | `df8643d` | 09:26 | not recorded | - | - | not recorded | +14 -1 | 0 | 0 | 15 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; live: run 4 of the plan with `--ticks 6`, no tick played, 0.0000 USD (J303, A111) |
| 369 | - | A111: run 4 again with --ticks 14, M5-101 resume tick count and unknown flags | M5 | `04891ab` | 09:26 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 370 | M5-55 runs 4 and 5a | live: Act II from the base, the check resume and run 5a | M5 | `a39b6b3` | 10:04 | not recorded | - | - | not recorded | +28 -8 | 0 | 0 | 36 | the second part of M5-55 (run 4 again with `--ticks 14`, A111, and run 5a); tokens not recorded; live: 0.0741 and 0.3724 USD, runtime revision 7 |
| 371 | M5-100 | lint: typecheck and lint each project from one program | M5 | `bd54255` | 10:44 | not recorded | - | - | not recorded | +424 -69 | 396 | 79 | 18 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A110, beside the plan |
| 372 | - | A112: M5-102, tests on three workers without blocking runs | M5 | `d24c430` | 10:44 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 373 | M5-55 runs 5b and 5c | live: Act II runs 5b and 5c from the base | M5 | `ee30c3b` | 10:45 | not recorded | - | - | not recorded | +22 -8 | 0 | 0 | 30 | the third part of M5-55; tokens not recorded; live: 0.3261 and 0.2907 USD, runtime revision 7 |
| 374 | M5-101 | cli: swt resume refuses a --ticks not above the snapshot, every command refuses a foreign flag | M5 | `6cacb45` | 11:07 | not recorded | - | - | not recorded | +97 -42 | 46 | 17 | 76 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A111, beside the plan |
| 375 | M5-102 | errata J308: measurements of the child process, the event-loop gaps and three cold checks | M5 | `ce0dd80` | 11:47 | not recorded | - | - | not recorded | +237 -55 | 6 | 283 | 3 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A112, beside the plan |
| 376 | - | A113: the check is green in 582 s, M5-103 for margin before the gate | M5 | `9259e9a` | 12:09 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 377 | M5-103 | check: tests without isolation between files, two workers with a 384 MB heap, api reports unsorted | M5 | `12aa64a` | 15:02 | not recorded | - | - | not recorded | +71 -19 | 53 | 14 | 23 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A113, beside the plan |
| 378 | - | A114: two test workers without isolation, the check inside budget, B3 | M5 | `565efae` | 15:02 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 379 | M5-57 | Gate of M5: the nine done-whens, the softer check, the errata, the freeze dated, the resume note | M5 | `ab0d283` | 15:35 | not recorded | - | - | not recorded | +549 -47 | 0 | 0 | 0 | one builder session; commit id, merge time and lines filled by the integrator; tokens and agent time not recorded; cold `pnpm check` on `ab0d283` green in 523.6 s, peak 5863 MB, as row 231 of M4-63 was; the gate test `scripts/gates/m5-gate.test.ts` is its only test file |
| 380 | M5-57 follow-up | record row 379 filled; check green 523.6 s | M5 | `15df4b0` | 15:44 | not recorded | - | - | not recorded | +1 -1 | 0 | 0 | 2 | integrator's follow-up of row 379 (M5-57): its commit id, merge time and the check of `ab0d283`; tokens not recorded |
| 381 | - | A115: M5 closed; record row 379 completed | M5 | `82dc44c` | 15:44 | not recorded | - | - | not recorded | +2 -1 | 0 | 0 | 3 | integrator's commit, no issue id |
| 382 | - | RESUME: the record of M5-57 completed | M5 | `f270295` | 15:44 | not recorded | - | - | not recorded | +2 -4 | 0 | 0 | 6 | integrator's commit, no issue id |
| 383 | M5 review | M5 review: the challenger's findings, four held as failing tests | M5 | `1a063fe` | 16:03 | not recorded | - | - | not recorded | +334 -0 | 0 | 125 | 209 | the milestone review of M5 (`docs/M5-REVIEW.md`), a challenger session; tokens not recorded |
| 384 | - | A116: the review's findings as M5-104 to M5-106 | M5 | `f6879d7` | 16:03 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 385 | M5-105 | city: addition 3 at level 3 with the Confessor | M5 | `218e468` | 16:23 | not recorded | - | - | not recorded | +220 -11 | 0 | 202 | 4 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A116, beside the plan |
| 386 | M5-104 | api freeze gate: second freeze row, derived base, schema breaks, frozen set, owner's go | M5 | `ec5354a` | 16:24 | not recorded | - | - | not recorded | +319 -32 | 220 | 70 | 61 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A116, beside the plan |
| 387 | M5-106 | lint signal crash, standing test titles, M5-GATE left open | M5 | `557c7ec` | 16:27 | not recorded | - | - | not recorded | +217 -114 | 76 | 236 | 19 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A116, beside the plan |
| 388 | - | A117: M5 closed after the review's fixes; check green 474.5 s | M5 | `4604a12` | 16:35 | not recorded | - | - | not recorded | +3 -2 | 0 | 0 | 5 | integrator's commit, no issue id; the close of M5 (the commit of `milestone-m5`, `scripts/release/tags.ts`) |
| 389 | M6 specification | M6 spec: the release, 31 issues in nine waves, decisions A118 to A134 | M6 | `797a55f` | 17:00 | not recorded | - | - | not recorded | +845 -0 | 0 | 0 | 845 | specification commit, its session not recorded |
| 390 | M6 specification | M6 spec: the independent challenge, 28 findings, corrections applied | M6 | `d98f987` | 17:22 | not recorded | - | - | not recorded | +187 -50 | 0 | 0 | 237 | the independent challenge of the specification, a separate session; not recorded |
| 391 | - | A135 to A139: the decisions the M6 challenge asked for | M6 | `0315667` | 17:22 | not recorded | - | - | not recorded | +5 -0 | 0 | 0 | 5 | integrator's commit, no issue id |
| 392 | - | A136: the Node line in issue M6-31 | M6 | `0da7ade` | 17:23 | not recorded | - | - | not recorded | +1 -1 | 0 | 0 | 2 | integrator's commit, no issue id |
| 393 | M6-00 | Scaffold of M6 | M6 | `0c12a32` | 17:36 | not recorded | - | - | not recorded | +321 -5 | 24 | 0 | 296 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 394 | M6-17 | The data repository and the link classes | M6 | `5e7f533` | 17:52 | not recorded | - | - | not recorded | +690 -0 | 514 | 174 | 2 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 434 hand-written lines by decision A140, which records the overrun; the `LICENSE` commit on `data/runs` was pushed by the integrator (K7) |
| 395 | - | A140: M6-17 size, unpublished-history links, data branch licence, Director package kind | M6 | `32fcab9` | 17:53 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 396 | M6-02 | installed table of a project: a data game with a Director (A121, P2) | M6 | `f8b80a9` | 17:59 | not recorded | - | - | not recorded | +318 -42 | 209 | 132 | 19 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 397 | M6-31 | the Node line of 1.0: engines >=22.19, .node-version 22.23.4, target node22.19 | M6 | `d819826` | 17:59 | not recorded | - | - | not recorded | +9 -5 | 2 | 0 | 12 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A136 |
| 398 | M6-31 follow-up | M6-31 errata: conflict markers removed | M6 | `35c4686` | 18:00 | not recorded | - | - | not recorded | +0 -3 | 0 | 0 | 3 | integrator's follow-up of row 397 (M6-31); tokens not recorded |
| 399 | M6-01 | sdk: the run-time check of service calls (A37, A119) | M6 | `6597b7c` | 18:10 | not recorded | - | - | not recorded | +182 -13 | 45 | 132 | 18 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; sdk +9 of the 15 booked |
| 400 | M6-13 | testkit: the TSDoc of checkResumeEveryBoundary says it samples (J318) | M6 | `d31eb05` | 18:11 | not recorded | - | - | not recorded | +19 -11 | 12 | 10 | 8 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 401 | M6-05 | rename: keep the variant keys and patterns of old names; errata | M6 | `fbab23c` | 18:15 | not recorded | - | - | not recorded | +536 -16 | 361 | 180 | 10 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; Source plus Tests 541 by the rule above |
| 402 | M6-03 | swt doctor: Node, versions, keys by name, SWT_ names, offline | M6 | `b75c6e6` | 18:21 | not recorded | - | - | not recorded | +468 -25 | 283 | 157 | 53 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; Source plus Tests 440 by the rule above |
| 403 | M6-18 | The legacy runs, staged locally | M6 | `356426e` | 18:26 | not recorded | - | - | not recorded | +373 -0 | 236 | 112 | 25 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; the staged branch and its digest in "The legacy runs staged by M6-18" |
| 404 | M6-20 | switch prepared: switch-main.ts checks, prints, verifies; runtime-r3 at 9d3ba515 | M6 | `aa26f08` | 18:31 | not recorded | - | - | not recorded | +554 -3 | 365 | 187 | 5 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; Source plus Tests 552 by the rule above |
| 405 | M6-14 | reports: a paused run, a resumed run from its resume, a dirty tree (P488, P493, P494) | M6 | `f7b7f73` | 18:36 | not recorded | - | - | not recorded | +281 -37 | 171 | 105 | 21 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 406 | M6-04 | swt doctor --online: one minimal request per provider, cost first | M6 | `92c0fa4` | 18:44 | not recorded | - | - | not recorded | +493 -21 | 292 | 141 | 56 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; decision A142 widens A135 to the probe of `@swarmtales/models`; Source plus Tests 433 by the rule above |
| 407 | M6-16 | B2: the guard answers by its tool verdict | M6 | `2e9d969` | 18:50 | not recorded | - | - | not recorded | +299 -55 | 105 | 214 | 26 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; runtime revision 8 (the tag `runtime-r8` is owed); engine +5 of the 10 booked, contracts +4 (`answerTool`); decision A143 |
| 408 | - | Resume: runtime-r8 owed at 2e9d969 (M6-16) | M6 | `74ca3ca` | 18:51 | not recorded | - | - | not recorded | +1 -1 | 0 | 0 | 2 | integrator's commit, no issue id |
| 409 | M6-06 | rename applied: grid, quarry, lanterns, harbor-lights, ember-tricks, blind-bid, econ-lab; tictactoe, morris | M6 | `6b4954b` | 19:41 | not recorded | - | - | not recorded | +1451 -1147 | 501 | 1249 | 588 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; the renamed files are the script's output (4.4) and are not told apart in the line columns; decision A144; 260 lines of API reports, oracle files, carried prompts or lockfile left out |
| 410 | M6-19 | docs/history: the cited papers of the old platform, carried | M6 | `68d1a66` | 19:58 | not recorded | - | - | not recorded | +5003 -1 | 3 | 0 | 5001 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; 5001 lines of carried papers; decision A145 |
| 411 | M6-09 | sample 2: team tic-tac-toe with grid, team-channel and consensus, as a game file and as YAML | M6 | `ae314ef` | 20:08 | not recorded | - | - | not recorded | +382 -15 | 36 | 151 | 185 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 412 | M6-10 | sample 3: roles and private texts, a captain per team and a briefing per role and per resident | M6 | `7588d94` | 20:20 | not recorded | - | - | not recorded | +367 -15 | 50 | 158 | 152 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded |
| 413 | M6-11 | sample 4: a Director and its dial, the coach on a tick trigger at direction 0 and 8 | M6 | `78cad6e` | 20:26 | not recorded | - | - | not recorded | +563 -93 | 112 | 145 | 205 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; decision A146 (the second way out of 3.4); 194 lines of API reports, oracle files, carried prompts or lockfile left out |
| 414 | M6-07 | packaging: the published list, its gate, the CLI build and the umbrella's swt | M6 | `f75224c` | 20:30 | not recorded | - | - | not recorded | +1562 -174 | 96 | 247 | 1390 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; about 1000 lines of `package.json` written by one script count as generated (A147), about 340 hand-written |
| 415 | M6-12 | the game tutorial and the tutorials gate | M6 | `3c46680` | 20:36 | not recorded | - | - | not recorded | +414 -1 | 0 | 157 | 258 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; decision A148 |
| 416 | M6-23 | rerun plan of M6: the four runs of 10.2 with their commands and caps | M6 | `155d497` | 20:47 | not recorded | - | - | not recorded | +154 -0 | 0 | 0 | 154 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; decision A149 |
| 417 | M6-21 | release scripts: release:check, release:version, release:names, docs/RELEASE.md | M6 | `224b8bb` | 20:56 | not recorded | - | - | not recorded | +717 -2 | 493 | 133 | 93 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; decision A150 (`release:names` run once, read-only); Source plus Tests 626 by the rule above |
| 418 | M6-24 | live: the tic-tac-toe baseline (run 1 of the M6 rerun plan) | M6 | `8714c7d` | 21:06 | not recorded | - | - | not recorded | +22 -3 | 0 | 0 | 25 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; live: run 1 of the plan, 0.0785 USD, runtime revision 8 |
| 419 | M6-22 | GAMES.md: every game has a live run; the runs of tic-tac-toe linked | M6 | `c6244ec` | 15:42 | not recorded | - | - | not recorded | +150 -89 | 3 | 4 | 228 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; the docs of 1.0 (README, `GAMES.md`, `docs/README.md`, `RELATED-WORK.md`, stability, `CITATION.cff`) |
| 420 | M6-32 | Seat order after a resume: card-table and liar's dice | M6 | `c3763de` | 15:47 | not recorded | - | - | not recorded | +55 -6 | 19 | 39 | 3 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A151, beside the plan |
| 421 | M6-26 | live: B2's check, Whispers under runtime revision 8 (run 4 of the M6 rerun plan) | M6 | `04fed25` | 16:03 | not recorded | - | - | not recorded | +21 -6 | 0 | 0 | 27 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; live: run 4 of the plan, 0.2264 USD, runtime revision 8 |
| 422 | M6-15 | B3: tests independent of their order; the check shuffles them by a seed of the head | M6 | `790747d` | 16:46 | not recorded | - | - | not recorded | +201 -78 | 79 | 190 | 10 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; decision A152 |
| 423 | M6-33 | prompts: check every owner's declared variables, not only the first reader's | M6 | `ccbf5cb` | 17:02 | not recorded | - | - | not recorded | +23 -4 | 7 | 18 | 2 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A152, beside the plan |
| 424 | M6-08 | packed-install gate: pack, offline install outside the repository, plays from the tarballs | M6 | `5e49fb9` | 17:16 | not recorded | - | - | not recorded | +606 -10 | 222 | 249 | 145 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; decision A153 (the lockfile way out and the fix of K36 inside the issue); the gate costs about 9 s after the build; Source plus Tests 471 by the rule above |
| 425 | M6-25 | live: the release smoke, doctor --online and the Hello Game from the packed install (runs 2 and 3) | M6 | `4c2ffcc` | 17:28 | not recorded | - | - | not recorded | +17 -2 | 0 | 0 | 19 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; live: runs 2 and 3 of the plan, 0.0000021 and 0.0019 USD, runtime revision 8 |
| 426 | - | Decision A154: issue M6-34 opens (kernel commit outside a clone, plugin versions) | M6 | `e8e175a` | 17:28 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 427 | M6-34 | cli manifest: no git outside a clone, plugin versions | M6 | `60d6045` | 17:46 | not recorded | - | - | not recorded | +284 -18 | 167 | 120 | 15 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A154, beside the plan; decision A155 |
| 428 | - | Decision A156: issue M6-35 opens (the check's memory margin) | M6 | `c08638e` | 17:53 | not recorded | - | - | not recorded | +1 -0 | 0 | 0 | 1 | integrator's commit, no issue id |
| 429 | M6-35 | check memory: lint runs two workers, the check's peak falls by about 1.6 GB | M6 | `f2e4044` | 18:40 | not recorded | - | - | not recorded | +18 -4 | 12 | 8 | 2 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A156, beside the plan; cold check green in 408.9 s, peak 4556 MB (on the builder's head) |
| 430 | M6-36 | public viewer page and README review: picture, viewer links, shorter findings, pnpm swt | M6 | `51af484` | 20:28 | not recorded | - | - | not recorded | +344 -31 | 194 | 58 | 119 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A157 (the owner's go of 2026-11-23), beside the plan |
| 431 | M6-37 | README rewritten for researchers: moments, questions, games, mechanics, Directors | M6 | `432a1ab` | 21:17 | not recorded | - | - | not recorded | +173 -55 | 3 | 53 | 172 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A158 (the owner's word of 2026-11-23: no line limit for the README), beside the plan; the commit of `develop` at the switch |
| 432 | M6-38 | switch-main: an optional tag whose commit the clone does not hold is left out (A159) | M6 | `acfa5d4` | 05:40 | not recorded | - | - | not recorded | +30 -5 | 22 | 12 | 1 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; added by decision A159, after the owner's switch of 2026-11-24, beside the plan |
| 433 | M6-29 | after the switch: workflows and docs name the branches as they stand | M6 | `c138860` | 05:47 | not recorded | - | - | not recorded | +29 -19 | 0 | 0 | 48 | builder session; its notice did not reach the gate issue's session, so tokens and agent time are not recorded; the conditional issue of the plan, its trigger O3 done on 2026-11-24 |
| 434 | M6-30 | Gate of M6: the ten done-whens, the 1.0 list line by line, the softer check, the save list, the errata, the resume note | M6 | the gate's squash commit | 06:20 | not recorded | - | - | not recorded | owed | owed | owed | owed | one builder session; commit id, merge time and lines filled by the integrator; tokens and agent time not recorded; the gate test `scripts/gates/m6-gate.test.ts` is its only test file; cold `pnpm check` on the gate's tree green in 432.4 s, peak 4622 MB |

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

State at commit `cfa3676` and the gate's squash commit, 231 rows (229 commits and the milestone reviews of M2 and
M3, which have no commit). The token sums below are those of the first 82 rows and of the rows 171 to 230: the usage
file of the sessions ends at row 82, the rows 83 to 170 have no number, the rows of M4 from 171 on take the notices
of the second integrator session, and row 231 waits for its notice.

| | Planned | Merged | Note |
|---|---|---|---|
| M0 | 14 (A12) | not recorded per issue | 3 rows: the root commit squashes the issues of the frame, then the oracle files and the spike paper. The other M0 issues on the old state (the resume note names the noise floor and the chess engine) were merged on `legacy` and have no row |
| M1 | 37 (A12) | 37 | M1-00 to M1-36 |
| M2 | 25 (A12) | 25 | M2-00 to M2-24; the gate M2-24 merged last (row 129, [`M2-GATE.md`](M2-GATE.md): 61 live runs, 1.6022 USD of the live budget of 10 USD). Beside the plan: the follow-up issues M2-25 and M2-26 of the reviews, both merged, M2-27 (row 134), which closes the milestone review (row 132), and M2-28 to M2-30 of A29 (rows 141, 142, 153) |
| Sum of M0 to M2 | 76 | 62 planned issues of M1 and M2, plus the 3 rows of M0. With the issues beside the plan (M1-37 to M1-40, M2-25 to M2-27): **72**, the number of kill check 1; with M2-28 to M2-30 (A29, merged after the gate): 75 | kill line 150. Every row with the milestone M0, M1 or M2 (reviews, the specification, follow-up and integrator commits included): 91 |
| M3 | 32 (A19), 33 with M3-32 (A24) | 33 | M3-00 to M3-32 (rows 130 and 131 are the live smoke M3-30 and the gate M3-31). Beside the plan: M3-33 (A26, row 137) and M3-34 (row 138), which closes the milestone review (row 135). M3 is closed by decision A28 (row 139). Stop line of A19: above 64 |
| M4 | 64 (A32), 72 with M4-64 to M4-71 (A42, A43, A45, A46) | 72 | M4-00 to M4-71 (rows 144 to 231); M4-44 has no commit of its own and is inside M4-45 (row 167, errata H32); M4-59, the three series, is row 230; M4-63, the gate, has two rows (229 and 231). The specification is row 143. The cut list is applied at 90 issues merged or open, and M4 is stopped and planned again above 128 (A32): 72 stand, nothing was cut. Open after the gate: the milestone review of M4 |
| M5 | 58 (A48); 102 with the issues M5-58 to M5-103 added by decisions A65 to A113 (the ids M5-73 and M5-93 were never given) | 101 at `565efae`, 102 with the gate M5-57 | M5-00 to M5-57; the specification is row 237; every planned issue is merged but the gate M5-57 (row 379); M5-18 has two parts (rows 269 and 281, the second as M5-64, A71); M5-70 has the erratum row 296 before its build (row 302). Beside the plan (44): M5-58 to M5-72, M5-74 to M5-92 and M5-94 to M5-103, each named in its row with its decision; all are merged. Rows without an issue of their own: 27 commits of the integrator (decisions, API reports, the record commit after `c7c6ef6`, docs) and the follow-ups that name their row. The cut list of section 10.2 was to be applied at 80 issues merged or open; it was never applied (erratum J310): the count passed 80 with decision A94, which added M5-78 to M5-81 (from 77 to 81), and every cut entry was built or played, but for cut 3: the Confessor's file is recorded and no game test compares it (J278). M5 is stopped and planned again above 116 (A48): 102 stand. The gate is row 379, "The gate of M5" below |
| M6 | 31 (A118), three of them conditional (M6-27 to M6-29); 32 with M6-31, the Node line (A136); 39 ids with M6-32 to M6-38 (A151, A152, A154, A156, A157, A158, A159) | 36 at `c138860`, 37 with the gate M6-30 | M6-00 to M6-26, M6-29, M6-31 to M6-38 and the gate M6-30 (row 434). The specification is row 389, its independent challenge row 390; errata `13-m6-spec-errata.md`. Of the conditional issues, M6-29 was built after the owner's switch of 2026-11-24 (row 433); not opened, their triggers not holding at the gate: M6-27 (the owner's go for the next City base, or a change of the City's game hash, which stayed `9418a743…`) and M6-28 (O8). Beside the plan (7): M6-32 to M6-38, each named in its row with its decision. The cut list of 13.2 (at 40 merged or open) was never applied: 39 ids, the two unopened conditional ones counted; M6 is stopped and planned again above 62 (A118). The gate is row 434, "The gate of M6" below |

Rows beside the plan: 69. Four follow-up issues of M1 (M1-37 to M1-40), four reviews of M1 (waves 1 to 3 and the
milestone), the specifications of M2, M3 and M4, the reviews A and B and the milestone review of M2, the six
follow-up issues of M2 (M2-25 to M2-30), the milestone review of M3 and its two issues (M3-33, M3-34), the eight
issues M4-64 to M4-71 (A42, A43, A45, A46), eight follow-up and prep commits with the id of their issue (rows 89, 96,
106, 139, 212, 219, 220, 223), and thirty commits of the integrator without an issue id (eleven of them in M4: five
decisions, three of API reports, a lint change, a README fix, the resume note). The two rows of M4-63 (229 and 231)
are one planned issue built in two parts, not a row beside the plan.

| | Recorded | Budget | Share |
|---|---|---|---|
| Agent tokens in rows (120 of 231 rows have a number, row 222 points to row 221, 109 are "not recorded", row 231 is owed) | 22.96 million | | |
| Agent tokens of the 12 sessions without a row | 2.38 million | | |
| Agent tokens, the 85 session reports up to row 82 | 15.60 million | 300 million (M0 to M2) | 5.2 % |
| Agent tokens, the 50 sessions of M4 from row 171 on (48 builders, the series M4-59, the first part of the gate) | 9.74 million | | median 0.19 million, largest 0.36 million (M4-59, a session that mostly waited on its runs), largest builder 0.30 million (M4-47); agent time 21.69 h, of which 6.40 h are M4-59 |
| Agent tokens, the rows of M5 (237 to 378: 38 rows with a number, all of them rows 238 to 280; 104 "not recorded" or pointing to another row) | 9.62 million | | the notices of the builders after row 280 did not reach the gate issue (the note of the rows 281 to 378) |
| Agent tokens, the rows after M5's gate (380 to 434) | not recorded | | no builder notice reached the gate issue's session ("How the rows after M5's gate were filled") |
| Agent cost | - | 750 USD | the sessions are not billed per token, so the USD line of the kill criterion cannot be counted |
| Live model spend | 1.6022 USD (M2 gate, 61 runs, `games/m2-ledger.jsonl`) and 0.0206 USD (M3 smoke, 3 runs, `games/m3-ledger.jsonl`) on this platform; 0.72 USD before M2 on the old one (specification of M2, 8.5) | 10 USD | not a kill number |
| Live model spend after M3 | 0.6515 USD (M2-30, the two cure series of A29, 24 runs, `games/a29-ledger.jsonl`); M4: 0.8615 USD (smokes of M4-60 and M4-61, 10 runs), 0.1746 USD (the check run of M4-70) and 4.0901 USD (the three series of M4-59, 52 runs): **5.1262 USD** in `games/m4-ledger.jsonl` at `cfa3676`, 63 runs, every reservation closed by its cost line. The rewrite so far on this platform: 1.6022 + 0.0206 + 0.6515 + 5.1262 = 7.4005 USD | M4: 12.00 USD (A33), 6.8738 left; the rewrite: 50 USD | not a kill number |
| Live model spend of M5 | **2.2980 USD** in `games/m5-ledger.jsonl` at `565efae`, 8 runs, every reservation closed by its cost line: Whispers 0.9517 (run 1) and 0.2145 (run 2), the City's Act I base 0.0686, the check resume 0.0000 and again 0.0741, Act II 0.3724, 0.3261 and 0.2907. The rewrite so far on this platform: 7.4005 + 2.2980 = 9.6985 USD | M5: 12.00 USD (A53), 9.7020 left; the rewrite: 50 USD, 40.3015 left | not a kill number |
| Live model spend of M6 | **0.3068 USD** in `games/m6-ledger.jsonl` at `c138860`, 4 runs, every reservation closed by its cost line: the tic-tac-toe baseline 0.0785, Whispers under r8 0.2264, `swt doctor --online` 0.0000021, the release smoke 0.0019 ([`M6-GATE.md`](M6-GATE.md)). The rewrite so far on this platform: 9.6985 + 0.3068 = 10.0053 USD | M6: 2.34 USD (A137), 2.0332 left, the reserve of 1.00 untouched; the rewrite: 50 USD, 39.9947 left | not a kill number |

**Kill check 1** (specification of M2, 8.6), recounted by M2-27 from the rows above and written into
[`M2-GATE.md`](M2-GATE.md): 72 issues of M0 to M2 against 150; 15.60 million recorded tokens against 600 million
(a lower bound, see below); no agent cost in USD. It does not fire.

The recorded sum leaves out the integrator's sessions, every session between row 82 and row 171 (the rest of M2, all
of M3 and the first batch of M4, rows 144 to 170) and counts each session as it reported itself, so it is a lower
bound of what the work used. The median of the 70 rows up to row 82 with a number is 0.16 million tokens, the largest
row 0.64 million. The one recalibration of D4 (the median of the first ten merged issues replaces the 6 million per
issue) is not done and is closed without being done: the budget it would recalibrate ended with M2, and the rows 83 to
170 hold no token number (specification of M4, section 5.3; written by issue M4-00).

## The budgets at the start of M6

Measured by issue M6-00 with the counter of the budget gate (`scripts/lib/budget.ts`, `codeLinesOf`) at `0da7ade`, the
head of `rewrite/develop` after M5's close (A117, `4604a12`), the specification of M6 and the decisions A135 to A139;
the specification measured the same numbers on `4604a127` and, in its independent challenge, on `797a55fa`
(`13-m6-spec.md`, section 1.3). No code changed between `4604a12` and `0da7ade`.

| Package | Code lines | M6 may add | After M6, at most | Limit |
|---|---:|---:|---:|---|
| `kernel` | 1473 | **0** | 1473 | gate 1473 (`packages/kernel/test/budget.test.ts`), hard 1500 |
| `sdk` | 2198 | 15 (M6-01, the check of A37, A119) | 2213 | |
| `engine` | 384 | 10 (M6-16, only if B2 needs the Director driver) | 394 | |
| kernel + sdk + engine | 4055 | 25 | 4080 | 4100 (A20): 45 left now, 20 after M6, not booked |
| `apps/cli` | 2031 | about 900 together with `models` and `testkit` | | none |
| `packages/models` | 1227 | | | none |
| `packages/testkit` | 1058 | | | none |
| `contracts` | 1068 | none planned but B2's answer tool (`ModelQuestion`, M6-16) | | none |

The live cap of M6 is the first line of `games/m6-ledger.jsonl`, `{"capUsd":2.34}`: A137 corrects A125's 3.00 to the
four runs' caps (1.34) and the reserve (1.00). The rewrite has spent 9.6985 of 50 USD on this platform; with the cap
of M6 it stands at 12.04 USD at most.

The cost of the three sample stubs in `pnpm lint` (section 9 of the specification), measured by M6-00 with
`node scripts/lint.ts --times` on the shared machine (not a cold check): `samples/roles` 1.5 s, `samples/shipped-director`
0.2 s, `samples/team-game` 0.1 s, one file each, about 326 MB per worker; the whole pass 225.6 s, 84 projects. The
cost of the filled samples is measured by M6-09 to M6-11.

## The legacy runs staged by M6-18

Staged by issue M6-18 with `node scripts/release/legacy-runs.ts` on the build session's clone, on 2026-11-16, from
the old state `a73e6a9` (`v0-final`) onto the head of `origin/data/runs` (`26a8c47e`). The branch
`data/legacy-staging` was written locally and not pushed; it is lost with the session's container (A25), so the
owner stages again on his own clone (a step of `docs/RELEASE.md`, issue M6-21) and compares the digest. The script
holds the digest below (`RECORDED_DIGEST`) and writes no branch when its own differs.

| What | Value |
|---|---|
| Staged | `stories/<name>/runs/` and `examples/` of `v0-final` (the class "run data" of `links.ts`), at `legacy/stories/…` and `legacy/examples/…` |
| Files | 8841 (8655 under `stories/*/runs/`, 186 under `examples/`) |
| Bytes | 815,678,605 (815.7 MB); largest file 7,876,162 |
| Manifest | `legacy/MANIFEST-v0-final.sha256`, one line `<sha256>  <path>` per file, sorted by path |
| **Manifest digest** (sha256 of the manifest) | **`9d4b3780b51325c071335c7187dd9d60aad8ce6c3f430151e033ebad356a363f`** |
| Trees on the branch | `legacy/stories` `17ce8f1e4619ff34921e52dc7a800af6465bf722`, `legacy/examples` `7cf682796d53518ed96be890f534d0014185bc88` (the tree of `v0-final:examples`) |
| Scan report | `legacy/SCAN-v0-final.json`: `swt scan` clean over 8841 files, keys of the environment's providers held |
| Time | 11.6 s, 194 MB of memory, the staged files written once into a temporary folder and removed |

The commit id of the branch is not reproduced (it holds the date, the committer and the head of the data branch); the
digest and the two tree ids are. The manifest was checked against the old state apart from the script: the same 8841
paths as `git ls-tree -r v0-final` filtered to the run data, and the sha256 of every 37th file read with
`git cat-file blob`.

## The budgets at the start of M5

Measured by issue M5-00 with the counter of the budget gate (`scripts/lib/budget.ts`) at `c5daac3`, the head of
`rewrite/develop` after M4-72 (`390448d`) and the specification of M5; the specification measured the same numbers on
`e3792ac` and, in its challenge, on `390448d` (`12-m5-spec.md`, section 1.3).

| Package | Code lines | M5 may add | After M5, at most | Limit |
|---|---:|---:|---:|---|
| `kernel` | 1402 | 88 (M5-01, M5-02, M5-04 only) | 1490 | gate 1420 (`packages/kernel/test/budget.test.ts`), raised by M5-05 to the measured count, at most 1490 (A20, A51); hard 1500 |
| `sdk` | 2107 (2099 before M4-72, which took 8) | 80 (M5-01, -03, -04, -06, -07) | 2187 | |
| `engine` | 360 | 25 (M5-04, -07, -09) | 385 | |
| kernel + sdk + engine | 3869 | 193 | 4062 | 4100 (A20): 231 left now, 38 after M5 |
| `contracts` | 993 | about 40 | | none |
| `mechanics/contracts` | 135 (with the three contracts of M5-00: `identity`, `allowance`, `receipt-source`) | | | none |

## The kernel gate of M5

Written by issue M5-05 (decision A20, A51). Measured with the counter of the budget gate (`scripts/lib/budget.ts`)
over the tree of each squash commit on `rewrite/develop`; the counter of `packages/kernel/test/budget.test.ts` gives
the same 1472 on `816903d`. The kernel lines of M5 are those of the three issues that 1.3 of `12-m5-spec.md` allows;
no other merged issue of M5 changed `packages/kernel/src/` (M5-00, -08, -12 and -13 leave it at their parent's count).

| Issue | Commit | Kernel | Planned | Sdk | Engine | Why it cannot live in a mechanic |
|---|---|---:|---:|---:|---:|---|
| M5-01, the hook `runEnded` | `abb7d14` | 1402 to 1409 (+7) | 8 | +4 | 0 | the end of a run is the kernel's: only `#finish` in `lifecycle.ts` knows that the run ends (limit reached or last tick over) before `run_ended` is written; a mechanic can listen to `tick_ended` but cannot tell the last tick from a run that a limit stops, and no event comes after `run_ended`. Two of the lines put the hook into the ordered hook table (`parts.ts`, `loader.ts`) as the other ordered hooks are |
| M5-02, staged calls | `cf8742e` | 1409 to 1446 (+37) | 65 | 0 | 0 | a call of actor `script` must run through the whole pipeline (lock, grant, stages, `tool_called`, steps) as a resident's call, at the end of the outermost step of plugin code and inside the lane; a mechanic has no port to submit a call and cannot hook the end of another plugin's step. The list of waiting calls also blocks a snapshot, which only the kernel takes |
| M5-04, the stage `review` | `816903d` | 1446 to 1472 (+26) | 15 | +27 | +19 | the answer of a Director is awaited inside the call, between the rule stages and `execute`, with the lane held; only the dispatch of the kernel holds the lane and the stage order, and a refusal of the stage is logged under the old stage names. About 11 of the lines keep the staged drain synchronous while `runCall` may now await a question, and refuse a staged call of a reviewed tool (errata J11, J23; booked by A66) |
| **M5** | | **1402 to 1472 (+70)** | **88** | **+31** | **+19** | engine total 3869 to 3989 of 4100 |

The gate of `packages/kernel/test/budget.test.ts` is set to **1472**, the measured count (it was 1420 from M1-38 and
1490, the cap of A51, from M5-02, erratum J12). Its test "passes a kernel at the gate and fails one line above it"
counts a scratch kernel of 1472 code lines as within the gate and one of 1473 as over it. The 18 lines of A51 that
M5 did not use are not held for a later issue: from now on a pull request that adds a kernel line raises the gate,
with an issue that names the missing extension point (`CLAUDE.md`, "Limits"). The hard limit stays 1500, 28 lines
above the gate.

**M5-63 (+1, gate 1473).** The missing extension point: calls staged in a `runEnded` hook were never run, because
`#finish` in `packages/kernel/src/lifecycle.ts` did not settle after each hook as every other hook does. Sections 4.1
and 4.2 of `12-m5-spec.md` say staged calls and their events land before `run_ended`; `petitions` (M5-25) fails its
open petitions there, and `script` (M5-31, M5-32) reacts at the end the same way. A mechanic cannot run a staged
call itself, so the line is the kernel's. The hard limit is now 27 lines away.

**M5-67 (+11 sdk, 2187 to 2198; way out 3 of section 1.3, decision A74).** The sdk lines that 1.3 did not book, measured
with the counter of the budget gate (`scripts/lib/budget.ts`) on the parent `7e2efd29`: sdk 2187 to 2198, kernel 1473
and engine 384 unchanged, kernel + sdk + engine 4044 to 4055 of 4100 (45 left). The missing extension points, all in
the plugins of the sdk because a mechanic cannot reach them: the trigger option `quiet` (a firing that only quiet
triggers keep is queued but is no news for `news`; 2 lines in `define.ts`, 1 in `plugin.ts`), the fact
`directors.active` (each resident's tick of its last call that reached `execute`, from the stage handler `after`, kept
in the slice; 6 lines), the fact `roster.residents` (0 net: the `facts` line of the roster plugin), and the key order of
a queued firing after a resume (2 lines, erratum J159: the firings of a look on `arena.round_end` wait across a
tick boundary). The fact `channels.notes` is mechanic code (`mechanics/channels/`) and outside the budget. Another
builder books about 2 sdk lines for `SWT-D004` (M5-64, A71) in parallel; the integrator measured after both merges (`e86573cd` and this one): sdk 2198, kernel 1473, engine 384, total 4055 of 4100 (M5-64 net 0 sdk lines).

## The gate of M3

The six done-whens of `refactoring-before-release/10-m3-spec.md` and the test that proves each. All of them run
offline, in `pnpm check`. The milestone is closed by its review, after M2 is closed (the gate of M2, M2-24, was merged at 20:27 while
this was written; its milestone review is open). The live smoke of M3 (M3-30, which does not gate) is run by
another session and was open when this was written. The milestone review (row 135) read commit `e1b77c2` and named
six fixes before the close: five are issue M3-34, the sixth is issue M3-33 (A26).

| # | Done when | Proven by |
|---|---|---|
| 1 | the slice plays and the whole run equals a committed timeline | `games/city-slice/test/city-slice.test.ts`: "plays twelve ticks and the whole log equals the committed timeline" (seeds 7 and 11, the variant `amended`) and the seven moments by name |
| 2 | replay from the game and `events.jsonl` alone gives the same log | `games/city-slice/test/replay-resume.test.ts`: "done-when 2: replay writes the committed timeline again ..." and its failing twin "a log with one input changed is not replayed equal"; from run folders: `apps/cli/test/city-slice.test.ts`, "done-when 2 from run folders" |
| 3 | a run stopped at a snapshot and resumed gives the straight log; `swt log verify` proves the continuity | in process: `replay-resume.test.ts`, "done-when 3, in process"; through `swt run`, `swt resume` and `swt log verify --previous`: `apps/cli/test/city-slice.test.ts` (equal as decision A23 reads it, for the snapshot at 7; the case "a snapshot before the Director is asked" pins the two lines that differ for a snapshot at 6, decision A27) |
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
| Issues of M3 | | 33 merged, M3-00 to M3-32 (32 planned, and M3-32 by A24). Open when the review closed: M3-33 (A26) and M3-34, the fixes of the review | | 32 | stop above 64 (A19) |

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
`human`, which no scheduler activates (M3-12). No builder reported a missing extension point of the kernel.

**Where the authoring interface was short.** In two places, both met by `decisions` (errata
`refactoring-before-release/10-m3-spec-errata.md`). One was added: `MechanicContext.actors` and `Setup.actors` in
the sdk (G3, M3-12), because a holder of a decision need not be a resident. Until the milestone review no mechanic
used the addition: `decisions`, which asked for it, still wrapped `resolve` and `create` to read the kernel's
port. M3-34 made it a plain `defineMechanic` on the two, with every committed log equal, so the addition is proven
by one mechanic. The other was worked around and is open: a tool context does not carry the log position of its
call. `decisions` reads it from `causedBy` of its own event in a listener (open point P5); the M4 specification
decides whether the context gets the position or payloads stop holding one (decision A27).

**Answer.** The City slice needed no kernel change that the tabletop games did not need. The check passes; the
kernel interface stands and M4 does not wait. The authoring interface did not stand untouched: one addition, one
gap left open. The reserved returns of M1 1.4 were not taken (decision 20 of the
specification, A20). Limits of this answer: the slice is six scripted residents and seven cut mechanics, not the
City; the judge, hooks for blocks above 1 and a stop inside a tick are M5 and are the next test of the same
question.

## The gate of M4

The nine done-whens of `refactoring-before-release/11-m4-spec.md` (the list "M4 is done when" at its head) and what
proves each. Done-whens 1 to 6 and 8 are tests, all offline and in `pnpm check`. The gate issue ran each named test
green at commit `cfa3676`: `pnpm vitest run games/` (113 files, 702 tests), then the command-line standing checks,
`apps/cli/test/city-slice.test.ts`, `apps/cli/test/help.test.ts`, `samples/`, `scripts/` and
`packages/kernel/test/budget.test.ts` (40 files, 271 tests). Done-when 7 is the live write-up
[`M4-GATE.md`](M4-GATE.md) with the smokes' rows in the runs indexes; done-when 9 is the next section. No game was
cut (section 2.6): the cut list was never applied, and all ten games of section 2.3 count. The milestone closes with
its review, which runs next.

| # | Done when | Met | Proven by |
|---|---|---|---|
| 1 | every tabletop game is ported: each of the ten plays, and `runOracle` finds no mismatch at level 3 for each of its oracle files, or the difference is a registered change | yes: 58 files (the 48 and ten additions; addition 11 was not recorded, errata H19), all at level 3 | `games/<game>/test/oracle.test.ts` of the ten games, one test per file, "`<file>`: runOracle at level 3 finds no mismatch": liar's dice 6, Harbor Lights 8, Lanterns 4, chess 12, Ember Tricks 4, Blind Bid 5, hold'em 6, nine men's morris 5, Convoy 4, Salt Market 4. In each file a test checks that the folder holds no other file ("covers every oracle file of the folder, each with the options of its variant", "covers every file of the folder ..." in chess; "knows every oracle file of the folder and the params of its variant" in Harbor Lights and Ember Tricks). The registered changes are the `call.endsTurn` mappings in `oracles/<game>/README.md` (errata H4) |
| 2 | standing checks: every game under `games/` passes replay, resume from every tick boundary in process, resume from every boundary through the command line, and a `swt run --fake` that ends without an `error` end and holds an accepted call | yes, with the sampled boundaries of section 4.3 for a long run through the command line (errata H44) | in process: `games/<game>/test/standing.test.ts` of all fifteen games, "`<run>`: the log replays equal" and "`<run>`: resumed from every boundary, the log is the straight log" (`checkResumeEveryBoundary` on scripted and fake runs, `[]` expected). Through the command line: `apps/cli/test/standing.test.ts`, `standing-b.test.ts` and `standing-c.test.ts` over the games list, "`<game>`, fake seed `<n>`: the fake run holds, and resumed from its boundaries it is the straight run, verifies and replays". The list is whole by `scripts/gates/games-list.test.ts` ("rejects a game folder that is not on the list, and an empty list"). The fake runs are also checked by `games/<game>/test/fake.test.ts` ("seed 7: ends by the match limit with an accepted call of every granted tool") |
| 3 | the scheduler sample `parallel`: a second scheduler outside the engine; its game plays to its end under `turns` and `parallel`; sixty runs replay to their own log; resume from every boundary; a Director works under it; kernel, sdk and engine have no line for it | yes | `samples/own-scheduler/test/game.test.ts`: "ends with the same result lines under turns and under parallel, though the guesses arrive in another order". `replay.test.ts`: "replays twenty races under `<activation>` to themselves, and the races differ" for `always`, `onNews` and `toAct` (60 runs, drivers that wait a seeded random time), and "resumes a kernel from the snapshot of every boundary, and the replay drivers of the rest write the rest of the log". `director.test.ts`: "wakes the Director by a firing at the next close, while a resident is still open, and the log replays". No line: the three commits of the sample (M4-53 `7156ef2`, M4-54 `f7f29c1`, M4-55 `054781a`) touch no file under `packages/{kernel,sdk,engine}` (`git show --stat`; outside the sample they touch the testkit only), and `SchedulerPort` (`packages/contracts/src/kernel/ports.ts`) has no changed line since `0ecabab` |
| 4 | no log position in a payload: the city slice resumed through the command line from every boundary differs from the straight run only in the marker line and the envelope fields `seq`, `causedBy` and `basis` | yes | `apps/cli/test/standing*.test.ts`, the cases "city-slice, fake seed 7" and "city-slice, fake seed 4". The slice runs at most 12 ticks, so every boundary is resumed, and `withoutMarker` takes out `run_resumed` and moves only those envelope fields back. In process: `games/city-slice/test/city-slice.test.ts`, "holds no log position in a payload of `decisions`: an amendment is named by its number `n` (decision A34)", and `director-amends.test.ts`, "writes no log position into a payload of the Director or of `decisions`" |
| 5 | the gates "a mechanic is a plain `defineMechanic` value" and "a base mechanic names no game mechanic" are in the check, each with a fixture that fails | yes | `scripts/gates/plain-mechanic.test.ts`: "holds in this repository, in the source and in the loaded values" and "fails on the fixture: decisions as it was before M3-34, wrapping resolve and create". `scripts/gates/base-alone.test.ts`: "holds in this repository" and "fails on a fixture in which ledger names puzzles". Both are under `scripts/gates/`, which `pnpm check` runs |
| 6 | the mechanic tutorial and the Director tutorial pass as tests; `docs/reference/errors.md` has an anchor for every code; `swt --help` prints the commands | yes | `samples/own-mechanic/test/tutorial.test.ts`: "every code block of the tutorial is an include of a file of the sample" and "the commands run as the tutorial says: the fake run prints its lines, verifies and replays equal". `samples/own-director/test/tutorial.test.ts`: the same two, and "a fake run without a hand: resumed through the command line from every boundary, it is the straight run, verifies and replays equal". `scripts/gates/error-docs.test.ts`: "has an anchor for every code of the source and a code for every anchor", with its failing twin. `apps/cli/test/help.test.ts`: "prints every command of the table and exits with 0, with and without the flag" |
| 7 | live: Harbor Lights and Lanterns keep the sign at 12 seeds; the chess count stands beside the old range; every other ported game has one recorded live run; the spend is inside the caps; no key in any artefact | yes | [`M4-GATE.md`](M4-GATE.md) (M4-59, row 230). Harbor Lights +1.58 (SE 1.37, n 12 pairs): sign kept, size not reproduced. Lanterns +0.058 recall (SE 0.022, n 12): kept. Chess 1.209 requests per half-move (1.196 to 1.238) beside 1.18 to 1.22: "holds". The other seven games have one smoke each in `games/<game>/RUNS.md` (liar's dice, Ember Tricks and Blind Bid by M4-60; hold'em, nine men's morris, Convoy and Salt Market by M4-61). Spend: 5.1262 USD of 12.00 in `games/m4-ledger.jsonl`, with every part inside its cap of 7.1 (below). Keys: the gate issue ran `swt scan` again over a checkout of `data/runs` at `570801d`, which printed "clean, 1486 files, keys of 2 providers held"; `swt scan docs` is clean too |
| 8 | `GAMES.md` is complete: thirteen cards beside the Hello Game and the city slice, and the overview table is generated | yes | `scripts/game-docs/game-docs.test.ts`: "is current: every block written from the games list and the game files, every game with its card" and "has a card for each of the thirteen ported tabletop games, beside the Hello Game and the city slice" |
| 9 | the stop rules and the softer check of section 9 answered in writing: the lines the kernel got, the three budgets, the issue count | yes | the next section, measured with `scripts/lib/budget.ts`; the gates `scripts/gates/budget.test.ts` and `packages/kernel/test/budget.test.ts` (the gate of 1420) are green |

**The caps of 7.1, by `games/m4-ledger.jsonl`.** Smokes part 1 (M4-60: six runs, the Hello Game twice and liar's
dice twice): 0.2685 of 1.25 USD. Part 2 (M4-61, four runs): 0.5932 of 1.60. The dearest smoke run cost 0.1973
(Convoy) of 0.40, and the Hello Game's cap runs 0.0018 and 0.0013 (errata H30). Harbor Lights cost 1.2814 of 1.60,
Lanterns 1.6631 of 2.35 and chess 1.1455 of 2.00 (dearest runs 0.0645, 0.1053 and 0.3181 of 0.12, 0.20 and 0.80).
The check run of M4-70 cost 0.1746 of the 0.40 that A46 gave it. No bridge was played (both signs kept), so its 2.00
are unspent. Sum: 5.1262 of 12.00.

## The softer check of M4

Section 9 of `refactoring-before-release/11-m4-spec.md`. Measured with the counter of the budget gate
(`scripts/lib/budget.ts`) at `0ecabab` (the state that section 1.2 was measured on) and at `cfa3676` (the head of M4
before the gate, which changes docs only):

| | Before M4 (`0ecabab`) | After M4 (`cfa3676`) | Added | Planned by section 1.2 | Limit |
|---|---:|---:|---:|---|---|
| `kernel` | 1393 | 1402 | 9 | 17, at most 1410 | gate 1420, hard 1500 |
| `sdk` | 2065 | 2099 | 34 | 25, at most 2090 | |
| `engine` | 360 | 360 | 0 | 0 | |
| kernel + sdk + engine | 3818 | 3861 | 43 | 42, at most 3860 | 4100 (A20): 239 left |
| Issues of M4 | | 72 merged (M4-00 to M4-71), none open | | 64 (A32), 72 with A42, A43, A45, A46 | cut list at 90, stop above 128 |

**Stop rules.** None fired. Rule 1: 72 issues, under 128. Rule 2: the kernel is at 1402, under its gate of 1420,
and kernel + sdk + engine are at 3861, under 4100; the issue of A20 was not needed. Rule 3: every ported game reaches
level 3 on every oracle file (done-when 1), so no game stopped.

**Which kernel lines did M4 add?** Nine, all of M4-16 (row 149), against the 17 booked: the two activation hooks
`activationOpened` and `activationClosed` that M1 1.4 reserved (`packages/kernel/src/ports.ts`, `parts.ts`,
`loader.ts`), with their two lists in `PluginHooks` of the kernel contracts (`packages/contracts/src/kernel/plugin.ts`,
4 lines). Their first user is chess (the forfeit of an idle turn). `kit.on` was not taken, so
`oracles/chess/README.md` has no registered change for it. M4-01 and M4-68 changed only the value of
`RUNTIME_REVISION` (3 to 4, then 4 to 5), which adds no code line; the kernel's API report differs from `0ecabab` in
that constant alone.

**Did a tabletop game need a kernel mechanism that was not reserved?** No. Two needs of the ports were met in the
sdk, each by a decision. A mechanic locks a tool of another mechanic by its bare name through `ctx.access` (A42,
M4-64, for Harbor Lights' crew arm): 6 sdk lines of the 15 booked. A snapshot's state comes back in the key order of
its schema (A43, M4-65 and M4-66): `inSchemaOrder` is 16 sdk lines by the counter (15 in its file and the barrel's
export line) against the 15 booked (errata H45). No port issue stopped for a missing kernel mechanism.

**Did `parallel` need a line in kernel, sdk or engine, or a change of `SchedulerPort`?** No (done-when 3). The
sample lives in `samples/own-scheduler/`. Outside it, its three issues touched only the testkit (`play`'s option
`schedulers`, the replay by the close line), no file of the three packages, and `SchedulerPort` has no changed line.
By the specification's own reading the scheduler port is ready to freeze. The M5 specification gets that as an
input, with what the sample did not try: a production scheduler, live runs under it, a stop inside a tick.

**Where do the three budgets stand, and what can M5 take?** The kernel is at 1402 (planned at most 1410): 98 lines
under its hard limit and 18 under its gate. Kernel + sdk + engine are at 3861: 239 lines under 4100, and one line
above the plan of 3860. The cause is the 22 sdk lines of A42 and A43, which section 1.2 did not book; the booked parts
used 12 of their 25 (the hooks 8 of 15, the firing numbers of M4-02 4 of 10). Against the table of section 1.2:
staged calls (65 kernel lines) and `runEnded` (8) fit. The kernel would then be at 1475, under 1500 and above the
gate of 1420, which the issue of A20 raises with the measured lines; the total would be at 3934 plus the sdk lines of
the two, with 166 left. The rest of the reserved list does not fit in the kernel (attributes 20, `afford`/`settle`
10, `guard`/`consult` 15, `every` 10 and `kit.on` 5 would bring it to 1535). It keeps the ways that section 1.2
names, which cost no kernel line.

**Did a firm effect change sign?** No (section 7.2, [`M4-GATE.md`](M4-GATE.md)). Harbor Lights' private notes keep
their sign (+1.58, SE 1.37, 12 pairs), at half the old size and with an interval that holds zero. Lanterns' team
brain keeps its sign and its size (+0.058, SE 0.022, 12 pairs), with another shape over the games. With quarry and
econ-lab of M2, all four firm effects of D11 keep their sign. The chess count holds (1.209 beside 1.18 to 1.22). No
bridge was run.

**Answer.** The ten tabletop games needed nine kernel lines, all reserved by M1 1.4, and no kernel mechanism that
was not reserved. The sample `parallel` needed none, and the scheduler port did not change. The check passes: the
kernel interface stands, and M5 starts on it. The authoring interface grew by 34 sdk lines, 22 of them by two
decisions taken while building (A42, A43). That puts the total one line above the plan of section 1.2 and well under
its limit. Limits of this answer: `parallel` is a sample with a scripted game and was never played live. The City
(M5), with its staged calls, its judge and a stop inside a tick, is the next test of the same question.

## The gate of M5

The nine done-whens of `refactoring-before-release/12-m5-spec.md` (the list "M5 is done when" at its head) and what
proves each. Done-whens 1 to 5, 7 and 8 are tests, all offline and in `pnpm check`; the gate issue M5-57 added one,
`scripts/gates/m5-gate.test.ts`, for the parts of done-whens 4 and 8 that no earlier gate checked whole. Done-when 6
is the live write-up [`M5-GATE.md`](M5-GATE.md) with the rows of the runs indexes; done-when 9 is the next section.

**The check.** The cold full check on `rewrite/develop` at `565efae` (M5-103 and decision A114 merged; the parent of
the gate issue) is green: **510.3 s of 600 s, peak 5942 MB of 6144 MB**, 477 test files with 3130 tests passed and 3
skipped; typecheck and lint 391.7 s, tests 498.6 s, build 29.8 s, API reports 88.8 s, the layer, licence and sign-off
gates pass (the integrator's log `/tmp/claude-0/check-71.txt`, not committed). Every test named below ran green in it.
The gate issue changes docs, `scripts/gates/` and `scripts/api-freeze/frozen.json` only; on its own head it ran
`pnpm vitest run scripts/gates` (17 files, 90 tests), `pnpm vitest run scripts` (28 files, 212 tests) and `pnpm api:freeze` ("27 frozen files, each as recorded"),
and left the full check to the integrator.

| # | Done when | Met | Proven by |
|---|---|---|---|
| 1 | Whispers plays: `games/whispers` with the variants `whispers` and `whispers-rumours` as params; `runOracle` finds no mismatch at level 3 for its three oracle files and the recorded additions, or the difference is a registered change | yes | `games/whispers/test/oracle.test.ts`: "`<file>`: runOracle finds no mismatch at level 3" for `whispers-s7.json`, `whispers-s11.json` and `whispers-rumours-s7.json`. Addition 1, `whispers-holdout-s7.json`: `games/whispers/test/holdout.test.ts`, "up to the tribunal's call: runOracle finds no mismatch at level 3" and "the trial to its end: the projection at level 1 is the file's, one tick later from the call"; the tick is the registered change of `oracles/whispers/README.md` ("`whispers-holdout-s7.json`", J126, J137). The variants are the param `receipts` (`WhispersParams`): `games/whispers/test/story.test.ts`, "binds no forgery in the rumours variant, but still whispers and votes"; both variants in the standing checks (3) |
| 2 | the City plays Act I and Act II: `act1-s7`, `act1-s11` and `burn-s7` at level 3, the resumed file equals `act1-s7` by A34, the projections of `act2-s7` find no difference (A56) | yes | `games/city/test/oracle.test.ts`: "`<file>`: runOracle finds no mismatch at level 3" for `cityofkeys-act1-s7.json`, `cityofkeys-act1-s11.json` and `cityofkeys-burn-s7.json` (the reduced City of `burn.ts`). `games/city/test/resumed.test.ts`: "is the straight file with one resume entry after the look of minute 6 (A34)", "the drivers of the file play the run that runOracle compares" and "resumed from every boundary, among them the save after minute 6, the log is the straight log". `games/city/test/act2.test.ts`: "`<file>`: the act's events, calls and end are the file's" for `cityofkeys-act2-s7.json` and addition 2 `cityofkeys-act2-seal-s7.json`, with its failing twin "finds a changed vote of the file". The registered changes are in `oracles/cityofkeys/README.md`. Addition 3 (`cityofkeys-act1-classifier-s7.json`, the City with the Confessor) is compared at level 3 since M5-105 (finding 4 of `M5-REVIEW.md`, decision A116): `games/city/test/classifier-oracle.test.ts`, "`cityofkeys-act1-classifier-s7.json`: runOracle finds no mismatch at level 3", with the Confessor driven by the call of `interpret` its own `act` makes, and its failing twin "names the changed event in a copy of the file changed by hand"; the Confessor's registered changes are in `oracles/cityofkeys/README.md`, "The Confessor against the file" (J313). Before M5-105 this cell said the file was compared by no game test (J278) |
| 3 | standing checks: both games pass the four checks of `11-m4-spec.md` 4.3 | yes, with the boundaries of A97, A102, A107 and A108 | replay and resume in process: `games/whispers/test/standing.test.ts` ("`<run>`: the log replays equal" for both variants at seeds 7 and 11, "`<run>`: resumed from every boundary, the log is the straight log" for the default variant, A108) and `games/city/test/standing.test.ts` (the same two over its runs, and "the Act I run plays the whole act: it ends, and Act II starts, in its last tick"). Through the command line: `apps/cli/test/standing.test.ts`, `standing-b.test.ts` and `standing-c.test.ts` over the games list, where `whispers` and `city` have their lines (fake seed 7 each; the first, middle and last boundary of a run of at most 12 ticks, the middle one of a longer run, A97, A102, A107). The fake runs: `games/whispers/test/fake.test.ts`, "seed 7: plays 45 minutes and accepts a call of every reachable tool", and `games/city/test/fake.test.ts`, "seed 7: plays 80 minutes through both acts and accepts a call of every reachable tool", each with "lists every resident tool of the old setup as reached or not reached". `--pause-on` in a fake run: `games/city/test/pause.test.ts` |
| 4 | the recut: no base mechanic names a game mechanic, no mechanic imports the kernel, no service cycle, every old coupling of 2.3 has its owner, `mechanics/shared` has no successor | yes | `scripts/gates/base-alone.test.ts` ("holds in this repository", "fails on a fixture in which ledger names puzzles"); the layer check `pnpm check:layers` with `scripts/layers/rules.test.ts` ("rejects a plugin that imports the kernel (D8)", "holds a package of class director to the rules of a game mechanic (M5, 4.6), and keeps base mechanics off it"); `scripts/gates/service-cycles.test.ts` ("holds in this repository", with its fixtures). The owners of 2.3 and the successor of `shared`: `scripts/gates/m5-gate.test.ts`, "holds in this repository" (the classes of 1.1; `identity`, `allowance`, `receipt-source` and `notes` each with its one provider, `names`, `marks`, `receipts`, `channels`; `channels`, `ledger` and `exile` reading them; nineteen one-way couplings of the table asked in their direction only; `receipts` asked through `receipt-source` alone; no `ending`; no folder `mechanics/shared` or `*shared*`, and `@swarmtales/mechanic-shared` still forbidden by the layer table), with "fails on a way back, a second provider, a lost reader, a changed class and a successor of shared". The checks of a Director's note moved to their owners as `rule` handlers: `mechanics/puzzles/test/pieces.test.ts` ("refuses a note with a piece of a dealt password ..."), `mechanics/motives/test/motives.test.ts`, `mechanics/goals/test/goals.test.ts` and `mechanics/whispers/test/whispers.test.ts` ("refuses a note that ... in the old words, at stage rule ..."); the private thoughts by `mechanics/city-directors/test/notes.test.ts` (A62, M5-72) |
| 5 | budgets: the kernel at most 1490 under a gate raised by M5-05, kernel + sdk + engine at most 4100; every kernel line M5 adds is one of the three reserved parts | yes: kernel 1473 (gate 1473), total 4055 | `packages/kernel/test/budget.test.ts` ("stays within the gate", "passes a kernel at the gate and fails one line above it", gate 1473 since M5-63) and `scripts/gates/budget.test.ts` ("has the decided numbers": kernel 1500, engine total 4100). The 71 kernel lines are M5-01 (7), M5-02 (37), M5-04 (26) and M5-63 (1, the staged calls of a `runEnded` hook, A70), "The kernel gate of M5" above; measured again by the gate issue at every commit of M5 that touched `packages/{kernel,sdk,engine}/src` (the softer check below) |
| 6 | live: a run of each Whispers variant; a new Act I base at six residents; one Act II from it to its end through `swt resume` of a live run; the gamemaker live; every folder verifies, replays equal, is clean under `swt scan`; the spend inside the caps | yes | [`M5-GATE.md`](M5-GATE.md), with the rows of `games/whispers/RUNS.md` and `games/city/RUNS.md`: Whispers runs 1 (`whispers`, 0.9517 USD) and 2 (`whispers-rumours`, 0.2145); the base `city/base/city-001` (0.0686), paused on `progression.act_ended` at tick 7; Act II from it to `arena.stop` three times (0.3724, 0.3261, 0.2907) through `swt resume --budget`; the gamemaker's 14 requests and 16 tool calls of the base went to a live model (J301). Spend 2.2980 of 12.00 USD in `games/m5-ledger.jsonl`, every run inside its cap of 7.2. The gate issue ran `swt scan` again over a fresh extract of the eight folders from `data/runs` at `053457c5`: "clean, 62 files, keys of 2 providers held" |
| 7 | the API freeze: the frozen surface of section 5 listed, its gate in the check with a fixture that fails, the freeze in force from the merge of the gate of M5 | yes | the list is `scripts/api-freeze/frozen.json` (27 files: the reports of the ten frozen packages, of the base mechanics and `mechanics/contracts`, and nine text forms under `scripts/api-freeze/surface/`), its record [`API-FREEZE.md`](API-FREEZE.md). `scripts/gates/api-freeze.test.ts`: "holds every frozen file as recorded, the text forms as the code says" and the five fixtures "1: fails on a missing file, an empty list and a frozen surface without a row" to "5: fails on a break whose decision row does not say the owner's go", with "refuses a change passed off as the freeze once the freeze is in force". In force: M5-57 ran `pnpm api:freeze --write` on its head (every base `565efae`) and then dated F1 **2026-11-16** (erratum J293); `pnpm api:freeze` passes on that tree |
| 8 | `GAMES.md` has the cards of Whispers and the City, both games on `games/index.ts` and in `scripts/game-docs/catalogue.ts` | yes | `scripts/gates/m5-gate.test.ts`, "lists Whispers and the City on the games list, in the catalogue and with their cards"; `scripts/game-docs/game-docs.test.ts`, "is current: every block written from the games list and the game files, every game with its card"; `scripts/gates/games-list.test.ts` keeps the list whole |
| 9 | the stop rules and the softer check of section 9 answered in writing in this file | yes | the next section |

## The softer check of M5

Section 9 of `refactoring-before-release/12-m5-spec.md`. Measured by the gate issue with the counter of the budget
gate (`scripts/lib/budget.ts`) on the tree of every commit of M5 that changed `packages/kernel/src`,
`packages/sdk/src` or `packages/engine/src` (each extracted with `git archive`), from `c5daac3` (the specification,
the state of "The budgets at the start of M5") to `565efae`:

| Issue | Commit | Kernel | Sdk | Engine | Total |
|---|---|---:|---:|---:|---:|
| start (the specification) | `c5daac3` | 1402 | 2107 | 360 | 3869 |
| M5-01, the hook `runEnded` | `abb7d14` | +7 | +4 | 0 | 3880 |
| M5-02, staged calls 1 | `cf8742e` | +37 | 0 | 0 | 3917 |
| M5-04, the stage `review` | `816903d` | +26 | +27 | +19 | 3989 |
| M5-03, staged calls 2 | `3561616` | 0 | +20 | 0 | 4009 |
| M5-06, Directors 1 | `54b8b6d` | 0 | +25 | +1 | 4035 |
| M5-61, the order `arena` of `turns` (A67) | `a8e631e` | 0 | 0 | +2 | 4037 |
| M5-63, staged calls of a `runEnded` hook (A70) | `bb841b3` | +1 | 0 | 0 | 4038 |
| M5-07, Directors 2 | `1b6e724` | 0 | +4 | +2 | 4044 |
| M5-67, the quiet trigger and the facts (A74) | `f961e2b` | 0 | +11 | 0 | 4055 |
| **M5** | `565efae` | **1473 (+71)** | **2198 (+91)** | **384 (+24)** | **4055 (+186)** |
| planned by 1.3 | | at most 1490 (+88) | 2187 (+80) | 385 (+25) | 4062 (+193) |

M5-58, M5-64, M5-88, M5-50 and M5-91 also touched these folders and left the counts as they were (the licence
header, `RUNTIME_REVISION` 6 to 7, `@internal` tags).

**Stop rules.** None fired. Rule 1: 102 issue ids (M5-00 to M5-103 without M5-73 and M5-93, which were never
given), 101 merged and the gate, under 116. Rule 2: the kernel is at 1473, under 1490, and kernel + sdk + engine at
4055, under 4100. Rule 3: both games reach level 3 on every oracle file that done-whens 1 and 2 name (the Act II
files by the projection of A56), so no game stopped. Rule 4: the base was recorded at 1.2347 USD spent of 12.00. **The
cut list of 10.2 was never applied** although the count passed 80 with decision A94 (erratum J310): no decision row
applied a cut, and every cut entry was built or played, but for cut 3, whose file is recorded and compared by no game
test (J278). It cost nothing the done-whens ask: the three runs among the entries (cuts 1, 2 and 5: runs 5c, 5b and run 2 of
Whispers) held 5.00 USD of caps and spent 0.83.

| Question | Planned answer | Answer |
|---|---|---|
| Which kernel lines did M5 add? | at most 88: `runEnded` (8), staged calls (65), the review stage (15), each reserved by M1 1.4, each with its first user; the gate raised to 1490 by issue 05 with the measured lines | **71**: `runEnded` 7 (M5-01; first user `decisions.settleAll`, then `petitions`, `arena`, `channels`), staged calls 37 (M5-02; first user `petitions.resolvePetition` and `script`), the review stage 26 (M5-04, booked at its measured count by A66; first users the guard of `puzzles` and `blame` of `receipts`), and 1 that runs the calls a `runEnded` hook stages (M5-63, A70: the two reserved parts together). The gate is 1473: M5-05 set it to the measured 1472 instead of 1490 (J30), M5-63 raised it by one. The hard limit is 27 lines away |
| Did the City or Whispers need a kernel mechanism that was not reserved? | no | **no.** No port stopped for a missing kernel mechanism. What the ports needed beyond the plan was met in the sdk: the call trigger on a resident's `tool_called` (A63, inside the 30 lines of M5-06), the quiet trigger, the facts `directors.active` and `roster.residents` and the key order of a queued firing after a resume (M5-67, +11 sdk lines, way out 3 of 1.3, A74). The kernel interface is ready to freeze |
| Did the scheduler port change? | no line of `SchedulerPort` and none of `turns` | **`SchedulerPort` no; `turns` yes, by one option value.** `SchedulerPort` (`packages/contracts/src/kernel/ports.ts`) has no changed line since `c5daac3` (the file changed by the licence header and the review's `ReviewRequest`, M5-04). `turns` got the order `arena`, the old arena's draw (M5-61, decision A67, +2 engine lines): an added value of the option `order`, needed for the old turn order of both games at level 3 (open question 4). It is an addition to the options of `turns`, not a change of the port, so the freeze did not wait (erratum J312) |
| Where do the three budgets stand, and what is left for M6? | kernel at most 1490, total at most 4062; the M6 items (samples 2 to 4, the check of A37, the packed install) each with their planned lines, all outside the kernel | kernel 1473 of 1500 (27 left), sdk 2198, engine 384, **total 4055 of 4100 (45 left)**, 7 under the plan of 4062: the sdk took 11 more than booked (M5-67), the kernel 17 fewer. The M6 items have no planned line counts in any specification yet (J312). Samples 2 to 4 and the packed install live outside `ENGINE_FOLDERS`. The run-time check of service calls (A37) is planned "in the sdk", so it counts against the 45 lines left of the total: the M6 specification measures it first, and a check above 45 lines needs its own way out |
| Is the API ready to freeze? | the list of section 5 with the exports issue 50 marked internal, and the reserved parts that are not in it | **yes, and it is frozen.** The list is `scripts/api-freeze/frozen.json` and [`API-FREEZE.md`](API-FREEZE.md): the exports of the ten packages read by M5-50, 129 of them `@internal` and out of the reports since M5-94 (A104), the 25 base-mechanic exports read again by M5-95 (18 out, 7 kept with a reason, A105), the whole `/contract` of every base mechanic in its report (M5-96, A106); "Not in the frozen surface" lists the reserved parts. F1 is dated 2026-11-16 by M5-57. Open: the tick trigger `{ every: n }` is frozen though no Director of a game uses it (J288) |
| What did the live runs cost, and is the base recorded? | section 7, against the caps | **2.2980 USD of 12.00** for 8 runs (Whispers 1.1661, the base 0.0686, the check resumes 0.0741, Act II 0.9892); every run inside its cap, the reserve untouched. The base is recorded: `city/base/city-001` on `data/runs`, its snapshot hash and game hash in `games/city/RUNS.md`. The rewrite has spent 9.6985 of 50 USD on this platform. [`M5-GATE.md`](M5-GATE.md) |
| `parallel` | still a sample, never played live; the freeze includes `SchedulerPort` as it stands | as planned: `samples/own-scheduler/` only, no live run, no City or Whispers run under it; `SchedulerPort` is frozen as it stands (in the report of `contracts`) |

**The check budget.** Not a question of section 9, but the longest part of M5 (decisions A97 to A114, issues M5-84,
M5-87, M5-92, M5-97 to M5-100, M5-102 and M5-103): with the two games the cold check ran past 600 s from M5-83 on.
It is back inside the budget with 89.7 s to spare (510.3 s, check 71), by sharing the command-line plays, fewer
command-line boundaries, one program for typecheck and lint, and the tests without isolation between files on two
workers. Left for after M5: B3, the 16 tests in 10 files that depend on the order inside their file (A114, J309).

**Answer.** The City and Whispers needed 71 kernel lines, all of the three reserved parts, and no kernel mechanism
that was not reserved; the scheduler port did not change, and `turns` gained one option value. The check passes: the
kernel interface stands, and the API is frozen from 2026-11-16. The authoring interface grew by 91 sdk lines, 11 more
than booked, which leaves 45 lines of the engine total for M6, where the run-time check of A37 will be the first to
claim them. Limits of this answer: one Act I base and three Act II runs at six residents on Haiku; no run with 12 or
more residents, no City run under `parallel`, no stop inside a tick.

## The gate of M6

The ten done-whens of `refactoring-before-release/13-m6-spec.md` (the list "M6 is done when" at its head) and what
proves each. Done-whens 1 to 6, 8 and 9 are tests or scripts in `pnpm check`, all offline; the gate issue M6-30 added
one, `scripts/gates/m6-gate.test.ts`, for the parts of done-whens 5 and 7 that no earlier gate checked whole (every
command of `docs/RELEASE.md` exists, 6.4; the baseline of each game of 1.0 line 3). The live runs, the save list and the
owner's lists are [`M6-GATE.md`](M6-GATE.md); done-whens 7 and 10 are the next two sections.

**The check.** The cold full check on the head of the gate issue (`rewrite/develop` at `c138860`, M6-29 merged, with
this issue's docs and its gate test; every build output, `*.tsbuildinfo` and the standing run cache removed first)
is green: **432.4 s of 600 s, peak 4622 MB of 6144 MB**, 508 test files with 3285 tests passed and 5 skipped, in the order of `--sequence.seed=2988963517`; typecheck and lint 332.1 s, tests 409.8 s, build 25.3 s, packed install 13.0 s, API reports 62.1 s; the layer, licence and sign-off gates pass; Node 22.23.4 (the log is the session's, not committed). **Under the goal of 540 s**. Every test named below ran green in it. The gate issue also ran, on that tree:
`pnpm release:check --branch <the gate's branch>` (green, 55 packages, 939 files, scan clean; the same on `c138860` with the branch `rewrite/develop`), `node scripts/release/data-repo.ts` (the dry run
passes), `node scripts/release/links.ts` (no unknown link) and `pnpm api:freeze` ("27 frozen files, each as
recorded").

| # | Done when | Met | Proven by |
|---|---|---|---|
| 1 | samples 2 to 4 exist, each its own package, played by a fake-model test that asserts on its log, with a README in the fixed format; `docs/tutorials/game.md` built from samples 1 to 4; the three first-hour tutorials pass as tests | yes | `samples/team-game/test/game.test.ts` ("plays the match; each move is the cell its team agreed on …", "--set games=2 is another game, and game.yaml is the same game as game.ts", "without grid, the provider of the vote's source, the game is refused with the error of the README"); `samples/roles/test/game.test.ts` ("first test: the game format has one model for every resident, so a model per resident is refused", K31; "plays the match; only the captains play, and a resident is shown its own team's posts only"); `samples/shipped-director/test/game.test.ts` ("is asked every second tick; at direction 0 it sends nothing, at 8 its fallback reminds the captain on move", the way out of 3.4 by A146; "the shipped gamemaker in this game is refused: it needs the City's run frame", P496). The README format and the commands: each sample's `test/tutorial.test.ts` ("every ts, yaml and sh block … stands in a file of the sample", "the commands run as the README says …"). The tutorials: `scripts/gates/tutorials.test.ts` ("reads the four tutorials, the game tutorial among them", "the game tutorial teaches from samples 1 to 4", with its failing fixture) and the tutorial tests of samples 1 to 6 (`games/hello/test/tutorial.test.ts`, `samples/*/test/tutorial.test.ts`) |
| 2 | outside the repository: the published packages packed, installed offline outside the work tree; samples 5 and 6 and a mechanic and a Director package from tarballs play, verify and replay; an undeclared service call is refused at run time with an `SwtError` | yes | `scripts/gates/packed-install.test.ts`, run by `pnpm check:pack` in lane 0 after the build (A120, A153): "installs into a folder outside the work tree, with the swt bin of the installed swarmtales", "plays, verifies and replays the Hello Game and samples 5 and 6, each with its committed outcome", "plays a game file and a YAML game with the installed JavaScript mechanic and Director", "refuses the planted call of a service the head does not declare" (`SWT-M026`, exit 2, K49), "checks every packed tarball of the release by 6.2", and the three failing cases of "the checks of the gate fail where they must". The check itself: `packages/sdk/test/undeclared.test.ts` ("lets `call` reach `requires` only, and `tryCall` and `has` reach `requires` and `uses`"; freeze row F2). The install uses a lockfile written from the workspace's (2.1's way out, A153); no CI job was needed |
| 3 | the rename applied: no old package name, folder or mechanic id outside the places 4.4 allows; every oracle test of a renamed game at level 3; the model-facing texts of every renamed game byte-equal before and after | yes | `scripts/gates/retired-ids.test.ts` ("stand in this repository only where an exception of the rename keeps them", with its failing fixture); the oracle tests of the renamed games through the `renamed` option of `runOracle` (freeze row F6): `games/{tictactoe,quarry,econ-lab,lanterns,harbor-lights,ember-tricks,blind-bid,morris}/test/oracle.test.ts` at level 3; M6 changed no oracle file, only the eight READMEs of the renamed games, each by one registered change "the mechanic is named `<new>`" (`git diff --stat 4604a12 f2e4044 -- oracles`); `scripts/gates/model-inputs.test.ts` ("pins every renamed game of the games list": the model inputs hashed before the apply, K24; "leaves the City's game hash the one of its Act I base", `9418a743…`, A144 (d)) |
| 4 | `swt doctor` offline, `swt doctor --online` with its cost first, both tested offline, one online call recorded live | yes | `apps/cli/test/doctor.test.ts` (Node against `engines`, the version lines, keys by name and never their value, the `SWT_` names, `--json`, exit 1 on a fail); `apps/cli/test/doctor-online.test.ts` ("prints the estimate first, then sends one request to the cheapest alias with an output cap of 1 …", "skips a provider whose estimate is above the budget …", "fails a refused key, and prints no key value", "asks every provider with a key, or only the one of --provider …", "with --ledger reserves the budget before the request and writes the cost after it"); freeze rows F3 and F7 (A135, A142). The live call: run 2 of M6, `hello/release/doctor-online.json` on `data/runs` (`f02a7a75`), 0.0000021 USD, from the packed install (`games/hello/RUNS.md`) |
| 5 | names and publishing ready: the published list and its gate, the content check of every tarball, a green `pnpm release:check`, `docs/RELEASE.md` with every owner's-hand step; nothing published, reserved, pushed as a tag or made public by an agent | yes | `scripts/gates/release-list.test.ts` ("holds in this repository: 20 packages on the platform line, every other mechanic on the plugins line", and its failing cases); `scripts/release/test/release.test.ts` ("the content of a tarball (6.2)", "no release script publishes, pushes or tags": "holds for every file of scripts/release/, its tests included"); `pnpm release:check` green on `c138860` (above); `docs/RELEASE.md` steps 0 to 7 and "Not recommended before 1.0", and every command it names exists: `scripts/gates/m6-gate.test.ts`, "holds for the checklist of the release", with "fails on a missing script, a missing file, an unread flag and an unknown command of swt, and on finding none". No agent published, reserved, tagged or made anything public: the owner pushed the tags and switched `main` himself on 2026-11-24 (O3); O2, O4, O8 and O12 are open (`M6-GATE.md`, "Left for the owner") |
| 6 | the data repository, the legacy removal and the switch prepared, each by a script with a dry run and its test; the save list with a status per row; every link to `v0-final` and `data/runs` classified by a gate | yes, with two findings | `scripts/release/test/data-repo.test.ts` and the dry run on `c138860` (passes: `data/runs` at `f02a7a75` with `LICENSE`, 40 rows, scan clean); `scripts/release/test/legacy-runs.test.ts` and the digest recorded by M6-18 ("The legacy runs staged by M6-18" above); `scripts/release/test/switch-main.test.ts` (each state of a fixture remote, "names runtime-r3 at 9d3ba515 and every revision up to the kernel's"); `scripts/gates/links.test.ts` ("has a class for every link of the repository"). The save list with its status: `M6-GATE.md`, "The save list". **Findings** (errata of the gate): the 89 links into the old history at `d13350b5` match no pattern of the link script, so the gate does not class them, although A140 (b) gave them a class; and the carry row of the save list is not ticked: the mutation harness and its gate (E7) were never carried, and the M6 specification does not name them |
| 7 | the 1.0 list of REWRITE section 5 answered line by line, each line with its test or its record; line 3 with one recorded live baseline per game, tic-tac-toe by a run of M6 | yes | the next section, "The 1.0 list"; line 3 by `scripts/gates/m6-gate.test.ts` ("holds in this repository: fifteen games, each with its row, its commit and its side of the rename", with its failing cases) and "The baselines of 1.0 line 3" below |
| 8 | the carries of M5 closed or named with their owner: J318, P494, B2, B3, P488, P493 built; B1 and P495 with their owner's point | yes | J318: freeze row F5 (`addition: docs only`, M6-13). P488, P493, P494: `apps/cli/test/report-parts.test.ts` ("writes the report of a scripted paused run, its facts marked up to the pause", "counts a resumed run from its last run_resumed, with the base's part apart …", "names kernel.dirty: true in the header of a run on a dirty tree …"), and the row of `whispers-001` in `games/whispers/RUNS.md` says "dirty tree". B2: `games/whispers/test/guard-tool.test.ts` ("is offered the one tool verdict with its old text, and its call blocks the guarded text", "replays equal, and resumed from three boundaries writes the straight log"), runtime revision 8 (`docs/RUNTIME-REVISIONS.md`, row r8, `2e9d969c`), the live check run 4 (24 of 24 reviews read, P480 closed). B3: `scripts/lib/check-run.test.ts` ("shuffles the tests by a seed of the head commit and names the seed in the summary"), the shuffle inside files (A152, K43). B1 (P486) and P495: the owner's (11.2; P495 with the next base, M6-27 not triggered) |
| 9 | budgets: the kernel adds no line (1473), kernel + sdk + engine at most 4100; the cold check green inside 600 s and 6 GB, 540 s the goal; the live spend inside the cap | yes | kernel 1473 (`packages/kernel/test/budget.test.ts`, gate 1473), kernel + sdk + engine **4069** of 4100 (`scripts/gates/budget.test.ts`; the softer check below); the cold check above (432.4 s of 600 s, peak 4622 MB of 6144 MB); the live spend 0.3068 of 2.34 USD, each run inside its cap (`M6-GATE.md`) |
| 10 | the stop rules and the softer check of section 12 answered in writing in this file | yes | "The softer check of M6" below |

## The 1.0 list

REWRITE section 5, line by line, at the gate of M6 (done-when 7). "Held" means a test of `pnpm check` or a recorded
run proves the line on `c138860`; what the owner still does for the release is in `M6-GATE.md`.

| # | Line of 1.0 | Held | By |
|---|---|---|---|
| 1 | One game format, one runner, one event format, chain over envelopes | yes | the game format: `packages/contracts/test/game-schema.test.ts` (one schema for the file and the data form), sample 2's "game.yaml is the same game as game.ts" and `apps/cli/test/installed.test.ts` (a data game of a project plays, verifies and replays); one runner: `swt run` plays every game of the games list (`apps/cli/test/standing.test.ts`, `standing-b.test.ts`, `standing-c.test.ts`) and, outside the repository, the installed one (`scripts/gates/packed-install.test.ts`); one event format: `packages/contracts/test/envelope-log.test.ts`; the chain over envelopes: `packages/chain/test/chain.test.ts`, `attack.test.ts`, `canonical.test.ts`, and `swt log verify` of every live folder of M6 |
| 2 | Kernel and engine-total budgets hold; file, function and complexity limits hold with no unexplained exception | yes | `packages/kernel/test/budget.test.ts` (1473 of the gate 1473, hard 1500) and `scripts/gates/budget.test.ts` (engine total 4069 of 4100); the limits in `pnpm lint` (300 code lines a file, 50 a function, complexity 10; tests 600 and 100); `scripts/gates/exceptions.test.ts` ("are well-formed in every source file": every disable comment names its rule, a reason and an issue) |
| 3 | All fifteen games (thirteen tabletop games, Whispers, City of Keys) run offline against their oracle file and have one recorded live baseline each | yes | offline: `games/<game>/test/oracle.test.ts` of the fifteen (the City also `classifier-oracle.test.ts`), every oracle file at level 3 (the Act II files of the City by projection, A56); the standing checks of every game (`games/*/test/standing.test.ts`, the command-line plays of `apps/cli/test/standing*.test.ts`). The baselines: `scripts/gates/m6-gate.test.ts` and the table "The baselines of 1.0 line 3" below, which names per game its run, its path on `data/runs` and the code commit it replays at: tic-tac-toe by run 1 of M6 (`155d497e`, after the rename), seven renamed games by runs recorded before the rename (quarry and econ-lab at `b7de6505`, Harbor Lights and Lanterns at `5b6336a6`, Blind Bid and Ember Tricks at `7ea5ea10`, morris at `7ea5ea10` through the off-branch `f0de5e95`), each of which replays at its own code commit (4.3) |
| 4 | The four firm effects are reproduced in sign | yes | M2: quarry's open quarries and econ-lab's brain kept their sign at 12 seeds ([`M2-GATE.md`](M2-GATE.md)); M4: Harbor Lights' private notes (+1.58, SE 1.37) and Lanterns' team brain (+0.058, SE 0.022) kept theirs ([`M4-GATE.md`](M4-GATE.md)). No series of M6 (none spans the rename, 4.3) |
| 5 | City of Keys plays Act I and Act II at six residents | yes | offline: `games/city/test/oracle.test.ts`, `act2.test.ts`, `resumed.test.ts`; live: the Act I base `city/base/city-001` and Act II to `arena.stop` three times from it (5a, 5b, 5c; [`M5-GATE.md`](M5-GATE.md)); the City's game hash is unchanged by M6 (`scripts/gates/model-inputs.test.ts`), so the base still binds |
| 6 | The three first-hour tutorials (game, mechanic, Director) pass as tests | yes | `scripts/gates/tutorials.test.ts` (every fenced block of `game.md`, `mechanic.md`, `director.md` and `scheduler.md` is an include of a sample's file or `no-test` with its reason) and the tutorial tests of samples 1 to 6 (done-when 1) |
| 7 | A mechanic and a Director written outside the repository run from a packed install | yes | `scripts/gates/packed-install.test.ts` (done-when 2): the plain JavaScript mechanic and Director of `scripts/gates/fixtures/outside/`, packed and installed as tarballs, played from a game file and a YAML game; samples 5 and 6 copied outside; the release smoke of M6 (runs 2 and 3) from the same install form |
| 8 | Licence, notices, headers and package names are in place | yes, but for the owner's look | `LICENSE` and `NOTICE` (A65); every tarball carries `LICENSE`, `NOTICE` and its README (`scripts/gates/release-list.test.ts`, "LICENSE and NOTICE of a tarball"; `pnpm release:check`); the SPDX header of every source file (`pnpm check:licences`, `checkHeaders`); the package names of the published list (`scripts/release/packages.json`) after the rename (`scripts/gates/retired-ids.test.ts`), free on the registry on 2026-11-16 (A150). Open for the owner: the lawyer's look at `LICENSE` and the wording of the package `NOTICE` (A147), and O2, the names held by his account |
| 9 | The licence gate is green; no copyleft licence in the lockfile, the files or the data | yes | `pnpm check:licences` (the lockfile's every package, the repository's files, the workflows, `third_party/manifest.json`) in the check above, with `scripts/licences/licences.test.ts` ("refuses copyleft, source-available and unknown ids"); `THIRD-PARTY-LICENSES.md` fresh (`pnpm release:check`); the data branch carries the project's licence (K7) |

### The baselines of 1.0 line 3 (A124)

One recorded live run per game, the first of its runs index that ended or recorded a result. `scripts/gates/m6-gate.test.ts`
holds this table and checks each row of the runs index, that the commit it replays at is on the history of the head,
and on which side of the rename (`6b4954b2`, M6-06) it stands. A run recorded before the rename replays at its own
code commit, because its game file imports the old package names (4.3); it counts for the renamed game.

| Game | Run | Path on `data/runs` | Code commit (replays at) | Runtime | Cost (USD) | Rename |
|---|---|---|---|---:|---:|---|
| `tictactoe` (was `tictactoe-teams`) | M6-24, seed 7 | `tictactoe/baseline/tictactoe-001` | `155d497e` | 8 | 0.0785 | after; recorded under the final name |
| `quarry` (mechanic was `draft-rounds`) | M2 pilot, seed 31 | `smoke/quarry-001` | `b7de6505` | 3 | 0.0337 | before |
| `econ-lab` (mechanic was `econ-games`) | M2 pilot, label 41 | `smoke/econ-lab-001` | `b7de6505` | 3 | 0.0125 | before |
| `harbor-lights` (mechanic was `hint-towers`) | M4 series, 12 pairs | `harbor-lights/harbor-lights-private-notes` | `5b6336a6` | 4 | 1.2814 | before |
| `liars-dice` | M4 smoke, seed 53 (the second; the first was stopped, P473) | `liars-dice/smoke/liars-dice-002` | `7ea5ea10` | 4 | 0.1088 | unchanged game |
| `lanterns` (mechanic was `clue-grid`) | M4 series, 12 pairs | `lanterns/lanterns-team-brain` | `5b6336a6` | 4 | 1.6631 | before |
| `chess` | M4 series, 4 matches | `chess/chess-requests` | `5b6336a6` | 4 | 1.1455 | unchanged game |
| `holdem` | M4 smoke, seed 41 | `holdem/smoke/holdem-001` | `7ea5ea10` | 4 | 0.1159 | unchanged game |
| `convoy` | M4 smoke, seed 53 | `convoy/smoke/convoy-001` | `f0de5e95` (`7ea5ea10`) | 4 | 0.1973 | unchanged game |
| `morris` (was `morris-teams`) | M4 smoke, seed 13 | `morris-teams/smoke/morris-teams-001` | `f0de5e95` (`7ea5ea10`) | 4 | 0.0969 | before |
| `salt-market` | M4 smoke, seed 41 | `salt-market/smoke/salt-market-001` | `f0de5e95` (`7ea5ea10`) | 4 | 0.1831 | unchanged game |
| `blind-bid` (mechanic was `sealed-auction`) | M4 smoke, seed 31 | `blind-bid/smoke/blind-bid-001` | `7ea5ea10` | 4 | 0.0216 | before |
| `ember-tricks` (mechanic was `trick-play`) | M4 smoke, seed 23 | `ember-tricks/smoke/ember-tricks-001` | `7ea5ea10` | 4 | 0.0540 | before |
| `whispers` | M6-26, seed 11 (also M5's runs 1 and 2 under r6 and r7) | `whispers/smoke/whispers-001-r8` | `8714c7d3` | 8 | 0.2264 | unchanged game |
| `city` | M5 Act I base, seed 7 (Act II from it: 5a, 5b, 5c) | `city/base/city-001` | `1ffa813f` | 7 | 0.0686 | unchanged game; its game hash `9418a743…` holds across the rename |

The commit `f0de5e95` (M4-60's run rows), which the rows of Convoy, morris and Salt Market name, is on no branch:
`git branch -a --contains` finds none, so a fetch cannot get it and a `git gc` may drop it. Its tree differs from
`7ea5ea10` only in four runs indexes, `docs/LESSONS-LEARNED.md` and `games/m4-ledger.jsonl` (`git diff --stat`), so the three runs replay at
`7ea5ea10`, as the rows already say. This is the case of finding 7 of [`M5-REVIEW.md`](M5-REVIEW.md) again (the run commits of 5a
and 5c); the gate leaves the rows as they are and lists a tag for the owner in `M6-GATE.md`, "Left for the owner".

## The softer check of M6

Section 12 of `refactoring-before-release/13-m6-spec.md`. Measured by the gate issue with the counter of the budget
gate (`scripts/lib/budget.ts`, `codeLinesOf`) on the tree of every commit of M6 that changed `packages/kernel/src`,
`packages/sdk/src`, `packages/engine/src`, `apps/cli/src`, `packages/models/src` or `packages/testkit/src` (each
extracted with `git archive`), from `4604a12` (the state of "The budgets at the start of M6") to `c138860`:

| Issue | Commit | Kernel | Sdk | Engine | Total | `apps/cli` | `models` | `testkit` | `contracts` |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| start (M5 closed) | `4604a12` | 1473 | 2198 | 384 | 4055 | 2031 | 1227 | 1058 | 1068 |
| M6-02, the installed table of a project | `f8b80a9` | 0 | 0 | 0 | 4055 | +50 | 0 | 0 | 0 |
| M6-01, the run-time check of service calls | `6597b7c` | 0 | +9 | 0 | 4064 | 0 | 0 | 0 | 0 |
| M6-05, the rename's script and `renamed` of `runOracle` | `fbab23c` | 0 | 0 | 0 | 4064 | 0 | 0 | +35 | 0 |
| M6-03, `swt doctor` | `b75c6e6` | 0 | 0 | 0 | 4064 | +154 | 0 | 0 | 0 |
| M6-04, `swt doctor --online` | `92c0fa4` | 0 | 0 | 0 | 4064 | +114 | +34 | 0 | 0 |
| M6-16, B2 | `2e9d969` | 0 | 0 | +5 | 4069 | 0 | +10 | 0 | +4 |
| M6-08, the packed install (K36) | `5e49fb9` | 0 | 0 | 0 | 4069 | +22 | 0 | 0 | 0 |
| M6-34, the manifest outside a clone | `60d6045` | 0 | 0 | 0 | 4069 | +74 | 0 | 0 | 0 |
| **M6** | `c138860` | **1473 (+0)** | **2207 (+9)** | **389 (+5)** | **4069 (+14)** | 2445 (+414) | 1271 (+44) | 1093 (+35) | 1072 (+4) |
| planned by 1.3 | | 1473 (+0) | 2213 (+15) | 394 (+10) | 4080 (+25) | about +900 together | | | |

M6-13, M6-14 and M6-06 also touched these folders and left these counts as they were (M6-14's reader of a paused and
a resumed run is in `packages/lab`, which the table does not count).

**Stop rules.** None fired. Rule 1: 39 issue ids (M6-00 to M6-38), 37 merged with the gate, the conditional M6-27 and M6-28
never opened: under 62, and under the cut line of 40, so the cut list of 13.2 was never applied and every entry
of it was built or played (B2 and its run, P488, run 3, M6-18 and M6-19). Rule 2: the kernel is at 1473, no line
added; kernel + sdk + engine 4069, under 4100. Rule 3: every renamed game matches its oracle files at level 3 through
the mapping, and the model inputs of every renamed game are the ones hashed before the apply (done-when 3), so the
rename stands. Rule 4: the cold check is inside 600 s (432.4 s of 600 s, peak 4622 MB of 6144 MB); the levers of section 9 were not needed for time.
The check passed its memory budget once (6285 MB at `60d6045`, A156), which M6-35 brought back under it by running
lint on two workers (K53); no gate, lint rule or test was dropped.

| Question | Planned answer | Answer |
|---|---|---|
| Did M6 add a kernel line? | no | **no.** The kernel has 1473 code lines at every commit of M6. Its source changed in one line that is not a code line count: `RUNTIME_REVISION` from 7 to 8 (M6-16, B2), which the freeze compares without its number (A143) |
| Where do the budgets stand? | kernel 1473, total at most 4080 | kernel 1473 of 1500, sdk 2207, engine 389, **total 4069 of 4100 (31 left)**, 11 under the plan of 4080: the check of A37 took 9 of its 15 sdk lines (M6-01), B2 5 of its 10 engine lines (M6-16). `apps/cli`, `models` and `testkit` grew by 493 of the about 900 planned; `contracts` by 4 (`answerTool`, freeze row F8) |
| Did an outside plugin need a mechanism the sdk does not offer? | no; if the packed-install gate finds one, it is named and goes to after 1.0 or to a decision row | **no sdk mechanism.** The packed install found faults of packaging and of the command line, each fixed: the prompt files were not in the built `dist` and an installed `swt` did not look in its dependencies' `prompts/` folders (K36, fixed in M6-08 by A153); an installed `swt` asked git about the user's project and recorded every plugin at `0.0.0` (P502, P503, fixed by M6-34, A155). Named for after 1.0: a package whose prompt files are not under `prompts/<owner>/` stays unfound outside a clone (today only `city-directors`, A153), and the shipped Directors cannot leave the City's run frame (P496) |
| Did the frozen surface take a break? | no; the additions of 1.4, each with its row | **no.** The rows of `docs/API-FREEZE.md` after F1 are additions, each under its decision: F2 (`SWT-M026`, A119), F3 and F7 (`doctor` and `--online`, the probe of `models`, A135, A142), F5 (`addition: docs only`, J318, A126), F6 (`renamed` of `runOracle`, A122), F8 (`answerTool`, A126), F9 (`RUNTIME_REVISION`, A143). The numbering skips F4 (erratum of the gate). `pnpm api:freeze`: "27 frozen files, each as recorded" |
| Is every line of the 1.0 list held, and by what? | the table of the gate, line by line | **yes, all nine,** by the table "The 1.0 list" above; line 8 waits for the owner's look at `LICENSE` and the package `NOTICE` before any publish |
| What is left for the owner? | 11.1 and 11.2 with their status | `M6-GATE.md`, "Left for the owner". Done by the owner on 2026-11-24: the switch of `main` (O3: `main` at `4604a12`, `develop` at `432a1ab`, `legacy` and `v0-final` at `a73e6a9`, `main` the default branch) and the tags `runtime-r3` to `runtime-r8` and `milestone-m1` to `milestone-m5` on the remote at their commits (A159). Open: O4 (the ruleset of `develop` refuses direct pushes and Actions has run nothing since 2026-11-14, so the integrator pushes to `rewrite/develop` and `develop` lags), the stale "Branches" and "Check" bullets of `CLAUDE.md` (a text is proposed in `M6-GATE.md`), O8, O2 and O12, the lawyer's and the owner's look at `LICENSE` and the package `NOTICE`, the provider's usage page against 2.2980 and 0.3068 USD, the optional run tags (their commits handed over as a bundle, A159), `milestone-m6` once this gate merges, and the owner's go for P445, P497, P499, P500 and the rest of 11.2 |

**Answer.** M6 added no kernel line and took 14 of the 25 booked lines of the engine total; the platform runs from
a packed install outside the repository, with a mechanic and a Director in plain JavaScript and the run-time check of
service calls, and the fifteen games of 1.0 each have a recorded live baseline. Every line of the 1.0 list is held by
a test or a record in the repository. What 1.0 still needs is the owner's: the names, the look at the licence texts,
Actions and the protection of `develop` (O4), the data repository and the publish; the switch of `main` and the tags
are done (2026-11-24). Two findings of the gate stand beside the list
and need a decision row before O6: the mutation gate of E7, which the carry list of REWRITE 3.10 keeps and which was
never carried, and a class for the 89 links into `d13350b5`. Limits of this answer: the baselines are single runs
(no effect is measured by them); the baselines of seven of the eight renamed games, recorded before the rename, replay only at their own code
commit, and three (Convoy, morris, Salt Market) name a code commit on no branch; the live runs of M6 are four, all on Haiku.
