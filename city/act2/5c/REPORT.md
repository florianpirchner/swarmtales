# Run city-001

- Game: `city` (The City of Keys), params `{"activation":"onNews","agents":6,"cast":[],"classifier":true,"coreMotives":true,"figureDirection":4,"gamemaker":true,"gmDirection":4,"lastLevel":10,"minutes":80,"names":true,"passesPerMinute":3,"personas":true,"startLevel":1,"stopWhenDone":true,"stopWhenSeatsDecided":true}`
- Seed 7, replicate 0
- Purpose: exploratory; started at 2026-11-16T10:24:43.047Z
- Kernel: runtime revision 7, version 0.0.0, commit `0d119aa9283fd885c959ec3f93a683bbf92cacf2`; scheduler `@swarmtales/engine/turns`, revision 1
- Manifest: `a078d0cbe2856f8a1685ddabc4156713c3fb914760ad7cbed168655bfef53f2f`
- Signed head: `cfed1c358e531175b20835469342975db28fa3f81f7056d698be634e3f2ff658`

## Result

The run ended at tick 52: limit (arena.stop).

## Facts

| Key | Title | Unit | Value |
| --- | --- | --- | --- |
| `run.ticks` | Ticks |  | 53 |
| `run.activations` | Activations |  | 654 |
| `run.toolCalls` | Tool calls |  | 857 |
| `run.toolRefusals` | Refused tool calls |  | 5 |
| `run.refusals.GROUP_NOT_VISIBLE` | Refusals with GROUP_NOT_VISIBLE |  | 3 |
| `run.refusals.FACTION_FULL` | Refusals with FACTION_FULL |  | 1 |
| `run.refusals.UNKNOWN_FACTOR` | Refusals with UNKNOWN_FACTOR |  | 1 |
| `run.noCallActivations` | Activations without a call |  | 89 |
| `run.humanToolCalls` | Tool calls of the human |  | 0 |
| `models.requests` | Model requests |  | 658 |
| `models.failedRequests` | Failed model requests |  | 0 |
| `models.contextResets` | Context resets |  | 0 |
| `models.inputTokens` | Input tokens | tokens | 2434 |
| `models.outputTokens` | Output tokens | tokens | 181535 |
| `models.cacheReadTokens` | Tokens read from the cache | tokens | 18211417 |
| `models.cacheWriteTokens` | Tokens written to the cache | tokens | 689203 |
| `models.costUsd` | Cost | USD | 0.3593 |
| `interpretations.labelledPromise` | Statements the Confessor labelled promise | statements | 9 |
| `interpretations.labelledOffer` | Statements the Confessor labelled offer | statements | 11 |
| `interpretations.labelledThreat` | Statements the Confessor labelled threat | statements | 0 |
| `interpretations.labelledRefusal` | Statements the Confessor labelled refusal | statements | 17 |
| `interpretations.labelledLie` | Statements the Confessor labelled lie | statements | 2 |
| `interpretations.labelledHesitation` | Statements the Confessor labelled hesitation | statements | 1 |
| `interpretations.labelledHelpRequest` | Statements the Confessor labelled helpRequest | statements | 38 |
| `interpretations.labelledAccusation` | Statements the Confessor labelled accusation | statements | 0 |
| `interpretations.labelledThanks` | Statements the Confessor labelled thanks | statements | 0 |
| `channels.directorNotes` | Notes and posts of a Director | notes | 83 |
| `exile.exiles` | Residents exiled | residents | 3 |
| `exile.ransoms` | Residents ransomed from the gate | residents | 1 |
| `receipts.blames` | Blames settled | blames | 0 |
| `receipts.blamesUpheld` | Blames upheld | blames | 0 |
| `progression.doorsPassed` | Doors passed | doors | 38 |
| `progression.doorsPerResident` | Doors passed per resident | doors | 6.333 |
| `tribunal.tribunals` | Tribunals counted | tribunals | 3 |
| `tribunal.votes` | Secret votes of a tribunal | votes | 17 |
| `tribunal.gamemakerTribunals` | Tribunals the gamemaker planned | tribunals | 2 |
| `seal.sealsWon` | Seals won at auction | seals | 0 |
| `seal.sealsUsed` | Seals broken on a resident | seals | 0 |

## Refusals

| Code | Count |
| --- | --- |
| `GROUP_NOT_VISIBLE` | 3 |
| `FACTION_FULL` | 1 |
| `UNKNOWN_FACTOR` | 1 |

## Spend

| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
| --- | --- | --- | --- | --- | --- |
| `resident:A01` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 78 | 0.04255 | 20 |
| `resident:A02` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 119 | 0.06397 | 11 |
| `resident:A03` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 74 | 0.03717 | 18 |
| `resident:A04` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 89 | 0.04703 | 18 |
| `resident:A05` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 102 | 0.05357 | 8 |
| `resident:A06` | `@swarmtales/models/resident` | anthropic `claude-haiku-5-5` | 90 | 0.04612 | 14 |
| `director:confessor` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 16 | 0.00285 | 0 |
| `director:gamemaker` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 90 | 0.06601 | 0 |
| `director:judge` | `@swarmtales/engine/director` | anthropic `claude-haiku-5-5` | 0 | 0 | absent |
| `script` | `@swarmtales/models/resident` | none | absent | absent | absent |

The run: 0.3593 USD in 658 model requests.

## Loophole candidates (unverified)

none written: this report has no model-written part

## Review

Reviewed against the log by the builder of M5-55 (see `README.md` for the run's story, its loopholes and problems).

- **The facts count the whole log, the base's Act I included** (P493). The resume alone: ticks 8 to 52 (45), 493
  requests, 0.2907 USD (the CLI's meter and the ledger), no door passed (`progression.doorsPassed` 38 is the base's
  alone); the base adds 165 requests and 0.0686 USD to the spend rows.
- `exile.exiles` 3, `exile.ransoms` 1, `tribunal.tribunals` 3, `tribunal.votes` 17, `tribunal.gamemakerTribunals` 2,
  `receipts.blames` 0, `seal.sealsWon` 0 (two bids of 0, `seal_expired`): verified against the events.
- Refusals: 5, all in the resume and all the residents' (`GROUP_NOT_VISIBLE` 3, `FACTION_FULL` 1, `UNKNOWN_FACTOR` 1).
- `director:judge` 0 requests: right, no `blame` in either part.
- Loophole candidates: none written by a model; the reviewer's are LH21, LH5 and LH6 (seen), in `README.md`.
