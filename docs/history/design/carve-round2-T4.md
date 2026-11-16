# Carve round 2, team T4 (conflict): exile, tribunal, seal, standoff-tribunal, standoff

> **Carried from the old platform.** This paper was written for the old platform, before the rewrite, and is kept as
> it was, except for its links. Links to the other papers of [`docs/history/`](../README.md) stay relative; paths into
> code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do not exist on this
> branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Round 1 carved only `standoff`; `exile`, `tribunal`, `seal` and `standoff-tribunal` are still the
empty wave-3.0 heads (`mechanics/{exile,tribunal,seal,standoff-tribunal}/src/index.ts`). Round 2
carves all four completely and fixes standoff. Read first: `carve-decisions.md` (D-1 order, D-2
act events, D-6 lookups, D-7 notes, D-8 situation facts, D-12 gates), `carve-plan.md` steps 11-15
and 17, `mechanic-api.md`.

## Split: two sub-teams, parallel-safe

| Sub-team | Mechanics | Old sources (lines) |
|---|---|---|
| **T4a** | exile, tribunal (with factions, tribunal rules, ransom, wills) | `tribunal.ts` 940, `factions.ts` 320, `tribunal-rules.ts` 155, world.ts `isExiled` 816-818, `standingOf` 821-824, `payRansom` 2616-2626, `lastWill` 2730-2787, `#onExiled` 2795-2819, `vote` 2593, `nominate` 2599, `joinFaction` 2605, `refuseApplicant` 2611, `tribunalParts`/`draftParts` in turn-input.ts |
| **T4b** | seal, standoff-tribunal, and the standoff must-fixes | `seal.ts` 260, `holdout.ts` 673, world.ts `#seal` 928-937, `#holdout` 1137-1253, `#onStruck` 1263-1277, `#withHoldoutRule` 1592, `sealParts`/`holdoutParts` in turn-input.ts |

The suggested split (T4a exile + seal, T4b tribunal + standoff-tribunal) is not used: exile's
gates, ransom and wills live in the old `Tribunal` class, so splitting exile from tribunal would
have two teams editing one port at once. Exile + tribunal share it; seal and the holdout are each
self-contained and only call into exile.

**What each needs from the other** (all signatures are frozen in `mechanics/shared`; each side
tests against a stand-in of the other built with `kit.provideSome`):

- T4b needs from T4a: `ExileApi.strike({ resident, by: "seal" | "holdout" })`, `isExiled`,
  `standing`, `alive`, `exiledBy`; `TribunalApi.missing({})` (the seal is refused at 0).
- T4a needs from T4b: `SealApi.onExiled({ resident })` (through `uses`, in the old `#onExiled`
  order). Nothing else.
- Both need from T1-T3 (they implement in their round 2, stand-ins meanwhile): `PuzzlesApi.heldPieces`,
  `fragmentOf`, `inherited`, `openFragmentDoors`, `burn`, `contract`; `ProgressionApi.bounds`,
  `endAct`, `nextBlamePenalty`, `chargeBlame`, `lastProgress` (with the old -1 mapping); `GoalsApi.onExiled`,
  `noteLeaders`, `noteHeir`, `goalOf`; `NotesApi.check`/`record`; `MarksApi.priceOf`.
- The core gives `ctx.minutes` (story minutes) and the phase orders of `HOOK_ORDER`.

Neither sub-team edits `mechanics/shared`, the core, the testkit or the other sub-team's folder.
A missing shared method is a request to the integration owner, as in round 1.

## Must-fix (challenger findings, `challenge-wave3.md` T4 section)

