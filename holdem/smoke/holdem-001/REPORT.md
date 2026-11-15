# Run holdem-001

- Game: `holdem` (Hold'em), params `{"aidSeats":[],"brain":true,"brainSeats":[],"duplicate":true,"games":0,"hands":0,"maxWords":150,"seats":4}`
- Seed 41, replicate 0
- Purpose: smoke; started at 2026-11-15T09:34:02.562Z
- Kernel: runtime revision 4, version 0.0.0, commit `7ea5ea107090937a4b84de02f64b96aa5c51daf8`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `8ee1f13ee3d8c0badad3c9a02c7a10de7223294b0ef59920a4337ceba5989cb1`
- Signed head: `9b313b2aa39c80a4a42f9f108928f705a9b650abf17293671964aa38e759baee`

## Result

The run ended at tick 51: limit (holdem.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 51 |
| `run.activations` | Activations |  | 489 |
| `run.toolCalls` | Tool calls |  | 478 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 5 |
| `run.noCallActivations` | Activations without a call |  | 14 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 489 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 16 |
| `models.inputTokens` | Input tokens | tokens | 1894 |
| `models.outputTokens` | Output tokens | tokens | 104293 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 3692671 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 212712 |
| `models.costUsd` | Cost | USD | 0.1159 |
| `holdem.evLoss` | EV loss per decision | points | 0.2279 |
| `holdem.callsWithoutOdds` | Calls without the pot odds |  | 0.1558 |
| `holdem.foldsFacingBet` | Folds when facing a bet |  | 0.2214 |
| `holdem.vpip` | Hands played voluntarily (VPIP) |  | 0.6641 |
| `holdem.agreement` | Decisions of the baseline's kind |  | 0.6885 |
| `holdem.missed` | Decisions missed | decisions | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 16 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 5 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 113 | 0.02568 | 3 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 135 | 0.03337 | 3 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 120 | 0.02828 | 4 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 121 | 0.02851 | 4 |

The run: 0.1159 USD in 489 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
