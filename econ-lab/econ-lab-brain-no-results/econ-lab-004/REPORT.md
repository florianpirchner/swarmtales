# Run econ-lab-004

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false,"showResults":false}`
- Seed 46, replicate 0, arm `brain` of experiment `econ-lab-brain-no-results`
- Purpose: exploratory; started at 2026-11-14T22:28:50.166Z
- Kernel: runtime revision 3, version 0.0.0, commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `112c12f73b398ef3865dabc8bcba481f32c3a8ea7070cdcb94e33412259f71d1`
- Signed head: `c7929fcc982015a980b2c0d45412799ca962658b31fd6cb52947f08c56794ddb`

## Result

The run ended at tick 9: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 9 |
| `run.activations` | Activations |  | 123 |
| `run.toolCalls` | Tool calls |  | 112 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 123 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 432 |
| `models.outputTokens` | Output tokens | tokens | 19628 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 339772 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 47583 |
| `models.costUsd` | Cost | USD | 0.0192 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.2 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.5 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0 |
| `econ-games.tablePoints` | Points of the table | points | 430 |
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

The run: 0.0192 USD in 123 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
