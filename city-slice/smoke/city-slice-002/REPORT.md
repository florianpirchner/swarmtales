# Run city-slice-002

- Game: `city-slice` (The city slice), params `{}`
- Seed 11, replicate 0
- Purpose: smoke; started at 2026-11-14T20:32:39.160Z
- Kernel: runtime revision 3, version 0.0.0, commit `a4e7ea7dd26766bffa4f35d0b8e79cf61263f2b5`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `5b9db1871ac6e26e701e81995a464b98fe6680166933496cfe9d61888d41652f`
- Signed head: `8bffc61d46c8c31312c6e577d86583b59d32cc874177bf6475926baec40f3b8d`

## Result

The run ended at tick 12: ticks.

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 72 |
| `run.toolCalls` | Tool calls |  | 21 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.DECISION_CLOSED` | Refusals with DECISION_CLOSED |  | 1 |
| `models.requests` | Model requests |  | 72 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 288 |
| `models.outputTokens` | Output tokens | tokens | 6568 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 142940 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 6910 |
| `models.costUsd` | Cost | USD | 0.005606 |

## Refusals

| Code | Count |
| --- | --- |
| `DECISION_CLOSED` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `director:warden` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` |
| `human` | `@swarmtales/cli/hand` | none |

The run: 0.005606 USD in 72 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
