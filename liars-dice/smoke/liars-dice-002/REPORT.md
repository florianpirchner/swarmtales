# Run liars-dice-002

- Game: `liars-dice` (Liar's dice), params `{"brain":true,"dice":4,"games":3,"maxWords":150,"seats":4,"talk":true}`
- Seed 53, replicate 0
- Purpose: smoke; started at 2026-11-15T09:08:18.895Z
- Kernel: runtime revision 4, version 0.0.0, commit `7ea5ea107090937a4b84de02f64b96aa5c51daf8`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `f850e535ff1b8cfb9ba4d6ab6f0e2ee0c5acd22f907382080325ddf01100a254`
- Signed head: `221ca798a998036b32eb4255fc5aaf91e4a67c9a553d3e76d98a0af221e69bd4`

## Result

The run ended at tick 23: limit (liars-dice.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 23 |
| `run.activations` | Activations |  | 232 |
| `run.toolCalls` | Tool calls |  | 226 |
| `run.toolRefusals` | Refused tool calls |  | 3 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 3 |
| `run.noCallActivations` | Activations without a call |  | 11 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 232 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 12 |
| `models.inputTokens` | Input tokens | tokens | 876 |
| `models.outputTokens` | Output tokens | tokens | 119756 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 2267853 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 208922 |
| `models.costUsd` | Cost | USD | 0.1088 |
| `liars-dice.rounds` | Rounds | rounds | 45 |
| `liars-dice.bluffShare` | Bids under 0.5 from the own dice |  | 0.03356 |
| `liars-dice.callsLost` | Liar calls lost by the caller |  | 0.7556 |
| `liars-dice.remarkShare` | Bids with a public remark |  | 1 |
| `liars-dice.agreement` | Decisions of the baseline's kind |  | 0.8918 |
| `liars-dice.missed` | Decisions missed | decisions | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 12 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 3 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 70 | 0.03213 | 2 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 61 | 0.03069 | 3 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 51 | 0.02267 | 3 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 50 | 0.02326 | 3 |

The run: 0.1088 USD in 232 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
