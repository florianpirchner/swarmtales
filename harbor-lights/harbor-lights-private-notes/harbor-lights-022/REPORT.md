# Run harbor-lights-022

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 103, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:24:14.936Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `01cba64ffc83c2915f98f19a4e0058693c1d1fcd66bb0109d2ef7e3372e536ac`
- Signed head: `e068d0520cd243d32a405834b5c1c0b17dec68b757452f6230c34a7f641fd73a`

## Result

The run ended at tick 6: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 6 |
| `run.activations` | Activations |  | 121 |
| `run.toolCalls` | Tool calls |  | 69 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 53 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 121 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 364 |
| `models.outputTokens` | Output tokens | tokens | 50548 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1472591 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 102057 |
| `models.costUsd` | Cost | USD | 0.05279 |
| `hint-towers.score` | Points per game | points | 25 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 31 | 0.01281 | 14 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 31 | 0.01095 | 13 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01648 | 13 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 31 | 0.01255 | 13 |

The run: 0.05279 USD in 121 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
