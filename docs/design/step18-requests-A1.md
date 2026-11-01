# Step 18, team A1 (arena): requests to the integrator

A1 carved the old `Arena` (packages/engine/src/arena.ts) into `mechanics/arena` (carve-plan step 18):
the run events (`run_start`, `round_end` with its standings, `act_brake`, `run_end`), the stop reasons
(the tribunal's end, every resident done, seats decided, the budget, the snapshot and the act
brakes), the arena's slice (`seenPoints`, `braked`; version 1 with a migration from the old `arena`
field as version 0) and the turn policy of the old arena (`legacyTurns(run)` from `arenaFromStory`).
A1 added `EndingApi` to `mechanics/shared` (as the brief asked) and did not edit `packages/engine`,
the core, `packages/engine/src/world.ts`, `test/golden` or another team's mechanic. The CLI is not
wired. Each gap below is worked around or pinned by a test; the numbered items are what the
integrator (or the named owner) should decide or add.

1. **`run_end` is one minute later after a stop at a minute's start** (core, host). The old
   `#nextMinute` advanced the clock, ran the minute's start (jobs, director), asked `#stopReason` and
   wrote `run_end` at that minute. On the host the arena's `stop` limit breaches at that minute's
   first `halted()` check (the minute's start has run, as before; nothing else differs), but the host
   ends the minute, advances the clock and only then finishes, so `run_end.minute` is the old minute
   + 1. The same holds for `host.stop` between minutes (the app's stop after a snapshot that ends the
   run): `#end` runs at the next minute. Pinned in `test/mechanics/arena/differential.test.ts`
   (`compare(..., { endShift: 1 })` asserts new = old + 1 and every other field exact) for
   `stopWhenDone`, seats decided, the brake checkpoint that stops and the snapshot that stops.
   Proposed: the host finishes at the minute of the breach when no pass of it started (or a
   `finishAt: "current"` on the breach); then drop `endShift`.

2. **A budget stop mid-run: the old run also played the next minute's start** (core, host). The old
   arena noticed the budget after `round_end`, but `run_end` came from `#nextMinute`, which first ran
   the next minute's start (in the test: the director's `at(2)` post and its `director_action`). The
   host stops after the minute of the breach. Pinned in the test "stops mid-run once the spend
   exceeds the budget" (the two extra old lines are listed, everything else is equal). Decide whether
   the new behaviour (nothing after the breach) is the intended one; I recommend keeping it.

3. **A budget spent in the last block must skip the app's `between` slot** (app, step 19). The old
   arena skipped the interpreter when the minute's turns had spent the budget. The arena sets its
   reason in `minuteEnded` and the referee's `budget` limit breaches at the minute's end, so the host
   skips `between` on that breach. An app that runs its own work outside `between` should read the
   fact `arena.stopping` (non-null once the run will stop) before it spends more.

4. **The app's own stop has no reason in `run_end`** (core). The old `ArenaOptions.stopWhen` (an
   app callback whose text became `run_end.reason`) has no counterpart: `host.stop(reason)` does not
   hand its text to `runEnded`. The arena keeps its own reasons for every stop it causes (the snapshot
   and the brakes included, so the app's `host.stop("snapshot")` writes the old text). Proposed: pass
   the stop text to `runEnded` (`HostEndReason` with `detail`), and the arena writes it when it has
   none of its own.

5. **`toLegacySnapshot` writes back version-0 slices only** (chronicle, same as S1 request 5). The
   arena's slice is version 1, so a host snapshot written back into the old file does not carry the
   `arena` field. The old file's `delivered` is progression's and `seenBoard` channels' now; the writer
   has to merge the three slices into the old field. Not done by A1 (chronicle is not A1's).

6. **`seatsDecided` reads `ProgressionApi.hasPassed`, the old one read `solved`** (shared, owner
   progression). The old `#reachablePoints` counted the reward of every level the resident had not
   *solved*; the arena counts every level it has not *passed*. They differ for a resident that passed
   a level without solving it (a released door, a carried team level): the old engine still counted
   that reward as reachable. No golden or differential reaches the case. Proposed:
   `ProgressionApi.hasSolved({ resident, level })` (or the solved list), then `reachablePoints` uses it.

7. **The brakes run after a non-arena referee breach** (core). The host emits `minute_ended` also
   when another mechanic's limit breached in the minute; the arena's `minuteClosed` only skips when
   no pass started or the arena itself has a reason. The old engine had no other limits. Proposed: a
   `ctx.halted` (or the breach on `minute_ended`) so the arena can skip the brakes and the snapshot
   then; until then a story with another limit may log one `act_brake` after its breach.

8. **The tribunal's stop has no differential** (owner T4). `stopReason` asks `TribunalViewApi.stop`
   (`endReason`, `busy`, `pursuing`) as the old `#stopReason` asked the tribunal. The goldens never
   end by the tribunal and no differential loads the real tribunal; the order of the checks is the
   old one, line for line. Proposed: a differential with the real holdout tribunal once it is merged.

9. **Exiled residents' `tools` count in the standings is unverified.** `tools` is
   `ctx.access.open(resident).length` (old `enabledTools`); the goldens' exiled residents come from the
   seal with stand-ins, and their counts match the goldens, but no test exiles through the real exile.

10. **Turn policy from the story, not from the arena's options** (kit). The kit gives a body no
    options at build time, so the arena's body declares `turns: { order: legacyTurnOrder, inputs:
    INPUT_KINDS }` and the story passes `turns: legacyTurns(run)` from `arenaFromStory(story, run)`
    (passes, block size, `onNovelty`). The composition (step 19) must pass that policy; the
    differentials and the goldens do.

11. **Shared fingerprint and lockfile changed.** `EndingApi` and `Ending` are exported from
    `mechanics/shared` and appended to `SHARED_APIS`; `FINGERPRINT` in
    `test/mechanics/shared-frozen.test.ts` is updated with a comment. `mechanics/arena/package.json`
    depends on `@swarmtales/contracts`; `pnpm install` updated `pnpm-lock.yaml` (it also re-sorted the
    entry of `mechanic-motives`).

12. **Observation for the goals team (not verified as a bug).** In `test/mechanics/arena/resume.test.ts`
    the real goals mechanic, loaded on the host resumed from the L7 checkpoint, dealt other secret
    goals at minute 9 than the old engine did (for example A03: "A05 is still in the city" vs. "more
    points than A06"). The arena test leaves the goals out (every old goal misses, so the standings are
    equal); the goals team should check its random stream on resume.
