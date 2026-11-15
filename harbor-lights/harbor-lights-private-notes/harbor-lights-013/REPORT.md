# Run harbor-lights-013

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 107, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:57:53.159Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `609ef63a531b3edf05d517529de6e70f514d2454c64c9bd4eebbfa785e0a6477`
- Signed head: `63376ec715302179b370ac118ab3835fd6e2496343bfbcb7ffe68733d578bd51`

## Result

The run ended at tick 6: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 6 |
| `run.activations` | Activations |  | 123 |
| `run.toolCalls` | Tool calls |  | 84 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 5 |
| `run.noCallActivations` | Activations without a call |  | 40 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 123 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 374 |
| `models.outputTokens` | Output tokens | tokens | 56437 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1688661 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 117215 |
| `models.costUsd` | Cost | USD | 0.05979 |
| `hint-towers.score` | Points per game | points | 20 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 5 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 30 | 0.01415 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 30 | 0.01703 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01191 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.0167 | 4 |

The run: 0.05979 USD in 123 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
