# Run harbor-lights-019

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 110, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:15:35.927Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `22bdab518ac8e44980173fddc996e8aa76a5cc4f8c39d9e1dfc179eba6f169c8`
- Signed head: `f09b00f7a2de7318456a7195c256dcaac72cc1bbb5456e6059de55781fae7537`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 113 |
| `run.toolCalls` | Tool calls |  | 73 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 4 |
| `run.noCallActivations` | Activations without a call |  | 41 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 113 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 346 |
| `models.outputTokens` | Output tokens | tokens | 55301 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1496973 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 112936 |
| `models.costUsd` | Cost | USD | 0.05677 |
| `hint-towers.score` | Points per game | points | 17 |
| `hint-towers.misfires` | Misfires |  | 3 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 4 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.0105 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 29 | 0.01467 | 9 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01114 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.02046 | 8 |

The run: 0.05677 USD in 113 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
