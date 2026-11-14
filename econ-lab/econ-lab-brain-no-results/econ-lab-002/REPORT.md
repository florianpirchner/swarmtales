# Run econ-lab-002

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 44, replicate 0, arm `brain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:25:48.023Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `2d87b3b35aa589e6c1d11ecf680695577af439a0bc4ef03a4af3a6006ef54dda`
- Signed head: `9e7035edc3550abc03c51c4094b0caf13df35c05d2ee6a137bc5f713248df274`

## Result

The run ended at tick 9: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 9 |
| `run.activations` | Activations |  | 127 |
| `run.toolCalls` | Tool calls |  | 119 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 127 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 442 |
| `models.outputTokens` | Output tokens | tokens | 20782 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 370282 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 53751 |
| `models.costUsd` | Cost | USD | 0.02086 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.5 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.018 |
| `econ-games.tablePoints` | Points of the table | points | 429 |
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

The run: 0.02086 USD in 127 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
