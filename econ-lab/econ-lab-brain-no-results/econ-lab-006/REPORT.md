# Run econ-lab-006

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 42, replicate 0, arm `brain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:31:38.630Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `725d6e03f249bf5e991940386aa9e8b6711632c6dbae680f351d2cf5189695a9`
- Signed head: `f6055ccb751439efc1a13a35405a84586fb617c998f801cfd3cc23b668a8f648`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 133 |
| `run.toolCalls` | Tool calls |  | 125 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 4 |
| `models.requests` | Model requests |  | 133 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 454 |
| `models.outputTokens` | Output tokens | tokens | 21045 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 406429 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 52376 |
| `models.costUsd` | Cost | USD | 0.02118 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.511 |
| `econ-games.tablePoints` | Points of the table | points | 545.8 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 4 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.02118 USD in 133 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
