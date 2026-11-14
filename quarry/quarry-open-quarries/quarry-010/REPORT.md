# Run quarry-010

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 41, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:08:33.517Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `659ef862bf050726019c5d4751ba71684a79019bd1bddb370844c766c563fdbd`
- Signed head: `cc6ca7eb7326c2a7784e685373d66d0005401b0c7c3158d2adb0b5c48188bbab`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 190 |
| `run.toolCalls` | Tool calls |  | 186 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `models.requests` | Model requests |  | 190 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 704 |
| `models.outputTokens` | Output tokens | tokens | 38618 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1026586 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 112063 |
| `models.costUsd` | Cost | USD | 0.04365 |
| `draft-rounds.tablePoints` | Points of the table | points | 1019 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04365 USD in 190 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
