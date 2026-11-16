# Rerun plan of M6

The plan of the live runs of milestone M6, committed before the first run (issue M6-23). It is the short form of
section 10 of [`refactoring-before-release/13-m6-spec.md`](refactoring-before-release/13-m6-spec.md), which holds the
reasons; where the two differ, the specification and its errata hold. No run of this plan is a series: every run is
a single run with its own cap, and no run of M6 tests an effect (paper 02 D8). A change of this plan after the first
live run is a deviation: it is written into the run's README and into the record of the issue that played it, and it
never moves a cap.

Decisions behind the plan (`refactoring-before-release/DECISIONS.md`, section 9): A14 (the caps are refusals by
code), A15 and A25 (the data branch and its leak scan), A52 (every call on Haiku through Anthropic, the gamemaker by
`--director-model`), A122 (the runs are recorded under the renamed ids), A124 (what a recorded baseline is), A125 as
corrected by A137 (the cap of 2.34 USD), A126 (B2 under runtime revision 8), A135 and A142 (`swt doctor --online`),
A136 (the Node line). No run of M6 plays the City; its base `city/base/city-001` stays as it is (A54, issue 27).

## The committed files

| File | What |
|---|---|
| `docs/RERUN-PLAN-M6.md` | this plan |
| `games/m6-ledger.jsonl` | the spend ledger of M6, with its cap line `{"capUsd":2.34}` (issue M6-00, errata K3); every run below names it with `--ledger` |

## Where the runs start

**Runs 1 and 4** play from a clone of `rewrite/develop` at the head that the issue names, with a clean tree
(`git status --porcelain` prints nothing), so that the manifest says `kernel.dirty: false` (P494), under runtime
revision 8 (`docs/RUNTIME-REVISIONS.md`, row r8) and Node 22.23.4 (`.node-version`, A136). `$RUNS` is a folder
outside the work tree. In the clone `swt` is `node --conditions development apps/cli/src/bin.ts`, as in the README.
Before run 1, `swt doctor` (offline) is read: no `fail`.

**Runs 2 and 3** play from the packed install of the release candidate (6.1), the case of 2.1, not from the clone:

```sh
REPO=$PWD                                    # the clean clone at the release candidate
PACK=$(mktemp -d); PROJ=$(mktemp -d)         # both outside the work tree
pnpm build
pnpm -r --filter "swarmtales..." --filter "@swarmtales/mechanic-grid..." pack --pack-destination "$PACK"
cp games/hello/game.ts "$PROJ/game.ts"
# $PROJ/package.json: "type": "module"; dependencies swarmtales, @swarmtales/sdk, @swarmtales/mechanic-grid;
# pnpm.overrides map swarmtales and every @swarmtales/* package to "file:$PACK/<its tarball>" (2.1)
pnpm -C "$PROJ" install --offline --ignore-scripts
```

Every command of runs 2 and 3 runs in `$PROJ` through `node_modules/.bin/swt`, without `--conditions development`;
the ledger is named by its absolute path `$REPO/games/m6-ledger.jsonl`. If the packed-install gate of M6-08 or
`docs/RELEASE.md` of M6-21 writes the project in another form, issue 25 takes that form and names it in its record.
Before run 2, `swt doctor` (offline) in `$PROJ` is read: the `node` check meets the `engines` `>=22.19` of the
installed `swarmtales`, both version lines are in step, no `fail`. Before run 3, the same game plays fake in `$PROJ`
(`swt run game.ts --fake --seed 1 --out $PROJ/fake`, then `swt log verify` and `swt replay --game game.ts` of its
folder); a live run starts only after the fake one passes.

