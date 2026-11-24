# The gate of milestone M6: the live runs, the baselines of 1.0, the save list

The write-up of the gate issue M6-30 for the parts of [`refactoring-before-release/13-m6-spec.md`](refactoring-before-release/13-m6-spec.md)
that are records rather than tests: the live runs of section 10, played by issues M6-24, M6-25 and M6-26 after the
plan in [`RERUN-PLAN-M6.md`](RERUN-PLAN-M6.md); the recorded baseline of each game (1.0 line 3, A124); the save list
of REWRITE 4.1 with its status (done-when 6); and what is left for the owner (section 11). Every number below is read
from the runs indexes (`games/*/RUNS.md`), the spend ledger [`../games/m6-ledger.jsonl`](../games/m6-ledger.jsonl) or
the dry runs of `scripts/release/`. The ten done-whens, the 1.0 list line by line and the softer check are in
[`ISSUE-RECORD.md`](ISSUE-RECORD.md), "The gate of M6".

**Result.** The four runs of the plan are recorded, each inside its own cap: **0.3068 USD of the cap of 2.34**, the
reserve untouched. Every one of the fifteen games of the 1.0 list has one recorded live baseline; the baselines
of seven of the eight renamed games were recorded before the rename and replay at their own code commit (4.3). The save list is prepared but not ticked: three
rows wait for the owner (the old runs, the links after O8, the bundle of the old state) and one row is not met in the repository (the
mutation gate of E7, below).

## The live runs of M6

| # | Run (plan row) | Folder on `data/runs` | Data commit | Code commit | Runtime | Cap (USD) | Cost (USD) | End |
|---:|---|---|---|---|---:|---:|---:|---|
| 1 | `tictactoe`, seed 7, the baseline (M6-24) | `tictactoe/baseline/tictactoe-001` | `2c42bcba` | `155d497e`, clean | 8 | 0.30 | **0.0785** | `grid.match` after 24 ticks, exit 0; three draws; 15 of 15 moves optimal |
| 4 | Whispers `whispers`, seed 11, 45 ticks, B2's check (M6-26) | `whispers/smoke/whispers-001-r8` | `36c6b886` | `8714c7d3`, clean | 8 | 1.00 | **0.2264** | the tick limit, exit 0; the guard answered 24 of 24 reviews by its tool `verdict`, none unreadable (P480 closed) |
| 2 | `swt doctor --online --provider anthropic`, packed install (M6-25) | `hello/release/doctor-online.json` | `f02a7a75` | `5e49fb93` | 8 | 0.01 | **0.0000021** | nine `ok`; the estimate 0.0000069 printed before the request |
| 3 | the Hello Game, seed 1, packed install: the release smoke (M6-25) | `hello/release/hello-game-001` | `f02a7a75` | `5e49fb93`, no checkout (P502) | 8 | 0.03 | **0.0019** | the tick limit (12), 8 of 9 moves (P445), exit 0 |
| | **Sum** | 4 records | | | | 1.34 | **0.3068** | |

The ledger holds nine lines: its cap line `{"capUsd":2.34}` and one reservation and one cost line per run, none open;
the four cost lines sum to 0.30685 USD. Every folder verifies, replays equal and is clean under `swt scan`, and every
finished run holds a `REPORT.md` written with `--game`, as each row of its runs index records. The rewrite has spent
**10.0053 USD** of 50 on this platform: 9.6985 before M6 (A149) and 0.3068. The cost is what the platform computes
from the token counts and the price table; it was not compared with the provider's usage page (the owner's, 11.1).

What the runs had to show (the plan's last table): the baseline ends by its own rule with a tally (run 1: yes, read
from the log, since the report's facts table holds neither the tally nor the referee's scores, P497); the guard
answers by its tool and every answer is read (run 4: 24 of 24, against 2 of 19 unreadable under r7); one minimal
request answered, its estimate first, its cost in the ledger (run 2: yes); the built `dist` plays against the real
provider (run 3: yes, no winner, P445).

