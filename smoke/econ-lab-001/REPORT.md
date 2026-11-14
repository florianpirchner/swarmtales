# Run econ-lab-001

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 41, replicate 0
- Purpose: pilot; started at 2026-11-14T18:27:57.769Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `40b0726a2b005441cad4d897eab1b90716b0b1e53291451a7c3de8df366e2986`
- Signed head: `560a4d7b18421896eb808736931b352dc6c9b8977f82e0cdc37437e7ae883540`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 94 |
| `run.toolCalls` | Tool calls |  | 92 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 94 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 346 |
| `models.outputTokens` | Output tokens | tokens | 11470 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 217107 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 36360 |
| `models.costUsd` | Cost | USD | 0.01249 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.018 |
| `econ-games.tablePoints` | Points of the table | points | 463 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.01249 USD in 94 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
