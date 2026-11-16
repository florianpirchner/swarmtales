# Run city-001

- Game: `city` (The City of Keys), params `{"activation":"onNews","agents":6,"cast":[],"classifier":true,"coreMotives":true,"figureDirection":4,"gamemaker":true,"gmDirection":4,"lastLevel":10,"minutes":80,"names":true,"passesPerMinute":3,"personas":true,"startLevel":1,"stopWhenDone":true,"stopWhenSeatsDecided":true}`
- Seed 7, replicate 0
- Purpose: exploratory; started at 2026-11-16T09:35:01.139Z
- Kernel: runtime revision 7, version 0.0.0, commit `8e11ab1eeb02c372f2240e3c6bbe0ce8d6d6c6bd`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `711cf30d446547258f9935ebe3751eeb7f8ffe67de21f4807c9497bf3adbb147`
- Signed head: `cb22fcb3821e58c555e87279a1da35ec8521febfad62ab7881316895e561b876`

## Result

The run ended at tick 54: limit (arena.stop).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 55 |
| `run.activations` | Activations |  | 766 |
| `run.toolCalls` | Tool calls |  | 942 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.FACTION_FULL` | Refusals with FACTION_FULL |  | 3 |
| `run.refusals.UNKNOWN_FACTOR` | Refusals with UNKNOWN_FACTOR |  | 2 |
| `run.noCallActivations` | Activations without a call |  | 127 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 784 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 2934 |
| `models.outputTokens` | Output tokens | tokens | 212895 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 23862646 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 765102 |
| `models.costUsd` | Cost | USD | 0.441 |
| `interpretations.labelledPromise` | Statements the Confessor labelled promise | statements | 16 |
| `interpretations.labelledOffer` | Statements the Confessor labelled offer | statements | 14 |
| `interpretations.labelledThreat` | Statements the Confessor labelled threat | statements | 2 |
| `interpretations.labelledRefusal` | Statements the Confessor labelled refusal | statements | 18 |
| `interpretations.labelledLie` | Statements the Confessor labelled lie | statements | 3 |
| `interpretations.labelledHesitation` | Statements the Confessor labelled hesitation | statements | 3 |
| `interpretations.labelledHelpRequest` | Statements the Confessor labelled helpRequest | statements | 53 |
| `interpretations.labelledAccusation` | Statements the Confessor labelled accusation | statements | 5 |
| `interpretations.labelledThanks` | Statements the Confessor labelled thanks | statements | 1 |
| `channels.directorNotes` | Notes and posts of a Director | notes | 104 |
| `exile.exiles` | Residents exiled | residents | 3 |
| `exile.ransoms` | Residents ransomed from the gate | residents | 1 |
| `receipts.blames` | Blames settled | blames | 0 |
| `receipts.blamesUpheld` | Blames upheld | blames | 0 |
| `progression.doorsPassed` | Doors passed | doors | 42 |
| `progression.doorsPerResident` | Doors passed per resident | doors | 7 |
| `tribunal.tribunals` | Tribunals counted | tribunals | 3 |
| `tribunal.votes` | Secret votes of a tribunal | votes | 17 |
| `tribunal.gamemakerTribunals` | Tribunals the gamemaker planned | tribunals | 2 |
| `seal.sealsWon` | Seals won at auction | seals | 0 |
| `seal.sealsUsed` | Seals broken on a resident | seals | 0 |

## Refusals

| Code | Count |
| --- | --- |
| `FACTION_FULL` | 3 |
| `UNKNOWN_FACTOR` | 2 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 136 | 0.08401 | 12 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 103 | 0.05401 | 24 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 91 | 0.04913 | 22 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 123 | 0.06947 | 18 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 110 | 0.05625 | 16 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 97 | 0.04621 | 35 |
| `director:confessor` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 29 | 0.004302 | 0 |
| `director:gamemaker` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 95 | 0.07762 | 0 |
| `director:judge` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 0 | 0 | absent |
| `script` | `@swarmtales/models/resident` | none | absent | absent | absent |

The run: 0.441 USD in 784 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part

## Review

Reviewed against the log by the builder of M5-55 (see `README.md` for the run's story, its loopholes and problems).

- **The facts count the whole log, the base's Act I included.** A resumed run's log holds the base's 2016 lines, so
  `run.ticks` 55, `models.requests` 784, `models.costUsd` 0.441, `progression.doorsPassed` 42 and the Confessor's
  labels are the base's and the resume's together. The resume alone: ticks 8 to 54 (47), 619 requests, 0.3724 USD
  (the CLI's meter and the ledger), 4 doors passed (Bastion door 8; Dazzle doors 8, 9 and 10), 39 statements
  labelled, two of them `lie`. The spend rows likewise hold the base's requests (the base: 165, 0.0686 USD).
- `exile.exiles` 3, `exile.ransoms` 1, `tribunal.tribunals` 3, `tribunal.votes` 17, `tribunal.gamemakerTribunals` 2,
  `receipts.blames` 0 (no `blame` in either part), `seal.sealsWon` 0 (two bids of 0, `seal_expired` "nobody bid"):
  verified against the events.
- Refusals: 5, all in the resume (`FACTION_FULL` 3: #4822, #4941, #6079; `UNKNOWN_FACTOR` 2: #6623, #7492).
- `director:judge` 0 requests: right, no review was asked in either part.
- Loophole candidates: none written by a model; the reviewer's are LH21 (new), LH6 and LH7 (seen), in `README.md`.
