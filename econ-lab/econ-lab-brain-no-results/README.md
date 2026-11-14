# Experiment econ-lab-brain-no-results

Without the results of earlier games, by how much does the strategy brain lower cooperation in the dilemma? Six runs per arm give an estimate with its interval, read beside the -0.771 of the M2 gate and the old -0.40; nothing is gated.

## Plan

- Purpose: exploratory; design: unpaired
- Game: `games/econ-lab/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `nobrain` (control) `{"brain":false,"showResults":false}`; `brain` `{"showResults":false}`
- Seeds: 41, 42, 43, 44, 45, 46; replicates: 1
- Primary metric: `econ-games.dilemmaCooperation`; secondary: `econ-games.dilemmaRound1`, `econ-games.fundCooperation`, `econ-games.tablePoints`, `strategy-brain.brainWrites`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.05 USD per run, 0.4 USD in total
- Spec hash: `0636c80a28b62486dfd126edb62376d7b0b3e151753229a62b2237b1ac34c1a1`; code: commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`, runtime revision 3

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `econ-lab-002` | `brain` | 44 | 0 | included |  | 0.02086 | `9e7035edc355` |
| `econ-lab-001` | `brain` | 45 | 0 | included |  | 0.01971 | `0caa515aaeb4` |
| `econ-lab-003` | `nobrain` | 41 | 0 | included |  | 0.01196 | `0d9b0d4de440` |
| `econ-lab-004` | `brain` | 46 | 0 | included |  | 0.0192 | `c7929fcc9820` |
| `econ-lab-005` | `nobrain` | 46 | 0 | included |  | 0.01084 | `ee14db2e654d` |
| `econ-lab-006` | `brain` | 42 | 0 | included |  | 0.02118 | `f6055ccb7514` |
| `econ-lab-007` | `brain` | 41 | 0 | included |  | 0.02141 | `19b9eb12ec22` |
| `econ-lab-008` | `nobrain` | 42 | 0 | included |  | 0.01162 | `3055d619bf37` |
| `econ-lab-009` | `nobrain` | 44 | 0 | included |  | 0.01076 | `0f026796ddc9` |
| `econ-lab-010` | `nobrain` | 45 | 0 | included |  | 0.01075 | `25b2eed16bd8` |
| `econ-lab-012` | `nobrain` | 43 | 0 | included |  | 0.01052 | `1e406a0ea5ef` |
| `econ-lab-011` | `brain` | 43 | 0 | included |  | 0.02324 | `603190d13ac3` |

## Means by arm (included runs)

| Metric | `nobrain` | `brain` |
| --- | --- | --- |
| `econ-games.dilemmaCooperation` | 1 (n 6) | 0.3333 (n 6) |
| `econ-games.dilemmaRound1` | 1 (n 6) | 0.6667 (n 6) |
| `econ-games.fundCooperation` | 0.01017 (n 6) | 0.09117 (n 6) |
| `econ-games.tablePoints` | 461.7 (n 6) | 451 (n 6) |
| `strategy-brain.brainWrites` | absent | 12 (n 6) |
| `models.requests` | 96.17 (n 6) | 129.7 (n 6) |
| `econ-games.decisions` | 72 (n 6) | 72 (n 6) |
| `models.costUsd` | 0.01107 (n 6) | 0.02093 (n 6) |
| `econ-games.missedDecisions` | 0 (n 6) | 0 (n 6) |

## Shares by arm (included runs, 95 % Wilson interval)

A run counts when its `econ-games.dilemmaCooperation` is at or above 1.

| Arm | Runs that count | n | Share | 95 % interval |
| --- | --- | --- | --- | --- |
| `nobrain` | 6 | 6 | 1 | 0.6097 to 1 |
| `brain` | 1 | 6 | 0.1667 | 0.03005 to 0.5635 |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `econ-games.dilemmaCooperation` | primary | included | -0.6667 | 0.1388 | -1.024 to -0.3097 | 12 | 0.01515 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.dilemmaCooperation` | primary | finished | -0.6667 | 0.1388 | -1.024 to -0.3097 | 12 | 0.01515 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.dilemmaRound1` | secondary | included | -0.3333 | 0.08333 | -0.5476 to -0.1191 | 12 | 0.01515 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.dilemmaRound1` | secondary | finished | -0.3333 | 0.08333 | -0.5476 to -0.1191 | 12 | 0.01515 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.fundCooperation` | secondary | included | 0.081 | 0.08435 | -0.1359 to 0.2979 | 12 | 0.7273 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.fundCooperation` | secondary | finished | 0.081 | 0.08435 | -0.1359 to 0.2979 | 12 | 0.7273 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.tablePoints` | secondary | included | -10.73 | 19.1 | -59.85 to 38.38 | 12 | 0.6883 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.tablePoints` | secondary | finished | -10.73 | 19.1 | -59.85 to 38.38 | 12 | 0.6883 | difference of the arm means, treatment minus control; label-permutation exact |
| `strategy-brain.brainWrites` | secondary | included | absent | absent | absent | absent | absent |  |
| `strategy-brain.brainWrites` | secondary | finished | absent | absent | absent | absent | absent |  |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

none: the experiment is reported, not gated

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` | `econ-games.decisions` | `nobrain` | 1.336 | held |
| `models.requests` | `econ-games.decisions` | `brain` | 1.801 | held |
| `models.costUsd` |  | `nobrain` | 0.01107 | held |
| `models.costUsd` |  | `brain` | 0.02093 | held |
| `econ-games.missedDecisions` |  | `nobrain` | 0 | held |
| `econ-games.missedDecisions` |  | `brain` | 0 | held |

