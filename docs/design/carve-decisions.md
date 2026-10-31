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

---

# Round 2 decisions (integrator's second pass, 2026-10-31)

Inputs: `carve-requests-round2-{T1,T2,T3,T4a,T4b}.md` and the shared or cross-team findings of
`challenge-round2.md`. Each entry says accept, accept with change, or reject (with the alternative),
gives the final signatures, and names the team that still has work. The fix-round briefs are
`carve-round3-{T1,T3,T4a,T4b}.md`; T2 works in its own thread and gets its items through this
section.

| Id | Requests and findings | Verdict |
|---|---|---|
| R2-D1 | T1 R2-1, T2 1, T1 challenge 8 | Accept: `LedgerApi.open`, `has`, `idempotencyKey`; strict accounts on |
| R2-D2 | T1 R2-2, T4a 4, T4b R2-2, T1 challenge 3, T4b challenge 1 | Accept with change: in the host, not the converter |
| R2-D3 | T1 R2-3, T1 challenge 2 | Accept: `ctx.roles.has(role)` |
| R2-D4 | T1 R2-4, T4b R2-5 | Accept with change: facts may call queries only |
| R2-D5 | T1 R2-5, T1 challenge 1 and 6 | Accept: channels owns `defy` and `gamemaker_defied` |
| R2-D6 | T1 R2-6, T3 8 | Accept: the old pi argument handling, a bare `INVALID_ARGUMENTS` |
| R2-D7 | T1 challenge 12 | Accept with change: the old `TOOL_LOCKED` text; grants decide "not found" |
| R2-D8 | T2 4 | Accept: `PuzzlesApi.secrets` |
| R2-D9 | T2 5, T3 2, T4b R2-8, T3 challenge A7 | Accept with change: a `runResumed` hook instead of more minute slots |
| R2-D10 | T4b R2-3, T3 1, T3 challenge A5, T4b challenge 2 | Accept: `StandoffTribunalApi.taskLine` |
| R2-D11 | T1 challenge 7, T3 challenge A7 | Accept: a source test of the order rule |
| R2-D12 | T1 challenge 9 | Accept: receipts owns `quoteDms` |
| R2-D13 | T3 5, T3 challenge A2, T4a 5 | Accept: `isOpen` and `open` apply the lock handlers |
| R2-D14 | T2 3, T1 challenge 5 | Accept: `DmRecord.text` optional |
| R2-D15 | T3 challenge A1, T3 6 | Accept: the loader refuses mixed listener modes |
| R2-D16 | T2 2, T3 3, T3 challenge A6 | Accept: the converter copies `delivered`, `seenBoard`, `notes` |
| R2-D17 | T1 challenge 10, T4b R2-7, R2-9, T4b challenge 3 and 9, T4a 10, 12, T2 6 | Accept: the option and grant mapping table for step 17 |
| R2-D18 | T4a 1, 2, 3, T4a challenge 1 and 10 | Accept with change: T4a moves its extras into shared in round 3 |
| R2-D19 | T3 4 | Accept: `CastApi.active` (T2 adds it) |
| R2-D20 | T4a challenge 5, T4b challenge 5, T4a 7 | Reject the split: one notion of exile, an intended change |
| R2-D21 | T2 8 | Reject: suspensions stay unreadable in `load` |
| R2-D22 | T4b challenge 11 | No change: `pnpm test` already excludes `.claude/` |
| R2-D23 | challenger mutants | Accept: a mutation helper in the testkit |
| R2-D24 | T3 9, T1 R2-7, R2-8, T3 6, 7, T4a 6, 8, 9, 11, T4b R2-4, R2-6 | Acknowledged; no core change |

## R2-D1 Ledger accounts

```ts
// mechanics/shared/src/economy.ts, LedgerApi
open: command({ account }, null)          // an account at 0; an open one is left as it is; no event
has: query({ account }, boolean)
mint | burn: command({ account, amount, reason, idempotencyKey?: string }, null)
move: command({ from, to, amount, reason, idempotencyKey?: string }, { ok: true, txId } | { ok: false, code: "INSUFFICIENT_FUNDS" })
```

- A repeated `idempotencyKey` books nothing and returns the first booking's `txId` (old
  `TransferOptions.idempotencyKey`).
- `ledger.strictAccounts` now defaults to **true**, as the old ledger always was: a booking on an
  account nobody opened throws `Unknown account: X`. Accounts that the old code opened are opened
  where it opened them:
  - the cast's escrow at `runStarted` (old world.ts:784), done in `mechanics/cast/src/index.ts`;
  - a group treasury in `createGroup` (old groups.ts:127), done in
    `mechanics/channels/src/group-actions.ts`;
  - a city group (old groups.ts:145), done in `mechanics/channels/src/treasury.ts`.
