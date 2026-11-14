# Run quarry-001

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":false,"packSize":6,"packs":2}`
- Seed 31, replicate 2, arm `control` of experiment `quarry-noise-floor`
- Purpose: pilot; started at 2026-11-14T18:30:04.268Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `83fff728323ac68e5f5f9cdc9e642b8b906ce94889fb9278418f5343e26bea21`
- Signed head: `8288bfc9351098cafcccf08c77d3cb5bc17cd09188b02621c8fa0f220c05102c`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 188 |
| `run.toolCalls` | Tool calls |  | 186 |
| `run.toolRefusals` | Refused tool calls |  | 6 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 6 |
| `models.requests` | Model requests |  | 188 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 692 |
| `models.outputTokens` | Output tokens | tokens | 32626 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 805715 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 84097 |
| `models.costUsd` | Cost | USD | 0.03495 |
| `draft-rounds.tablePoints` | Points of the table | points | 995 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 2 |
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

The run: 0.03495 USD in 188 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
