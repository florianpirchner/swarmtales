# Run econ-lab-017

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 43, replicate 0, arm `nobrain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:08:54.522Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `4475a65249c2e170ca4bb9ffff9a7729a2cacce9d5fb3b72afb4ef9363e610b8`
- Signed head: `3e2a6267aec515afa8cc3c7e70962c6ed5741b959abbaad88f88cd425e422703`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 95 |
| `run.toolCalls` | Tool calls |  | 85 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 95 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 342 |
| `models.outputTokens` | Output tokens | tokens | 12864 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 222140 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 30890 |
| `models.costUsd` | Cost | USD | 0.01255 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.057 |
| `econ-games.tablePoints` | Points of the table | points | 469.6 |
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

The run: 0.01255 USD in 95 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
