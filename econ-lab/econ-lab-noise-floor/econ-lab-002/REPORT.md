# Run econ-lab-002

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 41, replicate 3, arm `nobrain` of experiment `econ-lab-noise-floor`
- Purpose: pilot; started at 2026-11-14T18:43:37.623Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `8fad0d8e3ed5dc0de8bf031df4072e1aa007f5070cd3ae6aeb660d6111c541ad`
- Signed head: `d2833e90b64352f1efb49eaa794bbbfd203c780c8c861d56d3bc28c82cdf54f8`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 93 |
| `run.toolCalls` | Tool calls |  | 83 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 93 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 342 |
| `models.outputTokens` | Output tokens | tokens | 15185 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 213038 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 37945 |
| `models.costUsd` | Cost | USD | 0.0145 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.5 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.068 |
| `econ-games.tablePoints` | Points of the table | points | 437.4 |
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

The run: 0.0145 USD in 93 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
