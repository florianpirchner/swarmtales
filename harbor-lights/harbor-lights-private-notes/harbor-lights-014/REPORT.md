# Run harbor-lights-014

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 102, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:04:23.066Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `ae235a7db74f7127c9b998ce9feb8b746f4f89076bcc00c295380559c8a56bf7`
- Signed head: `768b613d3a2ef453ed4d2f9250e1e88609420f16770739fe212e999b8492f486`

## Result

The run ended at tick 3: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 3 |
| `run.activations` | Activations |  | 80 |
| `run.toolCalls` | Tool calls |  | 55 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 25 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 80 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 264 |
| `models.outputTokens` | Output tokens | tokens | 52796 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1162056 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 107196 |
| `models.costUsd` | Cost | USD | 0.05144 |
| `hint-towers.score` | Points per game | points | 19 |
| `hint-towers.misfires` | Misfires |  | 2 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 18 | 0.01159 | 6 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01858 | 8 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 20 | 0.01208 | 7 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 18 | 0.009194 | 4 |

The run: 0.05144 USD in 80 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
