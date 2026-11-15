# Run harbor-lights-009

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 111, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:46:59.104Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a981a49bdcc938b7681939b45e68666e65f13950a6bf5242a4dc83077cc3aae0`
- Signed head: `069a9b6b3a4ddea92e168ef808a1726850341ba31c464d54f7b4909f57d4912d`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 114 |
| `run.toolCalls` | Tool calls |  | 72 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.TOUCHES_NOTHING` | Refusals with TOUCHES_NOTHING |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 43 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 114 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 352 |
| `models.outputTokens` | Output tokens | tokens | 44902 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1352690 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 103857 |
| `models.costUsd` | Cost | USD | 0.049 |
| `hint-towers.score` | Points per game | points | 20 |
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
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01207 | 8 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01023 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01572 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01098 | 12 |

The run: 0.049 USD in 114 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
