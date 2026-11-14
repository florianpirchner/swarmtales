# Run econ-lab-008

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 52, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T19:55:22.704Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `039272c7300a5e0c8b80c2c88e3fd434c4ab4bdb58f634d2b8911ea291731ceb`
- Signed head: `702b886426c11b23eaf6b2dfdacf1d11227eb56eda7c59f1f80b720caaf03f90`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 131 |
| `run.toolCalls` | Tool calls |  | 118 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `models.requests` | Model requests |  | 131 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 460 |
| `models.outputTokens` | Output tokens | tokens | 21925 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 405020 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 53504 |
| `models.costUsd` | Cost | USD | 0.02175 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.05 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.25 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.189 |
| `econ-games.tablePoints` | Points of the table | points | 454.8 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.02175 USD in 131 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
