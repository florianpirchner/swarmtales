# Run salt-market-001

- Game: `salt-market` (Salt Market), params `{"brain":true,"games":4,"maxWords":150,"rounds":6,"spoil":true}`
- Seed 41, replicate 0
- Purpose: smoke; started at 2026-11-15T10:17:30.936Z
- Kernel: runtime revision 4, version 0.0.0, commit `f0de5e95a4ff7a42041833193b5f3b0b44b21f18`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `b25213a8782ac08d210ee65bb791c8cc65ffbab2f1f17cc26d29f9506fb096dc`
- Signed head: `b5a9678d9e29566d72ad68a87afd7ea430d0ccb07f2495f37b8dc3306c246514`

## Result

The run ended at tick 28: limit (salt-market.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 28 |
| `run.activations` | Activations |  | 324 |
| `run.toolCalls` | Tool calls |  | 444 |
| `run.toolRefusals` | Refused tool calls |  | 18 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 9 |
| `run.refusals.OFFER_CLOSED` | Refusals with OFFER_CLOSED |  | 3 |
| `run.refusals.OWN_OFFER` | Refusals with OWN_OFFER |  | 4 |
| `run.refusals.CANNOT_COVER` | Refusals with CANNOT_COVER |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 53 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 324 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 16 |
| `models.inputTokens` | Input tokens | tokens | 1268 |
| `models.outputTokens` | Output tokens | tokens | 185578 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 4630445 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 350678 |
| `models.costUsd` | Cost | USD | 0.1831 |
| `salt-market.gainOverIdle` | Gain over idle |  | 0.0715 |
| `salt-market.efficiency` | Gains from trade realised |  | -0.3578 |
| `salt-market.tablePoints` | Table points | points | 609 |
| `salt-market.contracts` | Contracts filled | contracts | 3 |
| `salt-market.trades` | Trades | trades | 37 |
| `salt-market.credit` | Trades with a later delivery | trades | 0 |
| `salt-market.brokenPromises` | Promises broken | promises | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 15 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 9 |
| `OFFER_CLOSED` | 3 |
| `OWN_OFFER` | 4 |
| `CANNOT_COVER` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 82 | 0.05077 | 10 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 81 | 0.04621 | 16 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 78 | 0.04089 | 15 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 83 | 0.04518 | 12 |

The run: 0.1831 USD in 324 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
