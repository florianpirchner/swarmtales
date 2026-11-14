# Experiment quarry-open-quarries

Does showing every hand raise the table's points?

## Plan

- Purpose: confirmatory; design: paired
- Game: `games/quarry/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `control` (control) `{}`; `open` `{"openHands":true}`
- Seeds: 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79; replicates: 1
- Primary metric: `draft-rounds.tablePoints`; secondary: `draft-rounds.sharedLanes`, `strategy-brain.brainWrites`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.1 USD per run, 1.5 USD in total
- Spec hash: `bd19298de593e090ad709d6bf624197df8793825bad684a4ffe7d6cfed3f0d46`; code: commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`, runtime revision 3

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `quarry-001` | `control` | 73 | 0 | included |  | 0.03342 | `dc7a7a0ff797` |
| `quarry-002` | `control` | 43 | 0 | included |  | 0.0357 | `d2e2fd0d724e` |
| `quarry-003` | `open` | 61 | 0 | included |  | 0.04079 | `744cbf8dcfa0` |
| `quarry-004` | `open` | 79 | 0 | included |  | 0.04309 | `81db9529f55d` |
| `quarry-005` | `control` | 71 | 0 | included |  | 0.03185 | `9ba8483db2f3` |
| `quarry-006` | `open` | 37 | 0 | included |  | 0.04048 | `19e86efe5a57` |
| `quarry-007` | `open` | 73 | 0 | included |  | 0.04169 | `53f1c74649dd` |
| `quarry-008` | `open` | 31 | 0 | included |  | 0.03982 | `e98477288622` |
| `quarry-009` | `control` | 37 | 0 | included |  | 0.03645 | `77d337fcfc91` |
| `quarry-010` | `open` | 41 | 0 | included |  | 0.04365 | `cc6ca7eb7326` |
| `quarry-011` | `open` | 53 | 0 | included |  | 0.04454 | `58499c9a4686` |
| `quarry-012` | `open` | 43 | 0 | included |  | 0.04163 | `4fc710996450` |
| `quarry-013` | `control` | 47 | 0 | included |  | 0.03642 | `2105dc259e58` |
| `quarry-014` | `control` | 59 | 0 | included |  | 0.03607 | `5a1f17ddbb14` |
| `quarry-015` | `control` | 31 | 0 | included |  | 0.03279 | `83c2a1807c49` |
| `quarry-016` | `open` | 59 | 0 | included |  | 0.0404 | `5e01976685b4` |
| `quarry-017` | `open` | 67 | 0 | included |  | 0.04103 | `caaf9214fc22` |
| `quarry-018` | `control` | 53 | 0 | included |  | 0.03239 | `b2eec2596fb0` |
| `quarry-019` | `open` | 47 | 0 | included |  | 0.03822 | `7ab2a1c6a120` |
| `quarry-020` | `control` | 79 | 0 | included |  | 0.03184 | `071dd7681097` |
| `quarry-021` | `control` | 61 | 0 | included |  | 0.0352 | `a968e509b746` |
| `quarry-022` | `control` | 41 | 0 | included |  | 0.03412 | `29e5ae5da48c` |
| `quarry-023` | `control` | 67 | 0 | included |  | 0.03508 | `e982e74a0f13` |
| `quarry-024` | `open` | 71 | 0 | included |  | 0.04323 | `80eb617bc45e` |

## Means by arm (included runs)

| Metric | `control` | `open` |
| --- | --- | --- |
| `draft-rounds.tablePoints` | 952.8 (n 12) | 1037 (n 12) |
| `draft-rounds.sharedLanes` | 4.417 (n 12) | 1.167 (n 12) |
| `strategy-brain.brainWrites` | 12 (n 12) | 11.83 (n 12) |
| `models.requests` | 185.7 (n 12) | 187.1 (n 12) |
| `draft-rounds.decisions` | 144 (n 12) | 144 (n 12) |
| `models.costUsd` | 0.03428 (n 12) | 0.04155 (n 12) |
| `draft-rounds.missedPicks` | 0 (n 12) | 0 (n 12) |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft-rounds.tablePoints` | primary | included | 84.5 | 22.04 | 36 to 133 | 12 | 0.0009766 | mean of the paired differences, treatment minus control; sign-flip exact |
| `draft-rounds.tablePoints` | primary | finished | 84.5 | 22.04 | 36 to 133 | 12 | 0.0009766 | mean of the paired differences, treatment minus control; sign-flip exact |
| `draft-rounds.sharedLanes` | secondary | included | -3.25 | 0.3509 | -4.022 to -2.478 | 12 | 0.0004883 | mean of the paired differences, treatment minus control; sign-flip exact |
| `draft-rounds.sharedLanes` | secondary | finished | -3.25 | 0.3509 | -4.022 to -2.478 | 12 | 0.0004883 | mean of the paired differences, treatment minus control; sign-flip exact |
| `strategy-brain.brainWrites` | secondary | included | -0.1667 | 0.1124 | -0.414 to 0.08065 | 12 | 0.5 | mean of the paired differences, treatment minus control; sign-flip exact |
| `strategy-brain.brainWrites` | secondary | finished | -0.1667 | 0.1124 | -0.414 to 0.08065 | 12 | 0.5 | mean of the paired differences, treatment minus control; sign-flip exact |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

- Rule: draft-rounds.tablePoints, open minus control over the included runs, is greater than 0; a verdict needs 10 complete pairs
- Verdict: **kept** (estimate 84.5, n 12)

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` | `draft-rounds.decisions` | `control` | 1.289 | held |
| `models.requests` | `draft-rounds.decisions` | `open` | 1.299 | held |
| `models.costUsd` |  | `control` | 0.03428 | held |
| `models.costUsd` |  | `open` | 0.04155 | held |
| `draft-rounds.missedPicks` |  | `control` | 0 | held |
| `draft-rounds.missedPicks` |  | `open` | 0 | held |

## Tolerance

none: no baseline was compared

## Deviations

none
