# Experiment quarry-noise-floor

Do five replicates of the control arm at seed 31 lie within the noise of the old platform?

## Plan

- Purpose: pilot; design: replicates
- Game: `games/quarry/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `control` (control) `{}`
- Seeds: 31; replicates: 5
- Primary metric: `draft-rounds.tablePoints`; secondary: `draft-rounds.sharedLanes`, `strategy-brain.brainWrites`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.1 USD per run, 0.5 USD in total
- Spec hash: `94a1cfc80d717b4bafa971ebc83c0b9e37db15fcc11344eb4a17f8b74f47eb27`; code: commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`, runtime revision 3

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `quarry-002` | `control` | 31 | 1 | included |  | 0.03639 | `d0ce54ea6943` |
| `quarry-001` | `control` | 31 | 2 | included |  | 0.03495 | `8288bfc93510` |
| `quarry-004` | `control` | 31 | 4 | included |  | 0.0335 | `195590a81047` |
| `quarry-003` | `control` | 31 | 3 | included |  | 0.03325 | `54422b202e11` |
| `quarry-005` | `control` | 31 | 0 | included |  | 0.03345 | `9912f51fb693` |

## Means by arm (included runs)

| Metric | `control` |
| --- | --- |
| `draft-rounds.tablePoints` | 1088 (n 5) |
| `draft-rounds.sharedLanes` | 1.6 (n 5) |
| `strategy-brain.brainWrites` | 12 (n 5) |
| `models.requests` | 186 (n 5) |
| `draft-rounds.decisions` | 144 (n 5) |
| `models.costUsd` | 0.03431 (n 5) |
| `draft-rounds.missedPicks` | 0 (n 5) |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft-rounds.tablePoints` | primary | included | 1088 | 35.84 | 988.5 to 1187 | 5 | 1 | mean of the arm; none |
| `draft-rounds.tablePoints` | primary | finished | 1088 | 35.84 | 988.5 to 1187 | 5 | 1 | mean of the arm; none |
| `draft-rounds.sharedLanes` | secondary | included | 1.6 | 0.7483 | -0.4774 to 3.677 | 5 | 1 | mean of the arm; none |
| `draft-rounds.sharedLanes` | secondary | finished | 1.6 | 0.7483 | -0.4774 to 3.677 | 5 | 1 | mean of the arm; none |
| `strategy-brain.brainWrites` | secondary | included | 12 | 0 | 12 to 12 | 5 | 1 | mean of the arm; none |
| `strategy-brain.brainWrites` | secondary | finished | 12 | 0 | 12 to 12 | 5 | 1 | mean of the arm; none |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

none: the experiment is reported, not gated

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` | `draft-rounds.decisions` | `control` | 1.292 | held |
| `models.costUsd` |  | `control` | 0.03431 | held |
| `draft-rounds.missedPicks` |  | `control` | 0 | held |

## Tolerance

The mean of the new runs is 1088, of the baseline 1081: a difference of 6.8 with a standard error of 44.22.
**Within** the noise of the baseline.

## Deviations

none
