# Run lanterns-012

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 59, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:40:17.119Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `6aa281ba46382c472635816df77ef028036cf9631519dd782ad033587390f19f`
- Signed head: `b279769592d48a6d045ca211b318a8fe5b0decf93a274a6fa4e8f5c4a7799df5`

## Result

The run ended at tick 16: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 16 |
| `run.activations` | Activations |  | 265 |
| `run.toolCalls` | Tool calls |  | 244 |
| `run.toolRefusals` | Refused tool calls |  | 9 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 7 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 81 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 260 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 910 |
| `models.outputTokens` | Output tokens | tokens | 67309 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1436201 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 217824 |
| `models.costUsd` | Cost | USD | 0.07534 |
| `clue-grid.recall` | Recall per team and game |  | 0.9509 |
| `clue-grid.precision` | Precision per team and game |  | 0.9509 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.9762 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 7 |
| `TOOL_LOCKED` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 43 | 0.01214 | 16 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.01161 | 13 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 46 | 0.01259 | 11 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 45 | 0.01481 | 13 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01158 | 14 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 40 | 0.01262 | 14 |

The run: 0.07534 USD in 260 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
