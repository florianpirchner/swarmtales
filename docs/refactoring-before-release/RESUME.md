# Resume note of the rewrite (kept by the integrator)

## State on 2026-11-15, 07:40 UTC (read this part first)

- The integrator session changed on 2026-11-15 (the first one reached its weekly usage limit); builder work that
  was not merged then lived only in that session's container and was rebuilt from the specification.
- **M4 merged on `rewrite/develop`:** 00, 01, 02, 04, 05, 06, 07, 08, 11, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  26, 27, 28, 29, 31, 37, 38, 39, 41, 42, 44 (inside 45), 45, 47, 48, 64, 65 (decision A43). Games that play:
  liar's dice, Harbor Lights, Lanterns, chess (default, fresh, compact), hold'em (without the aid and mixed tables).
- **Open in M4:** 03, 09, 10, 12, 13, 14, 15, 30, 32 to 36, 40, 43, 46, 49 to 63, and a follow-up of 65 for the
  key order on resume of `holdem`, `chess`, `salt-market` and `strategy-brain` (the open pin in tic-tac-toe teams).
- **The check on this container:** 4 cores. `pnpm check` runs about 710 s on a quiet machine (typecheck 140 s,
  lint 260 s, tests 185 s, build and API 125 s), so the time budget of 600 s stops it at the build gate. The
  integrator runs the check, and then `pnpm build` and `pnpm api` on their own, and records that every gate
  passed; the budget overrun is an erratum of M4 for the gate issue (E16 of the integrator's list).
- The errata found while building M4 are collected for `11-m4-spec-errata.md` (written by issue 63).

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
