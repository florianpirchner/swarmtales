# Carve round 3, team T4b: requests

Requests of team T4b (seal, standoff, standoff-tribunal) for parts it may not edit. T4b goes on
without them; each says what it does meanwhile.

1. **`HOOK_ORDER.minuteEnded.standoff` is unused now** (`mechanics/shared/src/order.ts`). Must-fix 3
   (R2-D4) removed the standoff's minute-end cache, so the standoff has no `minuteEnded` hook any
   more. The slot the integrator added for it (R2-D9, later item 10) can go. Meanwhile it stays
   unused; nothing reads it.
2. **The mutant list's place.** The brief names `docs/design/mutants-round3-T4b.json`; the round's
   task names `test/mechanics/<team>/mutants.json`. T4b's list is
   `test/mechanics/t4b/mutants.json` (the task's place), with the review's earlier kills added as
   `R2-*` rows. Please say which place the next rounds use.
3. **The seal's tick against the tribunal's tick is not observable in T4b's tests.** Moving the
   seal's `minuteStarted` before the tribunal's (`HOOK_ORDER.minuteStarted.tribunal - 50`) survives:
   every seal test runs the tribunal as a stand-in that does nothing at the minute's start. Moving
   it before the door (`progressionDoor - 50`) is killed. A test with the real tribunal and the real
   seal in one Act II (a gate opened by the tribunal in the minute an auction opens) needs the real
   exile, tribunal, puzzles and progression together; that composition is the integrator's (it is
   also what would prove "a resident at the gate during an auction" through the old `World`).
