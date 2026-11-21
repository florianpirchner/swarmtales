# Run hello-game-001

- Game: `hello-game`, params `{}`
- Seed 1, replicate 0
- Purpose: smoke; started at 2026-11-21T17:21:33.912Z
- Kernel: runtime revision 8, version 1.0.0; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `831f36b7a048da6298ff07fcba177c5ef7f8fd688cdd668eeabf4c4f4d32c578`
- Signed head: `2814f9552760f9caa43d0d515b5b1f21b77db3272f7f75f186860104e15298fb`

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
| `models.outputTokens` | Output tokens | tokens | 2210 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 20203 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 4704 |
| `models.costUsd` | Cost | USD | 0.001902 |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:ada` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 9 | 0.0009187 | 0 |
| `resident:bob` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 8 | 0.000983 | 0 |

The run: 0.001902 USD in 17 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
