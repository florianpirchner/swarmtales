# Run quarry-015

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 31, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:23:15.729Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `bc078aa0d2c70cd49dc416fe58209f25f20f8787214c84472311f5163add5502`
- Signed head: `83c2a1807c493421669938ea1cd02721c74f2f6643ef02c8dd9c6e973a451e81`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 183 |
| `run.toolCalls` | Tool calls |  | 177 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `models.requests` | Model requests |  | 183 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 684 |
| `models.outputTokens` | Output tokens | tokens | 30538 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 757658 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 79034 |
| `models.costUsd` | Cost | USD | 0.03279 |
| `draft-rounds.tablePoints` | Points of the table | points | 1020 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 2 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.03279 USD in 183 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
