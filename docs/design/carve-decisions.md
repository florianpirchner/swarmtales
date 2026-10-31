# Carve decisions of wave 3.5

The integration owner's answer to every request of the four teams (`carve-requests-T1.md` to
`-T4.md`) and to every finding of the challengers (`challenge-wave3.md`) that touches the core,
`mechanics/shared`, the testkit, the legacy adapter or more than one team. Each entry says
**accept**, **accept with change** or **reject** (with the alternative) and gives the final
signature. Findings inside one mechanic go to that team's round-2 brief
(`carve-round2-T1.md` to `-T4.md`) as must-fix items.

What landed in code is marked **built**; everything else is a round-2 task of the named team.

## D-1 The order across mechanics (built)

The load order follows `requires`/`uses` and cannot express "the tribunal ticks before the
standoff" when the tribunal requires what the standoff provides (T4 #4, note). It also put cast's
escrow, the cores and the whisperer after the start points or after `run_start` (T1 #2, T2 #9,
T2 R-4), the minute-start ticks in the wrong order (T2 #2, T2 R-6, T3 #8), and the end of the run
in the wrong order (T2 #3, T3 #6, T4 R5).

**Mechanism (core, no game words).** Every hook except `news` takes a function (order 0), one
phase `{ order, run }`, or a list of phases; a mechanic may run twice in one hook (the door opens
before and after the ticks). The host runs the phases of one hook across all mechanics sorted by
`order`, ties in load order. Every listener (`kit.on`, `kit.listen`, `kit.core`) takes
`{ order? }`; the bus calls the listeners of one event by order, ties in load order, for deferred
and immediate listeners alike. A non-finite order is refused at bind time.

```ts
interface HookPhase<F> { readonly order: number; readonly run: F }
type HookSlot<F> = F | HookPhase<F> | readonly HookPhase<F>[];
interface ListenOptions { readonly immediate?: boolean; readonly order?: number }
const DEFAULT_ORDER = 0;
```

Calls staged inside `runEnded` phases now run before `run_ended` (the director's `onFail` at
run end, T2 #3); a stop between minutes (`host.stop`) runs the phases but no staged calls.

**The table** (`mechanics/shared/src/order.ts`, exported): `HOOK_ORDER` per hook and
`LISTENER_ORDER` per shared event, with the old source of each number. Every carved mechanic
gives each phase and each listener of a shared event the number of this table. Summary:

| Hook | Order (old source) |
|---|---|
| runStarted | whispers 100, ledger 200, cast 300 (escrow), puzzles 400, cores 500, progression 600 (`act_started`, locks), arena 1000 (`run_start`) |
| minuteStarted | cores 50 (old snapshot), progressionDoor 100 (not minute 0), names 200, tribunal 300, seal 400, standoff 500, whispers 600 (duty, then the vote), progressionClock 700, standoffTribunal 800, tribunalActEnd 900, progressionDoorAgain 1000, petitions 1100, cast 1200, script 1300 |
| turnInputs | script 100 (cues), status 200 (every status part and the task: they only read), channelsInbox 800 (mailbox, notices), channelsDigest 900 |
| minuteEnded | arena 1000 (`round_end`) |
| runEnded | progression 100 (`act_ended`), petitions 200, channels 300 (treasuries), arena 1000 (`run_end`) |
| `act_started` | goals 100, seal 200 |
| `act_ended` | seal 100, goals 200 (golden #835 before #836) |
| `level_entered` | cast 100, script 900 |
| `exiled` | channels 100, whispers 200, cast 300, script 900 |

**Proof on the goldens** (`test/mechanics/order.test.ts`): every golden line written outside a
resident's turn (before `run_start`, at a minute's start, `round_end`, the run's end and
`run_end`) is given to the mechanic that wrote it; one stand-in per mechanic writes
its lines in its phase with the table's order, loaded in the reverse of the old order, through
the legacy adapter. The result equals the golden lines byte for byte (without `seq`) for all three
logs; with every order set to 0 it does not, and moving `seal` after `cast` or `goals` before
`seal` fails it. Only the gamemaker's lines are left out (`dropJustified`: the between slot is
step 17, not a hook).

## D-2 Silent shared events (built)

Signals the old engine did with direct calls, declared in `mechanics/shared/src/events.ts`, with
no line in the old log (`LEGACY_SILENT_EVENTS`; the adapter's `LEGACY_SILENT` holds the same list
and drops them; `shared-frozen.test.ts` keeps the lists equal and checks there is no old owner):

```ts
progression.level_entered { agent, level }          // after level_up and the holder notices
progression.act_started   { fromLevel, residents[] } // old #noteActStarts
progression.act_ended     { fromLevel }              // old #endAct
cast.cast_collected       { from, cast, into[] }     // old onCollect listeners
```

- **T3 #1** (director before the holder notices): the script's `onEnter` rules listen to
  `level_entered` with `{ immediate: true, order: LISTENER_ORDER.level_entered.script }`, emitted
  by progression after `notifyHolders`; they land before `submission` as in golden f4g4 483-486.
- **T3 #6, T3 R-11 (act signals), T4 R5**: accept with change. Not a core hook (game words) and
  not `GoalsApi.actStarted/actEnded`: goals and seal listen to `act_started`/`act_ended` by
  `LISTENER_ORDER`. Progression emits `act_started` in its runStarted phase and on entry of an act
  level, `act_ended` from `ProgressionApi.endAct` and in its runEnded phase (not on a pause).
- **T2 R-7, T2 #4** (the feast seat): accept. `CastApi.collected({ from, cast, into }): null`,
  called by channels after it spent the DM's marks with the `newSender` of `receive`; it writes
  `cast_collected`, which the script listens to at once. `cast_dm` stays as frozen.

## D-3 Task-text parts (accepted with change)

**T1 R-2, T3 R-9, T1 #10, T3 #3.** Progression owns the `task` kind and appends the parts of
other mechanics, each through `uses`, in the old order of `#renderTask` (world.ts:1571-1590):

```ts
NamesApi.taskLine({ resident }): string | null       // the choose-name line (also under the closed-door text)
StandoffTribunalApi.taskLine({ resident }): string | null  // the holdout rule (T4b adds it; until then none)
MarksApi.taskLine({ level }): string | null          // "Marks on this level ..."
```

The text is `[task, ...parts].map(trimEnd).join("\n")` with null parts left out. The
`{blamePenalty}` placeholder is progression's own (`nextBlamePenalty`, D-5). The finished notice
is already kind `task`. `NamesApi.announcement` and `MarksApi.taskText` (the requested names) are
replaced by `taskLine`. `StandoffTribunalApi.taskLine` is added to the shared API by T4b in round 2
under the integration owner's review (the fingerprint changes once).

## D-4 Consult skip (built)

**T1 R-8.** Accept. `ask` may return `skipConsult(reason)` (kernel); nothing is asked or logged
and `execute` gets `{ ok: false, reason: "skipped", error: reason }`.

```ts
ConsultDefinition.ask(params, ctx): Static<Q> | Refusal | ConsultSkip
type Consulted<A> = { ok: true; answer: A } | { ok: false; reason: "absent" | "failed" | "skipped"; error: string }
```

## D-5 Offences belong to progression (T1 R-7 rejected, T3 R-5/R-6 accepted)

The challengers called T1 R-7 unsound: the blame count was kept twice and progression's never
climbed. Receipts keeps no count. Shared `ProgressionApi` (built):

```ts
nextPenalty({ resident }): number         // next wrong code in this act
nextBlamePenalty({ resident }): number    // next lost blame; 0 without a ladder
chargeBlame({ resident }): number         // command: the price, the act's count climbs
```

Blame calls `chargeBlame` through `uses`; the legacy `offences.blames` survive a resume in
progression's slice.

## D-6 Lookups (built in `mechanics/shared`; providers implement them in round 2)

| Request | Decision | Final signature |
|---|---|---|
| T1 R-3 receipt of a transfer | accept with change (no reply hook) | `ReceiptsApi.ofTransfer({ txId }): string \| null` |
| T1 R-4 DM receipts by channels | accept | channels calls `ReceiptsApi.issue({ body: { kind: "dm", ... } })` at delivery; no notice on `transfer` |
| T1 R-5 get and list | accept | `ReceiptsApi.get({ id }): Receipt \| null`, `list({ resident }): Receipt[]`, `Receipt = { id, minute, parties, body, text }` |
| T1 R-6 blame lookups, T1 #3 | accept, plus `lastNumber` over every kind | `ChannelsApi.dmRecord({ number })`, `boardPost({ number })`, `groupPost({ number })`, `couldRead({ group, reader, number })`, `lastNumber({})`; `dmRecord` is null for a cast DM (the old `#dms` never held them) |
| T2 #2/R-2, T3 #10 delivery fields | accept | `DmRecord.deliveredMinute?`, `deliveredAfter?` |
| T1 R-9 labelOf | accept (summary fixed) | `NamesApi.labelOf`: `Name (ID)` once chosen, bare id before |
| T1 R-10 marks level | **reject** (unsound) | marks reads `ProgressionApi.levelOf` through `uses`; no level in `MarksApi` |
| T1 R-13 hand-over test, T1 #5 | accept | `PuzzlesApi.isHandover({ text }): boolean` (the old `carriesRun`, normalised forms; never upper-cases plain words) |
| T3 R-1..R-4 puzzles extras | accept, folded into `PuzzlesApi` | `kindOf`, `taskValues`, `holders`, `revealFactor` as in `puzzles-extras` |
| T3 R-7 endAct | accept | `ProgressionApi.endAct({ fromLevel }): boolean` (writes `act_ended`) |
| T3 R-8 holder notice price | accept | `MarksApi.priceOf({ resident, channel }): number \| null` |
| T3 R-10 getStatus, T3 #4/#5 | accept | `ChannelsApi.pendingDms({ resident })`, `ReceiptsApi.list`, core `ctx.access.open(resident)` (the old `enabledTools`, grant order; the standings' `tools` count) |
| T3 R-11 goals | accept with change (act signals are events, D-2) | `GoalsApi.noteLeaders({ leaders })`, `noteHeir({ heir })`, `goalOf({ resident }): { act, kind, target?, text } \| null` |
| T3 R-12, T3 #7 cores | accept | `CoresApi.drivesOf({ resident }): string[] \| null`, `cuesOf({ resident }): string[]`; provided by cores (stub until T2 writes it) |
| T4 R1, T4 #3 | accept with change | `PuzzlesApi.heldPieces({ resident }): HeldPiece[]` (needers in **team-member order** for fragments), `fragmentOf`, `inherited`, `openFragmentDoors({}): number[]` |
| T4 R2 | accept with change (a piece, not a pair) | `StandoffApi.noteGiven({ from, to, piece: HeldPiece }): null` |
| T4 R3 | accept with change | `GoalsApi.noteHeir({ heir })` (once per heir, as the old `noteHeir`), `noteLeaders({ leaders })` |
| T4 R4, T4 #6 | accept | `ExileApi.toGate({ resident, until, ransomable, voters, price, selfPrice }): null` |
| T4 R6 | accept (built in the converter) | the converter copies `holdout.struck` into exile's slice as `holdout.struck`; `ExileApi.exiledBy({ resident }): "tribunal" \| "seal" \| "holdout" \| null` |
| T4 R7 | accept with change (built) | core `ctx.minutes` (story minutes); `ProgressionApi.bounds({}): { startLevel, lastLevel, survivors }` |
| T4 #7 ransom price | accept | `TribunalApi.ransomPrices({}): { price, selfPrice }`; standoff's city price is `ceil(price / 2)` through `uses: [TribunalApi]`, 0 without a tribunal; the copied option is removed |
| T1 R-1 names uses | accept | `namesHead.uses = [PuzzlesApi, ChannelsApi, ExileApi]` |

All of these are in `mechanics/shared` now (fingerprint updated). A provider that has not written
a method yet provides its API with `kit.provideSome` (built: a missing method throws
`<api>.<method> is not implemented`); every such provider switches back to `kit.provide` at its
round-2 gate, so the compiler checks completeness again.

## D-7 Gamemaker notes (T2 #8, T4 R8; accept with change)

One desk, provided by channels: `NotesApi` (`mechanics/shared/src/messages.ts`).

```ts
NotesApi.check({ text, to, as? }): { ok: true, text } | { ok: false, code, detail }  // old #checked
NotesApi.budget({ to }): { used, limit }   // sliding window per recipient (not a host limit)
NotesApi.record({ to, text, number, shown? }): null  // writes gamemaker_note
type NoteTarget = ResidentId | "board" | "tribunal"
```

`check` takes the leak words from `PuzzlesApi` (secrets), the private labels from the app's
`interpretation` events in `ctx.log`, the cores from `CoresApi.cuesOf`, the goals from
`GoalsApi.goalOf`, the whisperer from `WhispersEvents.whisperer_chosen` in the log. Every gamemaker
tool of every mechanic calls `check` in its `rule` and `record` after it wrote. The heading strip
keeps the story's city name (T2 #8). **T2 R-1** accept (built): `gamemaker_note` and
`gamemaker_defied` belong to channels in `LEGACY_EVENT_OWNERS`; channels declares both.

## D-8 Situation data for the gamemaker (T4 #5, T1 #9)

Accept: as facts with these schemas, read by the gamemaker's situation in step 17.

- whispers `dutyNow`: `{ agent, since, nextVote, whispers, recipients: Id[], needWhispers, needRecipients, met, busiest?: [Id, Id] } | null` (old `whisperDutyNow`).
- standoff `outstanding`: `{ holder, needer, level, pieces: HeldPiece[] }[]`; `cityPieces`:
  `{ from, piece: HeldPiece, claimed: Id[], price? }[]`; `unused`: `{ holder, needer, label, level, minute }[]`;
  `ultimatums`: `{ number, between: [Id, Id], until, penalty }[]`; `cityPiecePrice`: number.
- tribunal and seal: the facts their `situation.ts` lines read (`atRisk`, sessions, auction), named in T4's brief.

## D-9 Prompts (T1 R-11, T1 #11; built)

Reject the story override; accept tool descriptions with variables. A tool's `description` is a
plain prompt id or `{ prompt, variables(options) }`; a variable may be `{ prompt }`, another plain
prompt of the mechanic, rendered first (the old `describedAs(text("tools/showReceipt-receipt-plain"))`).

```ts
interface ToolDescription<M> { prompt: keyof M["prompts"]; variables(options): Record<string, string | number | { prompt: PlainPromptId }> }
```

Receipts declares `"tools/showReceipt": ["dmReceipt"]`, `"tools/showReceipt-receipt-plain": []`,
`"tools/showReceipt-receipt-quoted": []`, picks by its `quoteDms` option, and deletes its own
plain `tools/showReceipt.md` so the library's files apply (T1 round 2). No
`stories/whispers/prompts` is needed. `createPromptLookup()` now defaults `mechanics` to
`mechanicPromptFolders()` (every `mechanics/<id>/prompts`), so a host built with the default
lookup finds each mechanic's folder. Story overrides stay refused by `validate`: the old engine
is still the caller and `packages/engine` does not change; they open with step 18.

## D-10 Turn order (T1 R-14 rejected; built)

The challengers called sorting the ballots unsound. Core: `PassView.roster` (every resident, also
suspended ones). Shared: `legacyTurnOrder(view)` (the old `rngFor(seed, "order", minute + 1,
pass).shuffle(roster)` minus who may not act) and `legacyTurns({ passesPerMinute, blockSize,
activation })`, the turn policy of a legacy-compatible story. `test/mechanics/order.test.ts`
proves it on every `pass_start` of the three goldens. Gates compare ballots in order.

## D-11 Testkit stand-ins (T1 R-12; built)

`standIn(id, { events?: EventsDefinition[] })` and `standInsFor(snapshot, loaded, { events })`
declare the events of the definitions whose id is the stand-in's. Tests pass `SHARED_EVENTS`
(the testkit may not import mechanics). Test stand-ins of other teams' APIs use
`kit.provideSome`.

## D-12 Strict gates (built)

`packages/testkit/src/gates.ts`: `goldenDiff` (every difference), `goldenOrder` (owner and type in
log order, the order across mechanics), `goldenNotices(lines, to?)`, `goldenTurnInputs` with
`inputPart(input, prefix)`, `compareReplies(goldenCalls, replies)` (every call, `getStatus`
included) and `dropJustified(items, drop, why)`, the only allowed exclusion (it throws without a
reason or when it drops nothing). `test/mechanics/gate-strict.test.ts` mutates golden lines (every
seventh owned line of every log), swaps two lines of different mechanics, changes a notice text, a
status part and a `getStatus` reply, and expects each helper to fail. **Gate rule for round 2:** a
gate may not sort, strip fields, inject golden lines or filter tools except through
`dropJustified`; it compares owned lines, notices, turn inputs and replies.

## D-13 Other T2 requests

| Request | Decision |
|---|---|
| R-3 whisperer core | accept option 1: `WhispersEvents.whisperer_chosen { agent }` (shared, built); cores listens (order: whispers' runStarted 100 runs before cores' 500) and deals `story.whisperer.core` with an option `whispererCore` |
| R-4 core_dealt before run_start, T2 #9 | accept via D-1 (cores 500 and cast's escrow 300 run before the arena's `run_start` at 1000); no adapter hold-back |
| R-5 cast uses receipts | accept; recorded in the carve plan (optional edge cast to receipts) |
| R-6 cast before script, T2 #2 | accept via D-1 (cast 1200, petitions 1100, script 1300), not by load order |
| R-8 seenBoard, news order | accept; the turn loop calls `turnInputs`, `turnOpened`, `turnEnded` in the old order already; the `seenBoard` migration is a T2 must-fix |
| R-9 lottery rng | no change; labels frozen |
| T2 #1 receipt counted in the same turn | built via D-1: channels' inbox phase 800 runs after every status part (200) |

## D-14 T3 notes and core findings

- Cores before the goals deal: met by D-1 (cores 500 before progression 600, `act_started`).
- Goals does not listen to `exiled`; exile calls `GoalsApi.onExiled` in the old order (kept).
- T3 #9 resume: progression's runStarted does not run on resume; the levels not in the snapshot
  are dealt in progression's first `minuteStarted` phase after a resume (a T3 must-fix; no core change).
- T3 #12 `runEnded` on stop: deferred to step 18. `host.stop(reason)` ends with `stopped` and
  does not pass its reason on; the arena of step 18 ends a "seats decided" run with `minutes`, and
  only a snapshot or brake pause stops the host. Until then progression's skip on `stopped` stays.
- T3 #15 task marked shown: mark in `turnOpened`, never in `turnInputs` (T3 must-fix).
- T2 later: `isGone` must not count the gate as gone; the exile listener in channels is immediate
  with order 100.

## Not changed

Golden files, `packages/engine` and `GOLDEN_UPDATE`. The old engine stays the caller of the
library's prompts until step 18.
