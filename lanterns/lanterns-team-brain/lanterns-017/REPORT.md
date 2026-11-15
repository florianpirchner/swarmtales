# Run lanterns-017

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 107, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T10:00:15.072Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `5c9abafc7449d6e5e6ddbb19c7c4ef0e3d8a40c347ef031b973e9c6487a99e13`
- Signed head: `aaf467ec0e178f368b511964d66ed917ed3d5579f5e535b4749b47f91b129c76`

## Result

The run ended at tick 15: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 15 |
| `run.activations` | Activations |  | 213 |
| `run.toolCalls` | Tool calls |  | 184 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 71 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 213 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 768 |
| `models.outputTokens` | Output tokens | tokens | 51647 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1009466 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 163568 |
| `models.costUsd` | Cost | USD | 0.05644 |
| `clue-grid.recall` | Recall per team and game |  | 0.7611 |
| `clue-grid.precision` | Precision per team and game |  | 0.8166 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8412 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.009994 | 11 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.008674 | 13 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.009602 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 36 | 0.008886 | 13 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 40 | 0.01035 | 11 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 35 | 0.008939 | 11 |

The run: 0.05644 USD in 213 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
