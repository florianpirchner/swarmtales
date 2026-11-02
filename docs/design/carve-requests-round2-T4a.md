# Carve round 2, team T4a (exile, tribunal): requests to the integration owner

Team T4a carved `exile` and `tribunal` (docs/design/carve-round2-T4.md). Core, `mechanics/shared`
and the testkit stay unchanged; where a shared interface is missing, the mechanics use a local
adapter (the pattern of round 1: an API defined word for word in both packages, matched by name
by the host, kept equal by a test) and the request below asks to make it shared.

## Requests

1. **`exile-extras` into `ExileApi`.** The tribunal reads three things of the exile beyond the
   frozen API: `gates({})` (old `Tribunal.gates()`: the gate views with prices, paid, covered,
   will written), `exiled({})` (who left through the gate or by the seal, in the order they left:
   the old `Tribunal#exiled`, which the target, `missing`, the register for the ransom prices and
   the end reason read) and `ransomed({ resident })` (a second gate takes no ransom). Local
   adapter: `mechanics/{exile,tribunal}/src/extras.ts`. With `ransomed` in `ExileApi`, the
   `ransomable` input of `toGate` could be derived by the exile itself.

2. **`tribunal-extras` and the exile's `uses`.** The texts the exile writes (`gateNotice`,
   `gateNoticeFinal`, `ransomed`, `exiled`, `will`) and the will's cap (`bequestPerHeir`) are the
   story's tribunal spec, rendered with the tribunal's rule values: the exile asks
   `tribunal-extras.text({ key, values })` and `bequestPerHeir({})` instead of a copy of the spec.
   The exile also `uses` `TribunalApi` for `ransomPrices` (a gate of an old file without prices
   gets them at the first minute, as the old `restore` did). `test/mechanics/packages.test.ts`
   pins `uses(exileHead) == ["seal", "goals"]`, so the frozen heads (`exileHead`, `tribunalHead`)
   stay as they were and the mechanics are built from `exileWorkHead` / `tribunalWorkHead`
   (uses: seal, goals, tribunal-extras, tribunal; the tribunal requires `exile-extras` and uses
   goals). Please update the pins with requests 1-3.

3. **`tribunal-view` for the gamemaker's view and the run's stop rule.** Facts get a `FactView`
   without calls, but the old `schedulingWindow`, `cityCall`, `atRisk` and the arena's
   `#stopReason` (`endReason`, `busy`, `pursuing`) read the ledger and the exile. Local API
   `TribunalViewApi` (`mechanics/tribunal/src/view-api.ts`): `schedulingWindow`, `cityCall`,
   `atRisk`, `stop`. The role/app that builds the gamemaker's report and the stop rule should read
   it (or a shared copy of it). The plain facts are `plan`, `session`, `called`, `ended`, `draft`.

4. **Converter: a file without `world.tribunal`.** `examples/cityofkeys-act1-06a-01/snapshot-L7.json`
   was written before the tribunal; `convertLegacySnapshot` then gives neither `exile` nor
   `tribunal` a slice, and the host refuses to resume a stateful mechanic without one (the old
   world started a fresh tribunal). Please let the converter write the empty version-0 slices
   (`{ version: 0, data: {} }`) for both; their migrations take `{}`. The resume test adds them
   itself meanwhile (`test/mechanics/exile/exile.test.ts`).

5. **Progression at the gate.** The old `enabledTools` removed `submitSolution` from a resident at
   the gate. That is progression's lock now: refuse it while `ExileApi.standing` is `gate`. The
   T4a tools are locked in the `lock` stage like the standoff's (`TOOL_LOCKED`,
   `replies/locked`); `ctx.access.open` does not see such locks, so `getStatus` / `activeTools`
   (progression) list them only once a shared "is this tool open" query exists.

6. **The plan's `#onExiled` order.** Work-plan item 4 lists "pieces, burn, goal, seal,
   contraction, then `exiled` and the suspension". The old code writes `exiled` first (old
   `#closeGate` and `Tribunal.strike` emit before `onExiled`), then the pieces, the burn, the
   goal, the seal and the contraction. The exile follows the old code; the world-level
   differential test checks the order.

7. **Old files cannot tell a seal's strike from a gate.** Both are in the old `Tribunal#exiled`;
   the version-0 migration reads them as `by: "tribunal"` (they count the same for the register,
   the target and the prices). Only `ExileApi.exiledBy` differs for such a resident.

8. **T4 #4 (a gate that closes while an ultimatum is due).** The exile closes its gates in a
   phase of order `HOOK_ORDER.minuteStarted.tribunal` (300), before the tribunal's own phase at
   the same order (the exile loads first). The scenario needs the standoff's phase at 500
   (T4b must-fix 4); please add the differential scenario at integration, with both carved.

9. **`callTribunal` belongs to the holdout tribunal.** Work-plan item 6 names `callTribunal`
   beside `scheduleTribunal`; it is the old `callHoldoutTribunal` (`standoff-tribunal`, T4b) and
   is not in `tribunal`. `scheduleTribunal`'s `reason` is logged only, so it has no `NotesApi`
   check (the old tool had none).

10. **The gamemaker's offer of `scheduleTribunal`.** The old gamemaker offered the tool only while
    the window was open and a resident in the city held the director role
    (`#mayScheduleTribunal`). That is the roles' concern; they can read
    `tribunal-view.schedulingWindow`.

11. **Refusals behind the lock and the schema.** As in the old gateway, the lock answers first:
    `NO_TRIBUNAL`, `NOT_A_VOTER`, `ALREADY_VOTED`, `NO_DRAFT`, `NOT_IN_DRAFT`, `IS_LEADER` and
    `EXILED` cannot reach a resident through the pipeline (the tools keep the checks), and the
    parameter schemas answer `INVALID_ARGUMENTS` before `INVALID_AMOUNT` or a count below 1.

12. **Story wiring.** `tribunal.with(story.tribunal)`: `TribunalOptions` is the contracts'
    `TribunalSpec` as a Typebox schema (the readonly `targetShare` rules included). The exile has
    no options.
