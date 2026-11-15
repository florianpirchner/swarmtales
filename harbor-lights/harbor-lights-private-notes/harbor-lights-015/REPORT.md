# Run harbor-lights-015

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 102, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:04:24.072Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `c019748abdce721317989df0d7b6fa2d3c3abe1610fefe2888e4df7b5db78f1f`
- Signed head: `c6706c76bfd7bcfdc5b8b68accc06a4fdf74e6074d07f53275fc0f2e4cde52fc`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 110 |
| `run.toolCalls` | Tool calls |  | 84 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 5 |
| `run.noCallActivations` | Activations without a call |  | 28 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 110 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 340 |
| `models.outputTokens` | Output tokens | tokens | 46425 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1436974 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 105320 |
| `models.costUsd` | Cost | USD | 0.05078 |
| `hint-towers.score` | Points per game | points | 22 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 5 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01422 | 6 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.0103 | 6 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.01418 | 7 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.01208 | 9 |

The run: 0.05078 USD in 110 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
