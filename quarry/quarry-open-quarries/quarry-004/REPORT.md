# Run quarry-004

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 79, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T18:54:15.291Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `47086c14e28d540e0c1976c28c060dd30b2bffcf0eee53dd7f89990f17fe9b01`
- Signed head: `81db9529f55d5599544668ff0fe8f91c928e0b9712aa9d6f39f3ecaada0c18eb`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 189 |
| `run.toolCalls` | Tool calls |  | 187 |
| `run.toolRefusals` | Refused tool calls |  | 9 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 9 |
| `models.requests` | Model requests |  | 189 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 694 |
| `models.outputTokens` | Output tokens | tokens | 38717 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 993458 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 109845 |
| `models.costUsd` | Cost | USD | 0.04309 |
| `draft-rounds.tablePoints` | Points of the table | points | 933 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 4 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 11 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 9 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04309 USD in 189 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
