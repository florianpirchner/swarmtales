# Run econ-lab-006

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 42, replicate 0, arm `nobrain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T19:53:39.483Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7f7645ac200ec24465c83e5c223029f10a66eea910a6cf34adc024cee698ab2f`
- Signed head: `11f5beb1201b2d39b248f7e69eae8d3b5aa3fcbd00d30870257a1c9ac2fa680e`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 97 |
| `run.toolCalls` | Tool calls |  | 85 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 97 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 356 |
| `models.outputTokens` | Output tokens | tokens | 11618 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 226979 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 25864 |
| `models.costUsd` | Cost | USD | 0.01135 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.018 |
| `econ-games.tablePoints` | Points of the table | points | 463 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

none

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.01135 USD in 97 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
