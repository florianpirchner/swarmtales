# Run lanterns-024

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 83, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T10:35:33.585Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `d1244254196a2e37cac31db053c3c72f87353b130c8ed447f26f9cdd5d63ada3`
- Signed head: `d2bdf55bbc26b7077ea603ec958082a6453afc33fa2a0ca137805d0959cd18ff`

## Result

The run ended at tick 14: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 14 |
| `run.activations` | Activations |  | 227 |
| `run.toolCalls` | Tool calls |  | 203 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 73 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 227 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 830 |
| `models.outputTokens` | Output tokens | tokens | 54867 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1103609 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 174841 |
| `models.costUsd` | Cost | USD | 0.06041 |
| `clue-grid.recall` | Recall per team and game |  | 0.7159 |
| `clue-grid.precision` | Precision per team and game |  | 0.8417 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.7403 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 38 | 0.01082 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 37 | 0.008849 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01074 | 14 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.009412 | 12 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 38 | 0.01057 | 12 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 39 | 0.01002 | 10 |

The run: 0.06041 USD in 227 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
