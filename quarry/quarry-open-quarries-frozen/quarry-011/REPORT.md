# Run quarry-011

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":true,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2,"showResults":true}`
- Seed 43, replicate 0, arm `open-frozen` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T22:15:04.433Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `73d21405a56e9a8e3a08d0f82c68696c9c7cd538e8c554e6f4b538030e0e3f34`
- Signed head: `51240e881f41c97a4b40ddcdd46c4be84ac98a78cf258dd7ec6a1d6c9f898851`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 190 |
| `run.toolCalls` | Tool calls |  | 188 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 190 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 704 |
| `models.outputTokens` | Output tokens | tokens | 34926 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1007297 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 107850 |
| `models.costUsd` | Cost | USD | 0.04109 |
| `draft-rounds.tablePoints` | Points of the table | points | 1024 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 0 |
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

The run: 0.04109 USD in 190 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
