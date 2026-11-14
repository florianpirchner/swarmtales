# Run quarry-009

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 37, replicate 0, arm `control` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:07:53.064Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `8c5ba9279d080bc5292b7e24ee5c8db54473f0a50a466773410c48b9a9c06382`
- Signed head: `77d337fcfc91f3b466fa096d881ed9e54498d4b6a7d47df31348b87331e6800b`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 191 |
| `run.toolCalls` | Tool calls |  | 193 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `models.requests` | Model requests |  | 191 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 706 |
| `models.outputTokens` | Output tokens | tokens | 33603 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 864345 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 87489 |
| `models.costUsd` | Cost | USD | 0.03645 |
| `draft-rounds.tablePoints` | Points of the table | points | 899 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 3 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.03645 USD in 191 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
