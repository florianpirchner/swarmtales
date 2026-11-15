# Run harbor-lights-001

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 105, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:22:01.833Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `d389a04eb678282bebc1e9d87c11ae46f3ede7acca9be0007f23028f59d1648c`
- Signed head: `b942b9fbfbc9e9d70dd8cbb5810c86c023d107cc642a08745794256387f89298`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 102 |
| `run.toolCalls` | Tool calls |  | 53 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 49 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 102 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 310 |
| `models.outputTokens` | Output tokens | tokens | 53521 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1544631 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 109548 |
| `models.costUsd` | Cost | USD | 0.05593 |
| `hint-towers.score` | Points per game | points | 14 |
| `hint-towers.misfires` | Misfires |  | 3 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.01054 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01453 | 13 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01326 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.0176 | 12 |

The run: 0.05593 USD in 102 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
