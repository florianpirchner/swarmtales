# Run quarry-020

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 79, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:33:40.663Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `63a7a99903ccd956538c61889d08dfd7963cd8cb79d9bd0faf8196f1c1b42b96`
- Signed head: `071dd7681097ec4c46551ae00597b45821a8cd37322eab9154d8b482a27b1520`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 180 |
| `run.toolCalls` | Tool calls |  | 176 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 180 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 672 |
| `models.outputTokens` | Output tokens | tokens | 29719 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 722540 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 77476 |
| `models.costUsd` | Cost | USD | 0.03184 |
| `draft-rounds.tablePoints` | Points of the table | points | 870 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 7 |
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

The run: 0.03184 USD in 180 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
