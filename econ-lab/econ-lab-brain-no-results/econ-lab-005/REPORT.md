# Run econ-lab-005

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 46, replicate 0, arm `nobrain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:30:36.469Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `ca4676725431ad5089158bb766ae6463f4644025d1ae1ef54503d8279c50b255`
- Signed head: `ee14db2e654d6fcab1354f9e8b8c96891cce5933d4e971ae79feec0a3d51bced`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 97 |
| `run.toolCalls` | Tool calls |  | 88 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 97 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 356 |
| `models.outputTokens` | Output tokens | tokens | 11382 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 233336 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 22226 |
| `models.costUsd` | Cost | USD | 0.01084 |
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

The run: 0.01084 USD in 97 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
