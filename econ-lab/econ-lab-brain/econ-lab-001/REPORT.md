# Run econ-lab-001

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 49, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T19:48:00.336Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `5847898be52072af7b5d801c8b24927eb36d4c50f4639f929797e58b2b122fbb`
- Signed head: `dca45fe56485dfce6cf531befee1d38a9f62906ed729ae99d4ca0c99cd6f8f31`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 133 |
| `run.toolCalls` | Tool calls |  | 121 |
| `run.toolRefusals` | Refused tool calls |  | 4 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `models.requests` | Model requests |  | 133 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 464 |
| `models.outputTokens` | Output tokens | tokens | 24143 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 417558 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 59121 |
| `models.costUsd` | Cost | USD | 0.02368 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.05 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.25 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.043 |
| `econ-games.tablePoints` | Points of the table | points | 420.2 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 3 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.02368 USD in 133 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
