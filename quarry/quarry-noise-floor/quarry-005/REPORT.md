# Run quarry-005

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 31, replicate 0, arm `control` of experiment `quarry-noise-floor`
- Purpose: pilot; started at 2026-11-14T18:39:02.047Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `47483698f547037cd6ca0896ce01ffa95005c6bd717efa9c86a572146eb1aa01`
- Signed head: `9912f51fb693f041527d2ebb2a7cd56770873d3a192051e33e92f4cb3ac3d8b9`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 183 |
| `run.toolCalls` | Tool calls |  | 177 |
| `run.toolRefusals` | Refused tool calls |  | 6 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 6 |
| `models.requests` | Model requests |  | 183 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 678 |
| `models.outputTokens` | Output tokens | tokens | 32054 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 751029 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 78752 |
| `models.costUsd` | Cost | USD | 0.03345 |
| `draft-rounds.tablePoints` | Points of the table | points | 1151 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 0 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 6 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.03345 USD in 183 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
