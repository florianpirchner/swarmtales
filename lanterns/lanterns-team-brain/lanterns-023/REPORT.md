# Run lanterns-023

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 89, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T10:27:34.965Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `5acb3b46bb51d045f76fbc7772b4986a137e36e2e9c67eb73bbdc2e28f155de0`
- Signed head: `b0d10bef0a68fb3f9e1967e43fe5e54f5a1180e7e07f010be4cb612a488e3410`

## Result

The run ended at tick 18: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 18 |
| `run.activations` | Activations |  | 309 |
| `run.toolCalls` | Tool calls |  | 278 |
| `run.toolRefusals` | Refused tool calls |  | 7 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 6 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 96 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 309 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 1106 |
| `models.outputTokens` | Output tokens | tokens | 70581 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1922112 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 244677 |
| `models.costUsd` | Cost | USD | 0.08521 |
| `clue-grid.recall` | Recall per team and game |  | 0.9063 |
| `clue-grid.precision` | Precision per team and game |  | 0.9437 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.875 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 6 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 61 | 0.01674 | 15 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.01201 | 18 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 52 | 0.01498 | 15 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 52 | 0.01445 | 16 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 48 | 0.01319 | 17 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 52 | 0.01384 | 15 |

The run: 0.08521 USD in 309 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
