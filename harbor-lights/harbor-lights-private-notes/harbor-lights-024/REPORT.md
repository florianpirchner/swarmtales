# Run harbor-lights-024

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 112, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:29:44.885Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `2a4c7b50c0521d6cccf01fcae84d733ea881f487ca3cb98b3b997ce4e7d06796`
- Signed head: `f3dcfedb8e746b9c9824954a10be7414e2ed3c21bb0734d1e58b6f6fa8b6cf97`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 108 |
| `run.toolCalls` | Tool calls |  | 57 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 51 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 108 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 328 |
| `models.outputTokens` | Output tokens | tokens | 51040 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1580123 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 107015 |
| `models.costUsd` | Cost | USD | 0.05473 |
| `hint-towers.score` | Points per game | points | 22 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.0109 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01696 | 14 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01304 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01383 | 13 |

The run: 0.05473 USD in 108 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
