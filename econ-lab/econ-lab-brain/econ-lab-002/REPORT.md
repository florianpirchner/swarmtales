# Run econ-lab-002

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 50, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T19:48:00.361Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `82c6d24a3d16d1cbc8007175baa89f9959ee3f7832058e97dec959889c1a44b0`
- Signed head: `4fcbf032ec21cf155f2982266784483c973ccc02f8f8b1dca635f69ce87a72c8`

## Result

The run ended at tick 9: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 9 |
| `run.activations` | Activations |  | 128 |
| `run.toolCalls` | Tool calls |  | 123 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 128 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 446 |
| `models.outputTokens` | Output tokens | tokens | 21219 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 380094 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 57961 |
| `models.costUsd` | Cost | USD | 0.0217 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.3 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.75 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.021 |
| `econ-games.tablePoints` | Points of the table | points | 439.6 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 2 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.0217 USD in 128 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
