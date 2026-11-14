# Run econ-lab-019

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 42, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:10:48.923Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `34ba0d5a98b7d8a7d87fbfaeaf90f6d79f3bacc463bf45b5b2b6496d77a473c0`
- Signed head: `9af70655c2026cef276ded2439547d04fc979adf17c44b3dd567eb6c2bc9d5d8`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 130 |
| `run.toolCalls` | Tool calls |  | 122 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `models.requests` | Model requests |  | 130 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 450 |
| `models.outputTokens` | Output tokens | tokens | 23468 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 405095 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 55501 |
| `models.costUsd` | Cost | USD | 0.02277 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.1 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.5 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0.107 |
| `econ-games.tablePoints` | Points of the table | points | 444 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 2 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.02277 USD in 130 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
