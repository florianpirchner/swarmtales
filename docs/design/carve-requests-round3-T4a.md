# Carve round 3, team T4a (exile, tribunal): requests to the integration owner

Round 3 moved the T4a extras into `mechanics/shared/src/conflict.ts` (R2-D18): `ExileApi.gates`,
`exiled` and `ransomed`, `TribunalApi.text` and `bequestPerHeir`, and `TribunalViewApi`. The local
adapters (`mechanics/{exile,tribunal}/src/extras.ts`, `mechanics/tribunal/src/view-api.ts`) and the
work heads are gone; the mechanics load `exileHead` and `tribunalHead`, which
`test/mechanics/packages.test.ts` pins.

## Requests

1. **`FactView.minutes`.** The tribunal's `stop` and `section` facts compute what
   `TribunalViewApi` answers (the act's end, the fallback call, the window), and those read the
   run's minutes. A `FactView` has no `minutes`, so the tribunal keeps the run's minutes in its
   state (`state.minutes`, set at the start of each tick, never saved) and the facts are `null`
   before the first minute. With `minutes` on `FactView` the field and the `null` before the first
   minute go away.

2. **The R2-D17 mapping of `gamemaker.roles`.** The `scheduleTribunal` offer (old
   `#mayScheduleTribunal`, gamemaker.ts:281) needs the gamemaker's roles: a resident in the city
   must play a level of the `director` role. The tribunal takes them as the option
   `gamemakerRoles` (not part of the story's `tribunal` spec; without it the tool is never
   offered, as in a run without the gamemaker). The story mapping should pass
   `tribunal.with({ ...story.tribunal, gamemakerRoles: story.gamemaker?.roles })` when the run
   plays the gamemaker.

## Notes

- **`mechanics/shared/src/index.ts`.** The brief allows `conflict.ts` only. `TribunalViewApi` is
  new in shared, so it had to be exported from the index and added to `SHARED_APIS` too (one
  import, one export, one list entry). The fingerprint in `test/mechanics/shared-frozen.test.ts`
  was recomputed for both files.
- **The mutant list** is `test/mechanics/t4a/mutants.json` (where the workflow asked for it), not
  `docs/design/mutants-round3-T4a.json` as the brief names it. Run it with
  `pnpm mutants test/mechanics/t4a/mutants.json`.
- **Stand-ins that stay.** The resume differential (`test/mechanics/tribunal/resume.test.ts`) runs
  the real exile, tribunal, ledger and standoff on their converted slices. Progression, channels,
  puzzles, goals and the seal are stand-ins there: the real progression and puzzles need the doors
  of the whole story, and the comparison would then be a whole-run comparison, which is not T4a's.
  Progression's answers (levels, the act's start, the last level-ups, the passed doors and the
  held pieces) are read from the old continuation, and the stand-in channels numbers the city's
  groups after those of the file.
- **The holdout strike** (`test/mechanics/exile/holdout-world.test.ts`) is compared with the old
  `World#onStruck` through `ExileApi.strike`, the call the holdout tribunal makes; the holdout
  tribunal itself is T4b's and is not loaded there.
