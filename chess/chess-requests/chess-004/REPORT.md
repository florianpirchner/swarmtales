# Run chess-004

- Game: `chess` (Chess), params `{"brain":true,"coach":false,"compact":true,"fresh":true,"games":4,"maxPlies":80,"maxWords":150,"settleCap":false,"showLegalMoves":false,"showThreats":false,"teams":false}`
- Seed 47, replicate 0, arm `fresh-compact` of experiment `chess-requests`
- Purpose: confirmatory; started at 2026-11-15T12:46:12.808Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7148a576e63596bdf8cf8207ae9afa60682fbadcefa83e11932e71c052e8fb96`
- Signed head: `d6e37d52fd8303db5efa007ff6d2a9bab14ad650f9ff32f39f94500b8e929aaf`

## Result

The run ended at tick 54: limit (chess.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 54 |
| `run.activations` | Activations |  | 348 |
| `run.toolCalls` | Tool calls |  | 422 |
| `run.toolRefusals` | Refused tool calls |  | 13 |
| `run.refusals.ILLEGAL_MOVE` | Refusals with ILLEGAL_MOVE |  | 10 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 8 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 348 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 291 |
| `models.inputTokens` | Input tokens | tokens | 796 |
| `models.outputTokens` | Output tokens | tokens | 491619 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 402478 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 545486 |
| `models.costUsd` | Cost | USD | 0.3181 |
| `chess.plies` | Half-moves played | half-moves | 291 |
| `chess.refusedMoves` | Refused moves |  | 10 |
| `strategy-brain.brainWrites` | Brains written |  | 8 |

## Refusals

| Code | Count |
| --- | --- |
| `ILLEGAL_MOVE` | 10 |
| `BRAIN_TOO_LONG` | 1 |
| `TOOL_LOCKED` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 175 | 0.1556 | 3 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 173 | 0.1625 | 5 |

The run: 0.3181 USD in 348 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
