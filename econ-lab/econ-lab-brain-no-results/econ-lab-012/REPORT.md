# Run econ-lab-012

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 43, replicate 0, arm `nobrain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:38:19.728Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `717ed369c7f487890a01792a55cc9756d3587160713507b510db67a50d907830`
- Signed head: `1e406a0ea5efd824174535b49e02e0ae2ee4df4f597e467776e13571dfdc5700`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 95 |
| `run.toolCalls` | Tool calls |  | 84 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 95 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 342 |
| `models.outputTokens` | Output tokens | tokens | 11346 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 220497 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 20857 |
| `models.costUsd` | Cost | USD | 0.01052 |
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

The run: 0.01052 USD in 95 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
