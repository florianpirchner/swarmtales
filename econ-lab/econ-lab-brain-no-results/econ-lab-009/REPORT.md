# Run econ-lab-009

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 44, replicate 0, arm `nobrain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:35:45.637Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `4349b5e2ac4fb078567f133835c0142db8ba7f1f99489126f7014d1942b0af22`
- Signed head: `0f026796ddc9a0e743ee094ac3c4cd70912aad2162854e21af88ede06fd8d954`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 96 |
| `run.toolCalls` | Tool calls |  | 84 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 96 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 350 |
| `models.outputTokens` | Output tokens | tokens | 11571 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 225671 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 21424 |
| `models.costUsd` | Cost | USD | 0.01076 |
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

The run: 0.01076 USD in 96 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
