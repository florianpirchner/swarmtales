# Run quarry-006

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 37, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T18:59:26.282Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `1e2437db78a09c6306412be050283b381219006bc45f221a04940982c978c23e`
- Signed head: `19e86efe5a57f6bd69a5b9e44b73ef27487d58eb098f3c86c73cefc16f7267aa`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 187 |
| `run.toolCalls` | Tool calls |  | 181 |
| `run.toolRefusals` | Refused tool calls |  | 6 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 6 |
| `models.requests` | Model requests |  | 187 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 692 |
| `models.outputTokens` | Output tokens | tokens | 35589 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 957044 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 104364 |
| `models.costUsd` | Cost | USD | 0.04048 |
| `draft-rounds.tablePoints` | Points of the table | points | 918 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 0 |
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

The run: 0.04048 USD in 187 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
