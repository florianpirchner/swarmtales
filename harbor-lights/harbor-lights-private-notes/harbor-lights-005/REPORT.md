# Run harbor-lights-005

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 111, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:34:49.396Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `f1f948fb3d2baf49846f5533015f259ec98f33c733def338ae38b2789d1ba407`
- Signed head: `226e1b468421d84889882fb499f569d0dc3c656505f221bc02cacca00b464f74`

## Result

The run ended at tick 4: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 4 |
| `run.activations` | Activations |  | 99 |
| `run.toolCalls` | Tool calls |  | 55 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 44 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 99 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 306 |
| `models.outputTokens` | Output tokens | tokens | 52871 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1379211 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 105932 |
| `models.costUsd` | Cost | USD | 0.0535 |
| `hint-towers.score` | Points per game | points | 22 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 23 | 0.0122 | 9 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01324 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01537 | 13 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01269 | 11 |

The run: 0.0535 USD in 99 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