**Deviations from the plan.** (1) Runs 2 and 3 installed the packed release candidate in the form of the packed-install gate (a lockfile
written from the workspace's, an offline frozen install, A153), not the plain `--offline --ignore-scripts` install of
the plan, whose rehearsal had failed (`ERR_PNPM_NO_OFFLINE_META`); the plan allowed it ("issue 25 takes that form").
(2) The manifest of run 3 names no `kernel.commit` and no `kernel.dirty` (P502), and recorded every plugin at `0.0.0`
(P503); both are fixed by M6-34 for later runs, and the folder stays as recorded. **Problems and loopholes:** no new
loophole (LH21 seen in a related form in run 4); problems P497, P499, P500, P502 and P503 new, P480 closed; P445,
P495 and P7 seen again. P499 and P500 propose rule or prompt changes of Whispers and the gamemaker: the owner's go.

## The baselines of 1.0 line 3 (A124)

The table of the fifteen baselines, with the code commit each replays at and its side of the rename, is in
[`ISSUE-RECORD.md`](ISSUE-RECORD.md), "The baselines of 1.0 line 3" (it names the old ids of the renamed games, which
the name lint allows in the record only). `scripts/gates/m6-gate.test.ts` checks it.

## The save list (REWRITE 4.1, `13-m6-spec.md` 7.2), with its status at the gate

| Must outlive `legacy` | Where | Status at the gate | Left |
|---|---|---|---|
| oracle files | `oracles/` | **done** (M0) | none |
| lessons log, findings, runtime revisions: their links to `v0-final` | the data repository or `docs/history/` | **classified, not rewritten.** `node scripts/release/links.ts` on `c1388605`: 399 links to `v0-final` (243 run data in 9 files, 15 carried docs in 5, 132 old code in 42; more than the 344 of the start because `docs/history/` carries the papers with their links) and 9 to `data/runs` in 2 files, none unknown; `scripts/gates/links.test.ts` holds it. Not classified: 89 links into the old history at `d13350b5` (85 in `LESSONS-LEARNED.md`, 4 in `docs/history/ideas/door-standoff.md`), which the link script does not match (erratum of the gate; A140 (b)) | M6-28 after O8 (its trigger does not hold); a class for the `d13350b5` links |
| the recorded runs of the old platform (`stories/*/runs/`, `examples/`) | `swarmtales-runs/legacy/…` | **staged once, not pushed.** M6-18 staged 8841 files, 815.7 MB, manifest digest `9d4b3780…` ("The legacy runs staged by M6-18" in the record); the staging was lost with the build container (A25) | the owner stages again on his clone (`docs/RELEASE.md` step 5, the script refuses another digest) and pushes with O8 |
| the carry list of REWRITE 3.10, each mechanic's tests, the legacy log reader of the viewer | on `main` | **done but one row.** Carried: `packages/chain`, the viewer with its legacy log reader (`packages/viewer-core/src/load.ts`, fixture `legacy-run`), `packages/prompts`, `random.ts` (`packages/kernel/src/random.ts`), the rule code of the thirteen games, the mechanic README generator (`scripts/mechanic-docs/`), the conformance checks (`packages/testkit/src/conformance.ts`); ported: models, the tool pipeline, the turn loop, testkit, the reporter, every mechanic with its tests (43 folders under `mechanics/`, each with `test/`); recut: the City cluster and its four Directors (M5). **Not carried: the mutation harness with its gate for kernel and sdk** (E7; 3.10's carry row; `packages/testkit/src/mutation.ts` and `test/testkit/mutation.test.ts` are at `v0-final` only). `10-m3-spec.md` section 17 left it, with the editor budget of A9, for M6; `13-m6-spec.md` names neither (erratum of the gate) | a decision row of the integrator or the owner: an issue before 1.0, or a recorded move after it |
| papers of `docs/ideas/` and `docs/design/` that a kept doc cites | `docs/history/` | **done** (M6-19, A145) | none |
| bridge runs and the noise floor on the old code | the data repository | **on `data/runs`** under `legacy/` (M2) | moves with O8 |
| the whole old state | `swarmtales-v0-final.bundle`, outside GitHub | **not made** (the owner's) | `docs/RELEASE.md` step 3, with `git bundle verify` |

The deletion of `legacy` and `v0-final` (O6) waits for every row above, after 1.0.

## The dry runs of the release, on the gate's tree (`c1388605` and this issue)

| Script | Result |
|---|---|
| `pnpm release:check --branch <the gate's branch>` (on `f2e4044c` with `rewrite/develop`, the same) | "packed 55 packages, 939 files; swt scan: clean", "release:check: green on …"; it prints 55 `pnpm --dir … publish --access public` lines for the owner |
| `node scripts/release/data-repo.ts` | "the dry run passes": `data/runs` at `f02a7a75`, 1575 files, 203.1 MB, with `LICENSE` and `README.md`; 40 rows of the runs indexes, each with its path and data commit on the branch; scan clean, 1575 of 1575 files |
| `node scripts/release/links.ts` | four classes, none unknown (the save list above) |
| `pnpm api:freeze` | "27 frozen files, each as recorded" |

`node scripts/release/switch-main.ts` reads the remote and is the owner's to run; its states are proven by
`scripts/release/test/switch-main.test.ts` on a fixture remote. The owner ran the switch with it on 2026-11-24;
`--verify` then named only the two optional run tags (A159), which M6-38 leaves out where the clone lacks their commits.

## Left for the owner

**The owner's hand** (11.1, A134; none done by an agent):

| Item | Status at the gate |
|---|---|
| O3, the switch of `main` | **done by the owner on 2026-11-24**: `main` at `4604a127` (M5 closed), `develop` at `432a1abd` (M6-37), `legacy` and `v0-final` at `a73e6a92`, `main` the default branch. M6-29 then moved the workflows and the docs to the branches as they stand (K54, K55). The first attempt of 2026-11-17 had been refused by the required checks of the repository's ruleset |
| O3, the tags | **done by the owner**: `runtime-r3` to `runtime-r8` and `milestone-m1` to `milestone-m5` on the remote at the commits of `scripts/release/tags.ts` (A159). Owed: `milestone-m6`, once this gate merges and M6's review closes it. Optional: `runs/m5-5a` (`8e11ab1e`) and `runs/m5-5c` (`0d119aa9`), whose commits were never pushed and were handed to the owner as a git bundle (A159); `f0de5e95`, the code commit of three baselines (`ISSUE-RECORD.md`, "The baselines of 1.0 line 3"), is in the same case. The owner's earlier tag `m5` at `ab0d283d` (the gate of M5) stands beside `milestone-m5` at `4604a127` |
| O4, Actions and branch protection | **partly settled.** On 2026-11-24 the owner took the required checks out of the ruleset of `develop` (A160), so the integrator pushes `develop` and `rewrite/develop` to the same commit; Actions has run nothing since 2026-11-14, so turning Actions on and the required checks back on stays open (`docs/RELEASE.md`, step 4, A150) |
| `CLAUDE.md` after the switch | **stale, for the owner** (an agent does not edit it without his word): see "A text for `CLAUDE.md`" below |
| O8, the data repository and the old runs | open; the dry run passes |
| O2 and O12, the npm scope and names, the publish | open; the names were free on 2026-11-16 (A150), the scope exists without saying whose |
| the lawyer's and the owner's look at `LICENSE` and the package `NOTICE` (A65, A147) | open; before O10 and O12 |
| the provider's usage page against the ledgers of M5 (2.2980) and M6 (0.3068) | open |
| O6, O9, O10, O11, O13 | not before 1.0 or not planned (`docs/RELEASE.md`, "Not recommended before 1.0"); the public viewer page of A157 is published from `main` by `pages.yml` |

**A text for `CLAUDE.md`** (proposed, not applied). The bullet "Branches" says that `main` and `develop` are still
called `rewrite/root` and `rewrite/develop` until the switch, and the bullet "Check" that the recorded local check is
the proof "until GitHub Actions and branch protection are switched on". Proposed:

- **Branches.** Work lands on `develop`; `main` moves only at a milestone, after the milestone review (decision A5).
  The switch was made on 2026-11-24 (`main` at the close of M5). Until O4 lets the integrator's commits through the
  ruleset of `develop`, the integrator merges onto `rewrite/develop` and the owner brings `develop` up to it.
- **Check.** `pnpm check` must be green before a merge; it needs a full clone. Until Actions runs the required checks
  of `main` and `develop` (O4), the recorded result of the local `pnpm check` is the proof: in the squash commit, and
  in the body of a pull request where one is opened. (The rest of the bullet as it stands.)

**The owner's go** (11.2; recorded proposals only, no issue built any of them; a coordinator's go is not the
owner's): P445 (the Hello Game's tick limit, 20 ticks), P497 (metrics for the tic-tac-toe report), P499 and P500
(Whispers and the gamemaker, run 4), B1 (P486), P484, P485, P491, P492, LH21, P465, P496 (the shipped Directors outside
the City), two more Act I bases with P495, runs with 12 residents, a DeepSeek gamemaker, a break of the frozen API,
spend above the cap, publishing the games, `npm create`, the docs site.

**The German summaries** of the live runs are the job of the sessions that played them (`CLAUDE.md`, "After every
live run", point 5); whether each was given, and the one of M5 that `M5-GATE.md` lists as open, is not recorded in
the repository.
