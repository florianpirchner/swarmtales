# Carve requests of team T1 (economy)

Gaps found in the frozen APIs of `mechanics/shared` while carving names, ledger, marks, receipts and
whispers. Nothing in `mechanics/shared` was edited. Each request names what is missing, why, the exact
signature wanted, and the local adapter T1 uses until it lands. The integration owner decides.

## R-1 Names needs ChannelsApi and ExileApi

`names` posts the choice board announcement and the "X is now called Y" notice through `ChannelsApi`
and hides the "you are" status part of an exiled resident through `ExileApi`. Both are in `uses` of
the head, so `test/mechanics/packages.test.ts` (`uses(namesHead)`) changed from `["puzzles"]` to
`["puzzles", "channels", "exile"]`. Alternative: channels listens to `name_chosen`.

## R-2 Task-text parts (`#withMarks`, the choose-name text)

The old task input appends the choose-name line and the marks line to the level text. No API lets
progression ask the owners. Wanted: `NamesApi.announcement({ resident }): string | null` (query) and
`MarksApi.taskText({ resident, level }): string | null` (query). Local adapter: none (the lines are
missing from the task input until progression reads them).

## R-3 The receipt id for the transfer reply

`transferPoints` replies `... receipt R-xxxx`. `ReceiptsApi` has no way for the ledger to learn the id
of the receipt receipts issues on `transfer`. Local adapter: the ledger reads the
`receipts.receipt_issued` event from `ctx.log.since(before)` after emitting `transfer` (the listener is
immediate). Wanted: a reply hook, or `ReceiptsApi.lastIssuedFor({ txId }): string | null`.

## R-4 DM receipts are issued by channels

A DM receipt is issued at delivery (old `dm_delivered`). The frozen events list only `dm_sent`.
Channels must call `ReceiptsApi.issue({ body: { kind: "dm", from, to, number, text? } })` at delivery
(receipts strips `text` unless its option `quoteDms` is set) and send the sender the delivery notice.
Channels must not also notify on `transfer`: receipts already notifies the recipient (double notice).

## R-5 ReceiptsApi lacks get and list

`forgeReceipt` (whispers) needs a receipt by id and the receipts of a resident. Wanted:
`ReceiptsApi.get({ id }): (ReceiptBody & { id, minute, parties }) | null` and `ReceiptsApi.list({
resident }): array of the same`. Local adapter: whispers parses the `receipt_issued` events (id, kind,
parties, text) and reads number, sender, recipient, minute and quoted text back from them.

## R-6 ChannelsApi lacks the lookups of blame

Blame needs a DM's delivery (minute and the message number at delivery), a board post by number, and
group posts and whether a reader could read one. Local adapter: DMs and board posts from the
`channels` events in the log, the delivery from the dm receipt (minute) and from the highest numbered
`dm_sent` at issue time (`deliveredAfter`). Group claims are not supported (gap). Wanted:
`ChannelsApi.dmRecord({ number })` with `deliveredMinute` and `deliveredAfter`,
`ChannelsApi.boardPost({ number })`, `ChannelsApi.groupPost({ number })`,
`ChannelsApi.couldRead({ group, reader, number })`.

## R-7 Blame counts per act

The loser's price climbs with its lost blames in the act (the old `offences`, owned by progression's
act bookkeeping). No API exposes it. Local adapter: receipts counts itself and resets when
`ProgressionApi.currentAct` changes; a resumed run starts the counts at zero (the legacy count is lost).

## R-8 The consult stage cannot skip the judge

When the city's own checks already reject a blame, the old tool settled it without asking the judge.
The consult stage asks first (`ask` may only refuse, not skip). Result: a judge call is wasted on a
blame that is rejected anyway, and the judge is "absent" before the checks run. Wanted: `ask` may
return a `skip` marker so `execute` runs with `{ ok: false, reason: "skipped" }`.

## R-9 NamesApi.labelOf

The summary says "name or id"; the old behaviour (and the one implemented) is `Name (ID)` once a name
exists, the bare id before.

## R-10 MarksApi carries no level

`MarksApi` has no level argument, so marks follows `progression.level_up` and a `startLevel` option.
The refill needs no job: it is booked lazily on every read, as before.

## R-11 Tool descriptions with variables

`showReceipt`'s library description takes the variable `dmReceipt`; a tool description must be a
variable-less prompt id. receipts ships `mechanics/receipts/prompts/tools/showReceipt.md` (the plain
variant). The Whispers story overrides it with the quoted variant in its own prompt folder. A host must
be given the mechanic's prompt folder (`createPromptLookup({ mechanics: { receipts: dir } })`); the
default lookup finds the library file and refuses it (variables differ).

## R-12 Resume tests and shared events

`standIn(id)` of the testkit declares no events, so a loaded listener of `progression.level_up` fails
the loader check. T1's tests use `standInWithEvents(ProgressionEvents)` (in `test/mechanics/t1`).
Wanted: `standIn` spreads the events of a known `EventsDefinition` for its id.

## R-13 Fragments for the whisper tally

The whisperer's tally excludes DMs that hand over a door's fragment. `PuzzlesApi` offers no list of
fragments. Local adapter: whispers reads the `fragments_dealt` events from the log and matches runs of
3 characters (the old `carriesRun` also normalised code-like forms such as spaced or dashed text; that
part is simplified). Wanted: `PuzzlesApi.isHandover({ text }): boolean`.

## R-14 Turn order differs from the legacy shuffle

The popularity ballots of a minute come in the host's turn order, not the legacy order, so the
whispers gate compares ballots of one run as a sorted set (everything else in order).
