# Run lanterns-004

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 89, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:02:37.141Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `99f400ec431d4f0674d7251aedcefb19fe9d277af606e7de39e039f1ecdf1991`
- Signed head: `9d055c34f8ccbfc82e63f42c13ec325559d0ff76bebea8ba104f6ee9b6c486bf`

## Result

The run ended at tick 14: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 14 |
| `run.activations` | Activations |  | 212 |
| `run.toolCalls` | Tool calls |  | 184 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.KEEPER_SILENT` | Refusals with KEEPER_SILENT |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 69 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 212 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 758 |
| `models.outputTokens` | Output tokens | tokens | 46956 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1002444 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 163857 |
| `models.costUsd` | Cost | USD | 0.05406 |
| `clue-grid.recall` | Recall per team and game |  | 0.7174 |
| `clue-grid.precision` | Precision per team and game |  | 0.7806 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.6803 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `KEEPER_SILENT` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.008218 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.01065 | 10 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.008606 | 13 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.0084 | 11 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 39 | 0.00976 | 10 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008426 | 12 |

The run: 0.05406 USD in 212 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
