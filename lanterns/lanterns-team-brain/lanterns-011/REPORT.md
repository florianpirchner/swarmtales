# Run lanterns-011

- Game: `lanterns` (Lanterns), params `{"brain":false,"games":4,"maxClues":5,"maxWords":200}`
- Seed 97, replicate 0, arm `nobrain` of experiment `lanterns-team-brain`
- Purpose: confirmatory; started at 2026-11-15T09:31:34.182Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `73e72b896d364f76f60ec50be225c6787718582761e311f2e350cab5528296f9`
- Signed head: `13664f8eb2c070f28396438defdd82752400236e83d5b607c7135644a5710002`

## Result

The run ended at tick 14: limit (clue-grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 14 |
| `run.activations` | Activations |  | 227 |
| `run.toolCalls` | Tool calls |  | 204 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.POST_CAP` | Refusals with POST_CAP |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 70 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 227 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 24 |
| `models.inputTokens` | Input tokens | tokens | 822 |
| `models.outputTokens` | Output tokens | tokens | 50594 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1111118 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 169494 |
| `models.costUsd` | Cost | USD | 0.05768 |
| `clue-grid.recall` | Recall per team and game |  | 0.7494 |
| `clue-grid.precision` | Precision per team and game |  | 0.8216 |
| `clue-grid.recallLater` | Recall per team and game, from game 2 on |  | 0.7562 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `POST_CAP` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.009064 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 42 | 0.009658 | 12 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 33 | 0.009206 | 11 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 41 | 0.01087 | 13 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 37 | 0.009344 | 11 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 41 | 0.009538 | 11 |

The run: 0.05768 USD in 227 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
