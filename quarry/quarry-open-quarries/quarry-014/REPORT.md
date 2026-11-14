# Run quarry-014

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 59, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:19:40.836Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `63603d77bc233f9954913fe0e181c80f2e6d85e587d1f4012b0d675186933473`
- Signed head: `5a1f17ddbb141532497f6b869e2b68261d5eb05c09d3d29269ea359d65bfae2b`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 189 |
| `run.toolCalls` | Tool calls |  | 187 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `models.requests` | Model requests |  | 189 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 702 |
| `models.outputTokens` | Output tokens | tokens | 33694 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 833742 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 86512 |
| `models.costUsd` | Cost | USD | 0.03607 |
| `draft-rounds.tablePoints` | Points of the table | points | 970 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 2 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.03607 USD in 189 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
