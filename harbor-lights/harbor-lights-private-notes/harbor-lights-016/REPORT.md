# Run harbor-lights-016

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"nobrain","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 110, replicate 0, arm `nobrain` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:09:33.459Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `b0ade41a1c7fb8a89dfd44f5e1f7778b95daac02b12960bc54e6b609258aad3d`
- Signed head: `885edea33caea7b0f3af670cde9a6983f51da4d8dc8c5ff9043ffce009dc1312`

## Result

The run ended at tick 4: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 4 |
| `run.activations` | Activations |  | 88 |
| `run.toolCalls` | Tool calls |  | 51 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `run.noCallActivations` | Activations without a call |  | 37 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 88 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 276 |
| `models.outputTokens` | Output tokens | tokens | 41433 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1080563 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 87999 |
| `models.costUsd` | Cost | USD | 0.04255 |
| `hint-towers.score` | Points per game | points | 18 |
| `hint-towers.misfires` | Misfires |  | 3 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.01031 | 10 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 21 | 0.01019 | 8 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 22 | 0.01056 | 10 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 21 | 0.01149 | 9 |

The run: 0.04255 USD in 88 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
