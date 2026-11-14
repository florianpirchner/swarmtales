# Run quarry-007

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 73, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:02:57.219Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `d3e8a27198a8917bd903155c5aa0e0fa2fe9e0493a8e2fab403ec1292bf3c3c7`
- Signed head: `53f1c74649dd27c7dddea631e3016b02c7feb16761c5b27678a24aa5296ce173`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 187 |
| `run.toolCalls` | Tool calls |  | 186 |
| `run.toolRefusals` | Refused tool calls |  | 7 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 7 |
| `models.requests` | Model requests |  | 187 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 690 |
| `models.outputTokens` | Output tokens | tokens | 36621 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 989369 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 107314 |
| `models.costUsd` | Cost | USD | 0.04169 |
| `draft-rounds.tablePoints` | Points of the table | points | 1006 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 0 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 7 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04169 USD in 187 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
