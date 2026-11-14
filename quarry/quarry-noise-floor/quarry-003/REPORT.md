# Run quarry-003

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 31, replicate 3, arm `control` of experiment `quarry-noise-floor`
- Purpose: pilot; started at 2026-11-14T18:34:35.142Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `b63c0b9aef79d8ff4d14ae554b1e7eeef296cf226ddb77b3d54cd6470354674c`
- Signed head: `54422b202e11b05a3b7fb61479157c1663ff2fc18808b327c1734873f6d098e8`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 185 |
| `run.toolCalls` | Tool calls |  | 177 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 185 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 686 |
| `models.outputTokens` | Output tokens | tokens | 31192 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 764013 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 79557 |
| `models.costUsd` | Cost | USD | 0.03325 |
| `draft-rounds.tablePoints` | Points of the table | points | 1170 |
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

The run: 0.03325 USD in 185 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