**Rehearsed offline on `f75224c7`** (M6-23, no model call): the build and the pack of the closure above pass (28
tarballs: the CLI depends on `lab`, `testkit` and four mechanics of the City's frame); the offline install does not
(`ERR_PNPM_NO_OFFLINE_META` for `@noble/curves@2.4.0`, a dependency of `@swarmtales/chain`): the store holds the
tarballs, not the registry's metadata, which is the first test of M6-08 and its way out (2.1). Also open: outside a
clone the prompt lookup finds no prompt file of a mechanic (`packages/prompts/src/lookup.ts`, errata K36), and the
Hello Game's `grid` declares prompts. So runs 2 and 3 wait for M6-08: its gate green, its install form taken here,
and the fake run of the Hello Game above passing in `$PROJ`.

## The runs

The flags of the runs, with `$GM` for `--director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000` and `$L`
for `--ledger games/m6-ledger.jsonl` (in the clone) or `--ledger "$REPO/games/m6-ledger.jsonl"` (in `$PROJ`):

| # | Run | Command | Cap | Expected | Issue | On `data/runs` |
|---|---|---|---:|---:|---|---|
| 1 | `tictactoe`, the default game (three games, brain on, no gamemaker), seed 7: the baseline (A124) | `swt run games/tictactoe/game.ts --seed 7 --provider anthropic --model claude-haiku-5-5 --budget 0.30 $L --purpose exploratory --out $RUNS/tictactoe/baseline` | 0.30 | 0.10 | 24 | `tictactoe/baseline/tictactoe-001/` |
| 4 | Whispers `whispers` (receipts on), seed 11, 45 ticks, runtime revision 8: B2's check | `swt run games/whispers/game.ts --seed 11 --provider anthropic --model claude-haiku-5-5 --thinking low $GM --budget 1.00 $L --out $RUNS/whispers/r8` | 1.00 | 0.25 to 0.95 | 26 | `whispers/smoke/whispers-001-r8/` |
| 2 | `swt doctor --online`, Anthropic only, from `$PROJ` | `swt doctor --online --provider anthropic --budget 0.01 $L --json > $RUNS/hello/release/doctor-online.json` | 0.01 | 0.0001 | 25 | `hello/release/doctor-online.json` |
| 3 | the Hello Game from `$PROJ`, seed 1: the release smoke | `swt run game.ts --seed 1 --provider anthropic --model claude-haiku-5-5 --budget 0.03 $L --out $RUNS/hello/release` | 0.03 | 0.002 | 25 | `hello/release/hello-game-001/` |

**Order:** 1, read; 4, read; 2; 3, read. One run is in flight at a time (10.1); 1 and 4 are wave 5, 2 and 3 wave 7
after the docs of 1.0 (M6-22), since the release smoke runs the README's commands: if the README of M6-22 writes the
command of run 3 in another form, run 3 takes that form with the flags `--seed`, `--budget` and `--ledger` of the
row, and the record names the difference.

**Seeds and purposes.** Run 1 plays the first fake seed of the games list (`games/index.ts`, `fakeSeeds: [7]`, the
seed of the oracle `tictactoe-teams-s7.json`), not the game's own 11; Whispers plays its own 11, the seed of both M5
runs; the Hello Game plays seed 1, the seed of its live smokes of M2 and M4. Run 1 is `exploratory` (a single run
whose numbers are read and pooled into no verdict, like the City's base of M5), runs 3 and 4 are smokes (the
default). The ledger names a run `<purpose>/<run id>` (`exploratory/tictactoe-001`, `smoke/whispers-001`,
`smoke/hello-game-001`) and the doctor `doctor/online`. The CLI numbers a run `001` in its fresh `--out` folder; the
Whispers folder is renamed `whispers-001-r8` before it goes to `data/runs`, beside `whispers-001` (r6) and
`whispers-001-r7`.

**Expected costs.** Run 1: the old platform's default run of tic-tac-toe teams cost 0.07 USD (`v0-final`,
`stories/tictactoe-teams/runs/tictactoe-teams-06a-001-smoke`, seed 11); 0.10 holds the other seed. Run 4: 0.2145 was
the variant `whispers-rumours` under r7, 0.9517 the variant `whispers` under r6, 63 requests above the second price
tier (P479), so this run may end at its cap (exit 5) before tick 45. Run 2: 64 input tokens and 1 output token of
Haiku, about 0.00001. Run 3: the Hello Game's smokes cost 0.0013 to 0.0018 (`games/hello/RUNS.md`).

## The models, as the manifests name them

Every resident and Director plays Haiku through Anthropic: provider `anthropic`, `requestedId` and `resolvedId`
`claude-haiku-5-5`, pricing `pi-ai@1.4.0`.

