# Run quarry-014

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":true,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2,"showResults":true}`
- Seed 41, replicate 0, arm `open-frozen` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T22:20:14.471Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `cb61b851d622d8cb9e42cfddf6e9a8e92e4f9ef2b87dbdcdef83b444c5f26446`
- Signed head: `4e60dd84ff2aed4ab3e5c22fbb71c2f02648419730faed62309cd6f95abb9dfc`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 187 |
| `run.toolCalls` | Tool calls |  | 182 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 4 |
| `models.requests` | Model requests |  | 187 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 692 |
| `models.outputTokens` | Output tokens | tokens | 37319 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 967659 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 107316 |
| `models.costUsd` | Cost | USD | 0.04182 |
| `draft-rounds.tablePoints` | Points of the table | points | 989 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 4 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04182 USD in 187 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
