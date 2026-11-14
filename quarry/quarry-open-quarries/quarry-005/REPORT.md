# Run quarry-005

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 71, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T18:58:49.511Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `59fd180f34c39cf47c7d1472830006e15765f5e40300e62211a307e34be94812`
- Signed head: `9ba8483db2f3fc39b30eff5ca7c170d0a75ca09ca6e22057bb41248d8a4160ab`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 180 |
| `run.toolCalls` | Tool calls |  | 175 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 180 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 672 |
| `models.outputTokens` | Output tokens | tokens | 29923 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 721319 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 76858 |
| `models.costUsd` | Cost | USD | 0.03185 |
| `draft-rounds.tablePoints` | Points of the table | points | 1061 |
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

The run: 0.03185 USD in 180 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
