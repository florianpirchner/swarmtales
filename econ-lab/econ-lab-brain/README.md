# Experiment econ-lab-brain

Does the strategy brain lower cooperation in the dilemma?

## Plan

- Purpose: confirmatory; design: unpaired
- Game: `games/econ-lab/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `nobrain` (control) `{"brain":false}`; `brain` `{}`
- Seeds: 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52; replicates: 1
- Primary metric: `econ-games.dilemmaCooperation`; secondary: `econ-games.dilemmaRound1`, `econ-games.fundCooperation`, `econ-games.tablePoints`, `strategy-brain.brainWrites`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.05 USD per run, 0.75 USD in total
- Spec hash: `d967092e2dfbf8689743006a7e51c8f13cb60f91259fbd7a7c2d1590c8f8f12f`; code: commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`, runtime revision 3

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `econ-lab-002` | `brain` | 50 | 0 | included |  | 0.0217 | `4fcbf032ec21` |
| `econ-lab-001` | `brain` | 49 | 0 | included |  | 0.02368 | `dca45fe56485` |
| `econ-lab-003` | `nobrain` | 48 | 0 | included |  | 0.01357 | `8efd337116f2` |
| `econ-lab-004` | `nobrain` | 49 | 0 | included |  | 0.01284 | `e8633b7a5fab` |
| `econ-lab-005` | `nobrain` | 45 | 0 | included |  | 0.01158 | `a401550e5104` |
| `econ-lab-006` | `nobrain` | 42 | 0 | included |  | 0.01135 | `11f5beb1201b` |
| `econ-lab-007` | `brain` | 41 | 0 | included |  | 0.02116 | `219769d8467a` |
| `econ-lab-008` | `brain` | 52 | 0 | included |  | 0.02175 | `702b886426c1` |
| `econ-lab-009` | `nobrain` | 50 | 0 | included |  | 0.01018 | `24bcd40b3d6b` |
| `econ-lab-010` | `nobrain` | 46 | 0 | included |  | 0.01277 | `92a407fd1c0e` |
| `econ-lab-011` | `brain` | 43 | 0 | included |  | 0.02104 | `9432aaf95acc` |
| `econ-lab-012` | `brain` | 46 | 0 | included |  | 0.02175 | `7f2a63d6fbbf` |
| `econ-lab-013` | `brain` | 47 | 0 | included |  | 0.0219 | `feccd74e0378` |
| `econ-lab-014` | `nobrain` | 41 | 0 | included |  | 0.01266 | `0a618b94240c` |
| `econ-lab-015` | `brain` | 48 | 0 | included |  | 0.02349 | `3ba3e721b54e` |
| `econ-lab-016` | `brain` | 51 | 0 | included |  | 0.02258 | `3fb08eddad4d` |
| `econ-lab-017` | `nobrain` | 43 | 0 | included |  | 0.01255 | `3e2a6267aec5` |
| `econ-lab-018` | `brain` | 45 | 0 | included |  | 0.02028 | `de0587d3035c` |
| `econ-lab-019` | `brain` | 42 | 0 | included |  | 0.02277 | `9af70655c202` |
| `econ-lab-020` | `nobrain` | 52 | 0 | included |  | 0.01232 | `93bcdbabd294` |
| `econ-lab-022` | `nobrain` | 44 | 0 | included |  | 0.01182 | `7b7c20aaa35d` |
| `econ-lab-021` | `brain` | 44 | 0 | included |  | 0.02084 | `be9cceb49360` |
| `econ-lab-023` | `nobrain` | 47 | 0 | included |  | 0.01183 | `27f2a5abdaf7` |
| `econ-lab-024` | `nobrain` | 51 | 0 | included |  | 0.0137 | `9259b1f113cb` |

## Means by arm (included runs)

| Metric | `nobrain` | `brain` |
| --- | --- | --- |
| `econ-games.dilemmaCooperation` | 0.8583 (n 12) | 0.0875 (n 12) |
| `econ-games.dilemmaRound1` | 0.9583 (n 12) | 0.375 (n 12) |
| `econ-games.fundCooperation` | 0.04467 (n 12) | 0.04492 (n 12) |
| `econ-games.tablePoints` | 462.7 (n 12) | 431.8 (n 12) |
| `strategy-brain.brainWrites` | absent | 12 (n 12) |
| `models.requests` | 94.17 (n 12) | 130.5 (n 12) |
| `econ-games.decisions` | 72 (n 12) | 72 (n 12) |
| `models.costUsd` | 0.01226 (n 12) | 0.02191 (n 12) |
| `econ-games.missedDecisions` | 0 (n 12) | 0 (n 12) |

## Shares by arm (included runs, 95 % Wilson interval)

A run counts when its `econ-games.dilemmaCooperation` is at or above 1.

| Arm | Runs that count | n | Share | 95 % interval |
| --- | --- | --- | --- | --- |
| `nobrain` | 9 | 12 | 0.75 | 0.4677 to 0.9111 |
| `brain` | 0 | 12 | 0 | 0 to 0.2425 |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `econ-games.dilemmaCooperation` | primary | included | -0.7708 | 0.08415 | -0.9542 to -0.5875 | 24 | 0.000002219 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.dilemmaCooperation` | primary | finished | -0.7708 | 0.08415 | -0.9542 to -0.5875 | 24 | 0.000002219 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.dilemmaRound1` | secondary | included | -0.5833 | 0.06406 | -0.7198 to -0.4468 | 24 | 0.000002219 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.dilemmaRound1` | secondary | finished | -0.5833 | 0.06406 | -0.7198 to -0.4468 | 24 | 0.000002219 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.fundCooperation` | secondary | included | 0.00025 | 0.02688 | -0.056 to 0.0565 | 24 | 1 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.fundCooperation` | secondary | finished | 0.00025 | 0.02688 | -0.056 to 0.0565 | 24 | 1 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.tablePoints` | secondary | included | -30.87 | 5.84 | -43.19 to -18.54 | 24 | 0.00002589 | difference of the arm means, treatment minus control; label-permutation exact |
| `econ-games.tablePoints` | secondary | finished | -30.87 | 5.84 | -43.19 to -18.54 | 24 | 0.00002589 | difference of the arm means, treatment minus control; label-permutation exact |
| `strategy-brain.brainWrites` | secondary | included | absent | absent | absent | absent | absent |  |
| `strategy-brain.brainWrites` | secondary | finished | absent | absent | absent | absent | absent |  |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

- Rule: econ-games.dilemmaCooperation, brain minus nobrain over the included runs, is less than 0; a verdict needs 10 runs in each arm
- Verdict: **kept** (estimate -0.7708, n 12)

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` | `econ-games.decisions` | `nobrain` | 1.308 | held |
| `models.requests` | `econ-games.decisions` | `brain` | 1.813 | held |
| `models.costUsd` |  | `nobrain` | 0.01226 | held |
| `models.costUsd` |  | `brain` | 0.02191 | held |
| `econ-games.missedDecisions` |  | `nobrain` | 0 | held |
| `econ-games.missedDecisions` |  | `brain` | 0 | held |

## Tolerance

none: no baseline was compared

## Deviations

none
