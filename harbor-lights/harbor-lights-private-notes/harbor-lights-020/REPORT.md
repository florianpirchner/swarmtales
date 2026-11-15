# Run harbor-lights-020

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 106, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:19:28.830Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7785a5829c99d870e3ad2d16987625d2c0c5d5f5b63688a6910aa0d3aa03e8e7`
- Signed head: `bbff45d29b77a305a7e30e764cbba3384870b10a87e4476a4efb3c400339b00d`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 97 |
| `run.toolCalls` | Tool calls |  | 52 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 45 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 97 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 296 |
| `models.outputTokens` | Output tokens | tokens | 42147 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1217626 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 90234 |
| `models.costUsd` | Cost | USD | 0.04456 |
| `hint-towers.score` | Points per game | points | 15 |
| `hint-towers.misfires` | Misfires |  | 3 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.01294 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.008863 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01056 | 11 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01219 | 10 |

The run: 0.04456 USD in 97 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
