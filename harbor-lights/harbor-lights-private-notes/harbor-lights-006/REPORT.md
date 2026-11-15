# Run harbor-lights-006

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 109, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:40:21.571Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `636b3cfbeebaff3118592fbca75f95e8a9e50ce1b48bbaa468f4b03848ea9c60`
- Signed head: `2eb5890fcaef334c0226e86881cbc087fe3f0cd457f9de4414dbe8ac6894e683`

## Result

The run ended at tick 4: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 4 |
| `run.activations` | Activations |  | 98 |
| `run.toolCalls` | Tool calls |  | 59 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 39 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 98 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 310 |
| `models.outputTokens` | Output tokens | tokens | 59719 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1611777 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 115814 |
| `models.costUsd` | Cost | USD | 0.06049 |
| `hint-towers.score` | Points per game | points | 10 |
| `hint-towers.misfires` | Misfires |  | 3 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 30 | 0.01926 | 11 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 21 | 0.00954 | 9 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01625 | 11 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 21 | 0.01544 | 8 |

The run: 0.06049 USD in 98 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
