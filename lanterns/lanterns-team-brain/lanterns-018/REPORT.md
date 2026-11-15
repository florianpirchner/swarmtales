# Run lanterns-018

- Game: `lanterns` (Lanterns), params `{"brain":true,"games":4,"maxClues":5,"maxWords":200}`
- Seed 67, replicate 0, arm `brain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T10:05:39.478Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `57e23e859c61fdaa44cdc03f84f56ac30ae23c7c696ef5d377d13550d05e8297`
- Signed head: `df5273f28145e7bd5dedf73c29162b0b56810627f06b9dd09392cec00a391e24`

## Result

The run ended at tick 15: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 15 |
| `run.activations` | Activations |  | 298 |
| `run.toolCalls` | Tool calls |  | 264 |
| `run.toolRefusals` | Refused tool calls |  | 9 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 6 |
| `run.noCallActivations` | Activations without a call |  | 96 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 294 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 1046 |
| `models.outputTokens` | Output tokens | tokens | 71733 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1718607 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 237731 |
| `models.costUsd` | Cost | USD | 0.08287 |
| `clue-grid.recall` | Recall per team and game |  | 0.8812 |
| `clue-grid.precision` | Precision per team and game |  | 0.8812 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.925 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 3 |
| `BRAIN_TOO_LONG` | 6 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 59 | 0.01816 | 15 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 50 | 0.01346 | 18 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 48 | 0.01408 | 18 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 45 | 0.01273 | 17 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 50 | 0.01307 | 12 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01136 | 16 |

The run: 0.08287 USD in 294 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
