# Run harbor-lights-017

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 108, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:09:37.835Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `e8876347d887f781d1be5451bbb40f4c72a0017a5b77b98fba0a1518df2ad7f0`
- Signed head: `1c1cbea5e68f149d842ba0a65201cfbdb6f984a415ed12548a045be410fec7e2`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 99 |
| `run.toolCalls` | Tool calls |  | 57 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 42 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 99 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 310 |
| `models.outputTokens` | Output tokens | tokens | 55678 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1502089 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 108593 |
| `models.costUsd` | Cost | USD | 0.05647 |
| `hint-towers.score` | Points per game | points | 21 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01878 | 11 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 22 | 0.01146 | 9 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.01319 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 22 | 0.01303 | 10 |

The run: 0.05647 USD in 99 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
