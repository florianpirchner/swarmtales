# Run lanterns-015

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 73, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:51:50.681Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `96e51c2ff0d100fceec0de22c3ce14fcedccb63cd539a8e44182f8a6c35d6740`
- Signed head: `098326a3dada9ea826c579bd4df8b81966780648a4739610247f063bfb756b34`

## Result

The run ended at tick 14: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 14 |
| `run.activations` | Activations |  | 203 |
| `run.toolCalls` | Tool calls |  | 171 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.KEEPER_SILENT` | Refusals with KEEPER_SILENT |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 71 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 203 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 720 |
| `models.outputTokens` | Output tokens | tokens | 45458 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 924858 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 152710 |
| `models.costUsd` | Cost | USD | 0.05114 |
| `clue-grid.recall` | Recall per team and game |  | 0.7499 |
| `clue-grid.precision` | Precision per team and game |  | 0.8466 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.7915 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `KEEPER_SILENT` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.008541 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 35 | 0.008329 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.009203 | 11 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 35 | 0.008505 | 11 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.007906 | 12 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008655 | 13 |

The run: 0.05114 USD in 203 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
