# Run econ-lab-005

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 45, replicate 0, arm `nobrain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T19:53:01.434Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `6517c953ababc9e1cf17048612f4812cc829a4867fdf0cbe7ae9b04f7b3799cf`
- Signed head: `a401550e510488f90d54ee0323dffae46b177d60aa38a099143db08391d8ee84`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 96 |
| `run.toolCalls` | Tool calls |  | 85 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 96 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 352 |
| `models.outputTokens` | Output tokens | tokens | 11486 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 218876 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 28928 |
| `models.costUsd` | Cost | USD | 0.01158 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0 |
| `econ-games.tablePoints` | Points of the table | points | 460 |
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

The run: 0.01158 USD in 96 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
