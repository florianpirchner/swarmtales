# Run econ-lab-001

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 45, replicate 0, arm `brain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:25:48.006Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7d7939f0c529d5e4784d0ddd6470b69d0e45ba78a37cce8481340c30ae55bb91`
- Signed head: `0caa515aaeb44f57e263fccb8ae7669b5e431bd551a1abacc5ebc1f9d49f803d`

## Result

The run ended at tick 9: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 9 |
| `run.activations` | Activations |  | 122 |
| `run.toolCalls` | Tool calls |  | 114 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 122 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 428 |
| `models.outputTokens` | Output tokens | tokens | 19767 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 342559 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 50893 |
| `models.costUsd` | Cost | USD | 0.01971 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.5 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0 |
| `econ-games.tablePoints` | Points of the table | points | 426 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 2 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.01971 USD in 122 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
