# Run quarry-009

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2,"showResults":true}`
- Seed 37, replicate 0, arm `control` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T22:10:06.574Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `145ad222e8e0c2d2812319c60e3920f70598391714742ad93c77d1e6c95e9537`
- Signed head: `fd7b43cc401f979035f783462d26313edf9fb192570a7721bc57695695cc5df2`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 188 |
| `run.toolCalls` | Tool calls |  | 186 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `models.requests` | Model requests |  | 188 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 700 |
| `models.outputTokens` | Output tokens | tokens | 34278 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 834628 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 86737 |
| `models.costUsd` | Cost | USD | 0.0364 |
| `draft-rounds.tablePoints` | Points of the table | points | 888 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 4 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.0364 USD in 188 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
