# Run city-slice-003

- Game: `city-slice` (The city slice), params `{"briefed":true}`
- Seed 7, replicate 0
- Purpose: smoke; started at 2026-11-14T21:12:06.548Z
- Kernel: runtime revision 3, version 0.0.0, commit `53c35973ad26416d5312bdf8baa62e08785a09d9`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `9175264b449d26a030dff95702495a07f9e63bd2a37d2f34debe4337e9db0f15`
- Signed head: `d3f165be1b24aa70166b34f9fbeaf821c079c5ab60b65a8fb8248c195a24fcaf`

## Result

The run ended at tick 12: ticks.

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 72 |
| `run.toolCalls` | Tool calls |  | 51 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.DECISION_CLOSED` | Refusals with DECISION_CLOSED |  | 1 |
| `models.requests` | Model requests |  | 72 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 288 |
| `models.outputTokens` | Output tokens | tokens | 8620 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 212699 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 21867 |
| `models.costUsd` | Cost | USD | 0.009199 |

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

The run: 0.009199 USD in 72 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
