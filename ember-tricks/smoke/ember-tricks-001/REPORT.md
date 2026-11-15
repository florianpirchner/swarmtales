# Run ember-tricks-001

- Game: `ember-tricks` (Ember Tricks), params `{"brain":true,"games":1,"lever":"none","maxWords":200,"rounds":8}`
- Seed 23, replicate 0
- Purpose: smoke; started at 2026-11-15T09:21:41.000Z
- Kernel: runtime revision 4, version 0.0.0, commit `7ea5ea107090937a4b84de02f64b96aa5c51daf8`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `e4a39c1bd043792de601b4995942cc01c205ec1e55769c5ca74e5bedf0d1b2d1`
- Signed head: `f7e58e38212fe11f7f448fdecc4dbe4f83de0db24f92cfe9b3c77bab5845de85`

## Result

The run ended at tick 15: limit (trick-play.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 15 |
| `run.activations` | Activations |  | 323 |
| `run.toolCalls` | Tool calls |  | 328 |
| `run.toolRefusals` | Refused tool calls |  | 1 |
| `run.refusals.NOT_YOUR_TURN` | Refusals with NOT_YOUR_TURN |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 3 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 323 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 32 |
| `models.inputTokens` | Input tokens | tokens | 1032 |
| `models.outputTokens` | Output tokens | tokens | 45181 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 1356163 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 142092 |
| `models.costUsd` | Cost | USD | 0.05402 |
| `trick-play.hits` | Bids hit exactly |  | 0.4063 |
| `trick-play.zeroBids` | Bids of zero tricks |  | 0.3125 |
| `trick-play.meanBid` | Mean bid per seat and round | tricks | 0.7188 |
| `trick-play.points` | Points per seat and round | points | 0.4688 |
| `trick-play.vetoes` | Leads vetoed | vetoes | 1 |
| `trick-play.forfeits` | Actions of the move timer | actions | 0 |
| `strategy-brain.brainWrites` | Brains written |  | absent |

## Refusals

| Code | Count |
| --- | --- |
| `NOT_YOUR_TURN` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 78 | 0.01262 | 0 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 84 | 0.01543 | 0 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 82 | 0.01284 | 2 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 79 | 0.01313 | 1 |

The run: 0.05402 USD in 323 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
