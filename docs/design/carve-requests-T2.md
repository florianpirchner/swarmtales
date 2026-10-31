# Carve requests of team T2 (channels, cast, cores, petitions)

Requests to the integration owner. `mechanics/shared` and the core were not edited; each request
names what is missing or wrong, why, and the exact change, and says what the mechanic does until
then (a local adapter or a stand-in in the tests).

## 1. `gamemaker_note` and `gamemaker_defied` belong to channels

- **What:** move both events to the owner `channels` in `LEGACY_EVENT_OWNERS`
  (`packages/chronicle/src/log/legacy-owners.ts`), as the brief says for step 17.
- **Why:** the gamemaker tools `notify`, `postBoard` and `defy` are channels' now. `notify` writes the
  `notice` with its number; the old `gamemaker_note` line that follows it in the golden logs is still
  written by the gamemaker role (app). Until the owner moves, channels declares neither event, so
  the legacy adapter keeps writing `gamemaker_note` from the role as today.
- **Exact:** `gamemaker_note: "channels"`, `gamemaker_defied: "channels"` (and a declaration in the head
  of channels when the owner moves them).
- **Meanwhile:** channels' `notify` tool writes `notice` only; no change to the golden gate (the
  gate compares owned lines, and `gamemaker_note` is not channels' yet).

## 2. `DmRecord` carries no delivery fields

- **What:** `DmRecord` (`mechanics/shared/src/schemas.ts`) has `id, from, to, minute, answered, text`.
  Blame and the whisper duty also read the minute a DM reached the recipient and the city's last
  message number at delivery (old `deliveredMinute`, `deliveredAfter`).
- **Why:** `ChannelsApi.dmRecords` is the only door to the records.
- **Exact:** add `deliveredMinute: Type.Optional(Type.Integer())` and
  `deliveredAfter: Type.Optional(Type.Integer())` to `DmRecord`.
- **Meanwhile:** channels keeps both in its own slice (version 1) and `dmRecords` returns the shared
  shape without them.

## 3. The whisperer's own core (cores)

- **What:** the old world deals the whisperer the character the story gives it
  (`story.whisperer.core`) instead of the drawn one. Cores cannot know the whisperer: it is chosen by
  whispers (T1) and no event of `mechanics/shared` announces it.
- **Why:** the `core_dealt` line of the whisperer differs in `whispers-f10-grudge`; the gate for cores
  skips that one line.
- **Exact (either):**
  1. a shared `WhispersEvents.whisperer_chosen` (`{ agent }`) that cores listens to, with an option
     `whispererCore` on cores; or
  2. a `CoresApi.override({ resident, bigFive, drives })` command provided by cores and called by
     whispers before the deal, with `whispers` loaded before `cores`.
- **Meanwhile:** cores deals the drawn core to every resident; the gate excludes the whisperer's line.

## 4. `core_dealt` comes after `run_started` in the new log

- **What:** the old world dealt cores in its constructor, so the golden logs have `core_dealt` before
  `run_start`. `runStarted` is the earliest hook, so on the new host the lines follow `run_started`.
- **Why:** the per-mechanic gate does not see it (it filters by owner), but a whole-log golden run
  (carve step 18) will.
- **Exact:** either the legacy adapter moves the `core_dealt` lines before `run_start` (a translator
  for `run_started` that holds the line back), or the host gets a hook that runs before
  `run_started`.
- **Meanwhile:** the deal happens in `runStarted` and again in `minuteStarted` (a no-op once dealt), so
  an old snapshot without cores gets them before the next minute (old behaviour, v09).

## 5. Receipts: `uses` of cast, and the receipt text for the escrow notice

- **What:** the head of cast (frozen in 3.0) lists `requires: [ChannelsApi, ProgressionApi, LedgerApi]`
  and no `uses`. Paying from escrow issues a receipt (old `escrowTransfer`: `#issue` then `notify`).
- **Why:** without `ReceiptsApi` the receipt, its `receipt_issued` line and the notice with the
  receipt line are lost.
- **Exact:** `uses: [ReceiptsApi]` on the head of cast; `test/mechanics/packages.test.ts` does not
  pin cast's `uses`. Done in `mechanics/cast/src/head.ts`; the request is to record it in
  `docs/design/carve-plan.md` (optional edge cast to receipts).
- **Meanwhile:** cast calls `ReceiptsApi.issue` through `tryCall`; with receipts missing the payment
  still happens and nobody is told.

## 6. Cast must load before the script

- **What:** a collection with `afterSolve` is shortened in cast's `minuteStarted`, "before the minute's
  triggers" (old `#endCollectionsAfterSolve`).
- **Why:** hooks run in load order; if the script's `minuteStarted` runs first, its trigger on the
  collection's end sees the old window and fires one minute late.
- **Exact:** load order `cast` before `script` in every story that has collections (`defineCoreStory`
  mechanic lists), or a documented `after` edge in the head.
- **Meanwhile:** the cast tests load cast before the script's driver.

## 7. `cast_dm` does not say who is a new sender

- **What:** the old `onCollect(into, from)` listener ran for each collection in which the DM was the
  sender's first entry (`newSender`). The shared `cast_dm` payload has `collections` only.
- **Why:** the script (T3) cannot tell a first DM from a repeated one on `distinctSenders: false`
  collections.
- **Exact:** none needed on the event if the script reads the fact `cast.collections` (collection to
  the senders of its entries, in order) before and after; otherwise add
  `newSender: Type.Optional(Type.Array(Id))` to `cast_dm` (at the end, after `number`).
- **Meanwhile:** `CastApi.receive` returns `newSender`, but only channels is its caller; channels
  ignores it. Cast exposes `cast.collections`.

## 8. Arena `seenBoard` and the block's board novelty

- **What:** the old arena asked the world for `boardNovelty` per activation (the newest player post a
  resident has seen, and the board's newest at block start and turn open). Channels keeps these maps
  (`seenBoard`, `blockStart`, `turnStart`) and tells the arena through the `news` hook.
- **Why:** the arena's `quiet` decision reads them.
- **Exact:** the turn loop (carve step 18) must call the `news` and `turnOpened` hooks in the
  old order: `turnInputs` (block start), `turnOpened` (turn start), `turnEnded` (turn end).
- **Meanwhile:** the hooks are written and tested for their inputs; the quiet decision is not
  tested end to end.

## 9. `ctx.rng` positions for `drawLottery`

- **What:** the old stream is `rngFor(seed, "lottery", into, salt, minute)`; `ctx.rng("lottery", into,
  salt, ctx.minute)` draws the same. If the host ever moves the minute counter inside a hook, a lottery
  drawn in `minuteStarted` would use the new minute.
- **Why:** nothing to change today; recorded so that nobody changes the labels.
- **Exact:** none.
