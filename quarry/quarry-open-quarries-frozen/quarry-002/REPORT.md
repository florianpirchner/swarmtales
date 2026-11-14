# Run quarry-002

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":true,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2,"showResults":true}`
- Seed 53, replicate 0, arm `open-frozen` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T21:52:44.318Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7a221e6cb6e8728b7ae72325704ec798b87685e5d37494424cca72fb0d4b6993`
- Signed head: `36e13d132ea01ed51843f561246ed760882ae6e9b6fd683112c858bcf0c0d357`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 187 |
| `run.toolCalls` | Tool calls |  | 182 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 5 |
| `models.requests` | Model requests |  | 187 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 692 |
| `models.outputTokens` | Output tokens | tokens | 36516 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 960832 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 109070 |
| `models.costUsd` | Cost | USD | 0.04157 |
| `draft-rounds.tablePoints` | Points of the table | points | 917 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 0 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 5 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04157 USD in 187 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
