# Run econ-lab-011

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 43, replicate 0, arm `brain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:37:34.546Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `f8c5568a29b754da9b3f11b7efeac508fd589162824c07164b9b12781c8ccf68`
- Signed head: `603190d13ac38464cef37613739f646b40fb5358c37af6b57aabcd58521ae568`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 139 |
| `run.toolCalls` | Tool calls |  | 125 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 5 |
| `models.requests` | Model requests |  | 139 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 482 |
| `models.outputTokens` | Output tokens | tokens | 23707 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 428070 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 56423 |
| `models.costUsd` | Cost | USD | 0.02324 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.35 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.75 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0 |
| `econ-games.tablePoints` | Points of the table | points | 439 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 5 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.02324 USD in 139 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
