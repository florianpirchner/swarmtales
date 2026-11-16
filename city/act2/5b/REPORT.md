# Run city-001

- Game: `city` (The City of Keys), params `{"activation":"onNews","agents":6,"cast":[],"classifier":true,"coreMotives":true,"figureDirection":4,"gamemaker":true,"gmDirection":4,"lastLevel":10,"minutes":80,"names":true,"passesPerMinute":3,"personas":true,"startLevel":1,"stopWhenDone":true,"stopWhenSeatsDecided":true}`
- Seed 7, replicate 0
- Purpose: exploratory; started at 2026-11-16T10:05:18.515Z
- Kernel: runtime revision 7, version 0.0.0, commit `a39b6b340d9ba4ca274dbb5b51965d58dc9b66b6`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `7eb41876f6c26930c18227f8b6e7d98d9e396a04cc3d51023c9f07f6ba19f6cf`
- Signed head: `89601dd6d1a4a25595457b814d19e545ebc6b4f43c4306f57617aa46bc8103f6`

## Result

The run ended at tick 54: limit (arena.stop).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 55 |
| `run.activations` | Activations |  | 686 |
| `run.toolCalls` | Tool calls |  | 892 |
| `run.toolRefusals` | Refused tool calls |  | 14 |
| `run.refusals.PRIVATE_BLOCKED` | Refusals with PRIVATE_BLOCKED |  | 2 |
| `run.refusals.REPEATED` | Refusals with REPEATED |  | 3 |
| `run.refusals.GROUP_NOT_VISIBLE` | Refusals with GROUP_NOT_VISIBLE |  | 4 |
| `run.refusals.FACTION_FULL` | Refusals with FACTION_FULL |  | 2 |
| `run.refusals.REFUSED` | Refusals with REFUSED |  | 1 |
| `run.refusals.TOOL_LOCKED` | Refusals with TOOL_LOCKED |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 133 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 703 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 2594 |
| `models.outputTokens` | Output tokens | tokens | 202922 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 19964788 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 746104 |
| `models.costUsd` | Cost | USD | 0.3946 |
| `interpretations.labelledPromise` | Statements the Confessor labelled promise | statements | 15 |
| `interpretations.labelledOffer` | Statements the Confessor labelled offer | statements | 16 |
| `interpretations.labelledThreat` | Statements the Confessor labelled threat | statements | 2 |
| `interpretations.labelledRefusal` | Statements the Confessor labelled refusal | statements | 15 |
| `interpretations.labelledLie` | Statements the Confessor labelled lie | statements | 2 |
| `interpretations.labelledHesitation` | Statements the Confessor labelled hesitation | statements | 1 |
| `interpretations.labelledHelpRequest` | Statements the Confessor labelled helpRequest | statements | 43 |
| `interpretations.labelledAccusation` | Statements the Confessor labelled accusation | statements | 1 |
| `interpretations.labelledThanks` | Statements the Confessor labelled thanks | statements | 0 |
| `channels.directorNotes` | Notes and posts of a Director | notes | 107 |
| `exile.exiles` | Residents exiled | residents | 3 |
| `exile.ransoms` | Residents ransomed from the gate | residents | 1 |
| `receipts.blames` | Blames settled | blames | 0 |
| `receipts.blamesUpheld` | Blames upheld | blames | 0 |
| `progression.doorsPassed` | Doors passed | doors | 39 |
| `progression.doorsPerResident` | Doors passed per resident | doors | 6.5 |
| `tribunal.tribunals` | Tribunals counted | tribunals | 3 |
| `tribunal.votes` | Secret votes of a tribunal | votes | 17 |
| `tribunal.gamemakerTribunals` | Tribunals the gamemaker planned | tribunals | 2 |
| `seal.sealsWon` | Seals won at auction | seals | 0 |
| `seal.sealsUsed` | Seals broken on a resident | seals | 0 |

## Refusals

| Code | Count |
| --- | --- |
| `PRIVATE_BLOCKED` | 2 |
| `REPEATED` | 3 |
| `GROUP_NOT_VISIBLE` | 4 |
| `FACTION_FULL` | 2 |
| `REFUSED` | 1 |
| `TOOL_LOCKED` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 100 | 0.06089 | 24 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 82 | 0.04342 | 23 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 91 | 0.04967 | 18 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 119 | 0.06824 | 22 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 92 | 0.04496 | 22 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 96 | 0.04589 | 24 |
| `director:confessor` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 21 | 0.003691 | 0 |
| `director:gamemaker` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 102 | 0.07787 | 0 |
| `director:judge` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 0 | 0 | absent |
| `script` | `@swarmtales/models/resident` | none | absent | absent | absent |

The run: 0.3946 USD in 703 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part

## Review

Reviewed against the log by the builder of M5-55 (see `README.md` for the run's story, its loopholes and problems).

- **The facts count the whole log, the base's Act I included** (P493). The resume alone: ticks 8 to 54 (47), 538
  requests, 0.3261 USD (the CLI's meter and the ledger), 1 door passed (Bastion, door 8, minute 49); the base adds
  165 requests and 0.0686 USD to the spend rows and 38 doors to `progression.doorsPassed`.
- `exile.exiles` 3, `exile.ransoms` 1, `tribunal.tribunals` 3, `tribunal.votes` 17, `tribunal.gamemakerTribunals` 2,
  `receipts.blames` 0, `seal.sealsWon` 0 (two bids of 0, `seal_expired`): verified against the events.
- Refusals: 14, all in the resume; 5 are the gamemaker's (`PRIVATE_BLOCKED` #2850, #2852; `REPEATED` 3), 9 the
  residents'.
- `director:judge` 0 requests: right, no `blame` in either part.
- Loophole candidates: none written by a model; the reviewer's are LH21 and LH6 (seen), in `README.md`.
