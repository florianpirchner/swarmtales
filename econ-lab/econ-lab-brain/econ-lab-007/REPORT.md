# Run econ-lab-007

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 41, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T19:54:49.472Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `d66c4e6b2c12ae3eb5b4de7231ce1afac22894203d210398286f89683f1f1380`
- Signed head: `219769d8467ab23387e4866ac70ea86a8ce82f7f7ebd8f47a78017ca81c86334`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 129 |
| `run.toolCalls` | Tool calls |  | 116 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 129 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 454 |
| `models.outputTokens` | Output tokens | tokens | 21074 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 385386 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 53772 |
| `models.costUsd` | Cost | USD | 0.02116 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.05 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.25 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.018 |
| `econ-games.tablePoints` | Points of the table | points | 426 |
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

The run: 0.02116 USD in 129 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
