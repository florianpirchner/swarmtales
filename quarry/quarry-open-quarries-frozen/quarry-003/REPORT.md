# Run quarry-003

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2,"showResults":true}`
- Seed 47, replicate 0, arm `control` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T21:57:38.301Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `24e00516afef9f3f9238a83fb1f288e90e9f4844149889f3a47ae456c9718f5d`
- Signed head: `e388409ca42adf83a909988ae6889c1cada887141092c1e118864169ff6d95fa`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 182 |
| `run.toolCalls` | Tool calls |  | 181 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 182 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 680 |
| `models.outputTokens` | Output tokens | tokens | 33755 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 768360 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 82701 |
| `models.costUsd` | Cost | USD | 0.03497 |
| `draft-rounds.tablePoints` | Points of the table | points | 961 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 6 |
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

The run: 0.03497 USD in 182 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
