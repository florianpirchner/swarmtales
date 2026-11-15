# Run hello-game-001

- Game: `hello-game`, params `{}`
- Seed 1, replicate 0
- Purpose: smoke; started at 2026-11-15T08:55:06.895Z
- Kernel: runtime revision 4, version 0.0.0, commit `7ea5ea107090937a4b84de02f64b96aa5c51daf8`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `4f019f7a1a380be3a317b198b815d5e630fd6e7efb216c9b8e3ba3088e29bc80`
- Signed head: `e63036d14011319622e789acf5cf16d3d0f64ad956c7529c98f0c645af449473`

## Result

The run ended at tick 12: ticks.

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 17 |
| `run.toolCalls` | Tool calls |  | 17 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 0 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 17 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 66 |
| `models.outputTokens` | Output tokens | tokens | 2025 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 20403 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 4601 |
| `models.costUsd` | Cost | USD | 0.001798 |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:ada` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 9 | 0.0008148 | 0 |
| `resident:bob` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 8 | 0.0009835 | 0 |

The run: 0.001798 USD in 17 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
