# Oracles: City of Keys, the City slice (`stories/cityofkeys`)

Format and rules of comparison: [../README.md](../README.md).

The City of Keys is not exported whole. These files are the slice that
`docs/refactoring-before-release/05-challenge.md` section 5.5 asks for: six scripted residents and the parts no
tabletop game touches.

| File | Variant | Source | Covers |
|---|---|---|---|
| `cityofkeys-act1-s7.json`, `cityofkeys-act1-s11.json` | the story from its start, six residents, 12 minutes | scripted (`cityActOne`, `cityGamemaker`) | talk on the board and by DM with delivery and receipts, transfers on the ledger, rewards and penalties, wrong codes (`INCORRECT`, `INVALID_FORMAT`), locked tools, names chosen, levels 1 to 7 passed, the end of act one and the start of act two with its deal, the scripted director's actions, one board post of the gamemaker |
| `cityofkeys-act1-s7-resumed.json` | the same run, saved after minute 6 and continued on a fresh instance | the same script | save and resume: one `resume` entry; every other entry equals `cityofkeys-act1-s7.json` |
| `cityofkeys-act2-s7.json` | act two with a target of half the residents, continued from a saved first act | scripted (`actTwoResidents`, `actTwoGamemaker`) | delivery receipts, two blames judged by a model role (`role_asked`, `role_answered`), a faction draft, three tribunals with votes (`SELF_VOTE` refused), a ransom that brings a resident back, a last will (one refused: `UNKNOWN_FACTOR`), three exiles and what follows each, and a gamemaker that plans the second tribunal (one plan refused: `INVALID_COUNT`) |
| `cityofkeys-act2-seal-s7.json` | act two as `cityofkeys-act2-s7.json`, from the same saved first act | scripted (`actTwoSealResidents` of `scripts/oracles/m5-players.ts`: `actTwoResidents` with two bidders) | the black seal to its end: `bid` by `A02` (5) and `A06` (12) at minute 20, `seal_won` by `A06` with both bids paid at minute 23, `permaDeath` by the bearer on `A04` (`seal_used`, `exiled` with `by: "seal"`); the exile counts toward the act's target, so the tribunals then exile `A05` and `A06` only. The old script plays on unchanged around the missing `A04`, which adds refusals the base file has not: `UNKNOWN_NOMINEE` (2), `NOT_A_LEADER`, `NOT_ACCUSED`, `UNKNOWN_AGENT` (2, a last will to `A04`); recorded for M5-11 |
| `cityofkeys-act1-classifier-s7.json` | the story from its start as `cityofkeys-act1-s7.json`, with the statement classifier (`classifier: true` in `setup.definition.effective`) | scripted (`cityActOne`, `cityGamemaker`, and the Confessor `cityClassifier` of `scripts/oracles/m5-players.ts`) | the Confessor in the six rounds that hold statements: `overseer_called` and `overseer_answered` of `overseer:classifier` (`trigger: "hook:between"`), `interpretation` events (board questions `helpRequest`; a DM's proposal `promise` and `offer`, its recipient as target), `interpretation_round`; its third answer names a statement that is not in the round (dropped), its fourth comes without the tool (`ok: false`, `by: "fallback"`, `interpretation_error`). Every other timeline entry equals `cityofkeys-act1-s7.json`. The field `ref` of an `interpretation` is the sequence number of the labelled event in the old log, which the file does not carry; recorded for M5-11 |
| `cityofkeys-burn-s7.json` | a reduced City (`setup/cityofkeys-burn.story.json`): no acts, goals or seal, a tribunal from level 3 on that exiles a third of the city | scripted (`scripts/oracles/city-burn.ts`) | two tribunals, two exiles, and for each a burned puzzle piece: `factor_burned` for the level-4 fragment only the exiled resident held, with the residents who still need it |

Source of the calls. All three scripts play through the app's own path with scripted models: one turn per
resident and minute, one answer with tool calls or none. The act-two script is the scenario of
`test/stories/cityofkeys-tribunal.test.ts`.

The setup is a story definition: `setup.definition.file` names it (`setup/cityofkeys.story.json`;
`setup/cityofkeys-act2.story.json` differs in the tribunal's target, first call and length) and
`setup.definition.effective` holds the run dials.

**The starting state of the act-two file is not in the file.** Its timeline begins with a `resume` entry: the run
continues from `examples/cityofkeys-act1-06a-01/snapshot-L7.json`, the saved first act of a recorded live run. A
platform that cannot load that state uses the file as the reference for the order and the content of the events
of a tribunal and an exile; the act-one files are replayable from their inputs alone.

What follows an exile in the file, in this order: the city's board posts (the closed gate, the last will),
`exiled`, `resident_suspended`, `piece_kept` (the city keeps a counter-factor or a certificate that a resident
still needs, and sells it) with a notice to the resident who needs it, the ledger entry that burns the exiled
resident's points, `goal_resolved` with its board post, and `level_contracted` for every level nobody has
reached. A piece given away by a last will shows as `piece_given` before the exile.

Not covered, and why:

- **A burned certificate or counter-factor.** Under today's rules these no longer burn when a tribunal exiles
  their holder (P43): the city keeps them (`piece_kept`). Only a fragment burns, and the story as shipped never
  exiles a resident on a fragment level, which is why the burn file plays a reduced City.
- **A decision with a window (`decision_proposed`, `decision_settled`, `amendDecision`).** The tribunal opens one
  only with its option `decisionWindow` and a holder of `amendDecision`, and a holder is a human or an overseer.
  The path these scripts play through seats neither with that grant. `test/mechanics/tribunal/verdict.test.ts`
  reaches the gate on stand-in mechanics; it is the statement of that behaviour, not a file here.
- The human's hand (pause, instruction, amendment), the weaver, levels 8 to 10 played to their end, 12 or more
  residents. The classifier plays only in the act-one file of M5-11 (scripted labels, no decider), the seal only
  in the act-two file of M5-11 (not a tie, not a seal that expires unused after a win, not one ended by the act).
- The three M5-11 files were recorded on the branch `oracle/m5` of the old platform (`12-m5-spec.md`, section
  3.4, the additions, decision A59); `../m5-catalog.patch` holds their catalogue entries and the players.
- Model text: the scripted models answer with fixed words, which are not in the file.

## What the rewritten platform proves with these files (M3)

No file here can be replayed whole on the rewritten platform: the smallest setup (`cityofkeys-burn-s7.json`) loads
15 mechanics, and the slice of milestone M3 has seven. The files are used as **projections**: the events of named
sources and types, with named fields, in order, taken from the file and from the log of a run that reaches the
same situation, and compared byte for byte (`projectOracle`, `projectLog`, `projectCalls`, `eventBurst`,
`renumbered`, `projectionRest` and `projectionDifference` in `packages/testkit/src/oracle/project.ts`). Each proof also runs against a copy of the
file changed by hand and must name the changed event.

| # | File | Projection | Test |
|---|---|---|---|
| 1 | `cityofkeys-act1-s7.json`, `cityofkeys-act1-s11.json` | `puzzles.fragments_dealt`, levels 1 to 7, whole payload | `mechanics/puzzles/test/oracle.test.ts` |
| 2 | `cityofkeys-burn-s7.json` | `puzzles.fragments_dealt`, levels 1 to 7, whole payload | the same |
| 3 | `cityofkeys-burn-s7.json`, first exile (`A04`, minute 14) | `exile.exiled` (field `agent`), `puzzles.factor_burned`, `puzzles.level_contracted` for levels 5 to 7 | the same |
| 4 | `cityofkeys-burn-s7.json`, first exile | `ledger.ledger_entry` up to and with the entry that burns the points of `A04` (`debit: "A04"`, `credit: "SYSTEM_MINT_BURN"`, `amount: 35`, `reason: "exiled A04"`) | `mechanics/ledger/test/oracle.test.ts` |
| 5 | `cityofkeys-act1-s7.json`, `cityofkeys-act1-s11.json` | every `transferPoints` call with its answer; `ledger.ledger_entry` and `ledger.transfer`, whole payloads | the same |
| 6 | `cityofkeys-act1-s7.json`, `cityofkeys-act1-s11.json` | every `postBoard` and `sendDM` call of a resident with its answer; `channels.board_post` of residents, `channels.dm_sent`, `channels.dm_delivered`, whole payloads | `mechanics/channels/test/oracle.test.ts` |

How projection 3 is set up: the test reads where every resident stands from the file's `progression` events
before the exile (`level_entered`, and `submission` with the outcome `correct`), gives that to `puzzles` as its
option `standings`, banishes the resident the file names through the service of `exile`, and compares what is
written then. The file holds no direct message before its first exile, so no message is fed in.

How projections 4 and 5 are set up: the test walks the file's timeline. It makes every `transferPoints` call of
the file and compares the answer (`ok`, `code`, `stage`, and the text after the mappings below). What other
mechanics booked in the file (`level N solved` and `level N wrong submission` of `progression`, `secret goal
fulfilled` of `goals`) is fed in through the ledger's service (`mint`, `burn`), where the file has it, so that the
balances are the file's; the start points and the entries of the transfers are written by the ledger itself. For
projection 4 the walk stops before the first exile and the resident is banished through the service of `exile`:
the balance of 35 that is burned was reached by the file's entries, not given. The file holds no refused
`transferPoints` call, so no refusal of the ledger is proven by a file.

How projection 6 is set up: at every `turn` entry of the file the named resident gets an activation (one tick per
turn; a stand-in mechanic names who is woken), which delivers its direct messages, and every `postBoard` and
`sendDM` call of a resident is made. Nothing else is fed in. The two calls the file refuses with `TOOL_LOCKED`
(stage `lock`) are made on a second run of the same game whose tools are locked from the start: the lock is
`progression`'s, and a mechanic cannot lock the tool of another mechanic at M3. That proves the kernel's refusal
(code, stage and text), not when a tool opens.

### Left out of projections 4 to 6

The tests print these lists and fail when they change.

| File | Projection | Events of the source left out | Calls left out |
|---|---|---|---|
| `cityofkeys-burn-s7.json` | 4 | the ledger entry of the second exile (`exiled A02`); everything after the first exile | none |
| `cityofkeys-act1-s7.json` | 5 | none of `ledger`: 62 `ledger_entry` and 9 `transfer` are compared; 47 of the entries are fed in through the service | none |
| `cityofkeys-act1-s11.json` | 5 | none of `ledger`: 60 `ledger_entry` and 9 `transfer` are compared; 45 of the entries are fed in through the service | none |
| `cityofkeys-act1-s7.json` | 6 | `channels.board_post` of the city: 19 (authors `CITY` and `COURIER`, kind `city`); `channels.notice`: 38; `channels.gamemaker_note`: 1 | `readBoard`: 3 (the answer lists the city's posts); `postBoard` of the gamemaker: 1 |
| `cityofkeys-act1-s11.json` | 6 | `channels.board_post` of the city: 20; `channels.notice`: 42; `channels.gamemaker_note`: 1 | `readBoard`: 3; `postBoard` of the gamemaker: 1 |

Compared in projection 6, per file: 8 posts of residents, 5 `dm_sent`, 5 `dm_delivered`, 9 `postBoard` calls (one
refused) and 6 `sendDM` calls (one refused). The notices are left out whole, also the one `channels` itself
writes to the sender when a message is delivered: its old text names a receipt and the minute of the file.
The input lines of a turn (level 2) are not compared.

### Registered changes against the files

A projection leaves these out or maps them; nothing else may differ.

| Change | In the file | On the rewritten platform | Why |
|---|---|---|---|
| Additive levels are not dealt | `factors_dealt` for levels 8 to 10; `level_contracted` for levels 5 to 10 after the first exile | no `factors_dealt`; `level_contracted` for levels 5 to 7 | `puzzles` is cut to fragment levels at M3 (specification of M3, section 1.3) |
| `exiled` has a new field | `{ agent }` | `{ agent, by }` | whoever banishes is named; the projection compares `agent` |
| Order after an exile | `exiled`, `resident_suspended`, `factor_burned`, the ledger entry that burns the points, `level_contracted` | `exiled`, `actor_suspended`, the ledger entry, `factor_burned`, `level_contracted` | the ledger is a base mechanic and cannot name `puzzles`, so `puzzles` listens after the ledger (specification of M3, section 2.3, decision 4). Within one source the order is the file's |
| Numbers are renumbered | `postSeq` of a board post, `number` of a direct message, `txId` of a ledger entry | the same fields, counted without the posts, notices and entries of mechanics that are not in the slice | compared after a mapping in order of first appearance |
| The second exile of the burn file is not projected | `A02`, exiled by the second tribunal | not compared | it follows events of `standoff`, which is not ported |
| The answer of a transfer names no receipt | `... · receipt R-0013` | `... · receipt none` | `receipts` is not ported; the old ledger answers `none` without it. The test maps `receipt R-<n>` to `receipt none` |
| A resident is shown by its id | the chosen name in an answer (`to Moss-4196`) | the id (`to A05`) | `names` is not ported. The test maps every name of the file's `name_chosen` events to its id |
| No marks | `posted · #16 · marks 8/8 left` | `posted · #6` | `marks` is not ported. The test cuts ` · marks <n>/<m> left` from the end of an answer |
| The standing of a resident is an option | `progression` events | the option `standings` of `puzzles` | `progression` is not ported at M3; the test computes the option from the file |

