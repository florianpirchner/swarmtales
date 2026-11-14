# Run quarry-001

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 31, replicate 0
- Purpose: pilot; started at 2026-11-14T18:23:06.853Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `1a377825450f50942e6afa918e5cbf38c7e2c0022f83b784a0a23a8a396a9532`
- Signed head: `97e3fa9300d2d4f398a0bfca4f6e7fb0f1c07a9601e8eb4ee8f57882c128a3bf`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 184 |
| `run.toolCalls` | Tool calls |  | 178 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 184 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 686 |
| `models.outputTokens` | Output tokens | tokens | 31038 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 755266 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 84665 |
| `models.costUsd` | Cost | USD | 0.03372 |
| `draft-rounds.tablePoints` | Points of the table | points | 1071 |
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

The run: 0.03372 USD in 184 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
