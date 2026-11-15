# Run convoy-001

- Game: `convoy` (Convoy), params `{"brain":true,"cooldown":3,"crews":[2,2,3,3,3,3,4,4],"damageToLose":3,"games":3,"maxWords":150}`
- Seed 53, replicate 0
- Purpose: smoke; started at 2026-11-15T09:58:26.425Z
- Kernel: runtime revision 4, version 0.0.0, commit `f0de5e95a4ff7a42041833193b5f3b0b44b21f18`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `e4c0b4b2509d768cbd248e3a9e08e98fe042c46ccebc125bd3e2c1783e59a448`
- Signed head: `26364d480ec0de11387fb197d950c98e29818bb8a925e1b1e662d122b3a70b8e`

## Result

The run ended at tick 33: limit (convoy.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 33 |
| `run.activations` | Activations |  | 518 |
| `run.toolCalls` | Tool calls |  | 552 |
| `run.toolRefusals` | Refused tool calls |  | 20 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 5 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 15 |
| `run.noCallActivations` | Activations without a call |  | 116 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 518 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 18 |
| `models.inputTokens` | Input tokens | tokens | 1946 |
| `models.outputTokens` | Output tokens | tokens | 155153 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 6612655 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 427347 |
| `models.costUsd` | Cost | USD | 0.1973 |
| `convoy.saboteurWins` | Games won by the saboteurs |  | 0 |
| `convoy.damaged` | Damaged stages per game | stages | 1.333 |
| `convoy.damagePerChance` | Saboteur damage cards per chance |  | 0.4167 |
| `convoy.loyalHits` | Loyal accusation hits |  | 0.9167 |
| `convoy.rightVotes` | Loyal votes that matched the crew |  | 0.5521 |
| `convoy.crewsDown` | Crews voted down | crews | 3 |
| `strategy-brain.brainWrites` | Brains written |  | 17 |

## Refusals

| Code | Count |
| --- | --- |
| `TOOL_LOCKED` | 5 |
| `BRAIN_TOO_LONG` | 15 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 89 | 0.03265 | 13 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 91 | 0.0337 | 21 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 85 | 0.03128 | 23 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 84 | 0.03609 | 18 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 85 | 0.03083 | 23 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 84 | 0.03276 | 18 |

The run: 0.1973 USD in 518 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
