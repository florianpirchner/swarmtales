# Run harbor-lights-018

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 104, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:13:53.092Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `4eb0745d70cef477eaaed68084d31933cd7ed9224d9396d45a38b8ccc6179f74`
- Signed head: `8eb823b8e9b6502314a1652fb0270e1108bba77c3a4c4d443640fb58cedde4fd`

## Result

The run ended at tick 4: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 4 |
| `run.activations` | Activations |  | 98 |
| `run.toolCalls` | Tool calls |  | 53 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 45 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 98 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 298 |
| `models.outputTokens` | Output tokens | tokens | 49255 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1341927 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 97293 |
| `models.costUsd` | Cost | USD | 0.05024 |
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
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01183 | 11 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.01354 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.01591 | 10 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.008952 | 12 |

The run: 0.05024 USD in 98 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
