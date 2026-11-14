# Run econ-lab-008

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 42, replicate 0, arm `nobrain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:34:39.381Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7968cfbb4567192e6c64c01a80adf512e13e6af502574c54a30ec07d1701c0b0`
- Signed head: `3055d619bf376857c14b932cbce64856d1a3dc4dfcf06f232bc2243d0e03411d`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 98 |
| `run.toolCalls` | Tool calls |  | 89 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 98 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 358 |
| `models.outputTokens` | Output tokens | tokens | 12610 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 237733 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 23217 |
| `models.costUsd` | Cost | USD | 0.01162 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.043 |
| `econ-games.tablePoints` | Points of the table | points | 467.2 |
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

The run: 0.01162 USD in 98 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
