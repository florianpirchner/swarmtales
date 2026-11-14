# Run econ-lab-005

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 41, replicate 0, arm `nobrain` of experiment `econ-lab-noise-floor`
- Purpose: pilot; started at 2026-11-14T18:47:42.206Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `1784aeb318c07336fa4fd5f02d2f048d3ae5ec103618ebef480faec1da92ddfa`
- Signed head: `1af78479f2160f02991b2f649095dcebee9aba063f3afffbb647073d738f154a`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 94 |
| `run.toolCalls` | Tool calls |  | 85 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 94 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 346 |
| `models.outputTokens` | Output tokens | tokens | 12067 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 219221 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 25874 |
| `models.costUsd` | Cost | USD | 0.01149 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 1 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.05 |
| `econ-games.tablePoints` | Points of the table | points | 468.4 |
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

The run: 0.01149 USD in 94 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
