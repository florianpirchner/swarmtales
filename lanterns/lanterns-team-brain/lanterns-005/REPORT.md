# Run lanterns-005

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 103, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:02:37.176Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `5735a29deac52f072ce107c1aaaaa51580e2b54fb6cca757df27db4a2e197d36`
- Signed head: `0bec2d9e13a32fac8ee8a67e4365b72f129e7254dd858ac18e993c62c4df8a19`

## Result

The run ended at tick 13: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 198 |
| `run.toolCalls` | Tool calls |  | 178 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.KEEPER_SILENT` | Refusals with KEEPER_SILENT |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 65 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 198 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 714 |
| `models.outputTokens` | Output tokens | tokens | 45925 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 884440 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 158688 |
| `models.costUsd` | Cost | USD | 0.05171 |
| `clue-grid.recall` | Recall per team and game |  | 0.7536 |
| `clue-grid.precision` | Precision per team and game |  | 0.8541 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8055 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `KEEPER_SILENT` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 30 | 0.008209 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008578 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 39 | 0.009094 | 11 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008978 | 12 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 30 | 0.007919 | 10 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 31 | 0.008937 | 9 |

The run: 0.05171 USD in 198 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
