# Rerun plan of M5

The plan of the live runs of milestone M5, committed before the first run (issue M5-52). It is the short form of
sections 6 and 7 of [`refactoring-before-release/12-m5-spec.md`](refactoring-before-release/12-m5-spec.md), which
hold the reasons; where the two differ, the specification and its errata hold. No run of this plan is a series:
every run is a single run with its own cap, and no run of M5 tests an effect (section 7.4; paper 02 D8). A change of
this plan after the first live run is a deviation: it is written into the run's README and into the record of the
issue that played it, and it never moves a cap.

Decisions behind the plan (`refactoring-before-release/DECISIONS.md`, section 9): A14 (the caps are refusals by
code), A15 and A25 (the data branch and its leak scan), A17 (the reserve for the runs in flight), A28 (what the live
runs must show), A52 (every run on Haiku through Anthropic, the gamemaker by `--director-model`), A53 (the money),
A54 (the Act I base), A55 (the live resume), A61 (no rule changes in M5).

## The committed files

| File | What |
|---|---|
| `docs/RERUN-PLAN-M5.md` | this plan |
| `games/m5-ledger.jsonl` | the spend ledger of M5, with its cap line `{"capUsd":12}`; every run below names it with `--ledger` |

## The runs

`$RUNS` is a folder outside the worktree; each run folder goes to `data/runs` at the path of the last column after
its checks. The flags of every run, with `$GM` for `--director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000`
and `$L` for `--ledger games/m5-ledger.jsonl`:

