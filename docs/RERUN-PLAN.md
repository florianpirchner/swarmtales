# Rerun plan of the M2 gate

The plan of the live runs that close milestone M2, committed before the first run. It is the short form of
section 8 of [`refactoring-before-release/09-m2-spec.md`](refactoring-before-release/09-m2-spec.md), which holds
the reasons and the statistics; where the two differ, the specification holds. Every threshold below is in a
committed file, and every manifest of a series carries the hash of its spec. A change after the first live run of
step 3 is a deviation: it is written into the series README and into `docs/M2-GATE.md`, and it never changes a
pass rule.

Decisions behind the plan (`refactoring-before-release/DECISIONS.md`, section 9): D11 (each series runs once; the
gate is the sign of the two firm effects), A10 (what the noise floor changed), A14 (the spending cap), A15 (the
data branch).

## The committed files

| File | What |
|---|---|
| `games/quarry/experiments/open-quarries.json` | the quarry series |
| `games/econ-lab/experiments/brain.json` | the econ-lab series |
| `games/quarry/experiments/noise-floor.json`, `games/econ-lab/experiments/noise-floor.json` | the noise floor on the new platform (step 2) |
| `games/quarry/noise-floor.legacy.json`, `games/econ-lab/noise-floor.legacy.json` | the noise floor of the old platform: the control block of `stories/<game>/runs/noise-floor.json` of branch `m0/noise-floor` (commit 48ddf0a, runtime revision 2), copied by script; `packages/lab/test/base.test.ts` cites the line of each number |
| `games/m2-ledger.jsonl` | the spend ledger of M2, with its cap line |

## The two effects

| | Quarry: open quarries | Econ-lab: the brain |
|---|---|---|
| Question | Does showing every hand raise the table's points? | Does the strategy brain lower cooperation in the dilemma? |
| Control arm | `control`: `{}` (brain on, hands hidden) | `nobrain`: `{ brain: false }` |
| Treatment arm | `open`: `{ openHands: true }` | `brain`: `{}` |
| Primary metric | `draft-rounds.tablePoints` | `econ-games.dilemmaCooperation` |
| Design | paired: the seed fixes the deal | unpaired: the seed is a run label only (A10) |
| Seeds | 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79 | 41 to 52 |
| Runs | 1 per arm and seed: 24 | 1 per arm and label: 24 |
| Estimate | mean of the 12 paired differences, treatment minus control | mean(treatment) minus mean(control) |
| Old platform, 8 seeds | +77 points (SE 22) | -0.40 (SE 0.13) |
| Old platform, noise floor at one seed | -10 (SE 38) at seed 31 | -0.71 (SE 0.14) at label 41 |
| **Kept** | the estimate is greater than 0 | the estimate is less than 0 |
| Smallest n for a verdict | 10 complete pairs | 10 runs in each arm |
| Purpose | confirmatory (clean tree) | confirmatory |

Below the smallest n there is **no verdict**: the gate is neither passed nor failed, and the numbers go to the
owner. The rule reads the unrounded estimate over the included runs. A kept sign shows that the port did not turn
an effect around; it does not show the effect (with no effect at all the sign is kept one time in two). So the
series README also reports, not gated: standard error and 95 % interval, the exact permutation p value, whether
the estimate reaches half the old one, the same estimate over every finished run, the excluded runs per arm, and
for econ-lab the share of locked tables per arm with its Wilson interval.

Model of every run: `anthropic/haiku`, thinking `medium`, output cap 4000 tokens, provider-default sampling.

## Guardrails and exclusions

| Guardrail, on the mean of an arm | Quarry | Econ-lab |
|---|---|---|
| `models.requests` per `decisions` | within 10 % of 1.30 | within 10 % of 1.32 (`nobrain`), 1.75 (`brain`) |
| `models.costUsd` per run | at most 0.041 (`control`), 0.050 (`open`) | at most 0.015 (`nobrain`), 0.025 (`brain`) |
| `missedPicks`, `missedDecisions` | 0 | 0 |
| Allowed refusal codes | `BRAIN_TOO_LONG`, `TOOL_LOCKED`, `NOT_IN_PACK`, `INVALID_ARGUMENTS`, `BURN_IS_PICK`, `NO_BURNS_LEFT` | `TOOL_LOCKED`, `INVALID_ARGUMENTS`, `OUT_OF_RANGE`, `BRAIN_TOO_LONG` |

