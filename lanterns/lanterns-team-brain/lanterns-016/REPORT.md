# Run lanterns-016

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 61, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:59:18.913Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `527c674fffd4c768d92cf34626e41aecb2a78b3c72617a9f38454764a3c0e349`
- Signed head: `8da7e806bac50a29c8052e4121a84c6b26f2400503b4aaf31a5082e7706eea85`

## Result

The run ended at tick 13: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 190 |
| `run.toolCalls` | Tool calls |  | 173 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.KEEPER_SILENT` | Refusals with KEEPER_SILENT |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 61 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 190 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 672 |
| `models.outputTokens` | Output tokens | tokens | 40781 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 854527 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 147841 |
| `models.costUsd` | Cost | USD | 0.04748 |
| `clue-grid.recall` | Recall per team and game |  | 0.8559 |
| `clue-grid.precision` | Precision per team and game |  | 0.8975 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8357 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `KEEPER_SILENT` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 30 | 0.007399 | 10 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008182 | 10 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.007615 | 10 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 30 | 0.007187 | 11 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 35 | 0.008615 | 9 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008486 | 11 |

The run: 0.04748 USD in 190 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
