# Run econ-lab-018

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 45, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:09:25.878Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `2f5fac2abeb85dbdf2b00cd42b6f7a5bcadab7c73b4b5617fa0541cbb0923b3b`
- Signed head: `de0587d3035c18aa2424530d0e0db1ea80f8f585e714576240770ff2e0e5e6c2`

## Result

The run ended at tick 9: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 9 |
| `run.activations` | Activations |  | 124 |
| `run.toolCalls` | Tool calls |  | 120 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 124 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 436 |
| `models.outputTokens` | Output tokens | tokens | 20247 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 366099 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 51597 |
| `models.costUsd` | Cost | USD | 0.02028 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.5 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.018 |
| `econ-games.tablePoints` | Points of the table | points | 429 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

none

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.02028 USD in 124 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
