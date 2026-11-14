# Run quarry-013

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 47, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:18:02.396Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `238d652788ebc422aff54e868fd163b3a68d2f00c24a34a9e43fe44482c8b6b9`
- Signed head: `2105dc259e58a8fbf3ab9e5cf602758367f323de18de073be00da09f24d9b4e4`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 190 |
| `run.toolCalls` | Tool calls |  | 187 |
| `run.toolRefusals` | Refused tool calls |  | 6 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 6 |
| `models.requests` | Model requests |  | 190 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 700 |
| `models.outputTokens` | Output tokens | tokens | 34524 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 838505 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 85663 |
| `models.costUsd` | Cost | USD | 0.03642 |
| `draft-rounds.tablePoints` | Points of the table | points | 988 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 6 |
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

The run: 0.03642 USD in 190 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
