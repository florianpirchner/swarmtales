# Run lanterns-022

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 79, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T10:26:02.680Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `3851fc5b9021939ac92ad906c1972ec8dd5b05cfdd69ebbca5e34979dbabd6d3`
- Signed head: `43db7d62b85b446a77d97a5ebc21ee0297fd53442d2252c6ffa6ec8a207d3048`

## Result

The run ended at tick 15: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 15 |
| `run.activations` | Activations |  | 249 |
| `run.toolCalls` | Tool calls |  | 229 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 80 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 249 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 914 |
| `models.outputTokens` | Output tokens | tokens | 59488 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1352220 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 193008 |
| `models.costUsd` | Cost | USD | 0.06748 |
| `clue-grid.recall` | Recall per team and game |  | 0.6649 |
| `clue-grid.precision` | Precision per team and game |  | 0.7776 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.6962 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 41 | 0.0114 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.011 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 39 | 0.01173 | 14 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 40 | 0.01074 | 12 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 41 | 0.0109 | 15 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 44 | 0.01171 | 14 |

The run: 0.06748 USD in 249 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
