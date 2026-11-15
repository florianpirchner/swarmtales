# Run harbor-lights-012

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 112, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:57:18.127Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `fe6d99e0e71f90ce6ddf7734eec3c83c36b2eb7004aa7628cbe9fc94bb054fd9`
- Signed head: `de8ef11a34531e7b2e70b3e67be238f93281e6d631b09fe6a8612d308316ddc4`

## Result

The run ended at tick 7: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 129 |
| `run.toolCalls` | Tool calls |  | 76 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 3 |
| `run.noCallActivations` | Activations without a call |  | 54 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 129 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 384 |
| `models.outputTokens` | Output tokens | tokens | 63179 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1824060 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 116775 |
| `models.costUsd` | Cost | USD | 0.06447 |
| `hint-towers.score` | Points per game | points | 18 |
| `hint-towers.misfires` | Misfires |  | 2 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 1 |
| `NOT_YOUR_TURN` | 3 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.01572 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 34 | 0.01788 | 14 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01308 | 13 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 32 | 0.01778 | 14 |

The run: 0.06447 USD in 129 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
