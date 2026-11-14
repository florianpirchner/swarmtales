# Run econ-lab-021

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 44, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:14:02.152Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `d602527e8a83d1d3dac5417662130ce7f5453770a896f7ecfbcc6eccdf91fd19`
- Signed head: `be9cceb49360541b1c2f2f2c3d30a1c236a49c7aa93559d44acd6966bddead35`

## Result

The run ended at tick 9: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 9 |
| `run.activations` | Activations |  | 126 |
| `run.toolCalls` | Tool calls |  | 119 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `models.requests` | Model requests |  | 126 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 440 |
| `models.outputTokens` | Output tokens | tokens | 20994 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 372575 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 52580 |
| `models.costUsd` | Cost | USD | 0.02084 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.5 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0 |
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

The run: 0.02084 USD in 126 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
