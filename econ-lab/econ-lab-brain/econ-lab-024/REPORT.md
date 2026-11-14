# Run econ-lab-024

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 51, replicate 0, arm `nobrain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:17:15.922Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `55b487cfedd1328c557634b97f10c9984702c99c0a31ac9889c17a986108bd97`
- Signed head: `9259b1f113cb3e54383695d212f38bcd4505252ba45b13988864151dab55805d`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 96 |
| `run.toolCalls` | Tool calls |  | 91 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 96 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 350 |
| `models.outputTokens` | Output tokens | tokens | 14099 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 234384 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 34136 |
| `models.costUsd` | Cost | USD | 0.0137 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.25 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.75 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.018 |
| `econ-games.tablePoints` | Points of the table | points | 436 |
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

The run: 0.0137 USD in 96 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
