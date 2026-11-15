# Run chess-003

- Game: `chess` (Chess), params `{"brain":true,"coach":false,"compact":true,"fresh":true,"games":4,"maxPlies":80,"maxWords":150,"settleCap":false,"showLegalMoves":false,"showThreats":false,"teams":false}`
- Seed 43, replicate 0, arm `fresh-compact` of experiment `chess-requests`
- Purpose: confirmatory; started at 2026-11-15T12:13:03.187Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `126f565f78b2962416cc8ce861121e11fe496c1fbec0498061a108abf8a272e3`
- Signed head: `0d904faaf08aed15f4334ac57ae8518c7984d292843a844e002a6bbce94913a8`

## Result

The run ended at tick 45: limit (chess.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 45 |
| `run.activations` | Activations |  | 291 |
| `run.toolCalls` | Tool calls |  | 350 |
| `run.toolRefusals` | Refused tool calls |  | 18 |
| `run.refusals.ILLEGAL_MOVE` | Refusals with ILLEGAL_MOVE |  | 7 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 9 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 4 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 291 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 238 |
| `models.inputTokens` | Input tokens | tokens | 660 |
| `models.outputTokens` | Output tokens | tokens | 349113 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 372388 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 451856 |
| `models.costUsd` | Cost | USD | 0.2348 |
| `chess.plies` | Half-moves played | half-moves | 235 |
| `chess.refusedMoves` | Refused moves |  | 7 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `ILLEGAL_MOVE` | 7 |
| `BRAIN_TOO_LONG` | 9 |
| `TOOL_LOCKED` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 148 | 0.1181 | 2 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 143 | 0.1167 | 2 |

The run: 0.2348 USD in 291 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