1. **Four mechanics not implemented** (`mechanics/{exile,tribunal,seal,standoff-tribunal}/src/index.ts`).
   Golden-visible: `seal_auction_opened` (f4g4/f10g10 #770), `seal_expired` (#835, before
   `goal_resolved`), five `blocker_found` (whispers #152-#156), the seal and holdout status parts
   in `turn_input`. Random streams exactly: `rngFor(seed, "tribunal", minute)` (tribunal.ts:845),
   `("factions", tribunal)` (factions.ts:211), `("seal", seal)` (seal.ts:228),
   `("holdout-lot", lots)` (holdout.ts:586), through `ctx.rng(...)`.
2. **Standoff gate tests nothing** (`test/mechanics/standoff/standoff.test.ts:213`: no minute
   played, `[]` against `[]`). T4b: replay `goldenCalls` and compare `ownedBy(..., ["standoff"])`,
   the `held` status part (`inputPart(input, "[status]")`, e.g. f10g10 "you hold for others:
   Moss-4196 door 9 team certificate 026488") and the resume of `snapshot-L7` with `standInsFor`.
3. **Needer order** (`mechanics/standoff/src/holdings.ts:61`): take `PuzzlesApi.heldPieces` (team-member order, old world.ts:2689-2693) and delete the log-reading adapter.
4. **Minute-start order** (`mechanics/standoff/src/index.ts:194`): phase `HOOK_ORDER.minuteStarted.standoff` (500); tribunal 300, seal 400 (D-1).
5. **Situation data** (`mechanics/standoff/src/index.ts:202`): facts `outstanding`, `cityPieces`,
   `unused`, `ultimatums`, `cityPiecePrice` with the schemas of D-8; tribunal and seal add theirs.
6. **R2:** replace the `noteText` adapter with `StandoffApi.noteGiven({ from, to, piece })`.
7. **Ransom price copy** (`mechanics/standoff/src/index.ts:26`, `:73`): remove the option; use
   `TribunalApi.ransomPrices({}).price` through `uses: [TribunalApi]` (ceil of half, 0 without a
   tribunal); the register is the tribunal's own exiles (`ExileApi.exiledBy !== "holdout"`).
8. **Later items** (do them, they are cheap now): ultimatum gating by the gamemaker's dial
   (gamemaker.ts:214, :375); status text into prompt files (`competitor/status/held`,
   `held-piece`); sorted hand-overs in the slice (old snapshot order); fixtures from a real old
   file with `city`, `ultimatums` and a missing `givenAt`; `heldAll` cost goes with item 3.
9. **Provide completely:** standoff provides `StandoffApi` with `kit.provideSome` since wave 3.5
   (`mechanics/standoff/src/index.ts:171`); switch back to `kit.provide` once `noteGiven` is written.

## Ordered work plan

### T4a (exile, then tribunal)

1. **Exile state and slice.** State: gates (`{ resident, until, ransomable, voters, price,
   selfPrice }`), exiled (`{ resident, by, minute }`), ransomed. Version-0 migration reads slice
   key `tribunal` (gates, exiled, ransomed) and key `holdout.struck` (the converter's copy, by
   `holdout`). Resume fixture: `snapshot-L7` plus a hand-made old file with a gate and a struck resident.
2. **ExileApi queries.** `isExiled` (the gate counts as in the city, as old `isExiled`; T1 #6 and
   T2 "isGone" depend on it), `standing`, `alive` (story order), `exiledBy`.
3. **Exile commands.** `strike({ resident, by })` (no gate, no will, no ransom; old `#onStruck`),
   `toGate(...)` (writes `exile_gate`, notifies), the gate closing at `until` in a `minuteStarted`
   phase of order `HOOK_ORDER.minuteStarted.tribunal` (300, before the standoff at 500).
4. **`#onExiled` in the old order:** pieces (`StandoffApi.keep`), burn (`PuzzlesApi.burn`), goal
   (`GoalsApi.onExiled`), seal (`SealApi.onExiled`), contraction (`PuzzlesApi.contract`), then
   `exiled` (shared event) and the suspension. Listeners of `exiled` use `LISTENER_ORDER.exiled`.
5. **Tools `payRansom` and `lastWill`** with their replies, `ransom_paid`, `ransomed`,
   `last_will`; wills call `StandoffApi.noteGiven` per piece and `GoalsApi.noteHeir` per heir.
6. **Tribunal sessions:** schedule, announce, call, open, vote, result (`tribunal.ts`), the rng
   `("tribunal", minute)`, gamemaker tools `scheduleTribunal`, `callTribunal` (`serves:
   ["gamemaker"]`, `NotesApi.check` in `rule`, `record` after), `missing`, `inSession`,
   `ransomPrices`. The tribunal's act end in a phase of order `tribunalActEnd` (900) calls
   `ProgressionApi.endAct({ fromLevel })`.
7. **Factions** (`factions.ts`): `nominate`, `join`, `refuse`, the draft, `bloc_result`, rng
   `("factions", tribunal)`, `GoalsApi.noteLeaders` on `faction_leaders`.
8. **Status parts** `standing` (900) and `tribunal` (910) in a `turnInputs` phase of order
   `HOOK_ORDER.turnInputs.status`; prompts in files.
9. **Facts** for the situation (`atRisk`, sessions, factions) with schemas in the PR.

### T4b (seal, then standoff-tribunal, then standoff)

1. **Seal state and slice** (`seal.ts`): auction, bids, bearer; version-0 migration.
2. **Act listeners:** `act_started` with `LISTENER_ORDER.act_started.seal` (200, after the goals
   deal) begins the act's seal; `act_ended` with `LISTENER_ORDER.act_ended.seal` (100) ends it and
   writes `seal_expired` before the goals resolve (golden #835).
3. **Seal tick** in a phase `HOOK_ORDER.minuteStarted.seal` (400): `seal_auction_opened` (golden
   #770 after its `board_post`, before cast's `collection_shortened`), bids, `seal_won`; rng
   `("seal", seal)`. Tools `bid` and the resident `permaDeath` (calls `ExileApi.strike` with `by:
   "seal"`, refused while `TribunalApi.missing` is 0). `SealApi.onExiled`. Status part `seal` (1000).
4. **Holdout** (`holdout.ts`): blockers in a phase `HOOK_ORDER.minuteStarted.standoffTribunal`
   (800; whispers m3 `blocker_found` x5), sessions, ballots, lots with rng `("holdout-lot", lots)`,
   strikes through `ExileApi.strike({ by: "holdout" })`. Tool `tribunalVote`; gamemaker tools
   `callTribunal`, `drawLot`, `announceTribunal`, `permaDeath` (`serves: ["gamemaker"]`, notes
   through `NotesApi`). `exemptFromCap`. Status part `holdout` (1400).
5. **Holdout task line:** request `StandoffTribunalApi.taskLine({ resident }): string | null` from
   the integration owner (D-3; the old `#withHoldoutRule`), implement it; progression appends it.
6. **Standoff must-fixes** 2-9 above.

## Final shared APIs (frozen; full schemas in `mechanics/shared/src/conflict.ts`)

```ts
ExileApi: isExiled, standing, alive, exiledBy({ resident }), toGate({ resident, until, ransomable, voters, price, selfPrice }), strike({ resident, by })
TribunalApi: missing({}), inSession({}), ransomPrices({}): { price, selfPrice }
SealApi: onExiled({ resident })
StandoffTribunalApi: exemptFromCap({ from, to })   // + taskLine (step 5, via the integration owner)
StandoffApi: heldPieces, keep, noteText, noteGiven({ from, to, piece }), cityPiecePrice
ExileEvents.exiled; ProgressionEvents.act_started / act_ended (silent)
HOOK_ORDER / LISTENER_ORDER (mechanics/shared/src/order.ts)
```

## Gate (per sub-team; all of it, no exclusion without `dropJustified`)

- `pnpm check` green; goldens and `packages/engine` unchanged; no `GOLDEN_UPDATE`.
- Every golden log: `ownedBy(lines, [id])` equals what the mechanic writes for the replayed
  `goldenCalls` (`goldenDiff` empty); the replies equal (`compareReplies`, `getStatus` included);
  the mechanic's status parts equal `inputPart(..., "[status]")` of the golden turn inputs;
  `goldenOrder` across the mechanic and its neighbours equals the golden (T4b: seal with goals
  and cast; holdout with whispers).
- No golden has tribunal, ransom, will or holdout-session lines, so each old path gets a
  **differential test**: the same scripted scenario on the old `World` (packages/engine, read
  only) and on the new host, compared line by line through the legacy adapter. Scenarios at least:
  a gate that closes while an ultimatum is due (T4 #4), a ransom paid and one refused, a will with
  two pieces of the same value, a faction draft, a seal won and used, a holdout lot and a strike.
- Resume of `snapshot-L7` with `standInsFor(..., { events: SHARED_EVENTS })`, plus version-0
  fixtures with gates, exiled, ransomed, a running auction and a holdout session.
- Every API provided with `kit.provide` (not `provideSome`).
