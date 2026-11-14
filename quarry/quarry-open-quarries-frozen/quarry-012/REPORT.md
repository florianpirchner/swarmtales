# Run quarry-012

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2,"showResults":true}`
- Seed 53, replicate 0, arm `control` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T22:15:10.922Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `ba849e5c1431888b977626e0241aa83b33358c17f3eeb521b02ca11b5ee53b6a`
- Signed head: `fd011748a25f1c978188ef87290029c50f957fdcfd934e978e7ee53ab8cf85c4`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 181 |
| `run.toolCalls` | Tool calls |  | 175 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 4 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `models.requests` | Model requests |  | 181 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 674 |
| `models.outputTokens` | Output tokens | tokens | 32627 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 740513 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 79284 |
| `models.costUsd` | Cost | USD | 0.0337 |
| `draft-rounds.tablePoints` | Points of the table | points | 928 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 4 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 4 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.0337 USD in 181 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
