# Run lanterns-014

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 73, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:51:50.659Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7367d41bac2de43aca9793f961e7fbe8794d9187f40a446755b456b5e7ca423d`
- Signed head: `bde24b4720f749fef76658a998b63b8b160f1202f21e9cda376cf3a91149eba8`

## Result

The run ended at tick 14: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 14 |
| `run.activations` | Activations |  | 235 |
| `run.toolCalls` | Tool calls |  | 220 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 80 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 234 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 836 |
| `models.outputTokens` | Output tokens | tokens | 57278 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1200128 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 196183 |
| `models.costUsd` | Cost | USD | 0.06525 |
| `clue-grid.recall` | Recall per team and game |  | 0.8709 |
| `clue-grid.precision` | Precision per team and game |  | 0.8709 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8278 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 38 | 0.01151 | 11 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.009572 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.01098 | 13 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 41 | 0.01107 | 14 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.01112 | 14 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 43 | 0.01098 | 16 |

The run: 0.06525 USD in 234 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