- Opened accounts at 0 are now in the snapshot, as in the old file.
- **T2:** the resume escrow ("a cast member added after the snapshot", old world.ts:3089) is
  `has`, then `open`, then `mint` with `idempotencyKey: "escrow-<id>"`, in `runResumed.cast`
  (R2-D9).

## R2-D2 Absent slices

A mechanic with no slice in the file gets `slice.load({}, 0)`: the version-0 migration runs on an
empty object. A mechanic whose migration does not take `{}` makes the host throw
`snapshot: no slice for mechanic "<id>", and it does not take an empty version-0 slice (<reason>)`.
This sits in the host (`packages/kernel/src/host/snapshots.ts`), not the converter, so a new-format
file that leaves a mechanic out resumes in the same way.

- Every version-0 migration must accept `{}` and mean "the old file had none of this": names plays
  without names, the seal and the holdout have none, the tribunal has none.
- **T4a, T4b:** remove the slice patches from the resume tests
  (`test/mechanics/seal/seal-snapshot.test.ts:59`, `test/mechanics/standoff/standoff-snapshot.test.ts:91`)
  and resume the real `examples/cityofkeys-act1-06a-04/snapshot-L7.json` through
  `convertLegacySnapshot`.

## R2-D3 Roles

```ts
interface RolesView { has(role: string): boolean }   // packages/contracts/src/core/context.ts
MechanicContext.roles: RolesView                      // every context, tools and hooks
```

`has` is true when the host was created with a caller for the role (`createHost({ roles })`, fixed
at load). D-4 stays: a consult of an absent role is skipped.
**T1:** blame checks `ctx.roles.has("judge")` first and answers
`refuse("JUDGE_ABSENT", "the city's judge is absent")` before the city's checks and `reject()`
(old blame.ts:20).

## R2-D4 Facts call queries

```ts
interface FactView<S, O> {
  call<A, K extends QueryMethodName<A>>(api: A, method: K, input): Output   // throws when not provided
  tryCall<A, K extends QueryMethodName<A>>(api: A, method: K, input): Output | undefined
}
type QueryMethodName<A> = /* the method names of A whose kind is "query" */
```

A command is refused by type, and at run time with
`<id>: a fact may call only queries, not <Api>.<method>`. A fact still writes nothing.
- **T1:** compute whispers' `dutyNow` live in its fact and drop the cache refreshed at minute end
  (challenge 11).
- **T4b:** drop the cached `outstanding`, `unused` and `cityPiecePrice` of the standoff and the
  holdout's `lackingNow`, and compute them in the facts.

## R2-D5 `defy`

Channels owns the `defy` tool and the `gamemaker_defied` event. Whispers no longer has them; I
removed its `defy` tool, `DEFY_REASON`, the event, the `tools/defy` and `replies/defy-recorded`
prompts, the `defiance` option, the lock branch and `defies()`. The packages test lost its
foreign-event exception.
- Story composition (step 17): `channels.defiance` is
  `direction.level >= 10 && direction.defies && story.whisperer?.direction !== undefined`
  (old world.ts:706, which tested `direction`, not `quota`: challenge 6).
- **T2:** `defy` must stay open after a resume, where `whisperer_chosen` is not written again. Lock
  it with a lock handler that reads the whisperer from the state or the log, not only from the
  listener.

## R2-D6 Arguments

The gateway converts the arguments as the old runner's pi-ai did before checking them:
`Value.Convert(schema, withoutOptionalNulls(raw))`
(`packages/kernel/src/host/arguments.ts`, `convertArguments`). Then a failure answers the bare
`INVALID_ARGUMENTS`, with no detail, as the old tool wrapper did. The `replies/core/invalid-arguments`
prompt is gone. Mechanics change nothing; tests that relied on `"5"` being refused must send an
object.

## R2-D7 Locked tools

- A tool that is granted and offered but locked answers the old `TOOL_LOCKED` text:
  "not available to you at this level or in this phase; activeTools lists the tools you can use now".
- "Tool X not found" was pi's own answer for a tool the model was not offered. It stays outside
  the host: the story grants exactly what the old `enabledTools` offered (as `storyToolNames`
  does), and the arena offers `toolSpecs`.
- **T1:** the whispers differential grants like `storyToolNames` and drops the normaliser at
  `whispers-differential.test.ts:72-75`.

## R2-D8 Puzzle secrets

```ts
PuzzlesApi.secrets: query({}, { passwords: string[]; numbers: string[] })
```

The passwords of every dealt fragment level and the all-digit values of additive deals
(`dealValues`), ascending by level, as the old gamemaker's `#secretGuard` collected them.
**T2:** `NotesApi.check` reads it in place of the gathered `solutionOf`, `taskValues` and
`holders`.

