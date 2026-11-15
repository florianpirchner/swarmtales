# Run salt-market-001

- Game: `salt-market` (Salt Market), params `{"brain":true,"games":4,"markOwnOffers":true,"maxWords":150,"rounds":6,"spoil":true}`
- Seed 41, replicate 0
- Purpose: smoke; started at 2026-11-15T10:50:15.104Z
- Kernel: runtime revision 4, version 0.0.0, commit `864ab0e893cc0791cd5f1de5dc35c5aeb9b4696d`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a931219e3d03808ba4bf43689ad8088b95173f14dd9aa071530608fd1ed06b3c`
- Signed head: `8931a21a481f41ee32615d99546a1780049c1ded6f7148ec1310c33b9b7f6dfa`

## Result

The run ended at tick 28: limit (salt-market.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 28 |
| `run.activations` | Activations |  | 326 |
| `run.toolCalls` | Tool calls |  | 414 |
| `run.toolRefusals` | Refused tool calls |  | 12 |
| `run.refusals.OFFER_CLOSED` | Refusals with OFFER_CLOSED |  | 6 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `run.refusals.OWN_OFFER` | Refusals with OWN_OFFER |  | 1 |
| `run.refusals.TOO_MANY_OFFERS` | Refusals with TOO_MANY_OFFERS |  | 1 |
| `run.refusals.CANNOT_COVER` | Refusals with CANNOT_COVER |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 63 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 326 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 16 |
| `models.inputTokens` | Input tokens | tokens | 1278 |
| `models.outputTokens` | Output tokens | tokens | 171663 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 4590064 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 341922 |
| `models.costUsd` | Cost | USD | 0.1746 |
| `salt-market.gainOverIdle` | Gain over idle |  | 0.1045 |
| `salt-market.efficiency` | Gains from trade realised |  | -0.309 |
| `salt-market.tablePoints` | Table points | points | 623 |
| `salt-market.contracts` | Contracts filled | contracts | 4 |
| `salt-market.trades` | Trades | trades | 38 |
| `salt-market.credit` | Trades with a later delivery | trades | 1 |
| `salt-market.brokenPromises` | Promises broken | promises | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 16 |

## Refusals

| Code | Count |
| --- | --- |
| `OFFER_CLOSED` | 6 |
| `BRAIN_TOO_LONG` | 3 |
| `OWN_OFFER` | 1 |
| `TOO_MANY_OFFERS` | 1 |
| `CANNOT_COVER` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 80 | 0.04617 | 15 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 82 | 0.04182 | 16 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 82 | 0.04493 | 14 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 82 | 0.04167 | 18 |

The run: 0.1746 USD in 326 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
