# Run lanterns-006

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 79, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:10:03.225Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `21e8cdc27f2635cdefa22ecbaf6dab9eb0c6a1d3ae590748374d99cc1c36a2d4`
- Signed head: `6abf7566ac29f9630b3214066988ec8980eb19f8c06dd9d56983dffe39fb2e6b`

## Result

The run ended at tick 16: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 16 |
| `run.activations` | Activations |  | 296 |
| `run.toolCalls` | Tool calls |  | 272 |
| `run.toolRefusals` | Refused tool calls |  | 10 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 8 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 92 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 291 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 1056 |
| `models.outputTokens` | Output tokens | tokens | 78872 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1802352 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 251452 |
| `models.costUsd` | Cost | USD | 0.089 |
| `clue-grid.recall` | Recall per team and game |  | 0.7771 |
| `clue-grid.precision` | Precision per team and game |  | 0.7896 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8028 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 8 |
| `TOOL_LOCKED` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 49 | 0.01662 | 15 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 49 | 0.01441 | 13 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 51 | 0.01662 | 13 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 51 | 0.01536 | 17 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.01287 | 17 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 47 | 0.01311 | 17 |

The run: 0.089 USD in 291 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
