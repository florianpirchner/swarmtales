# Run lanterns-008

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 71, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:21:00.285Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `9cc6a4bd0ab5b1a4c864aff8a8b6fda8ee8a76b7845ae572eb120a8adc047fad`
- Signed head: `e32e8b6e5a7217e102f5b7f46abffd45013a7f7dc035071a6c099edb14a8a818`

## Result

The run ended at tick 17: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 17 |
| `run.activations` | Activations |  | 285 |
| `run.toolCalls` | Tool calls |  | 262 |
| `run.toolRefusals` | Refused tool calls |  | 12 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 12 |
| `run.noCallActivations` | Activations without a call |  | 93 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 273 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 964 |
| `models.outputTokens` | Output tokens | tokens | 72438 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1603608 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 228771 |
| `models.costUsd` | Cost | USD | 0.08095 |
| `clue-grid.recall` | Recall per team and game |  | 0.8097 |
| `clue-grid.precision` | Precision per team and game |  | 0.8739 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8297 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 12 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 45 | 0.01569 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 45 | 0.01282 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 49 | 0.01512 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01301 | 18 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 43 | 0.01203 | 20 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 49 | 0.01228 | 18 |

The run: 0.08095 USD in 273 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
