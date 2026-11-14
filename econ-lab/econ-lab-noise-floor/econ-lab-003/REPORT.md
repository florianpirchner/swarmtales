# Run econ-lab-003

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 41, replicate 2, arm `nobrain` of experiment `econ-lab-noise-floor`
- Purpose: pilot; started at 2026-11-14T18:45:30.267Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a2ad4d3b5c60e9bb09f56e1484587c152ab26423e23b12e2aba0294da625d980`
- Signed head: `5b377e05fc394cb2803ef8ddf4106dfcf80d01d173e988806c41c479910c0461`

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
| `models.inputTokens` | Input tokens | tokens | 352 |
| `models.outputTokens` | Output tokens | tokens | 14481 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 226486 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 32112 |
| `models.costUsd` | Cost | USD | 0.01355 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.25 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.75 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.05 |
| `econ-games.tablePoints` | Points of the table | points | 441.4 |
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

The run: 0.01355 USD in 95 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
