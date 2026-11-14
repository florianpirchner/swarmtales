# Run econ-lab-009

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 50, replicate 0, arm `nobrain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T19:57:47.249Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `b4d8a96edd2c45df664375a20052238eb727bf2b01bc86143ed8cf384a9ce904`
- Signed head: `24bcd40b3d6b8c6281e0155a8011879629b0855814f8a2402cbae93defb916bb`

## Result

The run ended at tick 6: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 6 |
| `run.activations` | Activations |  | 82 |
| `run.toolCalls` | Tool calls |  | 79 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 82 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 300 |
| `models.outputTokens` | Output tokens | tokens | 10821 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 180354 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 23473 |
| `models.costUsd` | Cost | USD | 0.01018 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0 |
| `econ-games.tablePoints` | Points of the table | points | 460 |
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

The run: 0.01018 USD in 82 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
