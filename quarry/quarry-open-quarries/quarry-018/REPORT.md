# Run quarry-018

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 53, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:29:31.967Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `2c6ca150c4c6cbdc8d184ad621b61c77fff7c1cba9d6487646ecfbf25476e60c`
- Signed head: `b2eec2596fb0cab87b7d915c07bd02b162e1adaeec570d67775ec7d2b90a54d7`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 181 |
| `run.toolCalls` | Tool calls |  | 173 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 181 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 674 |
| `models.outputTokens` | Output tokens | tokens | 30688 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 731517 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 77299 |
| `models.costUsd` | Cost | USD | 0.03239 |
| `draft-rounds.tablePoints` | Points of the table | points | 917 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 6 |
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

The run: 0.03239 USD in 181 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
