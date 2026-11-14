# Run quarry-003

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 61, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T18:54:10.142Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `b59a210cb00f44bc7bf01f2fe7e351e8bbbd48633c9528bac73e100e222a09a9`
- Signed head: `744cbf8dcfa0a866076718af8292740d1cd8583e69c36930e70c61068be7c21d`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 186 |
| `run.toolCalls` | Tool calls |  | 182 |
| `run.toolRefusals` | Refused tool calls |  | 10 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 10 |
| `models.requests` | Model requests |  | 186 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 682 |
| `models.outputTokens` | Output tokens | tokens | 36743 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 940373 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 103570 |
| `models.costUsd` | Cost | USD | 0.04079 |
| `draft-rounds.tablePoints` | Points of the table | points | 1057 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 11 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 10 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04079 USD in 186 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
