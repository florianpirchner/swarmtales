# Run lanterns-003

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 71, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T08:48:46.264Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `ec11d795e3924952f882f838ae2a8b63674143912a085cc470887adbdfe02891`
- Signed head: `9cebb574d8282db901012d6ff0ceb86a5d8e86ef17bce0b16e4f485bc36cb8d9`

## Result

The run ended at tick 13: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 215 |
| `run.toolCalls` | Tool calls |  | 184 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 71 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 215 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 772 |
| `models.outputTokens` | Output tokens | tokens | 49029 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1006662 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 164694 |
| `models.costUsd` | Cost | USD | 0.05525 |
| `clue-grid.recall` | Recall per team and game |  | 0.7017 |
| `clue-grid.precision` | Precision per team and game |  | 0.766 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.7523 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 37 | 0.01083 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.007858 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 36 | 0.008894 | 13 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 35 | 0.00929 | 11 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 38 | 0.00992 | 11 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 35 | 0.008455 | 11 |

The run: 0.05525 USD in 215 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
