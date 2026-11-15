# Resume note of the rewrite (kept by the integrator)

## State at the end of M4, 2026-11-15, about 14:00 UTC (read this part first)

Written by the gate issue of M4 (M4-63). The older sections below are kept as they were; where they differ, this
one holds.

- **M4 is built.** All 72 issues are merged on `rewrite/develop`: M4-00 to M4-71 (64 planned by A32, M4-64 to M4-71
  added by A42, A43, A45 and A46; M4-44 is inside M4-45). The last commits are M4-63 part 1 (`d7f4eb0`, the errata
  and the record), M4-59 (`cfa3676`, the three series) and the squash commit of the gate, M4-63. Decisions run to
  A46 (`DECISIONS.md` section 9); the specification is `11-m4-spec.md`, its errata `11-m4-spec-errata.md` (H1 to
  H47, open points Q1 to Q6).
- **Games that play:** the Hello Game, tic-tac-toe teams, quarry, econ-lab, the city slice and the ten tabletop
  games of M4 (liar's dice, Harbor Lights, Lanterns, chess, Ember Tricks, Blind Bid, hold'em, nine men's morris,
  Convoy, Salt Market). Each of the ten matches all of its oracle files at level 3 (58 files); every game passes
  the standing checks; `GAMES.md` has the thirteen tabletop cards and a generated overview.
- **The gate:** the nine done-whens are met, each with its test or its write-up, in `docs/ISSUE-RECORD.md` ("The
  gate of M4", "The softer check of M4"). The kernel has 1402 code lines (9 added, the two activation hooks of
  M4-16), kernel + sdk + engine 3861 of 4100; the sample `parallel` (`samples/own-scheduler/`) needed no line of
  kernel, sdk or engine and no change of the scheduler port. No stop rule fired, nothing was cut.
- **Live:** `games/m4-ledger.jsonl` holds 5.1262 USD of the cap of 12.00 (63 runs: the ten smokes of M4-60 and
  M4-61, the check run of M4-70, the 52 runs of the series of M4-59). The series (`docs/M4-GATE.md`): Harbor
  Lights' private notes +1.58 (SE 1.37), sign kept and size not reproduced; Lanterns' team brain +0.058 recall
  (SE 0.022), kept; chess 1.209 requests per half-move beside the old 1.18 to 1.22, the count holds. The run folders
  are on `data/runs` at `570801d` (pushed, the leak scan clean). Every recorded run of M4 is runtime revision 4;
  the runtime revision of `rewrite/develop` is 5 since M4-68, and no run of it is recorded yet (errata H41).
- **The check:** `pnpm check` runs its gates in three lanes and fits its budget again (M4-71: 549.3 s of 600 s,
  5348 MB of 6144 MB on this 4-core container; errata H16). Builders run targeted checks; the integrator runs the
  full check after each merge.

**Open points, in this order:**

1. **Owed by the owner** (the build session cannot push tags): the tag `v0-final` on `a73e6a9` (still not on the
   remote; the switch of `main` waits for it), `runtime-r4` at the merge of M4-02 (`b158a5b`) and `runtime-r5` at
   the merge of M4-68 (`6d1a685`) and `runtime-r6` at the merge of M4-72 (`390448d`), as `docs/RUNTIME-REVISIONS.md` says. The owner's go is also open for P465 (no
   game tool in an answer turn) and the look at the provider's usage page against the 4.09 USD of the series.
2. **The milestone review of M4** is done (`docs/M4-REVIEW.md`, closed by M4-72, A47); M4 is closed. Was: a challenger session that reads the specification, the errata and the
   result, and attacks the gate. Its findings become issues of M4 by a decision row, as the reviews of M2 and M3
   did; M4 is closed by that review.
3. **The row of M4-63** in `docs/ISSUE-RECORD.md` (row 231) waits for its commit id, merge time, tokens and agent
   time, which the integrator writes in with the merge.
4. **M5** is specified after the review: the City of Keys and Whispers (`REWRITE.md` section 4). Its inputs from
   M4: the softer check (staged calls and `runEnded` fit in the kernel, the rest of the reserved list does not;
   the gate of 1420 is raised by the issue of A20 with measured lines), the open points Q3 and Q5 of the errata,
   and that `parallel` was never played live.

## Older state (2026-11-14)

Last update: 2026-11-14, about 20:35 UTC, by the gate issue of M3 (M3-31). Read this first when the work is picked up again.

## Where things are

- **Old state, frozen:** pull request 156 is squash-merged; `main` is at `a73e6a9` (old platform + oracles + noise
  floor + chess engine without copyleft). Branch `legacy` sits on the same commit, verified on the remote.
  **Tag `v0-final` is NOT on the remote yet:** the git gateway of the build session refuses tag pushes. The owner
  pushes it (`git tag v0-final a73e6a9214767509c042cf572ba87ef586e133cc && git push origin v0-final`). `main` is
  not cleared before the tag is verified on the remote. Never delete the tag or the branch (the owner does).
