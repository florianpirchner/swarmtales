# Run econ-lab-020

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 52, replicate 0, arm `nobrain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:12:35.289Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `e16d306b31572e20582264538fd3fb9f1dd70712a27763b1f13f8117a5d60251`
- Signed head: `93bcdbabd294f352b13d9a8b993b95974238504d14a1277b654c59908d770fbf`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 93 |
| `run.toolCalls` | Tool calls |  | 81 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 93 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 340 |
| `models.outputTokens` | Output tokens | tokens | 13428 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 216780 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 27210 |
| `models.costUsd` | Cost | USD | 0.01232 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.275 |
| `econ-games.tablePoints` | Points of the table | points | 506.2 |
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

The run: 0.01232 USD in 93 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
