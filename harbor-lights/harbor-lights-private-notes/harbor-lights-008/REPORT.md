# Run harbor-lights-008

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 107, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:46:32.242Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7577b00641995cd5110055a1f3c368866254b1a1736654d469c9a2d0f9c037c2`
- Signed head: `645c66b5eb7b35fe2c4bc04abded67b62f88b5ad6eb7b46a29ab84cb8352f28a`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 100 |
| `run.toolCalls` | Tool calls |  | 53 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.TOUCHES_NOTHING` | Refusals with TOUCHES_NOTHING |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 47 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 100 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 304 |
| `models.outputTokens` | Output tokens | tokens | 49601 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1429869 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 98644 |
| `models.costUsd` | Cost | USD | 0.05146 |
| `hint-towers.score` | Points per game | points | 22 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `TOUCHES_NOTHING` | 1 |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.01586 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.013 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01146 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01113 | 11 |

The run: 0.05146 USD in 100 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
