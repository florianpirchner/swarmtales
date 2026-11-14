# Run quarry-023

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 67, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:41:39.910Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a1e466ff9d874a7749347512bd460dac575a250ecf1d310faceca1e72246d9be`
- Signed head: `e982e74a0f13e34f5751f10dc0ac1e4599e7f4e9427be14514d546be4466f03d`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 187 |
| `run.toolCalls` | Tool calls |  | 184 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 187 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 698 |
| `models.outputTokens` | Output tokens | tokens | 32510 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 817043 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 84673 |
| `models.costUsd` | Cost | USD | 0.03508 |
| `draft-rounds.tablePoints` | Points of the table | points | 841 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 5 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

none

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.03508 USD in 187 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
