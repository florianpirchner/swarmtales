# Run lanterns-009

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 59, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:21:05.858Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `0f740fd243a6931deeec7715e1e5b991037e65857161cff2c8006dff83fd5c74`
- Signed head: `9542a988a7cfe9d0ceefdabafc4a6a4988c489349e5c517531c322e154b8f6f9`

## Result

The run ended at tick 14: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 14 |
| `run.activations` | Activations |  | 208 |
| `run.toolCalls` | Tool calls |  | 179 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.KEEPER_SILENT` | Refusals with KEEPER_SILENT |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 67 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 208 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 754 |
| `models.outputTokens` | Output tokens | tokens | 47159 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 996386 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 163054 |
| `models.costUsd` | Cost | USD | 0.054 |
| `clue-grid.recall` | Recall per team and game |  | 0.843 |
| `clue-grid.precision` | Precision per team and game |  | 0.9167 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.9073 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `KEEPER_SILENT` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.00881 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 38 | 0.009596 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 32 | 0.009042 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 43 | 0.0104 | 10 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.00794 | 11 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 32 | 0.008217 | 10 |

The run: 0.054 USD in 208 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
