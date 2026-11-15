# Run harbor-lights-010

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 103, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:51:55.963Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `2096db379934c1aa6b6d28cf8522f650a8ca0fe6ed6b77fb040be18e66ad9c10`
- Signed head: `7f78a9d2417e40c67b62fa31fbd8c97b83509e8c1e0b333115c7f0bc99a0b31a`

## Result

The run ended at tick 4: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 4 |
| `run.activations` | Activations |  | 96 |
| `run.toolCalls` | Tool calls |  | 50 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 46 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 96 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 292 |
| `models.outputTokens` | Output tokens | tokens | 50331 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1233037 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 94403 |
| `models.costUsd` | Cost | USD | 0.04933 |
| `hint-towers.score` | Points per game | points | 22 |
| `hint-towers.misfires` | Misfires |  | 2 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.01312 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.01662 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 22 | 0.01221 | 11 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.007382 | 12 |

The run: 0.04933 USD in 96 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
