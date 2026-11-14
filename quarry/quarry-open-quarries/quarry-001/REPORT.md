# Run quarry-001

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 73, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T18:49:45.403Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `54f3774669752da9f66b163942b1c971918b268ab1e6b19eb54189fe969a365e`
- Signed head: `dc7a7a0ff7973e9334af818a007f46cd27fba6a0be1fc778d457e60770037962`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 187 |
| `run.toolCalls` | Tool calls |  | 181 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `models.requests` | Model requests |  | 187 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 698 |
| `models.outputTokens` | Output tokens | tokens | 29948 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 780735 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 84544 |
| `models.costUsd` | Cost | USD | 0.03342 |
| `draft-rounds.tablePoints` | Points of the table | points | 974 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 5 |
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

The run: 0.03342 USD in 187 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
