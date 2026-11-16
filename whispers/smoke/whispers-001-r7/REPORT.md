# Run whispers-001

- Game: `whispers` (Whispers (rumours only)), params `{"activation":"onNews","agents":6,"classifier":true,"coreMotives":true,"figureDirection":4,"gamemaker":true,"gmDirection":4,"guards":true,"lastLevel":7,"minutes":45,"names":true,"passesPerMinute":3,"receipts":false,"stopWhenDone":false,"stopWhenSeatsDecided":false,"whisperer":true}`
- Seed 11, replicate 0
- Purpose: smoke; started at 2026-11-16T03:27:38.474Z
- Kernel: runtime revision 7, version 0.0.0, commit `578e65df3387b8319ffa06dc0e7a277e7cb926a9`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `cdcadf8daf37ac65e34a359713997785a16113dafc071743faf03ec384876f0a`
- Signed head: `152d6e4dfb8db5e1317938b5084cfa6bd3692021266ae92899fc5e3589c64db7`

## Result

The run ended at tick 45: ticks.

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 45 |
| `run.activations` | Activations |  | 453 |
| `run.toolCalls` | Tool calls |  | 660 |
| `run.toolRefusals` | Refused tool calls |  | 11 |
| `run.refusals.GUARD_BLOCKED` | Refusals with GUARD_BLOCKED |  | 7 |
| `run.refusals.MAILBOX_FULL` | Refusals with MAILBOX_FULL |  | 2 |
| `run.refusals.MAILBOX_SENDER_LIMIT` | Refusals with MAILBOX_SENDER_LIMIT |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 104 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 447 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 1768 |
| `models.outputTokens` | Output tokens | tokens | 133090 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 9571658 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 416219 |
| `models.costUsd` | Cost | USD | 0.2145 |
| `interpretations.labelledPromise` | Statements the Confessor labelled promise | statements | 19 |
| `interpretations.labelledOffer` | Statements the Confessor labelled offer | statements | 5 |
| `interpretations.labelledThreat` | Statements the Confessor labelled threat | statements | 1 |
| `interpretations.labelledRefusal` | Statements the Confessor labelled refusal | statements | 8 |
| `interpretations.labelledLie` | Statements the Confessor labelled lie | statements | 6 |
| `interpretations.labelledHesitation` | Statements the Confessor labelled hesitation | statements | 0 |
| `interpretations.labelledHelpRequest` | Statements the Confessor labelled helpRequest | statements | 77 |
| `interpretations.labelledAccusation` | Statements the Confessor labelled accusation | statements | 18 |
| `interpretations.labelledThanks` | Statements the Confessor labelled thanks | statements | 9 |
| `channels.directorNotes` | Notes and posts of a Director | notes | 6 |
| `exile.exiles` | Residents exiled | residents | absent |
| `exile.ransoms` | Residents ransomed from the gate | residents | absent |
| `receipts.blames` | Blames settled | blames | 0 |
| `receipts.blamesUpheld` | Blames upheld | blames | 0 |
| `whispers.whisperDms` | The whisperer's direct messages, by its duty notices | messages | 47 |
| `whispers.forgeries` | Receipts forged | receipts | 0 |
| `whispers.popularityBallots` | Ballots of the popularity vote | votes | 42 |
| `progression.doorsPassed` | Doors passed | doors | 42 |
| `progression.doorsPerResident` | Doors passed per resident | doors | 7 |
| `standoff-tribunal.holdouts` | Holdout tribunals called | tribunals | absent |
| `standoff-tribunal.votes` | Secret ballots of a holdout tribunal | votes | absent |

## Refusals

| Code | Count |
| --- | --- |
| `GUARD_BLOCKED` | 7 |
| `MAILBOX_FULL` | 2 |
| `MAILBOX_SENDER_LIMIT` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 62 | 0.02786 | 19 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 66 | 0.03216 | 17 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 61 | 0.02882 | 17 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 65 | 0.03142 | 15 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 66 | 0.03254 | 18 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 64 | 0.03396 | 18 |
| `director:confessor` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 15 | 0.007251 | 0 |
| `director:gamemaker` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 48 | 0.02044 | 0 |
| `director:guard` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 0 | 0 | absent |
| `director:judge` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 0 | 0 | absent |
| `script` | `@swarmtales/models/resident` | none | absent | absent | absent |

The run: 0.2145 USD in 447 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part
