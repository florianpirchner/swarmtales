# Step 18 requests from O2 (overseer runtime)

Requests to the integrator from team O2 (steps 5, 6 and 8 of `docs/design/overseer-api.md` §6).
Nothing here was built outside O2's scope: `packages/engine/src/world.ts`, `mechanics/shared` and
every mechanic are untouched.

1. **An `ORDER` table for overseers.** Overseer triggers sort by `trigger.order`, and a trigger
   without one gets `DEFAULT_ORDER` 0 (`packages/kernel/src/host/overseers.ts`). The shared table
   of hook orders lives in `mechanics/shared/src/order.ts`, which is frozen. Please add named
   orders for the overseer slots there (or confirm that 0 is the default) so that stories do not
   write bare numbers.
2. **The between slot's order.** In `between` the host runs, in this order: the human's safe stop,
   the overseers' `between` firings, then the app's `HostOptions.between` (classifier, weaver,
   gamemaker while they are app roles). Please confirm this order in the design (§1.3 does not
   say where the app roles go).
3. **Decisions still open at the run's end settle with their ORIGINAL proposal** (the decision
   taken for this step). `#finish` calls `DecisionGate.settleAll()` before the `runEnded` phases;
   each open decision writes `decision_settled` with its original proposal, `changed: false` and
   no `by`, and its deadline job is cancelled. Amendments still standing are not applied. A stop
   between minutes (`#end`) does the same, but the commit calls that the settle stages are dropped
   there (no call may wait in a stopped host). This answers O1's request 2. Please confirm both.
4. **`HostOptions.human` stays `boolean | HumanChannel`.** `true` attaches the hand
   (`host.hand()`) without a scripted channel; a `HumanChannel` (for example `scriptedHuman(log)`)
   also attaches it. `false` or absent attaches nothing: no safe stops, no new events, byte-identical
   logs. O1's tests that pass `true`/`false` stay unchanged. This replaces O1's placeholder.
5. **Fact triggers are levels, not edges.** A `fact` trigger fires in every `between` slot while
   its `when` holds. A story that wants an edge keeps the last value in the overseer's state.
   Please confirm, or ask for an `edge: true` flag.
6. **Only `ctx.log` and event triggers are filtered by audience.** Facts, inputs, decisions and the
   residents view are not. Please confirm that §4.1 means only the log.
7. **`copyTo` copies by audience only.** A copy (`copy: [...]`, policy `story.human.copyTo`) puts
   the copied names into the `human_note` audience; it does not give them a standing order. The
   kernel does not enforce `gamemakerKnows`; that stays with the story.
8. **Standing orders for an app-driven gamemaker are stored but not rendered.** While the
   gamemaker is an app role (`HostOptions.between`), `instruct({target: "gamemaker"})` is accepted
   and logged, and the order is kept in the snapshot, but no prompt renders `{{standingOrders}}`
   for it until the gamemaker becomes an overseer. The app can read the orders from the log.
9. **`runEnded` overseers do not run on a stop.** On a stop between minutes (`#end`) the
   `runEnded` slot is skipped (it would need the gateway). Event firings queued by `run_started`
   run at the first settle of minute 0.
10. **A non-object output gains no `orders` field.** When an order (mode `order`) obliges an
    account, the answer schema becomes the output plus `orders` only for an object output. Any
    other output is asked unchanged and the account is missing. Please decide whether such heads
    are refused at load.
11. **A consult overseer makes exactly one call.** `calls()` returning more than one call for a
    consult ends the run with an error. Zero calls gives a failed reply "the overseer made no call"
    (or the limit's name when a limit is reached). The consult stage, not the overseer runner,
    records the cost with the referee.
12. **The "human-influenced" reporter flag is not built.** `human_note` and `human_amend` are in
    the log; the reporter does not mark a run as human-influenced yet.
13. **`scriptedHuman` replays only calls made at safe stops.** It replays a human `tool_called`
    whose seq is the stop's seq + 1 and skips earlier entries, so a log with a human call outside a
    safe stop (which the host never writes) does not replay.
14. **The overseer conformance test is a new file.** The design names `conformance.test.ts`; the
    checks went into `test/host/overseer-conformance.test.ts` so that no existing test changed.
    `checkOptionsDocumented` now takes `{id, options}` (a mechanic or an overseer), and
    `checkDeterminism`/`checkSnapshotRoundTrip` take options or a factory of options.
15. **O1's helper `stubOverseer` changed.** `test/host/proof/overseers.ts` now builds its stub with
    `defineOverseer` and `calls: () => []`, since an overseer definition must carry `instantiate`.
    O1's tests did not change and pass.
16. **"point" is a banned core word, so safe points are "safe stops".** The design's "safe point"
    is `SafeStop` / `safeStop` in the code (`test/host/core-words.test.ts`). Please rename it in
    the design.
