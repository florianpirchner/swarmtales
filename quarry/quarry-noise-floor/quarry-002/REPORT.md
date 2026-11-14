# Run quarry-002

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 31, replicate 1, arm `control` of experiment `quarry-noise-floor`
- Purpose: pilot; started at 2026-11-14T18:30:04.288Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7a7ca89b88734c8b4993bafe232f045651bb07af68d098d0b9990935376e7b5a`
- Signed head: `d0ce54ea694394695b53c537d3ff9cbe29cd6b29765e03803d778894adae349a`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 191 |
| `run.toolCalls` | Tool calls |  | 187 |
| `run.toolRefusals` | Refused tool calls |  | 7 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 7 |
| `models.requests` | Model requests |  | 191 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 706 |
| `models.outputTokens` | Output tokens | tokens | 33999 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 850822 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 86461 |
| `models.costUsd` | Cost | USD | 0.03639 |
| `draft-rounds.tablePoints` | Points of the table | points | 1112 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
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

The run: 0.03639 USD in 191 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