## R2-D9 `runResumed`

```ts
// packages/contracts/src/core/mechanic.ts
runResumed?: HookSlot<(ctx: MechanicContext) => void>
// mechanics/shared/src/order.ts
HOOK_ORDER.runResumed = { motives: 100, cast: 200, progression: 300, puzzles: 400 }
HOOK_ORDER.minuteEnded.standoff = 500
```

- The host runs the `runResumed` phases once after restoring a file of a run that had not ended.
  They run at the snapshot's minute, after the referee starts it and before `minute_started`, and
  the writes settle there. This is the old `#restore` tail (world.ts:3083-3125), in its order, at
  its minute.
- Rejected: the requested `minuteStarted.puzzles: 10` and `progressionLocks: 90`. They would run on
  every minute and one minute late (challenge A7).
- **T2/T3:** move to `runResumed`:
  - motives' core deal (now `minuteStarted.motives: 50`);
  - the cast's resume escrow (now `minuteStarted.cores + 10`);
  - progression's door, act starts and locks;
  - puzzles' re-deal (the literal `order: 10` and `progressionDoor - 10` go).
- **T4b:** the standoff's `minuteEnded` has its slot, already wired.

## R2-D10 Holdout task line

```ts
StandoffTribunalApi.taskLine: query({ resident }, string | null)
```

I moved it into shared. The local `StandoffTribunalTaskApi` and `standoffTribunalWorkHead` are gone,
and `standoffTribunalHead` provides it.
**T3:** progression adds `StandoffTribunalApi` to `uses` and appends the line between the names
line and the marks line (old `#withHoldoutRule`, world.ts:1592). Prove it against the 24
`turn_input` lines of `whispers-f10-grudge`, and stop stripping the line in `turns.test.ts:32-41`
and `notices.test.ts:72`.

## R2-D11 The order rule as a test

`test/mechanics/round2-shared.test.ts` scans the mechanics' sources. A hook phase the order table
covers may not be a plain function, which would be order 0.
- The T1 `turnInputs` hooks (names, ledger, marks, receipts, whispers) now use
  `HOOK_ORDER.turnInputs.status`.
- Pending: `channels:runStarted` (T2) and `whispers:minuteEnded` (T1). The test fails when either
  gains a slot, so the list cannot go stale.

## R2-D12 `quoteDms`

Receipts owns the story flag. **T2:** channels always passes the DM text to receipts and drops its
own `quoteDms` option (`messages.ts:190`).

## R2-D13 Open tools

```ts
interface AccessPort {
  open(resident): string[]              // granted, loaded, not locked, and no lock handler refuses
  isOpen(resident, tool): boolean
}
```

- `open` and `isOpen` ask every tool's lock handlers (the pipeline `lock` phase) with
  `params: undefined`.
- A probed handler must not emit: the host throws `access: a lock handler must not emit while it is only asked whether X is open for Y`.
- A handler must not ask about its own tool again: re-entrancy throws.
- A lock handler that needs another tool's state uses `isOpen(resident, otherTool)`, never `open()`.
  Whispers' `forgeReceipt` now does this.
- **T3:** `getStatus` and `activeTools` stay on `ctx.access.open` and now list what the old
  `enabledTools` listed. Write the gate lock of `submitSolution` (old world.ts:1446-1448) as a
  progression lock handler that reads `ExileApi.standing`, and test the f4g4 `getStatus` at
  minute 5 (no `chooseName`).

## R2-D14 Optional DM text

`DmRecord.text` is `Type.Optional(Type.String())`.
- Readers that need a string use `text ?? ""`.
- **T2:** channels stops turning a missing text into `""` in `dmRecordOf`.
- **T1:** blame's "kept no delivery record" (`blame.ts:198`) and the fall-through at `:177` get a
  differential with an old DM without text.

## R2-D15 Listener modes

Immediate listeners run inside the emit, before any deferred ones, whatever their order numbers. So
the loader now refuses two ordered listeners of one event (order other than the default) that differ
in `immediate`, with
`story: X and Y order their listeners of <src>.<type>, but only one is immediate; ...`.