- **New platform:** branch `rewrite/develop` (pushed after every merge). One squash commit per issue.
  Rules for builders: `CLAUDE.md`; specifications `08-m1-spec.md`, `09-m2-spec.md`, `10-m3-spec.md` and the errata
  files `08-m1-spec-errata.md`, `09-m2-spec-errata.md` and `10-m3-spec-errata.md`; decisions `DECISIONS.md`
  (section 9: A1 to A24).
- **M1 is complete** (issues 00 to 40, four reviews). Tic-tac-toe teams matches its nine oracle files at level 3.
- **M2:** all issues but the gate are merged: 00 to 23, the follow-ups 25 (lab) and 26 (money: the meter fails
  closed, the ledger pairs by id, a confirmatory run needs a clean tree), and the challenger reviews A and B.
  **M2-24, the gate, is merged** (`0ea32af`, 20:27 UTC): both series keep their sign, 61 live runs for 1.60 USD of
  the cap of 4.00 USD; the write-up is `docs/M2-GATE.md`, the run folders are on the orphan branch `data/runs`
  (the integrator pushes it), the indexes in `games/quarry/RUNS.md` and `games/econ-lab/RUNS.md`. The milestone
  review of M2 is open.
- **M3:** specified in `10-m3-spec.md` (32 issues, 33 with M3-32 by decision A24).
  - **Merged:** 00 to 29 and 32 (the last is `a4e7ea7`, M3-29), and with this note **M3-31, the gate**.
  - **Proven offline:** the six done-whens. 1, 2, 3 and 5 by `games/city-slice/test/*.test.ts` and
    `apps/cli/test/city-slice.test.ts`; 4 by `scripts/gates/exile-alone.test.ts`; 6, the softer check, in
    `docs/ISSUE-RECORD.md` ("The gate of M3", "The softer check of M3"): the kernel has 1393 code lines (12 added,
    all by M3-02), kernel + sdk + engine 3818 of 4100, no kernel interface changed, M4 does not wait.
  - **Open:** **M3-30, the live smoke** (decision A21; at most 0.40 USD per run, 1.50 USD for M3; it does not gate),
    run by another session; the milestone review of M3; `games/city-slice/RUNS.md` and `games/m3-ledger.jsonl` do
    not exist until the smoke writes them.
  - What the builders found against the specification: `10-m3-spec-errata.md` (G1 to G26, four open points).
- **Record:** `docs/ISSUE-RECORD.md` holds one row per commit up to `0ea32af` (129 rows). The rows 83 to 129 have no
  token number: the usage file of the sessions ends before them. The row of M3-31 is owed.
- **Check:** `pnpm check` has a time budget of 600 s; with several builders on the machine the lint alone takes
  330 s and the last gates are cut off. Builders therefore run targeted gates only (brief of the integrator), and
  the integrator runs the full check after each batch of merges. Lint runs as three processes (4 GB heap each).

## Next steps, in this order

1. M2: check that `data/runs` is pushed, then the milestone review of M2 (the kill criterion is checked there).
2. M3-30: read the smoke's report (the folder verifies, replays equal, the leak scan is clean, the cost is under
   the cap), merge its index row and its lessons; add the rows of M3-30 and M3-31 to `docs/ISSUE-RECORD.md`.
3. The milestone review of M3 (a challenger session). M3 is not closed before M2 is (`10-m3-spec.md` 13.2).
4. The switch: `main` becomes the new platform (root `rewrite/root`), `develop` from `rewrite/develop`. **It waits
   for the tag `v0-final` on the remote**, which only the owner can push (see above); `main` is not cleared before
   the tag is verified there.
5. M4 is specified next (the remaining tabletop games, the scheduler sample `parallel`); it gets its issue number by A19.

## Open follow-ups (not blocking)

Leftovers of M1: swap the local conformance stand-ins of the mechanic tests for the testkit's checks; `swt` has no
`bin`, build or smoke gate yet; plugin versions are `0.0.0` in the manifest. The mirror of the issues on GitHub
(decision A3). Viewer: views for the M1 event types, the game tab. Editor-completion budget (A9). The one
recalibration of D4 after the tenth merged issue. Restate the chess baseline numbers in paper 02 (new engine:
default 91, lists 54, lists and coach 40). `games/quarry/game.ts` carries a claim about model behaviour from the
old platform in a comment. From M3, the open points of `10-m3-spec-errata.md`: P2 (a data game with a Director,
goes to M5) and P5 (a tool context without the log position of its call; decision A36 keeps it so, since with A34
no payload holds a position). P1
and P4 are closed by M3-34, P3 (log positions in a `take` reply after a resume) by M4-02. The erratum G28 (the
report does not say "human-influenced", P452) goes to M4-09.
