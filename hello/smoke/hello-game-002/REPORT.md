# Run hello-game-002

- Game: `hello-game`, params `{}`
- Seed 1, replicate 0
- Purpose: smoke; started at 2026-11-15T08:56:33.819Z
- Kernel: runtime revision 4, version 0.0.0, commit `7ea5ea107090937a4b84de02f64b96aa5c51daf8`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `0e0cf219b0d4a1950f0a05f727530ec981d8adfcc1601660ad7deb19bbc0f33d`
- Signed head: `1d2ea6fb75ced7e30929f7bb6c2e1003c26794c6e7dcb0c7904ad964107578da`

## Result

The run ended at tick 10: limit (models.budget).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 14 |
| `run.toolCalls` | Tool calls |  | 14 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 0 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 14 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 54 |
| `models.outputTokens` | Output tokens | tokens | 1936 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 15861 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 1599 |
| `models.costUsd` | Cost | USD | 0.001332 |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:ada` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 8 | 0.0008045 | 0 |
| `resident:bob` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 6 | 0.0005274 | 0 |

The run: 0.001332 USD in 14 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
