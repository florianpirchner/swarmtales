# Run quarry-002

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 43, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T18:49:45.430Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `98c4469097a4f4b9a629a3e354851d6b47fc7bf1005ce4606e3eee700bf34c3e`
- Signed head: `d2e2fd0d724e184796e03ce7c3306375da48b144f85c153884d5617f5b8f53d0`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 187 |
| `run.toolCalls` | Tool calls |  | 184 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 187 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 694 |
| `models.outputTokens` | Output tokens | tokens | 33236 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 805585 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 87639 |
| `models.costUsd` | Cost | USD | 0.0357 |
| `draft-rounds.tablePoints` | Points of the table | points | 994 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 4 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 1 |
| `BRAIN_TOO_LONG` | 3 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.0357 USD in 187 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
