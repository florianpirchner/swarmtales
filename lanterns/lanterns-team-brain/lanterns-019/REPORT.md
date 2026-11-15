# Run lanterns-019

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 107, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T10:08:50.126Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `bcd98172bc033d81ae7465e4b3074d56e0de7c369c38705e9cfa4a2d3f7a6f61`
- Signed head: `0096f5dccaaf6d91dd4184b4b7593b01cd1be5136313d2e466b8a2a86d858d51`

## Result

The run ended at tick 17: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 17 |
| `run.activations` | Activations |  | 264 |
| `run.toolCalls` | Tool calls |  | 234 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 5 |
| `run.noCallActivations` | Activations without a call |  | 94 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 261 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 930 |
| `models.outputTokens` | Output tokens | tokens | 68227 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1423935 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 211433 |
| `models.costUsd` | Cost | USD | 0.07487 |
| `clue-grid.recall` | Recall per team and game |  | 0.7955 |
| `clue-grid.precision` | Precision per team and game |  | 0.853 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8107 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 5 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 43 | 0.01342 | 16 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.01271 | 14 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 48 | 0.01407 | 16 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01181 | 18 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 45 | 0.01237 | 17 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 39 | 0.01049 | 13 |

The run: 0.07487 USD in 261 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
