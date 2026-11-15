# Rerun plan of M4

The plan of the live runs of milestone M4, committed before the first run. It is the short form of section 7 of
[`refactoring-before-release/11-m4-spec.md`](refactoring-before-release/11-m4-spec.md), which holds the reasons;
where the two differ, the specification holds. Every threshold below is in a committed file, and every manifest of
a series carries the hash of its spec. A change after the first live run of a series is a deviation: it is written
into the series README and into `docs/M4-GATE.md`, and it never changes a pass rule.

Decisions behind the plan (`refactoring-before-release/DECISIONS.md`, section 9): D11 (exactly these three series,
each once at its planned seed count), A14 (the caps are refusals by code), A15 (the data branch), A17 (the reserve
for the runs in flight), A33 (the money and the arms of M4), A44 (turns without a call are a fact of the run).

Each plan prints with its caps, and nothing is played:

```
swt experiment run games/harbor-lights/experiments/private-notes.json --plan --ledger games/m4-ledger.jsonl
swt experiment run games/lanterns/experiments/team-brain.json --plan --ledger games/m4-ledger.jsonl
swt experiment run games/chess/experiments/requests.json --plan --ledger games/m4-ledger.jsonl
```

## The committed files

| File | What |
|---|---|
| `games/harbor-lights/experiments/private-notes.json` | the Harbor Lights series |
| `games/lanterns/experiments/team-brain.json` | the Lanterns series |
| `games/chess/experiments/requests.json` | the chess request count |
| `games/m4-ledger.jsonl` | the spend ledger of M4, with its cap line `{"capUsd":12}` |

## The two series and the count