| Actor | Run 1 `tictactoe` | Run 4 `whispers` | Run 3 Hello Game | From |
|---|---|---|---|---|
| residents | `X1` to `O3`: `medium`, 16000 | `A01` to `A06`: `low`, 4000 | `ada`, `bob`: `medium`, 4000 | the game file's output cap (tic-tac-toe 16000), else `MODEL_DEFAULTS` (4000); `--thinking`, else the game file's level, else `medium` |
| `director:gamemaker` | absent | `medium`, 16000 | absent | `$GM`; the game file keeps DeepSeek V4.1 Flash (A52) |
| `director:confessor`, `director:guard`, `director:judge` | absent | `off`, 4000 each | absent | the game file |

Run 2 binds the alias of Anthropic that the price table makes cheapest (`haiku`, `claude-haiku-5-5`), with an output
cap of one token (`apps/cli/src/doctor-online.ts`); a line that names another model stops issue 25. A manifest that
differs from this table in any line stops the run's issue before the next run: it is a finding for the integrator.
The resident names of run 1 are read from its manifest; the table holds their models, not their names.

## Caps

| Cap | USD | Held by |
|---|---:|---|
| **M6 as a whole** | **2.34** | `games/m6-ledger.jsonl`: a run that does not fit is refused (`SWT-C025`) |
| run 1, 2, 3, 4 | 0.30, 0.01, 0.03, 1.00 (1.34) | the cost meter of the run (`--budget`) |
| reserve: a second attempt of one run above, or a replacement Act I base (issue 27) | 1.00 | the room the ledger leaves, used only by a decision row (below) |

The rewrite has spent 9.6985 USD of its 50 on this platform before M6 (the five ledgers before this one); with the
cap of M6 it stands at 12.04 at most. A run's cost may pass its cap by the overshoot the meter allows
(`docs/reference/cli.md`, `--budget`). The cap of M6 holds no room above the run caps and the reserve, so an
overshoot is paid from the reserve: **the reserve is 1.00 minus what the runs before it spent above their caps**,
and its run's `--budget` is at most what the ledger's lines leave: its cap less every cost line and every
reservation without one (the ledger refuses a larger one, `SWT-C025`; `apps/cli/src/ledger.ts`).

**The reserve line.** A decision row that spends the reserve names the run and its budget; the run reserves its own
cap through `--ledger`. No reservation line is written by hand: with the cap at 2.34 the room is the reserve.

## Stops

- A run stops at its cap (exit 5). A second failure of the same kind (the same cap, the same error end, the same
  refusal of the ledger) stops that part of the plan and goes to the integrator.
- Run 4 at its cap before tick 45: the reserve pays its second attempt only after a decision row; B2's check reads
  the reviews that were played (10.2).
- Run 2 or 3 failing in `$PROJ` where it passes in the clone is a finding of the packed install (2.1, risk 2 of
  section 15), not a run to repeat: it goes to the integrator before any second attempt.
- A run that would pass the cap of M6 is refused by the ledger; spend above it is the owner's go (11.2, row 10).

## What every run delivers

Each run folder verifies (`swt log verify`), replays equal (`swt replay --game <game file>`), is clean under
`swt scan`, holds a `REPORT.md` (`swt report --game`), and goes to `data/runs` at the path of the table with a README
(loopholes, problems, solutions: proposed, built, or open), after the leak scan (A25). `develop` gets a row in
`games/tictactoe/RUNS.md` (new), `games/whispers/RUNS.md` or `games/hello/RUNS.md` with runtime revision 8 and
`kernel.dirty` (P494). Run 2 leaves no run folder: its `--json` line and its ledger lines are its record, scanned
like a folder. The reviewer reads the draft report against the log, adds every new loophole and problem to
`docs/LESSONS-LEARNED.md`, and the session that played the run sends Flo the short German summary (11.1). A run
tunes nothing; a rule change it suggests is a proposal for the owner (11.2).

| Must show | Run | Read from |
|---|---|---|
| the baseline of 1.0 line 3: the run ends by its own rule or its tick limit, with a tally | 1 | `grid.tally` and the moves scored by `optimal-referee` |
| the guard answers by its tool `verdict`, and every answer is read (r7 run 2: 2 of 19 unreadable) | 4 | the guard's `request` records (`tools: ["verdict"]`) and its answers, `invalid` counted against the reviews |
| one minimal request answered, its estimate printed before it, its cost in the ledger | 2 | the `--json` line in order, the lines `doctor/online` |
| the built `dist` plays against the real provider (6.1); no winner needed (P445) | 3 | the run's end and its cost line |