## Tolerance

none: no baseline was compared

## Deviations

none

## Reading, loopholes, problems and solutions (written by the reviewer, issue M2-30)

The series of decision A29 for the cure of loophole LH19 (issue M2-29): brain against no brain, both with
`showResults: false`, on the first six labels of the gate's series `econ-lab/econ-lab-brain`. Write-up:
`docs/M2-CURES.md` on `develop`. Ledger: `a29-ledger.jsonl`.

**The cure holds in play.** By script over the twelve runs: 2129 texts reach a seat after the start of game 2 or
3 (every input of a request and every reply of a look tool, the seat's own brain text left out). None holds
"Results so far", a sum "in all", a `Points:` line or the points of an earlier game; all 96 first requests of a
later game start from an empty context. A later game begins with "Game 2 begins." and, without a brain, "You keep
no notes between games."; `viewTable` between two games says "Game 1 is over; the next one starts soon."
(`econ-lab-003` #376, #683). In the brain arm 21 of the 48 brain texts handed to a later game carry a number of an
earlier game, written by the seat in its retro: that is the brain, not the line.

**The estimate beside the gate's.**

| | This series (no results) | Gate, the same six labels (results shown) | Gate, all 12 labels | Old platform |
|---|---|---|---|---|
| Brain minus `nobrain`, dilemma cooperation | -0.667 (SE 0.139, 95 % interval -1.024 to -0.310, 6 per arm) | -0.925 (SE 0.017) | -0.771 (SE 0.084, -0.954 to -0.588, 12 per arm) | -0.40 (SE 0.13) |
| `nobrain`, labels 41 to 46 | 1.00, 1.00, 1.00, 1.00, 1.00, 1.00 | 1.00, 1.00, 1.00, 1.00, 1.00, 1.00 | mean 0.858 | |
| `brain`, labels 41 to 46 | 0.25, 1.00, 0.35, 0.10, 0.10, 0.20 | 0.05, 0.10, 0.10, 0.10, 0.10, 0.00 | mean 0.088 | |
| Locked tables (1.00), `nobrain` | 6 of 6 (Wilson 0.61 to 1.00) | 6 of 6 | 9 of 12 (0.47 to 0.91) | 2 of 8 |
| Locked tables, `brain` | 1 of 6 (Wilson 0.03 to 0.56) | 0 of 6 | 0 of 12 (0 to 0.24) | |

Not gated: round 1 of the dilemma -0.333 (SE 0.083, interval -0.548 to -0.119); the shared fund +0.081 (SE 0.084,
interval -0.136 to +0.298); table points -10.7 (SE 19.1, interval -59.9 to +38.4). This series minus the gate's
estimate: +0.10 (SE 0.16, interval about -0.26 to +0.47). The exact permutation p is 0.015.

**What six runs per arm show and what not.** Without any result of an earlier game the brain still lowers
cooperation in the dilemma: the interval excludes zero. A seat without a brain and without results cooperates in
all six tables, so the locked control of the gate was not held together by the results line. The series cannot
show how much of -0.771 the results line was: the difference to the gate, +0.10, has an interval that holds zero.
One brain table of six locked at 1.00 (`econ-lab-006`, label 42: even splits, a fund held at 5 each, brains that
say "never be the first to defect", #950 to #1019); 0 of 12 did in the gate. One table of six against none of twelve is
no difference shown (Fisher exact p 0.33).

**Read line by line** (from `events.jsonl`: every input, call, answer, thinking, text, brain and retro):
`econ-lab-003` (`nobrain`, label 41) and `econ-lab-001` (`brain`, label 45); of `econ-lab-006` the rounds and the
brains before game 3. By script over all twelve: the no-results check, the refusals.

What the two logs show: without a brain the four seats defect through the shared fund (0 in every round) and
still open game 3 with A and stay there (`econ-lab-003` #718 to #912). With a brain the lesson of games 1 and 2
is "maximize my own total points; I am not paid for fairness" and "0 is dominant" (`econ-lab-001` #523, #930),
two seats open game 3 with B "because B strictly dominates" (#1015, #1025), and the table is at B from round 2.

**Loopholes: none new.** LH19 is cured for this game with the option. The retro still names the result of the
game that just ended, and a seat writes it into its brain (#533: "Game 1 result: A01 31, A02 29, A03 35, A04 25");
decision A29 keeps that on purpose.

**Problems:** none new. Known rows seen again: P449 (`n` 12 above for an unpaired estimate of 6 runs per arm);
P447 (the ledger names runs by `../runs-data/...`); P456 (the tool list shows the later games). The row
`strategy-brain.brainWrites` is "absent" because the `nobrain` arm exports no such fact; the brain arm wrote 12
brains in every run.

Refusals: `BRAIN_TOO_LONG` 16, all in the brain arm, in the list of the spec. No `request_failed`. Model as
resolved: `claude-haiku-5-5` in every response; code commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`, clean
tree. Cost: 0.1920 USD (cap 0.40); `nobrain` 0.0111 a run, `brain` 0.0209.
