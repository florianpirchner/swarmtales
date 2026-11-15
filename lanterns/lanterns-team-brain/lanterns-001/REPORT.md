# Run lanterns-001

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 101, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T08:35:54.969Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `74b5ca8886e12e7fbd5e6f8410fe2f04df0c0f7e133d6d8bc585eadcead73603`
- Signed head: `d95f1cc7566a18ba897f1d59cefcb53f6707b7c52325e324bf4a0473f32949a5`

## Result

The run ended at tick 18: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 18 |
| `run.activations` | Activations |  | 317 |
| `run.toolCalls` | Tool calls |  | 287 |
| `run.toolRefusals` | Refused tool calls |  | 10 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 8 |
| `run.refusals.POST_CAP` | Refusals with POST_CAP |  | 1 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 106 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 314 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 1132 |
| `models.outputTokens` | Output tokens | tokens | 85681 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 2001555 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 262264 |
| `models.costUsd` | Cost | USD | 0.09575 |
| `clue-grid.recall` | Recall per team and game |  | 0.6816 |
| `clue-grid.precision` | Precision per team and game |  | 0.8056 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.744 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 8 |
| `POST_CAP` | 1 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 57 | 0.01892 | 17 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 47 | 0.01517 | 18 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 51 | 0.01582 | 16 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 52 | 0.01652 | 19 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 50 | 0.01439 | 19 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 57 | 0.01493 | 17 |

The run: 0.09575 USD in 314 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
