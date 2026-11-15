# Run harbor-lights-004

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 109, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:34:16.942Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `bc836dedf8f5168ca1e08c227f9393a34f99a99235295b616dfed3f3e702e64e`
- Signed head: `5a978562a6f7843c4ad3201f2d3c5201afab758e756374d23a85b01225d3a525`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 116 |
| `run.toolCalls` | Tool calls |  | 84 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 4 |
| `run.noCallActivations` | Activations without a call |  | 33 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 116 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 354 |
| `models.outputTokens` | Output tokens | tokens | 54007 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1594199 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 115531 |
| `models.costUsd` | Cost | USD | 0.05742 |
| `hint-towers.score` | Points per game | points | 23 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 1 |
| `NOT_YOUR_TURN` | 4 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 32 | 0.01376 | 3 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01672 | 10 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01244 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.0145 | 8 |

The run: 0.05742 USD in 116 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
