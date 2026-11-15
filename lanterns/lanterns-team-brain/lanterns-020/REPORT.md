# Run lanterns-020

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 61, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T10:17:01.481Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a996bdfde8b8d43daf2b8481969b152a94ba23f1213db03646f1cc53710c0e52`
- Signed head: `b5ae0d52a5d96432aa170596b3837251e48809f488d900b7d4f3ae21001ef2be`

## Result

The run ended at tick 17: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 17 |
| `run.activations` | Activations |  | 289 |
| `run.toolCalls` | Tool calls |  | 276 |
| `run.toolRefusals` | Refused tool calls |  | 16 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 13 |
| `run.refusals.BAD_CLUE` | Refusals with BAD_CLUE |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 89 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 279 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 976 |
| `models.outputTokens` | Output tokens | tokens | 74590 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1669234 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 237997 |
| `models.costUsd` | Cost | USD | 0.08383 |
| `clue-grid.recall` | Recall per team and game |  | 0.8347 |
| `clue-grid.precision` | Precision per team and game |  | 0.908 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8213 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 2 |
| `BRAIN_TOO_LONG` | 13 |
| `BAD_CLUE` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.01336 | 15 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01149 | 16 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01358 | 15 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 45 | 0.01404 | 16 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 48 | 0.01455 | 15 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 58 | 0.01682 | 12 |

The run: 0.08383 USD in 279 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
