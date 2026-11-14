# Run econ-lab-015

- Game: `econ-lab` (Econ lab), params `{"blocks":[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":7},{"game":"dilemma","rounds":5}],"brain":true,"maxWords":150,"showHorizon":false}`
- Seed 48, replicate 0, arm `brain` of experiment `econ-lab-brain`
- Purpose: confirmatory; started at 2026-11-14T20:05:33.731Z
- Kernel: runtime revision 3, version 0.0.0, commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `5252bed623cb55bd99da6f5ad2afaf2ba44c298e26922547c11adaf462124971`
- Signed head: `3ba3e721b54e4427e203c4107701248537e9ce21b7dc966e01a8b09dcb1828ac`

## Result

The run ended at tick 10: limit (econ-games.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 10 |
| `run.activations` | Activations |  | 141 |
| `run.toolCalls` | Tool calls |  | 128 |
| `run.toolRefusals` | Refused tool calls |  | 9 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 8 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `models.requests` | Model requests |  | 141 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 486 |
| `models.outputTokens` | Output tokens | tokens | 23681 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 457870 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 56184 |
| `models.costUsd` | Cost | USD | 0.02349 |
| `econ-games.dilemmaCooperation` | Cooperation in the dilemma |  | 0.05 |
| `econ-games.dilemmaRound1` | Cooperation in round 1 of the dilemma |  | 0.25 |
| `econ-games.fundCooperation` | Cooperation in the shared fund |  | 0 |
| `econ-games.tablePoints` | Points of the table | points | 423 |
| `econ-games.decisions` | Decisions |  | 72 |
| `econ-games.missedDecisions` | Decisions not made in time |  | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 8 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model |
| --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` |

The run: 0.02349 USD in 141 model requests. The facts hold no spend per actor.

## Loophole candidates (unverified)

none written: this report has no model-written part
