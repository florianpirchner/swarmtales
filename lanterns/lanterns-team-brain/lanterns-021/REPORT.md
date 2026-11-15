# Run lanterns-021

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 67, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T10:18:49.847Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `ccc715dff4be62f7bf1058fdb6beac6db95f4dda23d1d7ba12a3cb11049c3fb8`
- Signed head: `09d55ae4a04ad1ec298bd1d2c23cd7c22329e809e1aeb8a18693577190d710c2`

## Result

The run ended at tick 14: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 14 |
| `run.activations` | Activations |  | 209 |
| `run.toolCalls` | Tool calls |  | 180 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 72 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 209 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 744 |
| `models.outputTokens` | Output tokens | tokens | 45223 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 936101 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 159315 |
| `models.costUsd` | Cost | USD | 0.05196 |
| `clue-grid.recall` | Recall per team and game |  | 0.8656 |
| `clue-grid.precision` | Precision per team and game |  | 0.9031 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8208 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 37 | 0.008695 | 14 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008671 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 38 | 0.009005 | 13 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008826 | 12 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 36 | 0.008659 | 10 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 30 | 0.008105 | 11 |

The run: 0.05196 USD in 209 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
