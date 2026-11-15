# Run harbor-lights-011

- Game: `harbor-lights` (Harbor Lights), params `{"aid":false,"brain":"solo","games":1,"maxWords":150,"strikes":"soft"}`
- Seed 104, replicate 0, arm `solo` of experiment `harbor-lights-private-notes`
- Purpose: confirmatory; started at 2026-11-15T07:52:23.803Z
- Kernel: runtime revision 4, version 0.0.0, commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a81cc55d8276f9a834f406634466bbffd46fa163efa4e9b92008c0588de19ba3`
- Signed head: `80fdbaae069aa6f8acc17be9a6008a531bb36e144c9ddb96f7e99d9e8d33c402`

## Result

The run ended at tick 6: limit (hint-towers.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 6 |
| `run.activations` | Activations |  | 112 |
| `run.toolCalls` | Tool calls |  | 70 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 4 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 42 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 112 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 4 |
| `models.inputTokens` | Input tokens | tokens | 340 |
| `models.outputTokens` | Output tokens | tokens | 47831 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1312049 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 97425 |
| `models.costUsd` | Cost | USD | 0.04925 |
| `hint-towers.score` | Points per game | points | 20 |
| `hint-towers.misfires` | Misfires |  | 2 |
| `strategy-brain.brainWrites` | Brains written |  | 4 |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 4 |
| `TOOL_LOCKED` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 27 | 0.007763 | 10 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.01202 | 10 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 31 | 0.01596 | 12 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 28 | 0.0135 | 10 |

The run: 0.04925 USD in 112 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
