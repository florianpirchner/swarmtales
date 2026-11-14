# Run quarry-010

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2,"showResults":true}`
- Seed 43, replicate 0, arm `control` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T22:10:38.163Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `3be3c849d4cff67b9499c70b89911a35c72f2edb0e4651759fd04fe4385ddf72`
- Signed head: `1c3e25010a8caf37031410dc82e9222887480e17f6167a983754124ed5677419`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 184 |
| `run.toolCalls` | Tool calls |  | 175 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 4 |
| `models.requests` | Model requests |  | 184 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 684 |
| `models.outputTokens` | Output tokens | tokens | 33064 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 764158 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 80696 |
| `models.costUsd` | Cost | USD | 0.03433 |
| `draft-rounds.tablePoints` | Points of the table | points | 888 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 5 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 4 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.03433 USD in 184 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
