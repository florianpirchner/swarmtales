# Run lanterns-007

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 83, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:10:39.264Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a35ddbe40515f3ea5ffec40aa6715b00d7058c2cfee6c396714d2ca5933ed8ce`
- Signed head: `e52f396e4d115b3d0d682bf65ec38f4e0401d24b1d6a9aaa445930072ab2aad4`

## Result

The run ended at tick 16: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 16 |
| `run.activations` | Activations |  | 262 |
| `run.toolCalls` | Tool calls |  | 229 |
| `run.toolRefusals` | Refused tool calls |  | 15 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 13 |
| `run.refusals.KEEPER_SILENT` | Refusals with KEEPER_SILENT |  | 1 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 88 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 252 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 882 |
| `models.outputTokens` | Output tokens | tokens | 68032 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1364490 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 205596 |
| `models.costUsd` | Cost | USD | 0.07345 |
| `clue-grid.recall` | Recall per team and game |  | 0.8207 |
| `clue-grid.precision` | Precision per team and game |  | 0.8959 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.761 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 13 |
| `KEEPER_SILENT` | 1 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 45 | 0.0147 | 16 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01234 | 18 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 43 | 0.0121 | 16 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01231 | 13 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01134 | 13 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 38 | 0.01066 | 12 |

The run: 0.07345 USD in 252 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
