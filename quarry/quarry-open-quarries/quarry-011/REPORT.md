# Run quarry-011

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 53, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:12:37.861Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `c0e7ee56690a0528f1e5fed0b6df456af6db99c4a47511e827aa139686ada092`
- Signed head: `58499c9a4686c55907e2c87911b8a14aa2a1fb3a6d155b0011d1ad6f58860598`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 191 |
| `run.toolCalls` | Tool calls |  | 193 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 191 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 706 |
| `models.outputTokens` | Output tokens | tokens | 39095 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1061111 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 114451 |
| `models.costUsd` | Cost | USD | 0.04454 |
| `draft-rounds.tablePoints` | Points of the table | points | 986 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
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

The run: 0.04454 USD in 191 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
