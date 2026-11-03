# Carve round 2, team T1 (economy): names, ledger, marks, receipts, whispers

Read first: `carve-decisions.md` (D-1, D-3, D-4, D-5, D-6, D-9, D-10, D-11, D-12). Do not edit
`mechanics/shared`, the core or the testkit; a gap is a request, as in round 1.

## Decisions that affect T1

| Decision | What T1 does |
|---|---|
| D-1 order | whispers' runStarted phase `HOOK_ORDER.runStarted.whispers` (100, before the ledger's 200); ledger's runStarted 200; names' minuteStarted 200; whispers' minuteStarted 600 (duty, then the vote); the `exiled` listener of whispers at `LISTENER_ORDER.exiled.whispers` |
| D-3 task parts | names provides `NamesApi.taskLine`, marks provides `MarksApi.taskLine({ level })` (old `#withMarks`); progression appends them |
| D-4 skip | blame's `ask` returns `skipConsult(reason)` for UNKNOWN_AGENT, SELF_BLAME, ALREADY_BLAMED and every other check the old tool ran before the judge |
| D-5 offences | receipts drops its own blame count; calls `ProgressionApi.chargeBlame` / `nextBlamePenalty` through `uses` |
| D-6 lookups | receipts provides `get`, `list`, `ofTransfer`; blame uses `ChannelsApi.dmRecord`, `boardPost`, `groupPost`, `couldRead`, `lastNumber`; marks provides `priceOf`; marks reads `ProgressionApi.levelOf` (R-10 rejected) |
| D-9 prompts | receipts' `showReceipt` description becomes `{ prompt: "tools/showReceipt", variables: (o) => ({ dmReceipt: { prompt: o.quoteDms ? "tools/showReceipt-receipt-quoted" : "tools/showReceipt-receipt-plain" } }) }`; declare the three prompts; delete `mechanics/receipts/prompts/tools/showReceipt.md` |
| D-10 turn order | gates use `legacyTurns(...)` and compare ballots in order (no sort) |
| D-11 stand-ins | replace `standInWithEvents` (`test/mechanics/t1/stand-ins.ts:17`) with `standIn(id, { events: SHARED_EVENTS })` |
| D-13 R-3 | whispers emits `whisperer_chosen` from `WhispersEvents` (the head already spreads it) |

## Must-fix (`challenge-wave3.md`, T1 section)

1. **Marks loses the level at a door** (`mechanics/marks/src/index.ts:83-90`, migration `:117`):
   read `ProgressionApi.levelOf` through `uses` instead of following `level_up`; drop the level
   from the slice or keep it only as a cache that is never trusted.
2. **Order at run start and minute start** (`ledger/index.ts:120`, whispers): phases per D-1.
3. **Blame's message number at delivery** (`receipts/index.ts:106`, migration `:331`): use
   `ChannelsApi.lastNumber` and `dmRecord(...).deliveredAfter`; migrate the old delivery records;
   group claims through `groupPost` and `couldRead`.
4. **Blame counts twice** (`receipts/index.ts:151`): D-5.
5. **Hand-over test broadened** (`whispers/duty.ts:110`): use `PuzzlesApi.isHandover` (T3 writes
   the old `carriesRun`); stand-in until then reproduces `secrets.ts:10-28` exactly.
6. **The gate counts as in the city** (`whispers/index.ts:96`): `inCity` is `!ExileApi.isExiled`
   (old world.ts:701, 716, 1070), not standing `alive`.
7. **Resume of duty and vote** (`whispers/index.ts:100`, `:332`, `:335`): `playedMinutes` from
   `ctx.minute` (a legacy log has `run_start`, not `run_started`); port `popularity.ts:restore`
   (skip counted rounds; a closed single vote stays the last round); keep forgeries without
   `forgedTo` as `{ minute }`.
8. **`forgeReceipt` only where `showReceipt` is open** (`whispers/index.ts:285`): lock on
   `ctx.access.open(resident).includes("showReceipt")` (old world.ts:1466).
9. **Missing whisperer pieces:** the whisperer's `defy` tool (`#whispererDefies`, world.ts:1463;
   the golden `[tools]` line of A06 lists it); the fact `dutyNow` with the schema of D-8 (old
   `whisperDutyNow`, `busiestPair`, world.ts:1044-1065).
10. **Task lines** (D-3): `NamesApi.taskLine` (also under the closed-door text, world.ts:1563) and
    `MarksApi.taskLine`; use the names option `announcement` (`names/index.ts:32`) or remove it.
11. **Whispers prompt** (D-9): the quoted `showReceipt` description for Whispers.
12. **Later items, now:** R-8 judge order (item D-4); ranks in the judge's question as the old
    `ranking()` (ties by level then id, exiled last; `receipts/index.ts:157`); a cast DM number
    answers "no DM, board post or group post"; the reason "kept no delivery record"; ledger:
    `UNKNOWN_ACCOUNT` for an unopened account, `idempotencyKey`, snapshot order of
    `SYSTEM_MINT_BURN` and zero-balance escrow accounts, the zero-sum check at restore; names and
    whispers migrations of `names` absent and `whispers: null` (old: play without names, pick a
    fresh whisperer); whispers reads receipts through `ReceiptsApi.get/list`, not regexes;
    `switch` with a `never` check in `receipts/book.ts`; texts into prompt files.
13. **Provide completely:** names, marks and receipts provide with `kit.provideSome` since wave 3.5
    (`names/src/index.ts:86`, `marks/src/index.ts:75`, `receipts/src/index.ts:187`); write
    `taskLine`, `priceOf`, `get`, `list`, `ofTransfer` and switch back to `kit.provide`.

## Final shared APIs used or provided

```ts
NamesApi: hasNames, nameOf, labelOf, resolve, taskLine({ resident }): string | null
LedgerApi: (unchanged)
MarksApi: canAfford, left, spend, priceOf({ resident, channel }): number | null, taskLine({ level }): string | null
ReceiptsApi: issue, count, ..., describe, get({ id }): Receipt | null, list({ resident }): Receipt[], ofTransfer({ txId }): string | null
ChannelsApi (used): dmRecords, dmRecord, boardPost, groupPost, couldRead, lastNumber, pendingDms
ProgressionApi (used): levelOf, nextBlamePenalty, chargeBlame
PuzzlesApi (used): isHandover({ text }): boolean
WhispersEvents.whisperer_chosen { agent }
skipConsult(reason) (kernel); ctx.access.open(resident) (core)
```

## Gate

- `pnpm check` green; goldens and `packages/engine` unchanged.
- Per golden: `goldenDiff(ownedBy(lines, [id]), written)` empty for names, ledger, marks,
  receipts, whispers, with the real `goldenCalls` replayed (the ledger gate replays transfers
  through the tools, not the golden bookings; receipts issues from the real issuers, not from
  bodies parsed back out of the golden text).
- `compareReplies` over every golden call of the replayed tools (`nameFavourite`, `forgeReceipt`,
  `getStatus` where T1 parts appear); the duty and vote notices with `goldenNotices`; the task
  lines with `goldenTurnInputs`; `goldenOrder` for whispers with progression and channels.
- Fixtures: blames with pairs and counts, receipts of kinds escrow, deposit and withdrawal, marks
  with `since`, a names snapshot without names, whispers with `null`.
- Every API provided with `kit.provide`.
