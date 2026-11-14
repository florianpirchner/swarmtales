# Run quarry-019

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 47, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:32:29.671Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `8d960181345c39b8fdde0f85688da2333cb241de6e86d1ad82b3a9639fe2494e`
- Signed head: `7ab2a1c6a12007320f2e00f2073b290a2367a1bef5f4a161c7dff557e1499863`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 180 |
| `run.toolCalls` | Tool calls |  | 173 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `models.requests` | Model requests |  | 180 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 672 |
| `models.outputTokens` | Output tokens | tokens | 33793 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 875009 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 100041 |
| `models.costUsd` | Cost | USD | 0.03822 |
| `draft-rounds.tablePoints` | Points of the table | points | 1120 |
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

The run: 0.03822 USD in 180 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
