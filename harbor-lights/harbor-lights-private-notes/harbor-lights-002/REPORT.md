# Run harbor-lights-002

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 101, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:28:34.167Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `dcae977722b7d2f3c2f7becf28acb801a645b79b9495593962ad7c3185e16e2c`
- Signed head: `2ede6f350a66111a1601c6efa1f594b4e5946e5fa69ef7f8f48f444de9b15848`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 117 |
| `run.toolCalls` | Tool calls |  | 75 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 43 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 117 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 362 |
| `models.outputTokens` | Output tokens | tokens | 54388 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1572767 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 114603 |
| `models.costUsd` | Cost | USD | 0.05728 |
| `hint-towers.score` | Points per game | points | 16 |
| `hint-towers.misfires` | Misfires |  | 2 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 1 |
| `NOT_YOUR_TURN` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 32 | 0.0137 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01239 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01481 | 9 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.01639 | 10 |

The run: 0.05728 USD in 117 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