The seal's `act_started` and `act_ended` listeners are immediate now, like the goals', so
`LISTENER_ORDER.act_ended` (seal 100, goals 200) applies (golden f10g10 #835-837).
**T3/T4b:** the real-mechanics order test `goldenOrder([... "goals", "seal"])`.

## R2-D16 Converter copies

`convertLegacySnapshot` copies three arrays into the version-0 slices, each only when the old file
has it as an array:
- `arena.delivered` into progression's `delivered`;
- `arena.seenBoard` into channels' `seenBoard`;
- `gamemaker.notes` into channels' `notes`.

`toLegacySnapshot` leaves those keys out of the mechanic data it puts back, so the round trip stays
byte-equal. **T3:** `migrateV0` reads `delivered` (`finished` per resident), and mutant M10 dies.

## R2-D17 Story option and grant mapping (step 17)

| Mechanic option or grant | From the old story |
|---|---|
| `names.reserved` | `[...Object.keys(story.cast), story.city]` (old world.ts:675) |
| `names.announcement` | `story.names.announcement`. **T1:** no `""` default; the option is required when names is loaded |
| `receipts.minRun` | the `postBoard` guard rule's `secrets.minRun`, only when the story has a tool guard |
| `receipts.quoteDms` | `story.rules.receipts.quoteDms` (R2-D12) |
| `ledger.strictAccounts` | always true |
| `channels.defiance` | R2-D5 |
| author name (holdout, notes) | `story.gamemaker.name`, one place (T4b R2-9) |
| `tribunal` | `tribunal.with(story.tribunal)` (T4a 12) |
| `ultimatum` | granted to the gamemaker only at direction 10 with `rules.ultimatum` (gamemaker.ts:214, :375). **T4b:** standoff's `direction` option goes |
| `defy`, `forgeReceipt`, `nameFavourite`, `tribunalVote` | granted per feature, as `enabledTools` did |
| `resolvePetition` | granted to `script` (T2 6) |
| `scheduleTribunal` | offered by a lock handler that reads `TribunalViewApi.schedulingWindow` and a director in the city (T4a 10) |
| standoff-tribunal | loaded only with a gamemaker (old world.ts:736; T4b challenge 9) |

## R2-D18 T4a's extras into shared

T4a moves its local APIs into `mechanics/shared` in round 3, with the exact shapes it has now:

```ts
ExileApi.gates: query({}, GateView[])
ExileApi.exiled: query({}, ResidentId[])
ExileApi.ransomed: query({ resident }, boolean)
TribunalApi.text: query({ key, values }, string)
TribunalApi.bequestPerHeir: query({}, number)
TribunalViewApi = { schedulingWindow, cityCall, stop, atRisk }   // shared, as in view-api.ts
```

- Pin `uses(exileHead) == ["seal", "goals", "tribunal"]` on the head the mechanic really loads, and
  delete the unused heads (challenge 10).
- The readers (the run's stop rule, the gamemaker's tribunal section, the `scheduleTribunal` offer)
  are steps 17 and 18. The fact must exist and be proven against old `situation.ts:264-294` now.

## R2-D19 Active cast

```ts
CastApi.active: query({}, { id: string; level: number }[])
```

**T2** adds it. **T3** then lists cast members in `listAgents` (old world.ts:1407-1413) with a
golden comparison.

## R2-D20 One notion of exile (rejected split)

The new seal, tribunal and goals read `ExileApi.standing`, which counts a holdout strike. The old
seal and tribunal knew only the tribunal's exile. I reject keeping two notions. A resident struck by
the holdout is out of the city for every mechanic, which is what a reader of the story expects. No
current story loads the holdout with the seal or the tribunal, so no golden or live run changes.
`docs/LESSONS.md` gets no row (no run showed it). The behaviour is intended and documented here; the
tests stay as they are.

## R2-D21 Suspensions in `load` (rejected)

`load` and migrations stay pure functions of the slice. Mechanics read `ExileApi.isExiled`, or
`!mayAct` at run time, as T2 does now.

## R2-D22 Test hygiene

The `pnpm test` script already runs `vitest --run --exclude '.claude/**'`. The challenger ran vitest directly; `pnpm test`
is the gate.

## R2-D23 Mutation helper

`packages/testkit/src/mutation.ts` applies one listed source change in a hard-linked temp copy and
runs the named tests. Its verdict is `killed`, `survived` or `broken`. The round-3 gates list their
mutants as data, and `pnpm mutants <list.json>` re-runs them.

## R2-D24 Acknowledged

- `uses` entries added in round 2 (progression `NamesApi`, T3 9) are fine. The frozen test covers
  `provides` and `requires`; `uses` pins are per mechanic.
- No core change for:
  - `turnInputs` with `legacyTurns` (T1 R2-8);
  - the script's `onEnter` order (T3 6);
  - `runEnded` on a stop (D-14);
  - the `#onExiled` order (T4a 6);
  - the T4 #4 scenario (T4a 8, a round-3 differential);
  - `callTribunal` ownership (T4a 9);
  - refusal order (T4a 11);
  - two `permaDeath` tools (T4b R2-4);
  - the T3 methods (T4b R2-6, stale).
