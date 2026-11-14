# Run econ-lab-012

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 46, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:00:39.006Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `d7dea0a6de2949f1f02a0a538c5f54a8479fc393f2ea2c14ba44da37dffdb265`
- Signed head: `7f2a63d6fbbfe5fbfaca25f2598cd8e6e03bfb8996089a1ea7a0f1473b3c8943`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 131 |
| `run.toolCalls` | Tool calls |  | 118 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `models.requests` | Model requests |  | 131 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 454 |
| `models.outputTokens` | Output tokens | tokens | 22166 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 400976 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 52896 |
| `models.costUsd` | Cost | USD | 0.02175 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.018 |
| `econ-games.tablePoints` | Points of the table | points | 423 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 3 |

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
