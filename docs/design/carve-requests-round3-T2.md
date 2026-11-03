# Requests from T2, round 3

Numbered requests to the owners of core, mechanics/shared, testkit and the converter. T2 uses a local adapter meanwhile.

1. **Shared: `CastApi.active`** (R2-D19). The shared `CastApi` is frozen and has no `active`. T2 provides it as a local API,
   `CastExtrasApi.active: query({}, { id: string; level: number }[])` (`mechanics/cast/src/extras.ts`, name `cast-extras`), declared
   by a second head: `castHead` stays the frozen shape that `test/mechanics/packages.test.ts` pins (one provider per shared API), and
   `castWorkHead` is the head the mechanic runs with (the way T4a did it for `exile`). Please add the method to `CastApi`; T2 then
   moves the one line into `CastApi`, deletes `extras.ts` and `castWorkHead`. T3 can declare the same definition (APIs match by name)
   to list cast members in `listAgents` (old world.ts:1407-1413) today.
2. **Order table: `HOOK_ORDER.minuteStarted.motives` (50) is unused now.** The core-motive deal for a file from before v09 moved to
   `runResumed.motives` (R2-D9), and the cast's resume escrow to `runResumed.cast`. The old comment on the entry says "until motives
   moves to `runResumed.motives`"; the entry can go.
3. **No `runStarted` slot for channels.** The pending `channels:runStarted` plain function is gone instead of getting a number:
   `defy` is now a lock handler (`pipeline.lock`) that reads the story's whisperer from the log, so channels has no `runStarted` hook.
   `test/mechanics/round2-shared.test.ts` lost `channels:runStarted` from `PENDING` (a shared test file; one line).
4. **Step 17 mapping:** nothing new. `resolvePetition` is granted to `script` wherever petitions load; the T2 fixtures that load petitions
   without granting it (`test/mechanics/t2/golden-world.ts`) now do, and `test/mechanics/petitions/petitions.test.ts` proves that an
   expiring petition is resolved only with the grant. The step-17 composition must do the same (R2-D17), or a petition that
   expires resolves silently: the state fails, but there is no `petition_resolved`, no post and no `onFail` action.
5. **Converter, for the whisperer:** none needed. The `defy` lock reads `whisperer_chosen` from the log, which a resume restores
   (`resume.events`). A host that resumes from a snapshot with a truncated or empty log would lose `defy` for the whisperer; no
   current caller does that.
