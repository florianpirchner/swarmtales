# Run quarry-008

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"frozenHands":true,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2,"showResults":true}`
- Seed 47, replicate 0, arm `open-frozen` of experiment `quarry-open-quarries-frozen`
- Purpose: exploratory; started at 2026-11-14T22:04:54.721Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `4e4f4fa7c5fb0c99eb9a055713c4dfd8e2182d748ecdbedb10afefab03727dcd`
- Signed head: `00b9d0f40ba8c44786e6b86d77c75bc9d9d27a212fef43f5b3cc32b123f82d0e`

## Result

The run ended at tick 13: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 13 |
| `run.activations` | Activations |  | 190 |
| `run.toolCalls` | Tool calls |  | 185 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 5 |
| `models.requests` | Model requests |  | 190 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 704 |
| `models.outputTokens` | Output tokens | tokens | 40760 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1018333 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 113667 |
| `models.costUsd` | Cost | USD | 0.04484 |
| `draft-rounds.tablePoints` | Points of the table | points | 1085 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 0 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 5 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04484 USD in 190 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
