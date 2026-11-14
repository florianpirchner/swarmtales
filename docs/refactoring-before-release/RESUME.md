# Resume note of the rewrite (kept by the integrator)

Last update: 2026-11-14, about 10:00 UTC. Read this first when the work is picked up again.

## Where things are

- **New platform:** branch `rewrite/develop` (pushed after every merge). One squash commit per issue.
  Rules for builders: `CLAUDE.md`; specifications `08-m1-spec.md` (+ `08-m1-spec-errata.md`) and `09-m2-spec.md`;
  decisions `DECISIONS.md` (section 9: A1 to A15).
- **Merged on `rewrite/develop`:** M1 issues 00 to 32 except 33, follow-ups M1-37 and M1-38, the challenger reviews
  of waves 1, 2 and of the kernel parts of wave 3; M2-00 (scaffold) and M2-01 (redaction).
- **In flight (local branches in worktrees under `/home/user/wt/`, not pushed unless said):**
  `m1/33` (port of `grid-game`, `optimal-referee`, `strategy-brain`), `m1/34` (CLI: `swt run --fake`, `swt log verify`),
  `m2/02` (contracts of M2; also adds the code letters `T` and `E`).
- **Old state:** branch `m0/integration` = `main` + oracles + noise floor + chess engine swap (Garbochess-JS in
  place of the GPL engine; lessons P440 to P445). Its full check was killed by memory in the lint gate while other
  work ran; it must be run alone (`flock /tmp/swt-check.lock pnpm check`, Node 26, about 25 minutes).

## Next steps, in this order

1. Old state: green full check on `m0/integration`, pull request to `main`, squash-merge. Then the freeze: tag
   `v0-final` and branch `legacy` at that commit, both verified on the remote. Never delete either (the owner does).
2. Finish M1: merge 33 and 34; then 35 (tic-tac-toe teams against its seven oracle files at level 3), 36 (Hello
   Game), swap the local conformance stand-ins of 32 and 33 for the testkit's checks, M1 review by a challenger.
3. The switch: `main` becomes the new platform (root `rewrite/root`), `develop` from `rewrite/develop`.
4. M2 in the wave order of `09-m2-spec.md` section 10 (next: 02, 17, 11, 12, then 03 to 06).

## Open follow-ups (not blocking)

Mirror of the issues on GitHub and `docs/ISSUE-RECORD.md` (decision A3) are not filled yet. Viewer: pages workflow,
views for the M1 event types, the game tab. An R code for "used after the run ended". Editor-completion budget (A9).
`games/README.md` still names the data repository (A15 says branch `data/runs`). Restate the chess baseline numbers
in paper 02 (new engine: default 91, lists 54, lists and coach 40).
