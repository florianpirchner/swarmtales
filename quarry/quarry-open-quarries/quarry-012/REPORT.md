# Run quarry-012

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 43, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:14:16.396Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `3aa0b7da253164eedbbbdfe6d1bf24ff85a74c68d54b68a5c617de2b6dcd2753`
- Signed head: `4fc710996450be45917a9ac9a1445f18b081b3533765ddd31acf8639ca49b61b`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 188 |
| `run.toolCalls` | Tool calls |  | 183 |
| `run.toolRefusals` | Refused tool calls |  | 6 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 6 |
| `models.requests` | Model requests |  | 188 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 694 |
| `models.outputTokens` | Output tokens | tokens | 37018 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 971115 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 106762 |
| `models.costUsd` | Cost | USD | 0.04163 |
| `draft-rounds.tablePoints` | Points of the table | points | 1033 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 6 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04163 USD in 188 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
