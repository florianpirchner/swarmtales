# Run quarry-004

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":true,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2,"showResults":true}`
- Seed 37, replicate 0, arm `open-frozen` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T21:57:41.134Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `e30e51445121f869a00f00200c215f4dc4d6de90154cf7078488edd0a2941dbc`
- Signed head: `75e44b13e733f6a07d7657a170aeae6166108374aabedefed2d7516d7fbae067`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 186 |
| `run.toolCalls` | Tool calls |  | 186 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 186 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 688 |
| `models.outputTokens` | Output tokens | tokens | 36634 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 986282 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 107560 |
| `models.costUsd` | Cost | USD | 0.04169 |
| `draft-rounds.tablePoints` | Points of the table | points | 956 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 0 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 1 |
| `BRAIN_TOO_LONG` | 3 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04169 USD in 186 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