| # | Run | Command | Cap | Expected | Issue | On `data/runs` |
|---|---|---|---:|---:|---|---|
| 1 | Whispers, seed 11, 45 ticks | `swt run games/whispers/game.ts --seed 11 --provider anthropic --model claude-haiku-5-5 --thinking low $GM --budget 1.00 $L --out $RUNS/whispers/smoke` | 1.00 | 0.95 | 53 | `whispers/smoke/<run>/` |
| 2 | Whispers `whispers-rumours`, seed 11 | as 1, with `--set receipts=false` | 1.00 | 0.21 | 53 | `whispers/smoke/<run>/` |
| 3 | City Act I, seed 7: **the base** | `swt run games/city/game.ts --seed 7 --provider anthropic --model claude-haiku-5-5 --thinking medium $GM --pause-on progression.act_ended --budget 0.50 $L --purpose exploratory --out $RUNS/city/base` | 0.50 | 0.38 | 54 | `city/base/<run>/` |
| 3b | a second base, only if 3 does not pause on `act_ended` | as 3 | 0.50 | | 54 | `city/base/<run>/` |
| 4 | City Act II, the check resume: 6 ticks from the base | `swt resume $RUNS/city/base/<base> --game games/city/game.ts --ticks 14 --provider anthropic --model claude-haiku-5-5 --thinking medium $GM --budget 0.40 $L --out $RUNS/city/act2/check` (`--ticks` counts the base's 8 ticks; `--ticks 6` until A111) | 0.40 | 0.29 | 55 | `city/act2/check/` (the first play with `--ticks 6`: `city/act2/check-0/`) |
| 5a | City Act II from the base to its end (done-when 6) | as 4 without `--ticks`, with `--budget 2.00 --purpose exploratory` | 2.00 | 1.90 | 55 | `city/act2/<run>/` |
| 5b, 5c | the same twice more (cut 1 and cut 2 of 10.2: 5c goes first) | as 5a | 2.00 each | 1.90 each | 55 | `city/act2/<run>/` |

**Expected costs corrected after run 1** (issue M5-53; the caps are unchanged). Run 1 (`whispers/smoke/whispers-001`)
cost 0.9517 USD against 0.50 expected, 1.9 times: half of it (0.4792) is the 63 resident requests above 100,000 input
tokens, which the price table charges five times (J252), from minute 31 on as the sessions grow (P479); the gamemaker
cost 0.0454. Run 1 now shows its measured cost, run 2 that cost times 0.9 (the ratio of the two variants' old expectations,
0.45 to 0.50), and the City rows their old expectation times the same 1.9, since their long sessions reach the same tier; the expected
spend is then 8.18 USD against run caps of 8.90, and a City Act II run may well end at its cap of 2.00. The deviation
is in the run's README: the run folder was written under `live-runs/` of the builder's worktree (untracked) instead of
a `$RUNS` outside it.

**Run 2 played** (issue M5-53, `whispers/smoke/whispers-001-r7`, runtime r7): 0.2145 USD against 0.86 expected. All six
passed door 7 at minute 36, so the sessions stayed short (no request above 52,059 input tokens, none at the second tier)
and the last nine minutes woke almost nobody; run 1 stalled at the late doors and its sessions grew past the tier. Run 2
now shows its measured cost; the City rows keep the factor of run 1, since one Whispers run that ends early says nothing
about the long Act II sessions. The expected spend is 7.53 USD against run caps of 8.90 (spent so far 1.1662: run 1
0.9517, run 2 0.2145). The CLI numbered the run `whispers-001` in its own `--out` folder, the same id as run 1 (and the
same ledger name `smoke/whispers-001`, with another `id`); its folder was renamed `whispers-001-r7` so that the two do
not collide on `data/runs` (it verifies and replays equal under that name).

**Run 3 played: the base** (issue M5-54, `city/base/city-001`, runtime r7): 0.0686 USD against 0.38 expected. It
paused after 8 ticks on `progression.act_ended` `{ fromLevel: 1 }` (tick 7, the first resident entered level 8), so
run 3b is not played. Its `--out` was `$RUNS/city/base`, a
fresh folder, so the CLI numbered it `city-001` (A103); runs 4 and 5 resume from `$RUNS/city/base/city-001` and write
each into its own fresh `--out` folder named by the run (`$RUNS/city/act2/check` for run 4, `$RUNS/city/act2/5a`,
`5b`, `5c` for run 5), each again `city-001` in its folder; on `data/runs` each folder is named by its row
(`city/act2/check/`, `city/act2/5a/` and so on), since four folders named `city-001` would collide. The City rows keep their
expected costs: an Act I of eight minutes says nothing about the long Act II sessions. Spent so far 1.2348 (runs 1
and 2 1.1662, run 3 0.0686). The base was played with one flag more than the row, `--plan`, which `swt run` ignored
(P487); it has no `REPORT.md`, since `swt report` refuses a paused run (P488).

**Run 4 played: no tick** (issue M5-55, `city/act2/check/city-001`, runtime r7): 0.0000 USD of the cap 0.40, by the
row's command with no flag more. `--ticks` of `swt resume` counts the finished ticks of the whole run, the base's 8
included, so `--ticks 6` was reached at the resume: the run wrote `run_resumed` (the base's snapshot hash, no
`replaced`) and stopped open, exit 3, with no request (P490). The resume itself holds (game hash, snapshot, manifest,
verify with `--previous`, replay, scan), but no live tick was played, so run 5a waits for the integrator: the row's
"6 ticks from the base" is `--ticks 14`, a change of the command that needs a decision row. Spent so far 1.2348, as
before.

**Run 4 played again, and run 5a** (issue M5-55, A111, runtime r7). Run 4 with `--ticks 14`
(`city/act2/check/city-002`; on `data/runs` `city/act2/check/`, the first play `city/act2/check-0/`): 0.0741 USD of
the cap 0.40, ticks 8 to 13 played, 118 activations, 155 calls, none refused, one `blame` upheld by the judge live;
it stopped open at 14 (exit 3). Run 5a (`city/act2/5a/city-001`, on `data/runs` `city/act2/5a/`): 0.3724 USD of the
cap 2.00 against 1.90 expected, ticks 8 to 54, ended by its own rule (exit 0) after three tribunals and three
exiles, each carried out by its listeners, so the must-show of run 5a holds; no request reached the second price
tier (at most 80,703 input tokens). Spent so far 1.6813 (runs 1 to 3 1.2348, run 4 0 and 0.0741, run 5a 0.3724).
Runs 5b and 5c wait for the integrator.

**Runs 5b and 5c played** (issue M5-55, runtime r7, by the integrator's go, 5b first), each by the command of 5a
with its own `--out`: 5b (`city/act2/5b/city-001`) 0.3261 USD, ended by its own rule after 54 ticks; 5c
(`city/act2/5c/city-001`) 0.2907 USD, ended by its own rule after 52 ticks; each with three tribunals and three
exiles. The three Act II runs cost 0.29 to 0.37 USD against 1.90 expected: no request of them reached 100,000 input
tokens (at most 80,703), so the factor 1.9 of run 1 did not apply. Spent so far 2.2981 (runs 1 to 3 1.2348, run 4
0.0741, runs 5a to 5c 0.9892). Every run of the plan is played.

The seeds are the games' own (Whispers 11, the City 7) and are written out so that no environment can move them.
`--purpose`: the specification names none; runs 1, 2 and 4 are smokes (the default, read as smokes before the next
run starts), the base and the Act II runs are `exploratory`, single runs whose numbers are read and pooled into no
verdict. The ledger names a run `<purpose>/<run id>`, for example `smoke/whispers-001` or `exploratory/city-001`.

**Every resume repeats the model flags** (`--provider`, `--model`, `--thinking`, `$GM`): a live resume takes the
game, the seed and the params from its base, but the models from its own command line (`apps/cli/src/live-resume.ts`,
`runOf`). Without `$GM` the gamemaker would play the game file's DeepSeek through OpenRouter; with the flags as above
the marker `run_resumed` carries no field `replaced`, and that is checked in runs 4 and 5.

**Order:** 1, read as a smoke; 2; 3, read; 4, read; 5a, read; 5b; 5c. One run is in flight at a time. After run 1 the
integrator corrects the expected costs of this table from its cost (not the caps). Run 3 waits for every City issue
(A54): the base snapshot binds the game's hash, so an Act II resume refuses a changed game. Between run 3 and the last
Act II run no merge changes the City's game hash (the game, its mechanics, its Directors, its prompts); if one must,
the base is recorded again as run 3b and the plan's rows of 4 and 5 resume from it.

## The models, as the manifests name them

Every actor's `model` in `manifest.json` (`actors[]`), computed by `resolveModelSettings` and `modelOf`: provider
`anthropic`, `requestedId` and `resolvedId` `claude-haiku-5-5`, `temperature` and `topP` `provider-default`, pricing
`pi-ai@1.4.0` (the pin of `packages/models`). The thinking level and the output cap of each:

| Actor | Whispers (runs 1, 2) | City (runs 3 to 5) | From |
|---|---|---|---|
| `resident:A01` to `resident:A06` | `low`, 4000 | `medium`, 4000 | `--thinking`; the game files name the same level (Whispers `low`, the City `medium` beside its GLM entry) and no output cap, so the default 4000 of `MODEL_DEFAULTS` |
| `director:gamemaker` | `medium`, 16000 | `medium`, 16000 | `$GM`; the game files keep DeepSeek V4.1 Flash, `high`, 393216 (A52) |
| `director:confessor` | `off`, 4000 | `off`, 4000 | the game file (`classifier` on by default) |
| `director:guard` | `off`, 4000 | absent: the City has no guard | the game file (`guards` on by default) |
| `director:judge` | `off`, 4000 | `off`, 4000 | the game file |
| `script` | no model | no model | the script is no model actor |

A manifest that differs from this table in any line stops the run's issue before the next run: it is a finding for
the integrator, not a run to repeat. The price table of `pi-ai@1.4.0` has a second tier for Haiku: a request with
more than 100,000 input tokens costs 0.50 per million input and 2.50 per million output tokens, five times the
first. The long sessions of Act II can reach it; the meter counts it, and the caps hold either way.

## Caps

| Cap | USD | Held by |
|---|---:|---|
| **M5 as a whole** | **12.00** | `games/m5-ledger.jsonl`: a run that does not fit is refused (`SWT-C025`) |
| Whispers, one run | 1.00 | the cost meter of the run (`--budget`) |
| City Act I, one run (to the pause on `act_ended`) | 0.50 | the cost meter |
| City Act II, the check resume | 0.40 | the cost meter |
| City Act II, one run to its end | 2.00 | the cost meter |
| reserve: a second Act I base beyond 3b, or one Act II run again | 2.00 | a reservation line, written by the integrator with its decision row (below) |
| the runs and the reserve together | 10.90 (11.40 with 3b) | their sum; 1.10 (0.60) of room under 12.00 for the overshoot of the runs in flight |

The run caps sum to 8.90 (9.40 with 3b); the expected spend was 4.30 USD (old costs, raised for a gamemaker on Haiku;
section 7.2) and is 8.18 USD after run 1 (above). Before M5 the rewrite spent 7.4005 USD (`docs/ISSUE-RECORD.md`), so with the cap of M5 it stands at
19.40 USD at most of its 50. A run's cost may pass its cap by the overshoot the meter allows (`docs/reference/cli.md`,
`--budget`); the room above covers it.

**The reserve line.** A decision row that spends the reserve writes `{"run":"reserve/<decision>","reservedUsd":2}`
into the ledger by hand, and closes it with `{"run":"reserve/<decision>","costUsd":0}` right before the run it pays
for starts: that run reserves its own cap through `--ledger`, and an open reserve line beside it would count the 2.00
twice.

## Stops

- A run stops at its cap (exit 5). A second failure of the same kind (the same cap, the same error end, the same
  refusal of the ledger) stops that part of the plan and goes to the integrator.
- Run 3b is played only when run 3 ends without the pause on `progression.act_ended` (exit 3, with `act_ended`
  `{ fromLevel: 1 }` in the tick before the snapshot); a run that pauses so is the base, whatever else it shows.
  `progression` also writes `act_ended` when the run ends, so an Act I that ends at the run's last tick or at its cap
  is no base.
- M5 is stopped and planned again when the spend reaches 12.00 before the Act I base is recorded (section 9, rule 4).
- The cut list of 10.2 removes 5c, then 5b, then (cut 5) run 2, each by a decision row; their caps are then free and
  not spent elsewhere.

## What every run delivers

Each folder verifies (`swt log verify`; a resumed one with `--previous <base>`), replays equal (`swt replay --game
<game file>`, with `--previous` for a resumed one), is clean under `swt scan`, holds a `REPORT.md` (`swt report
--game`), and goes to `data/runs` at the path of the table with a README (loopholes, problems, solutions: proposed,
built, or open), after the leak scan (A25). `develop` gets a row in `games/whispers/RUNS.md` or `games/city/RUNS.md`
with runtime revision 6; the base's row carries its snapshot's hash and path. The reviewer reads the draft report
against the log, adds every new loophole and problem to `docs/LESSONS-LEARNED.md` (and updates LH1 to LH11 and LH20
where a run shows them), and sends Flo the short German summary. A run tunes nothing; a rule change it suggests is a
proposal for the owner (section 8).

| Must show | Run | Read from |
|---|---|---|
| the gamemaker answers live and its calls land (A28) | 1 and 3 | the records `asked` and `answered` and the gamemaker's tool calls |
| every resident passed level 7, or Act I ended by its own rule | 3 | `progression.act_ended` and the base snapshot |
| Act II plays to its end: a tribunal sits and exiles, and the exile is carried out by its listeners (A28) | 5a | `tribunal.tribunal_result`, `exile.exiled` and what follows it |
| a review answered live (the guard, or the judge on a `blame`), when a resident calls a guarded tool or `blame` | any | the review records; not a must |
