# Run chess-002

- Game: `chess` (Chess), params `{"brain":true,"coach":false,"compact":true,"fresh":true,"games":4,"maxPlies":80,"maxWords":150,"settleCap":false,"showLegalMoves":false,"showThreats":false,"teams":false}`
- Seed 53, replicate 0, arm `fresh-compact` of experiment `chess-requests`
- Purpose: confirmatory; started at 2026-11-15T11:30:17.067Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `de25f6d56832ba51220594c6e68d41980dc71847d689cec0bf4c2490bd6f4083`
- Signed head: `91e97dbf949ec7400645c4297901a2f9b63bebc0cae0d6ad9312a5c1cceb2f9d`

## Result

The run ended at tick 53: limit (chess.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 53 |
| `run.activations` | Activations |  | 342 |
| `run.toolCalls` | Tool calls |  | 400 |
| `run.toolRefusals` | Refused tool calls |  | 11 |
| `run.refusals.ILLEGAL_MOVE` | Refusals with ILLEGAL_MOVE |  | 8 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 8 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 342 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 286 |
| `models.inputTokens` | Input tokens | tokens | 774 |
| `models.outputTokens` | Output tokens | tokens | 438664 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 402476 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 514658 |
| `models.costUsd` | Cost | USD | 0.2878 |
| `chess.plies` | Half-moves played | half-moves | 286 |
| `chess.refusedMoves` | Refused moves |  | 8 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `ILLEGAL_MOVE` | 8 |
| `BRAIN_TOO_LONG` | 2 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 175 | 0.1473 | 4 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 167 | 0.1405 | 4 |

The run: 0.2878 USD in 342 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
