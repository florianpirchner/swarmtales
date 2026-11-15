# Run lanterns-010

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 97, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:29:12.685Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `8edc3c96a05f1ee133b52c8b39128527340dc1bcad5c8ffa904b286d2670047c`
- Signed head: `336c50464aa723b788eab8a965a968e9b5555678f0cb783062c7e664749920e4`

## Result

The run ended at tick 17: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 17 |
| `run.activations` | Activations |  | 293 |
| `run.toolCalls` | Tool calls |  | 264 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 5 |
| `run.noCallActivations` | Activations without a call |  | 100 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 291 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 1050 |
| `models.outputTokens` | Output tokens | tokens | 76088 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1765643 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 238814 |
| `models.costUsd` | Cost | USD | 0.08566 |
| `clue-grid.recall` | Recall per team and game |  | 0.7269 |
| `clue-grid.precision` | Precision per team and game |  | 0.803 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.7887 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 5 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 50 | 0.01533 | 18 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 48 | 0.01271 | 17 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 49 | 0.01567 | 17 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 53 | 0.01742 | 15 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 49 | 0.01353 | 16 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01099 | 17 |

The run: 0.08566 USD in 291 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
