# Resume note of the rewrite (kept by the integrator)

Last update: 2026-11-14, about 18:25 UTC. Read this first when the work is picked up again.

## Where things are

- **Old state, frozen:** pull request 156 is squash-merged; `main` is at `a73e6a9` (old platform + oracles + noise
  floor + chess engine without copyleft). Branch `legacy` sits on the same commit, verified on the remote.
  **Tag `v0-final` is NOT on the remote yet:** the git gateway of the build session refuses tag pushes. The owner
  pushes it (`git tag v0-final a73e6a9214767509c042cf572ba87ef586e133cc && git push origin v0-final`). `main` is
  not cleared before the tag is verified on the remote. Never delete the tag or the branch (the owner does).
- **New platform:** branch `rewrite/develop` (pushed after every merge). One squash commit per issue.
  Rules for builders: `CLAUDE.md`; specifications `08-m1-spec.md`, `09-m2-spec.md`, `10-m3-spec.md` and the errata
  files `08-m1-spec-errata.md` and `09-m2-spec-errata.md`; decisions `DECISIONS.md` (section 9: A1 to A22).
- **M1 is complete** (issues 00 to 40, four reviews). Tic-tac-toe teams matches its nine oracle files at level 3.
- **M2:** all issues but the gate are merged: 00 to 23, the follow-ups 25 (lab) and 26 (money: the meter fails
  closed, the ledger pairs by id, a confirmatory run needs a clean tree), and the challenger reviews A and B.
  **M2-24, the gate, is running** (about 18:20 UTC) on a detached clean checkout of `b7de6505` in
  `/home/user/wt/gate`; run data in `/home/user/wt/runs-data/` (outside the tree), ledger
  `/home/user/wt/runs-data/m2-ledger.jsonl` with the cap 4.00 USD. Its results go to the orphan branch
  `data/runs` (the integrator pushes it) and to `docs/M2-GATE.md` on branch `m2/24`.
- **M3:** specified in `10-m3-spec.md` (32 issues). Merged: 00 to 14, 16 to 19, 22, 25. Building: 15 (the
  Director's driver), 26 (oracle proofs 2). Kernel at 1393 code lines.
- **Record:** `docs/ISSUE-RECORD.md` holds one row per merge up to `0ac3e89`; the rows after it are owed.
- **Check:** `pnpm check` has a time budget of 600 s; with several builders on the machine the lint alone takes
  330 s and the last gates are cut off. Builders therefore run targeted gates only (brief of the integrator), and
  the integrator runs the full check after each batch of merges. Lint runs as three processes (4 GB heap each).

## Next steps, in this order

1. M2-24: read the gate's report, push `data/runs`, merge `m2/24`, then the milestone review of M2.
2. M3 in the order of `10-m3-spec.md` section 12: after 15: 20 (run loop) and 23 (the game `city-slice`); then 21
   (`swt resume`), 24 (replays and resumes), 27 to 29 (viewer), 30 (live smoke, A21), 31 (gate).
3. The switch (needs the tag `v0-final` on the remote first): `main` becomes the new platform (root
   `rewrite/root`), `develop` from `rewrite/develop`.

## Open follow-ups (not blocking)

Leftovers of M1: swap the local conformance stand-ins of the mechanic tests for the testkit's checks; `swt` has no
`bin`, build or smoke gate yet; plugin versions are `0.0.0` in the manifest. The mirror of the issues on GitHub
(decision A3). Viewer: views for the M1 event types, the game tab. Editor-completion budget (A9). The one
recalibration of D4 after the tenth merged issue. Restate the chess baseline numbers in paper 02 (new engine:
default 91, lists 54, lists and coach 40). `games/quarry/game.ts` carries a claim about model behaviour from the
old platform in a comment.
