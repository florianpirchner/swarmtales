# Run chess-001

- Game: `chess` (Chess), params `{"brain":true,"coach":false,"compact":true,"fresh":true,"games":4,"maxPlies":80,"maxWords":150,"settleCap":false,"showLegalMoves":false,"showThreats":false,"teams":false}`
- Seed 41, replicate 0, arm `fresh-compact` of experiment `chess-requests`
- Purpose: confirmatory; started at 2026-11-15T10:44:56.334Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `86828d4e0e38ca9648af9606442c759d5cba98c681110a37627169183c8460d0`
- Signed head: `bea365089a98e43d242872b550af35342bae3ce73ed00f54bed65cd71b25bf4e`

## Result

The run ended at tick 58: limit (chess.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 58 |
| `run.activations` | Activations |  | 361 |
| `run.toolCalls` | Tool calls |  | 413 |
| `run.toolRefusals` | Refused tool calls |  | 21 |
| `run.refusals.ILLEGAL_MOVE` | Refusals with ILLEGAL_MOVE |  | 12 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 7 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 9 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 361 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 299 |
| `models.inputTokens` | Input tokens | tokens | 814 |
| `models.outputTokens` | Output tokens | tokens | 465059 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 455230 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 541259 |
| `models.costUsd` | Cost | USD | 0.3048 |
| `chess.plies` | Half-moves played | half-moves | 299 |
| `chess.refusedMoves` | Refused moves |  | 12 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `ILLEGAL_MOVE` | 12 |
| `BRAIN_TOO_LONG` | 7 |
| `TOOL_LOCKED` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 183 | 0.1485 | 4 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 178 | 0.1564 | 5 |

The run: 0.3048 USD in 361 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
