# Run whispers-001

- Game: `whispers` (Whispers), params `{"activation":"onNews","agents":6,"classifier":true,"coreMotives":true,"figureDirection":4,"gamemaker":true,"gmDirection":4,"guards":true,"lastLevel":7,"minutes":45,"names":true,"passesPerMinute":3,"receipts":true,"stopWhenDone":false,"stopWhenSeatsDecided":false,"whisperer":true}`
- Seed 11, replicate 0
- Purpose: smoke; started at 2026-11-16T01:12:14.082Z
- Kernel: runtime revision 6, version 0.0.0, commit `bd0ee26a495678d597a57ff62389c033e7afc6aa` with changes that are not committed; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `43576f9a4dde5c45cd7aebfcd390f5d3d611d813b51706fee81b46edf26dcd18`
- Signed head: `e0706546dbe052e14ab7eb71d9d007d851896a43083a7325cf00f723049eb2c9`

## Result

The run ended at tick 45: ticks.

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 45 |
| `run.activations` | Activations |  | 816 |
| `run.toolCalls` | Tool calls |  | 1235 |
| `run.toolRefusals` | Refused tool calls |  | 27 |
| `run.refusals.GUARD_BLOCKED` | Refusals with GUARD_BLOCKED |  | 19 |
| `run.refusals.MAILBOX_FULL` | Refusals with MAILBOX_FULL |  | 1 |
| `run.refusals.DM_LIMIT` | Refusals with DM_LIMIT |  | 5 |
| `run.refusals.LEVEL_NOT_REACHED` | Refusals with LEVEL_NOT_REACHED |  | 1 |
| `run.refusals.REPEATED` | Refusals with REPEATED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 50 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 895 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 3504 |
| `models.outputTokens` | Output tokens | tokens | 219531 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 35035312 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 862466 |
| `models.costUsd` | Cost | USD | 0.9517 |

## Refusals

| Code | Count |
| --- | --- |
| `GUARD_BLOCKED` | 19 |
| `MAILBOX_FULL` | 1 |
| `DM_LIMIT` | 5 |
| `LEVEL_NOT_REACHED` | 1 |
| `REPEATED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 139 | 0.1796 | 1 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 113 | 0.06269 | 25 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 147 | 0.3863 | 0 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 137 | 0.07445 | 5 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 113 | 0.05802 | 15 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 126 | 0.1333 | 4 |
| `director:confessor` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 44 | 0.01192 | 0 |
| `director:gamemaker` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 76 | 0.0454 | 0 |
| `director:guard` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 0 | 0 | absent |
| `director:judge` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 0 | 0 | absent |
| `script` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 0 | 0 | absent |

The run: 0.9517 USD in 895 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
