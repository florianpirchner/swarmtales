# Run morris-teams-001

- Game: `morris-teams` (Nine men's morris solo against the engine), params `{"brain":true,"engineDepth":3,"fixedCaptain":false,"games":3,"maxQuietTurns":40,"maxRounds":3,"maxTurns":120,"maxWords":300,"refereeDepth":3,"teamSize":1}`
- Seed 13, replicate 0
- Purpose: smoke; started at 2026-11-15T09:51:02.061Z
- Kernel: runtime revision 4, version 0.0.0, commit `f0de5e95a4ff7a42041833193b5f3b0b44b21f18`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `5d1641720a7dc890ee15cb687e0ba7f0accfb8dab628d6d4fd75a07e9969d8ef`
- Signed head: `a3cb3fc0aebdac77435957539f3509445e13cb8f8e3ec6e5e5a2918af6002199`

## Result

The run ended at tick 41: limit (morris.match).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 41 |
| `run.activations` | Activations |  | 205 |
| `run.toolCalls` | Tool calls |  | 251 |
| `run.toolRefusals` | Refused tool calls |  | 2 |
| `run.refusals.BRAIN_TOO_LONG` | Refusals with BRAIN_TOO_LONG |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 2 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 205 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 3 |
| `models.inputTokens` | Input tokens | tokens | 704 |
| `models.outputTokens` | Output tokens | tokens | 64478 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 5039038 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 113261 |
| `models.costUsd` | Cost | USD | 0.09686 |
| `morris-referee.blunders` | Blunders | turns | 1 |
| `morris-referee.blunderRate` | Blunders per 100 scored turns |  | 0.7092 |
| `morris-referee.xBlunders` | Blunders of side X | turns | 1 |
| `morris-referee.missedWins` | Missed wins | turns | 0 |
| `morris.games` | Games played | games | 3 |
| `morris.xWinShare` | Games won by X |  | 0.3333 |
| `morris.drawShare` | Games drawn |  | 0.3333 |
| `morris.blockedShare` | Games ended by a blockade |  | 0.3333 |
| `morris.turns` | Turns per game | turns | 47.33 |
| `morris.forfeits` | Moves played by the move timer | moves | 0 |
| `strategy-brain.brainWrites` | Brains written |  | 3 |

## Refusals

| Code | Count |
| --- | --- |
| `BRAIN_TOO_LONG` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 205 | 0.09686 | 2 |

The run: 0.09686 USD in 205 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
