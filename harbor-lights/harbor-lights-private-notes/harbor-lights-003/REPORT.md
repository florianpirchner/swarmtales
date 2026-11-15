# Run harbor-lights-003

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 105, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:28:34.184Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `3bcd93278a19389739262a7371ab66d1ac9b6eb12fbd580fa2339ea70d356d16`
- Signed head: `3cbbf2178f0b2ed165aa652dd2bab65f8fc83d9a6eec44292b2ee16273322fe0`

## Result

The run ended at tick 6: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 6 |
| `run.activations` | Activations |  | 122 |
| `run.toolCalls` | Tool calls |  | 69 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.TOUCHES_NOTHING` | Refusals with TOUCHES_NOTHING |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 54 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 122 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 374 |
| `models.outputTokens` | Output tokens | tokens | 56735 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1672016 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 115108 |
| `models.costUsd` | Cost | USD | 0.05951 |
| `hint-towers.score` | Points per game | points | 19 |
| `hint-towers.misfires` | Misfires |  | 2 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `TOUCHES_NOTHING` | 1 |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 32 | 0.01793 | 14 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.01145 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 32 | 0.01832 | 15 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 31 | 0.01182 | 13 |

The run: 0.05951 USD in 122 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