| | Harbor Lights: private notes | Lanterns: the team brain | chess: requests |
|---|---|---|---|
| Question | Do private notes raise the crew's score? | Does a team brain raise recall? | How many requests does a half-move cost? |
| Control arm | `nobrain`: `{ brain: "nobrain", games: 1 }` | `nobrain`: `{ brain: false }` | one arm, `fresh-compact`: `{ games: 4, maxPlies: 80, fresh: true, compact: true }` (the old story `chess-fresh-compact-g4-p80`) |
| Treatment arm | `solo`: `{ brain: "solo", games: 1 }` | `brain`: `{}` | |
| Output cap (the game's) | 4000 (Harbor Lights sets none) | 16000 | 16000 |
| Primary metric | `hint-towers.score` | `clue-grid.recall` | `models.requests` per `chess.plies` (see below) |
| Design | paired on the deal | paired on the seed | replicates |
| Seeds | 101 to 112 | 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107 | 41, 43, 47, 53 |
| Runs | 24 | 24 | 4 |
| Old platform | +3.2 (SE 0.8), `harbor-lights-04a-006-game1-plan` | +0.08 (SE 0.03), `lanterns-06a-005` and `-006` | 1.20, 1.18, 1.22, 1.19 on the revision-2 runs 048 to 051 (same arm, same seeds) |
| **Kept** | the mean of the paired differences, `solo` minus `nobrain`, is greater than 0 | `brain` minus `nobrain` greater than 0 | **no pass rule:** the mean and the range are reported beside 1.18 to 1.22 |
| Smallest n for a verdict | 10 complete pairs | 10 complete pairs | 3 finished matches |
| Purpose | confirmatory (clean tree) | confirmatory | confirmatory |

Model of every run: `anthropic/haiku`, thinking `medium`, provider-default sampling, the output cap of the game.

Below the smallest n there is **no verdict**: the gate is neither passed nor failed, and the numbers go to the
owner. A kept sign shows that the port did not turn an effect around; it does not show the effect. The series
README also reports, not gated:

- **Harbor Lights:** SE, 95 % interval, the exact sign-flip p, whether the estimate reaches +1.6 (half the old one),
  misfires per arm (`hint-towers.misfires`; old: 14 `solo`, 26 `nobrain` over 12 games), and the control mean against
  16.5 to 20.5 (old: 18.4).
- **Lanterns:** the same, the difference in games 2 to 4 (`clue-grid.recallLater`; old +0.11, SE 0.03), precision
  (old +0.08), and the games that ran out of clues, read from the `clue_game_ended` events (no metric exports it).
- **chess:** refused moves per 100 half-moves (old: at most 4), cost per match (old: 0.295 to 0.338 USD), and turns
  that ended without a call.

**The chess count.** The spec format holds one metric key as the primary one, not a ratio, so the spec names
`models.requests` as primary and the ratio as a guardrail without limits, `models.requests` per `chess.plies`: its
mean over the four matches is the number, and `values.csv` gives the range. The integrator puts both beside 1.18 to
1.22 in `docs/M4-GATE.md` and writes "hold" or not with one sentence of reason (A33; a numeric bound would be a rule
of D11 and needs the owner's go, section 8 row 3 of the specification). **Turns without a call** are the run fact
`run.noCallActivations` (A44): the lab counts the kernel's `activation_closed` events with `outcome: "no-call"`, per
actor and in total. Issue M4-09 builds it; the spec names it as a secondary metric already, and a generic key of the
lab is accepted by the runner before any run has it. A run of a platform without M4-09 has no such key, and
`swt experiment analyse` then refuses the series with `SWT-E010` (no run has the metric), so the count series does
not start before M4-09 is merged.

**The thinking setting of the old chess runs 048 to 051.** Their manifests (`run/000-run.json`) carry no thinking
level. Their command lines, in each run README on `legacy`, are `swt run --story chess-fresh-compact-g4-p80
--provider anthropic --model haiku --seed <n> --budget 1`, without `--thinking`; the story's model block sets only
the output cap (16000), and at their commit `b37d790` a resident's level is `options.thinking ?? model.thinking ??
story.model.thinking ?? "medium"` (`apps/cli/src/host/residents.ts`, line 216). So 048 to 051 ran with thinking
`medium`, the setting of this plan; the arm stays. (052 to 055 ran with `--thinking low` and are not compared.)

## Guardrails and exclusions

| Guardrail, on the mean of an arm | Harbor Lights | Lanterns | chess |
|---|---|---|---|
| `models.requests` per run | within 10 % of 96 (`nobrain`), 115 (`solo`) | within 10 % of 214 (`nobrain`), 286 (`brain`) | per `chess.plies`: reported, no limit |
| `models.costUsd` per run | at most 0.060 (`nobrain`), 0.062 (`solo`) | at most 0.066 (`nobrain`), 0.10 (`brain`) | at most 0.40 |
| other | | | `chess.refusedMoves` per `chess.plies` at most 0.04 |
| Allowed refusal codes | `NOT_YOUR_TURN`, `NO_SIGNALS`, `TOUCHES_NOTHING`, `TOOL_LOCKED`, `BRAIN_TOO_LONG`, `INVALID_ARGUMENTS` | `BRAIN_TOO_LONG`, `TOOL_LOCKED`, `KEEPER_SILENT`, `POST_CAP`, `INVALID_ARGUMENTS` | `ILLEGAL_MOVE`, `BRAIN_TOO_LONG`, `TOOL_LOCKED`, `INVALID_ARGUMENTS` |

The expected values are counted from the old logs (`events.jsonl` of every run named above on `legacy`): requests
per run of each arm, the cost of the old READMEs plus about 20 %, and every refusal code the old runs got, plus
`INVALID_ARGUMENTS`. None of the three games exports a decision count, so requests are judged per run (one game in
Harbor Lights, one match elsewhere). A guardrail that does not hold does not fail the gate: it is a deviation and a
lesson row, and the series is not repeated. A run is excluded by `failed-request`, `missed-decision`, `cost-cap` or
`error-end`; it keeps its folder and is replaced once (same arm and seed, replicate plus 100). **`missed-decision`
is blind in these three games** (finding B10 of M2): the rule reads a metric named `<plugin>.missed…`, and neither
`hint-towers`, `clue-grid` nor `chess` exports one, so a forfeited turn does not exclude a run. The rule stays in the
specs as at M2; forfeits are read in the two logs per arm. The first run of each
series is read as a smoke is before the second starts.

## Caps

| Cap | USD | Held by |
|---|---:|---|
| **M4 as a whole** | **12.00** | `games/m4-ledger.jsonl`; a run that does not fit is refused |
| one smoke run | 0.40 (0.002 for the cap run of the Hello Game) | the cost meter of the run |
| smokes, part 1 (three games and the cap run) | 1.25 | the ledger |
| smokes, part 2 (four games) | 1.60 | the ledger |
| Harbor Lights: series | 1.60 (0.12 per run) | the experiment runner |
| Lanterns: series | 2.35 (0.20 per run) | the experiment runner |
| chess: request count | 2.00 (0.80 per run, one run in flight) | the experiment runner |
| **one bridge on a lost sign** | **2.00** | a reservation line in the ledger, written by hand |
| a broken series | three excluded runs in a row | the experiment runner |

The parts sum to 10.80, the bridge included. The 1.20 between that and 12.00 are not assigned and are spent only by
a decision row. **The caps fit the plan (A17).** The runner starts a run only when what is spent, plus the per-run
cap of every run in flight, plus that of the new run, fits under the total. Expected spend and reserve: Harbor Lights
1.22 + 3 × 0.12, Lanterns 1.65 + 3 × 0.20, chess 1.28 + 0.80 (one in flight); smokes about 0.9. Without a bridge M4
spends about 5 USD. A per-run cap is more than twice the old cost of a run, so it catches a loop and never a normal
run. Two runs are in flight at most, one for chess. No noise floor is played at M4.

**A run may report more than its cap (finding B5 of the M2 review), and that is not changed by code at M4:** the
cost meter is asked between requests, so the last request of a run can pass the run's cap; the totals above hold the
reserve of A17 for the runs in flight, which covers that overshoot.

## What gets no series

Every other game gets one smoke (section 7.3 of the specification), the smokes of part 1 (issue 60) and part 2
(issue 61). Hold'em (the decision aid: EV loss 0.03 against 0.26 per decision over 24 mixed tables) and Ember Tricks
(the worth at the bid: 2.36 against 0.73 points per seat and round) are aid effects, not in D11; they are the next
candidates, hold'em first, and need the owner's go. Convoy, morris, Salt Market, Blind Bid and liar's dice set new
baselines later. None is run as a series inside the cap of M4.

## Data and the bridge

Every run folder, also a stopped or excluded one, goes to the orphan branch `data/runs` (A15), as
`<game>/<experiment id>/<run>/` with `experiment.json`, `results.json`, `values.csv` and the series README;
`develop` gets one row per series in `games/<id>/RUNS.md` with runtime revision 4.

If a series does not keep its sign, nothing is run again on the new platform. The same arms and seeds are played
once on the old code at `v0-final` (the bridge), with the same model and the game's old output cap. The old code
does not write the ledger, so the integrator writes a reservation line of 2.00 before the first bridge run and the
true cost, read from the old run reports, after the last. The bridge keeps the old sign: the port changed the effect,
M4 is not closed, and two logs per arm are read against two old ones. The bridge loses it too: the model moved, the
gate is not passed, and the owner decides. A second bridge is not funded and needs the owner's go.
