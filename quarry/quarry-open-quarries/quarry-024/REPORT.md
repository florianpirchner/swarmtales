# Run quarry-024

- Game: `quarry` (Quarry), params `{"brain":true,"burns":false,"games":3,"maxWords":150,"openHands":true,"packSize":6,"packs":2}`
- Seed 71, replicate 0, arm `open` of experiment `quarry-open-quarries`
- Purpose: confirmatory; started at 2026-11-14T19:42:40.098Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7fd01ef6ed6d912bfee23734c8efff5ac931a33af9eb6fcc8996e3988babc676`
- Signed head: `80eb617bc45e85c93beeaac02fedcc797946e04e382ae1848083449f72e89e7a`

## Result

The run ended at tick 12: limit (draft-rounds.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 12 |
| `run.activations` | Activations |  | 190 |
| `run.toolCalls` | Tool calls |  | 191 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 4 |
| `models.requests` | Model requests |  | 190 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 702 |
| `models.outputTokens` | Output tokens | tokens | 37832 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1028334 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 111704 |
| `models.costUsd` | Cost | USD | 0.04323 |
| `draft-rounds.tablePoints` | Points of the table | points | 1204 |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games |  | 0 |
| `draft-rounds.decisions` | Picks |  | 144 |
| `draft-rounds.missedPicks` | Picks not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 4 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.04323 USD in 190 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
