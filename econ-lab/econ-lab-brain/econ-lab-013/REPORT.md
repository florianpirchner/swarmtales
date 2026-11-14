# Run econ-lab-013

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 47, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:02:19.197Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `b9a22ecb76e0e9243f705c28cecf554d7873c497023dbd598012407d0675ca5e`
- Signed head: `feccd74e03783d9d1d87a6abeb09cbb8d67d8c6cfc5911f324d2cc4b254cd1f5`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 132 |
| `run.toolCalls` | Tool calls |  | 118 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 132 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 460 |
| `models.outputTokens` | Output tokens | tokens | 21896 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 416113 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 53951 |
| `models.costUsd` | Cost | USD | 0.0219 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.05 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.25 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.05 |
| `econ-games.tablePoints` | Points of the table | points | 431.4 |
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

The run: 0.0219 USD in 132 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
