# Resume note of the rewrite (kept by the integrator)

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
5. M4 is specified next (the remaining tabletop games, the scheduler `match`); it gets its issue number by A19.

## Open follow-ups (not blocking)

Leftovers of M1: swap the local conformance stand-ins of the mechanic tests for the testkit's checks; `swt` has no
`bin`, build or smoke gate yet; plugin versions are `0.0.0` in the manifest. The mirror of the issues on GitHub
(decision A3). Viewer: views for the M1 event types, the game tab. Editor-completion budget (A9). The one
recalibration of D4 after the tenth merged issue. Restate the chess baseline numbers in paper 02 (new engine:
default 91, lists 54, lists and coach 40). `games/quarry/game.ts` carries a claim about model behaviour from the
old platform in a comment. From M3: the open points P1 to P4 of `10-m3-spec-errata.md` (the wrapper in `decisions`,
data games with a Director, log positions in a `take` reply after a resume, the stale README of the sdk package).
