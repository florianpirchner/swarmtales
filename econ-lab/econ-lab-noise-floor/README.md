# Experiment econ-lab-noise-floor

Do five replicates of the control arm at label 41 lock the table as often as on the old platform?

## Plan

- Purpose: pilot; design: replicates
- Game: `games/econ-lab/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `nobrain` (control) `{"brain":false}`
- Seeds: 41; replicates: 5
- Primary metric: `econ-games.dilemmaCooperation`; secondary: `econ-games.dilemmaRound1`, `econ-games.fundCooperation`, `econ-games.tablePoints`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.05 USD per run, 0.25 USD in total
- Spec hash: `3c4ed71687d8360904ca3d8712e3f384e3d0cb3629b4184ed25a0e4940d5947a`; code: commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`, runtime revision 3

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `econ-lab-001` | `nobrain` | 41 | 4 | included |  | 0.01228 | `cf2fcebb6bc8` |
| `econ-lab-002` | `nobrain` | 41 | 3 | included |  | 0.0145 | `d2833e90b643` |
| `econ-lab-003` | `nobrain` | 41 | 2 | included |  | 0.01355 | `5b377e05fc39` |
| `econ-lab-004` | `nobrain` | 41 | 1 | included |  | 0.01101 | `1f71a3ccb916` |
| `econ-lab-005` | `nobrain` | 41 | 0 | included |  | 0.01149 | `1af78479f216` |

## Means by arm (included runs)

| Metric | `nobrain` |
| --- | --- |
| `econ-games.dilemmaCooperation` | 0.67 (n 5) |
| `econ-games.dilemmaRound1` | 0.85 (n 5) |
| `econ-games.fundCooperation` | 0.0408 (n 5) |
| `econ-games.tablePoints` | 454.6 (n 5) |
| `models.requests` | 94 (n 5) |
| `econ-games.decisions` | 72 (n 5) |
| `models.costUsd` | 0.01257 (n 5) |
| `econ-games.missedDecisions` | 0 (n 5) |

## Shares by arm (included runs, 95 % Wilson interval)

A run counts when its `econ-games.dilemmaCooperation` is at or above 1.

| Arm | Runs that count | n | Share | 95 % interval |
| --- | --- | --- | --- | --- |
| `nobrain` | 3 | 5 | 0.6 | 0.2307 to 0.8824 |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `econ-games.dilemmaCooperation` | primary | included | 0.67 | 0.2035 | 0.1052 to 1.235 | 5 | 1 | mean of the arm; none |
| `econ-games.dilemmaCooperation` | primary | finished | 0.67 | 0.2035 | 0.1052 to 1.235 | 5 | 1 | mean of the arm; none |
| `econ-games.dilemmaRound1` | secondary | included | 0.85 | 0.1 | 0.5724 to 1.128 | 5 | 1 | mean of the arm; none |
| `econ-games.dilemmaRound1` | secondary | finished | 0.85 | 0.1 | 0.5724 to 1.128 | 5 | 1 | mean of the arm; none |
| `econ-games.fundCooperation` | secondary | included | 0.0408 | 0.009871 | 0.0134 to 0.0682 | 5 | 1 | mean of the arm; none |
| `econ-games.fundCooperation` | secondary | finished | 0.0408 | 0.009871 | 0.0134 to 0.0682 | 5 | 1 | mean of the arm; none |
| `econ-games.tablePoints` | secondary | included | 454.6 | 6.331 | 437.1 to 472.2 | 5 | 1 | mean of the arm; none |
| `econ-games.tablePoints` | secondary | finished | 454.6 | 6.331 | 437.1 to 472.2 | 5 | 1 | mean of the arm; none |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

none: the experiment is reported, not gated

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` | `econ-games.decisions` | `nobrain` | 1.306 | held |
| `models.costUsd` |  | `nobrain` | 0.01257 | held |
| `econ-games.missedDecisions` |  | `nobrain` | 0 | held |

## Tolerance

The share of the new runs is 0.6, of the baseline 0.8: a difference of -0.2 with a standard error of 0.2828.
**Within** the noise of the baseline.

## Deviations

none
