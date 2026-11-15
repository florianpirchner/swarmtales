# Run lanterns-002

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 103, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T08:48:46.229Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `e81502ca2b4f12dfeeafb98d5c19eb660846930b9a236eed8d05bf2a940d33a0`
- Signed head: `0d74f2905428948dab363a4670f15d632b4cc012862a86a5a46ed7fc9d33d7d4`

## Result

The run ended at tick 20: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 20 |
| `run.activations` | Activations |  | 374 |
| `run.toolCalls` | Tool calls |  | 321 |
| `run.toolRefusals` | Refused tool calls |  | 19 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 16 |
| `run.refusals.KEEPER_SILENT` | Refusals with KEEPER_SILENT |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 126 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 356 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 1264 |
| `models.outputTokens` | Output tokens | tokens | 89193 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 2543074 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 281034 |
| `models.costUsd` | Cost | USD | 0.1053 |
| `clue-grid.recall` | Recall per team and game |  | 0.747 |
| `clue-grid.precision` | Precision per team and game |  | 0.8645 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8578 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 2 |
| `BRAIN_TOO_LONG` | 16 |
| `KEEPER_SILENT` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 61 | 0.01915 | 23 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 68 | 0.02053 | 20 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 54 | 0.01696 | 22 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 59 | 0.01763 | 18 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 56 | 0.01541 | 24 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 58 | 0.01559 | 19 |

The run: 0.1053 USD in 356 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
