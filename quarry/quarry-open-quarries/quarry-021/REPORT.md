# Run quarry-021

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 61, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:37:09.758Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `e68223d2a831799dc9db574fe9764e6328a2c29a7933e419a56d57c3f70b9610`
- Signed head: `a968e509b746d204b69fdb0022b8a8e4f9ed0ff88cadd9fe2d85d10f8548c7fe`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 189 |
| `run.toolCalls` | Tool calls |  | 187 |
| `run.toolRefusals` | Refused tool calls |  | 7 |
| `run.refusals.NOT_IN_PACK` | Refusals with NOT_IN_PACK |  | 1 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 6 |
| `models.requests` | Model requests |  | 189 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 698 |
| `models.outputTokens` | Output tokens | tokens | 33107 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 805807 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 84127 |
| `models.costUsd` | Cost | USD | 0.0352 |
| `draft-rounds.tablePoints` | Points of the table | points | 1037 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 4 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_IN_PACK` | 1 |
| `BRAIN_TOO_LONG` | 6 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.0352 USD in 189 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
