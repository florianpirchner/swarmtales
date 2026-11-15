# Run harbor-lights-007

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 101, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:40:34.393Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `9a60938299b5ad46e1d87162c4b17ef9ef4c51e54248b4dda8c2f533f618bba6`
- Signed head: `ab289bc1406b0d9d933b605f4172cfbfe7f5c624d6a89d553edad039030f356c`

## Result

The run ended at tick 4: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 4 |
| `run.activations` | Activations |  | 99 |
| `run.toolCalls` | Tool calls |  | 55 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 44 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 99 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 308 |
| `models.outputTokens` | Output tokens | tokens | 57029 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1472683 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 109433 |
| `models.costUsd` | Cost | USD | 0.05695 |
| `hint-towers.score` | Points per game | points | 17 |
| `hint-towers.misfires` | Misfires |  | 2 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.01103 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01447 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01337 | 11 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01808 | 10 |

The run: 0.05695 USD in 99 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
