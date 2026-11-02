# Carve round 2, team T2 (messages): channels, petitions, cast, cores

Read first: `carve-decisions.md` (D-1, D-2, D-6, D-7, D-12, D-13). Do not edit
`mechanics/shared`, the core or the testkit; a gap is a request.

## Decisions that affect T2

| Decision | What T2 does |
|---|---|
| D-1 order | channels' turnInputs: status parts at `HOOK_ORDER.turnInputs.status` (200), the mailbox and notices at `channelsInbox` (800), the digest at `channelsDigest` (900); channels' runEnded `settleTreasuries` at 300; petitions' minuteStarted 1100 and runEnded 200; cast's runStarted escrow 300 and minuteStarted 1200; cores' runStarted 500 and minuteStarted 50; listeners of `exiled` at `LISTENER_ORDER.exiled.channels` / `.cast` |
| D-2 | channels calls `CastApi.collected({ from, cast, into: newSender })` after it spent the marks; cast writes `cast_collected` |
| D-6 | channels provides `dmRecord`, `boardPost`, `groupPost`, `couldRead`, `lastNumber`, `pendingDms`, and `deliveredMinute`/`deliveredAfter` in `DmRecord`; cast uses `ReceiptsApi` (R-5) |
| D-7 | channels provides `NotesApi` (the old `#checked`, budgets as a sliding window per recipient, `gamemaker_note`); declares `gamemaker_note` and `gamemaker_defied` (now owned by channels) |
| D-13 R-3 | cores listens to `WhispersEvents.whisperer_chosen` and deals `story.whisperer.core` (option `whispererCore`); provides `CoresApi.drivesOf`, `cuesOf` |

## Must-fix (`challenge-wave3.md`, T2 section)

1. **Status line counts a receipt of the same turn** (`channels/src/hooks.ts:28-38`): split
   `turnInputs` into phases: the `dmWindow` status part at 200, the mailbox at 800 (D-1). Test
   with the real channels and receipts: golden f10g10 seq 251, A05 shows "2 receipts".
2. **Minute-start order** (`petitions/src/index.ts:108-110`, `cast/src/index.ts:111-119`):
   phases 1100 and 1200 (golden f10g10 769-771: `board_post`, `seal_auction_opened`,
   `collection_shortened`).
3. **Run end** (`channels/src/index.ts:56`, `petitions/src/index.ts:111`): phases per D-1; the
   petition `onFail` actions at run end are staged calls, which now run before `run_ended`.
4. **The feast seat** (`channels/src/messages.ts:129`): D-2; test with
   `stories/cityofkeys/story.ts:666,672` (`onCollect("feast", FEAST_SEAT)`).
5. **Migration from version 0** (`channels/src/state.ts:130-134`): restore `exiled` from the
   host's suspensions or the exile slice, never `[]`; migrate the arena's `seenBoard` (L7: A01 at
   98, A02 at 95, ...) into `seen`, so `news()` (`hooks.ts:47-53`) matches the old arena.
6. **Whisperer core** (`cores.test.ts:67-76`): D-13; drop the gate's exclusion.
7. **Delivery fields** (`channels/src/index.ts:33`): fill `deliveredMinute` and `deliveredAfter`.
8. **Gamemaker tools** (`channels/src/gamemaker.ts`): `defy` and `gamemaker_defied`; the leak,
   private-thought, core, role and repeat checks through `NotesApi.check`; budgets as the old
   sliding window (`gamemaker.ts:452-456`); the heading strip keeps "`<city> minute 30:`"
   (`gamemaker.ts:25`).
9. **Before `run_start`:** cores (500) and the escrow mint (300) in runStarted phases (D-1); the
   order test proves the golden order.
10. **Later items, now:** `isGone` (`messages.ts:29-31`) counts the gate as in the city
    (`ExileApi.isExiled`); the `exiled` listener immediate with order 100; two petitions expiring
    in one minute interleave as the old (resolve, post, actions, then the next): run each petition
    as its own staged chain; `createGroup` opens the ledger account at once; DM records without
    text stay absent, not `""`; afterSolve collections shortened in the story's rule order; texts
    into prompt files (petition visibility and signers, group description lines).
11. **Provide completely:** channels, cast and cores provide with `kit.provideSome` since wave 3.5
    (`channels/src/index.ts:23` and the empty `NotesApi`, `cast/src/index.ts:46`, the empty
    `CoresApi` in `cores/src/index.ts`); write the methods and switch to `kit.provide`.

## Final shared APIs

```ts
ChannelsApi: ..., dmRecords, dmRecord({ number }), boardPost({ number }), groupPost({ number }), couldRead({ group, reader, number }), lastNumber({}), pendingDms({ resident })
DmRecord: { id, from, to, minute, answered, text, deliveredMinute?, deliveredAfter? }
NotesApi: check({ text, to, as? }), budget({ to }), record({ to, text, number, shown? }); NoteTarget
CastApi: ..., receive, collected({ from, cast, into })
CoresApi: drivesOf({ resident }): string[] | null, cuesOf({ resident }): string[]
CastEvents.cast_collected (silent); WhispersEvents.whisperer_chosen
```

## Gate

- `pnpm check` green; goldens and `packages/engine` unchanged.
- **Channels:** replace the five sorted streams of `test/mechanics/channels/replay.ts` with
  `goldenDiff(ownedBy(lines, ["channels"]), written)` in log order. No golden line injected
  (`:130-137`); city posts and notices come from the real callers or stand-ins that call
  channels. Delivery notices keep their minute and receipt id (`:74-77`, `:88-94`). Locked and
  guard-blocked calls run through the pipeline. `goldenNotices` equal for every recipient.
- **Cast:** no `cast_revealed`/`collection_started` injection (`cast.test.ts:170-174`); the
  options come from the story.
- **Petitions:** a differential test against the old director on a scripted petition
  (no golden has one), and a resume with open petitions.
- **Turn inputs:** the `dmWindow` part, the `[unread]` digest and the notice lines equal
  `goldenTurnInputs` for every turn of the three goldens.
- **Order:** `goldenOrder(lines, ["channels", "receipts", "seal", "cast", "petitions", "script"])`
  equals the golden around every minute start and the run's end.
- Version-0 fixtures: a non-empty mailbox with an unnumbered entry, open petitions, collections
  with entries, a removed city group, exiled residents, a DM record without text.
- Every API provided with `kit.provide`.
