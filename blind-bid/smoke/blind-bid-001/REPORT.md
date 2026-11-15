# Run blind-bid-001

- Game: `blind-bid` (Blind Bid), params `{"brain":true,"games":3,"lots":["first-price","second-price","common","first-price","common","second-price"],"maxWords":150,"purse":100}`
- Seed 31, replicate 0
- Purpose: smoke; started at 2026-11-15T09:30:21.449Z
- Kernel: runtime revision 4, version 0.0.0, commit `7ea5ea107090937a4b84de02f64b96aa5c51daf8`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `b815c44e0a93efffbde03f56dc453e353f39c7e4cfe71d74ff2626ae4bf7296e`
- Signed head: `3131c8661ab8d735e9eab047cf2d5a8fa2f43538891224fe62c0b43c4b7d5902`

## Result

The run ended at tick 7: limit (sealed-auction.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 7 |
| `run.activations` | Activations |  | 103 |
| `run.toolCalls` | Tool calls |  | 97 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 11 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 103 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 372 |
| `models.outputTokens` | Output tokens | tokens | 23914 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 272818 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 54707 |
| `models.costUsd` | Cost | USD | 0.02156 |
| `sealed-auction.shading` | Bid over value, pay-your-bid |  | 0.6737 |
| `sealed-auction.truthfulness` | Truthfulness, pay-the-runner-up |  | 0.9797 |
| `sealed-auction.bidToEstimate` | Bid over estimate, shared worth |  | 0.6627 |
| `sealed-auction.cursed` | Shared-worth lots sold at a loss | lots | 2 |
| `sealed-auction.unspent` | Purse left unspent |  | 0.445 |
| `sealed-auction.missed` | Bids missed | bids | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.005224 | 3 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.005834 | 3 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 26 | 0.005146 | 2 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 25 | 0.005357 | 3 |

The run: 0.02156 USD in 103 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
