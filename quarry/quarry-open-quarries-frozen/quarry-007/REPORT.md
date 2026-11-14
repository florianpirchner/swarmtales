# Run quarry-007

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2,"showResults":true}`
- Seed 41, replicate 0, arm `control` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T22:04:54.670Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `14c9de8ac2f26e904c1c9caf8befc74b138eb422a91b40b62413521ee0924560`
- Signed head: `1a0035212fe782321857b1a534056fac50c3134c533c6a7026e58c68112926cc`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 187 |
| `run.toolCalls` | Tool calls |  | 181 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 187 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 698 |
| `models.outputTokens` | Output tokens | tokens | 32009 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 787999 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 82853 |
| `models.costUsd` | Cost | USD | 0.03431 |
| `draft-rounds.tablePoints` | Points of the table | points | 855 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 4 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 3 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.03431 USD in 187 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
