# Run econ-lab-016

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 51, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:05:45.076Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `2ba496db1ca762b6f207c7817ac14f2c212f63d0ef44b9216bbf1786192dafc6`
- Signed head: `3fb08eddad4dfc846a4e5b14e48a7010ffc5b4a185bc20c25bc3e27a8b184519`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 133 |
| `run.toolCalls` | Tool calls |  | 124 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 133 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 458 |
| `models.outputTokens` | Output tokens | tokens | 22822 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 422088 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 55257 |
| `models.costUsd` | Cost | USD | 0.02258 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.5 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.057 |
| `econ-games.tablePoints` | Points of the table | points | 435.6 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 3 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.02258 USD in 133 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
