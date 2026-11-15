# Run harbor-lights-021

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 108, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T08:21:40.521Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `4e1f6d351b57c6d632013d2b65eb254f483515529a7f20e109fd6c6bdfd8ac52`
- Signed head: `aa027b1cd22e62ba1a12f119cd97bc84146788c1df538d53d74d6a2ff52992c7`

## Result

The run ended at tick 5: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 5 |
| `run.activations` | Activations |  | 105 |
| `run.toolCalls` | Tool calls |  | 71 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 35 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 105 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 332 |
| `models.outputTokens` | Output tokens | tokens | 43481 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1195653 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 94443 |
| `models.costUsd` | Cost | USD | 0.04554 |
| `hint-towers.score` | Points per game | points | 22 |
| `hint-towers.misfires` | Misfires |  | 1 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.01455 | 7 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 24 | 0.006923 | 9 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.01318 | 10 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01088 | 9 |

The run: 0.04554 USD in 105 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