A guardrail that does not hold does not fail the gate: it is a deviation and a lesson row, and the series is not
repeated. A run is excluded by `failed-request`, `missed-decision`, `cost-cap` or `error-end`; it keeps its folder
and is replaced once (same arm and seed, replicate plus 100).

## The steps

| Step | What | Runs | Expected cost (USD) | Stops the next step when |
|---|---|---:|---:|---|
| 0 | Offline: the eleven oracle files, the canary test, `swt run --fake` of both games, the budget tests | 0 | 0 | anything is red |
| 1 | Live smoke: the Hello Game (`--budget 0.05`), one pilot of each control arm (quarry seed 31, econ-lab label 41) | 3 | 0.11 | a leak, an `error` end, a cost cap reached, requests per decision more than 25 % off |
| 2 | Noise floor on the new platform: 5 replicates of each control arm, compared with the legacy file | 10 | 0.23 | reported, not a gate |
| 3 | The two series, quarry first | 48 | 1.31 | |
| | Sum | 61 | 1.65 | 2.15 with 30 % for replacements and retries |

Step 2 compares quarry by the mean (`withinNoise`: within two standard errors of 1081, about plus or minus 73
points) and econ-lab by the share of locked tables (`shareWithinNoise`, threshold 1.00; four of five on the old
platform). With five runs both checks show only a gross break. "Outside" is not a stop: it is written into
`docs/M2-GATE.md`, and the reviewer reads two new logs against two legacy logs before step 3.

## Caps

| Cap | USD | Held by |
|---|---:|---|
| one run | 0.40 (0.05 for the Hello Game) | the cost meter of the run; a live run without a cap is refused |
| quarry series, econ-lab series | 1.50, 0.75 | the experiment runner, before each run |
| quarry noise floor, econ-lab noise floor | 0.50, 0.25 | the same |
| one run inside an experiment | 0.10 (quarry), 0.05 (econ-lab) | the cost meter of the run, set by the experiment runner |
| a broken series | three runs in a row | the experiment runner |
| M2 as a whole (A14) | 4.00 | the ledger `games/m2-ledger.jsonl`; a run that does not fit is refused |

Two runs are in flight at most. The order is the shuffled plan of the spec, which interleaves the arms. No test
calls a model.

**The caps fit the plan (decision A17).** The runner starts a run only when what is spent, plus the per-run cap
for each run in flight, plus the per-run cap for the new run fits under the cap of the experiment (specification
6.3). With two runs in flight that reserves three per-run caps. The per-run cap of an experiment is therefore
0.10 for quarry (a run costs about 0.04) and 0.05 for econ-lab (about 0.02), and the totals are 1.50 and 0.50
(quarry series and noise floor), 0.75 and 0.25 (econ-lab). Each total holds its expected spend plus the reserve:
0.91 + 0.30, 0.17 + 0.30, 0.40 + 0.15, 0.06 + 0.15. All totals together are 3.00, under the hard stop of 4.00. A
single run outside an experiment keeps `--budget 0.40`.

## Data and the kill criterion

Every run folder, also a stopped or excluded one, goes to the orphan branch `data/runs` (A15), as
`<game>/<experiment id>/<run>/` with `experiment.json`, `results.json`, `values.csv` and the series README;
`develop` gets one row per series in `games/<id>/RUNS.md`. An agent does not push the branch.

If a series does not keep its sign, nothing is run again on the new platform. The same two arms and 12 seeds are
played once on the old code (the bridge, capped per run at 0.07 for quarry and 0.04 for econ-lab, inside the
ledger). The bridge keeps the old sign: the port changed the effect, and kill criterion 3 of the rewrite fires.
The bridge loses it too: the model moved, the criterion does not fire, the gate is still not passed, and the
owner decides. Section 8.6 of the specification is the procedure.
