# Run econ-lab-003

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":false,"maxWords":150,"showHorizon":false}`
- Seed 48, replicate 0, arm `nobrain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T19:51:03.561Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `61bb1d432a16e3a3f4ae8d198cc536e5f42a7c628d0ed18e9a5bf4fc89b5a927`
- Signed head: `8efd337116f2029e535c1e475bc624acf65037de8e8c20169e47278b5181c414`

## Result

The run ended at tick 7: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 97 |
| `run.toolCalls` | Tool calls |  | 88 |
| `run.toolRefusals` | Refused tool calls |  | 0 |
| `models.requests` | Model requests |  | 97 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 352 |
| `models.outputTokens` | Output tokens | tokens | 13367 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 220271 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 37198 |
| `models.costUsd` | Cost | USD | 0.01357 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.3 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.75 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.018 |
| `econ-games.tablePoints` | Points of the table | points | 439 |
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

The run: 0.01357 USD in 97 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
