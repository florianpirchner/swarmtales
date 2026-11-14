# Run quarry-004

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 31, replicate 4, arm `control` of experiment `quarry-noise-floor`
- Purpose: pilot; started at 2026-11-14T18:34:40.255Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `9a0080461df95dffa3d469e660f5301cc7bdaad02f6c1bc707d999dc6faed0cb`
- Signed head: `195590a81047780da7bac21b944170981a77b2efff475c0a00558341d1f7b258`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 183 |
| `run.toolCalls` | Tool calls |  | 179 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 183 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 684 |
| `models.outputTokens` | Output tokens | tokens | 31305 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 771029 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 80574 |
| `models.costUsd` | Cost | USD | 0.0335 |
| `draft-rounds.tablePoints` | Points of the table | points | 1012 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 4 |
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

The run: 0.0335 USD in 183 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
