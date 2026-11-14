# Resume note of the rewrite (kept by the integrator)

Last update: 2026-11-14, about 11:45 UTC. Read this first when the work is picked up again.

## Where things are

- **Old state, frozen:** pull request 156 is squash-merged; `main` is at `a73e6a9` (old platform + oracles + noise
  floor + chess engine without copyleft). Branch `legacy` sits on the same commit, verified on the remote.
  **Tag `v0-final` is NOT on the remote yet:** the git gateway of the build session refuses tag pushes. The owner
  pushes it (`git tag v0-final a73e6a9214767509c042cf572ba87ef586e133cc && git push origin v0-final`). `main` is
  not cleared before the tag is verified on the remote. Never delete the tag or the branch (the owner does).
- **New platform:** branch `rewrite/develop` (pushed after every merge). One squash commit per issue.
  Rules for builders: `CLAUDE.md`; specifications `08-m1-spec.md` (+ `08-m1-spec-errata.md`) and `09-m2-spec.md`;
  decisions `DECISIONS.md` (section 9: A1 to A16).
- **Merged on `rewrite/develop`:** all of M1: issues 00 to 40 (37 and 38 are the kernel follow-ups, 39 the oracle
  runner, 40 the four open findings of the milestone review), the challenger reviews of waves 1 to 3 and of the
  milestone; M2-00 (scaffold) and M2-01 (redaction). **M1 meets its "done when":** tic-tac-toe teams matches all
  nine oracle files at level 3, `swt log verify` passes on a run, the viewer opens that run
  (`apps/viewer-web/test/real-run.test.ts`), kernel 1341 code lines (gate 1380).
- **In flight (local branches in worktrees under `/home/user/wt/`, not pushed):** `m2/02` (contracts of M2, built
  and green, waits for its merge).
- **Pace:** slow (one or two agents) until the usage reset at about 15:00 UTC on 2026-11-14, full width after it.

## Next steps, in this order

1. The switch (needs the tag `v0-final` on the remote first): `main` becomes the new platform (root
   `rewrite/root`), `develop` from `rewrite/develop`.
2. Small leftovers of M1 (not blocking): swap the local conformance stand-ins of the mechanic tests for the
   testkit's checks; `swt` has no `bin`, build or smoke gate yet; plugin versions are `0.0.0` in the manifest;
   the notes of the milestone review without a failing test (scratch list of the integrator, see follow-ups).
3. M2 in the wave order of `09-m2-spec.md` section 10 (next: merge 02, then 17, 11, 12, then 03 to 06).

## Open follow-ups (not blocking)

Mirror of the issues on GitHub and `docs/ISSUE-RECORD.md` (decision A3) are not filled yet. Viewer: pages workflow,
views for the M1 event types, the game tab. An R code for "used after the run ended". Editor-completion budget (A9).
`games/README.md` still names the data repository (A15 says branch `data/runs`). Restate the chess baseline numbers
in paper 02 (new engine: default 91, lists 54, lists and coach 40).
