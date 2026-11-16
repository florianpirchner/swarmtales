# Run tictactoe-001

- Game: `tictactoe` (Tic-tac-toe teams), params `{}`
- Seed 7, replicate 0
- Purpose: exploratory; started at 2026-11-16T20:48:29.397Z
- Kernel: runtime revision 8, version 1.0.0, commit `155d497e37377d46574f574556940e14f518589b`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `2e0a028482171ff592eaa1a1fefa0d18200aeeb04c0fe0778d63121f414395de`
- Signed head: `50843dc3cc8909411e7d2618498d216b733215e3c45542e4e5f1c4aa139abaed`

## Result

The run ended at tick 24: limit (grid.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 24 |
| `run.activations` | Activations |  | 461 |
| `run.toolCalls` | Tool calls |  | 349 |
| `run.toolRefusals` | Refused tool calls |  | 9 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 5 |
| `run.refusals.BRAIN_REPLAY` | Refusals with BRAIN_REPLAY |  | 1 |
| `run.refusals.NOT_ON_MOVE` | Refusals with NOT_ON_MOVE |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 163 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 403 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 18 |
| `models.inputTokens` | Input tokens | tokens | 1266 |
| `models.outputTokens` | Output tokens | tokens | 78107 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1915059 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 161528 |
| `models.costUsd` | Cost | USD | 0.07852 |
| `strategy-brain.brainWrites` | Brains written |  | 6 |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 2 |
| `BRAIN_TOO_LONG` | 5 |
| `BRAIN_REPLAY` | 1 |
| `NOT_ON_MOVE` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 68 | 0.01331 | 27 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 68 | 0.01266 | 26 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 72 | 0.01464 | 27 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 69 | 0.01351 | 28 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 61 | 0.01154 | 26 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 65 | 0.01287 | 29 |

The run: 0.07852 USD in 403 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
