# Run hello-game-001

- Game: `hello-game`, params `{}`
- Seed 1, replicate 0
- Purpose: smoke; started at 2026-11-14T18:22:18.624Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a6233b717768d048a9e385a4dbd3d4269003e9d85478d82de8bc03e9e915939e`
- Signed head: `4a4a2be3a0a1b2723a35d7e345dbb4ce3af2de9d484d0bf4a2d634505e84255e`

## Result

The run ended at tick 12: ticks.

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 17 |
| `run.toolCalls` | Tool calls |  | 17 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 17 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 66 |
| `models.outputTokens` | Output tokens | tokens | 1651 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 19049 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 4190 |
| `models.costUsd` | Cost | USD | 0.001546 |

## Refusals

none

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:ada` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:bob` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.001546 USD in 17 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
