# Run city-slice-001

- Game: `city-slice` (The city slice), params `{}`
- Seed 7, replicate 0
- Purpose: smoke; started at 2026-11-14T20:30:03.600Z
- Kernel: runtime revision 3, version 0.0.0, commit `a4e7ea7dd26766bffa4f35d0b8e79cf61263f2b5`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `2bb6ea0934263645672db11aa4821b20cc76d57b5813e9a22a1c53834dbad91f`
- Signed head: `0f186681ac36474c42b6eadd7771bc09b1786168de2d2f943da14ab40fb778d8`

## Result

The run ended at tick 12: ticks.

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 72 |
| `run.toolCalls` | Tool calls |  | 22 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 72 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 288 |
| `models.outputTokens` | Output tokens | tokens | 6303 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 139047 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 9787 |
| `models.costUsd` | Cost | USD | 0.005794 |

## Refusals

none

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

The run: 0.005794 USD in 72 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
