# Step 18, team S1 (script): requests to the integrator

S1 carved the old `Director` (packages/engine/src/director.ts) into `mechanics/script` (carve-plan step
16). S1 did not edit `packages/engine`, `mechanics/shared`, the core, the testkit, `test/golden` or
another team's mechanic. Each gap below is worked around inside the script; the numbered items are what
the integrator (or the named owner) should decide or add.

1. **`PuzzlesApi.teams({ level })` is missing** (shared, owner T3). The old `onTeamSplit` read
   `world.teamsOf(level)`. The script derives a level's teams from the `team` index of the level's
   `fragments_dealt` / `factors_dealt` line in the log (`mechanics/script/src/city.ts`, `teamsOf`), the
   last deal of the level, in the deal's team order. Before a level is dealt it returns no teams, where
   the old planner returned the planned teams; no split can be seen on an undealt level, so the firing
   is the same. Proposed: `teams: query({ level }, string[][])` in `PuzzlesApi`, then `teamsOf` calls it.

2. **`CastApi.collection({ into })` is missing** (shared, owner T2). The old conditions `collectionOpen`
   and `collectionEnded`, the trigger `onCollectionEnd` and `{seats}` read the cast's collection (its
   size, its end minute and its entries). The script reads `collection_started`, the last
   `collection_shortened` and the `cast_dm` lines whose `collections` hold it (`collectionOf`).
   Proposed: `collection: query({ into }, { first; untilMinute; entries } | null)`.

3. **`PetitionsApi.status({ petition })` is missing** (shared, owner T2). The condition `petitionStatus`
   reads `petition_opened` and `petition_resolved` from the log (`petitionStatus`). Proposed:
   `status: query({ petition }, "open" | "passed" | "failed" | null)`.

4. **Every story must grant `script: ["directorMinute", "resolvePetition"]`** (composition, step 18).
   The time triggers run in the staged call `directorMinute` (so the petitions that expired in the
   minute are resolved first, as the old `startMinute` began with `expirePetitions`). A story that does
   not grant it ends the run with `script: directorMinute was refused` (the `minuteRan` job throws, so a
   missing grant cannot pass silently). The options come from `scriptOptionsFromStory(story)` (the
   rules and the cast ids; `post` by a cast member that is not active is skipped, as before).

5. **`toLegacySnapshot` writes back version-0 slices only** (chronicle). The script's slice is version 1
   with the version-0 shape (the old `DirectorSnapshot`, key for key) and a migration `0 -> 1`. Writing a
   new host's snapshot back into an old file fails with `script: only version-0 slices are written back
   in the old shape`. The resume test writes the version-1 data in as a version-0 slice and gets the
   old `director` field byte for byte. Proposed: let `sliceData` accept the script's version 1 (same
   shape), or a per-slice "back to version 0" function.

6. **Minute-start order of cast and petitions differs from the old engine** (core / T2, not the script).
   Staged calls run only after all `minuteStarted` phases. Petitions stage `resolvePetition` (1100),
   cast shortens collections directly (1200), so in a minute where both happen the `collection_shortened`
   line now comes before the petition's resolution; the old `startMinute` expired petitions first and
   then shortened collections. The script's own time triggers come after both, as before. No test here
   has both in one minute; the goldens do not either. Proposed: cast shortens in a staged call too, or
   petitions resolve directly in their phase.

7. **The run's end: treasuries before the petitions' last resolutions** (core / T2). At `runEnded`
   channels settle the treasuries in its phase (300) while the petitions' resolutions of the last
   minute are staged; the old `closePetitions` ran before `settleTreasuries`. The script's
   `onPass`/`onFail` actions therefore run after the settlement. Not covered by a test; the goldens end
   without open petitions.

8. **Not carved here:** the figure cues (packages/engine/src/direction.ts, `turnInputs.script` 100) are
   built by the app (apps/cli compose.ts), not by the old `Director`; the old `Director` has no listener
   on `exiled`, so `LISTENER_ORDER.exiled.script` stays unused. The gamemaker's inputs and the Tribunal
   section are not read or written by the old `Director`, so the script owns none of them.
