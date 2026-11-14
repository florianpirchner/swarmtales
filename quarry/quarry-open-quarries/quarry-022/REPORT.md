# Run quarry-022

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 41, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:37:47.506Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `b3085f5927dcd0e7fddaed2d07178f513e7b830c7155e0e939c3552ab25b56f7`
- Signed head: `29e5ae5da48c4c1d129c7812ad81ce14d994f2a5c0c206e4068feb4dea03d664`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 184 |
| `run.toolCalls` | Tool calls |  | 181 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 184 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 686 |
| `models.outputTokens` | Output tokens | tokens | 32237 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 769381 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 81896 |
| `models.costUsd` | Cost | USD | 0.03412 |
| `draft-rounds.tablePoints` | Points of the table | points | 863 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 6 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 2 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.03412 USD in 184 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
