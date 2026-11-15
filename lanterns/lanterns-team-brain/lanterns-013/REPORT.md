# Run lanterns-013

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 101, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:40:48.749Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `142ed30b6c64dec257cca6aab9a0e2b45bc0d63a669b1932cd73987bc73b6a04`
- Signed head: `e424d40623ab2e8ee6192eadd5969823bbc85b85fcaf29ab80c14a5c182f9c69`

## Result

The run ended at tick 14: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 14 |
| `run.activations` | Activations |  | 231 |
| `run.toolCalls` | Tool calls |  | 197 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.refusals.KEEPER_SILENT` | Refusals with KEEPER_SILENT |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 78 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 231 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 822 |
| `models.outputTokens` | Output tokens | tokens | 51267 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1138339 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 167598 |
| `models.costUsd` | Cost | USD | 0.05805 |
| `clue-grid.recall` | Recall per team and game |  | 0.7331 |
| `clue-grid.precision` | Precision per team and game |  | 0.802 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.8133 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 1 |
| `KEEPER_SILENT` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 36 | 0.01004 | 14 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.007447 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 38 | 0.009509 | 14 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 43 | 0.01144 | 14 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 39 | 0.009293 | 11 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.01032 | 14 |

The run: 0.05805 USD in 231 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
