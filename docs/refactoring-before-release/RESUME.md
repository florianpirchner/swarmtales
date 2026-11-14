# Resume note of the rewrite (kept by the integrator)

Last update: 2026-11-14, about 15:45 UTC. Read this first when the work is picked up again.

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
- **M2:** issues 00 to 21 and 23 are merged, and the two challenger reviews A (keys, money of a single run) and B
  (experiment runner, analysis). Quarry (six files) and Econ Lab (five files) match their oracles at level 3. The
  canary test finds no key in any artefact. **Open:** M2-22 (`swt report`, `swt experiment`; with A18 and errata
  F12 and F14), then M2-25 and M2-24 below.
- **M3:** specified in `10-m3-spec.md` (32 issues, M3-00 to M3-31, waves in section 13). Nothing built yet.
- **Record:** `docs/ISSUE-RECORD.md` holds one row per merge.

## Next steps, in this order

1. Merge M2-22.
2. M2-25, a follow-up for the review findings that stand as `it.fails` tests: B5, B8, B12, B14 (review B); the
   meter fails open on a cost that is no number, and the ledger pairs a reservation by run name (review A).
3. M2-24, the gate (`09-m2-spec.md` section 8): live smoke of the Hello Game (cap 0.05 USD), the two noise floors,
   the two series. Haiku through Anthropic, caps of A17, hard stop 4.00 USD (A14), spend ledger
   `games/m2-ledger.jsonl`, run data on the orphan branch `data/runs` (A15). Then `docs/M2-GATE.md` and the
   milestone review.
4. M3 in the wave order of `10-m3-spec.md` section 13: issue 00, then 01, 04, 05, 07, 08 and 18 in parallel.
5. The switch (needs the tag `v0-final` on the remote first): `main` becomes the new platform (root
   `rewrite/root`), `develop` from `rewrite/develop`.

## Open follow-ups (not blocking)

Leftovers of M1: swap the local conformance stand-ins of the mechanic tests for the testkit's checks; `swt` has no
`bin`, build or smoke gate yet; plugin versions are `0.0.0` in the manifest. The mirror of the issues on GitHub
(decision A3). Viewer: views for the M1 event types, the game tab. Editor-completion budget (A9). The one
recalibration of D4 after the tenth merged issue. Restate the chess baseline numbers in paper 02 (new engine:
default 91, lists 54, lists and coach 40). `games/quarry/game.ts` carries a claim about model behaviour from the
old platform in a comment.
