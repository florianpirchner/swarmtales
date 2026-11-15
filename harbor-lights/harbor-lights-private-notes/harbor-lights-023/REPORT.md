# Run harbor-lights-023

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 106, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:26:40.459Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `579d56ffcf6fa4dbaef5c151268a8b18f839384212feee5c0dc4497bcb498586`
- Signed head: `b576d6c56a94de9b00d7b2e571301788cf3a2e4fe19ad31878099ad11f880b24`

## Result

The run ended at tick 6: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 6 |
| `run.activations` | Activations |  | 115 |
| `run.toolCalls` | Tool calls |  | 70 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 47 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 115 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 354 |
| `models.outputTokens` | Output tokens | tokens | 48997 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1392152 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 101755 |
| `models.costUsd` | Cost | USD | 0.05117 |
| `hint-towers.score` | Points per game | points | 21 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 32 | 0.01468 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01144 | 13 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01229 | 10 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01276 | 11 |

The run: 0.05117 USD in 115 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
