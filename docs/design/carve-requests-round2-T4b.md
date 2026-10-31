# Carve requests of team T4b, round 2 (seal, standoff-tribunal, standoff)

Requests to the integration owner for shared files team T4b may not edit (the core, `mechanics/shared`,
the testkit, the converter, the root scripts). Each names what is missing, why, the local adapter
used meanwhile and the proposed change.

## R2-1 `pnpm lint` runs out of memory at 6144 MB

- **What:** `pnpm lint` (`node --max-old-space-size=6144 node_modules/eslint/bin/eslint.js .`) aborts
  with "JavaScript heap out of memory" once `mechanics/seal` is carved. Without the seal's files it
  passes, but only just: unconstrained, the whole-repo lint peaks at about 7.1 GB of heap without the
  seal and 7.3 GB with it (measured with the ESLint API and `--max-old-space-size=12288`). Every team's
  round-2 work adds files to the one typed program, so every team will cross the line.
- **Meanwhile:** T4b runs the lint step as `node --max-old-space-size=12288 node_modules/eslint/bin/eslint.js .`
  (green) and every other step of `pnpm check` as written.
- **Proposed:** raise the limit in the root `lint` script to 12288, or lint with `--concurrency auto`
  (ESLint 9.34+), or lint per workspace project.

## R2-2 A seal (and holdout) slice for an old snapshot that has none

- **What:** the old `World` writes `seal` only once the act's seal began and `holdout` only with a
  holdout tribunal; `convertLegacySnapshot` writes a slice only for fields present. `snapshot-L7`
  (Act I) has no `seal`, so a host that loads the seal refuses the resume (`snapshot: no slice for
  mechanic "seal"`), although the old world simply started an empty seal house.
- **Meanwhile:** the resume test adds `seal: { version: 0, data: {} }` to the converted snapshot; the
  seal's version-0 migration takes `{ seal?: <old SealSnapshot> }`, so `{}` is a seal not begun.
- **Proposed:** the converter writes `{ version: 0, data: {} }` for every carved stateful mechanic
  whose old field is absent (seal, standoff-tribunal, standoff), or the host takes a mechanic's
  initial state when a resumed snapshot has no slice for it and the mechanic declares that as allowed.

## R2-3 `StandoffTribunalApi.taskLine` (D-3)

- **What:** the holdout rule under every door's task (old `#withHoldoutRule`, world.ts:1592) is
  appended by progression through `StandoffTribunalApi.taskLine({ resident }): string | null` (D-3);
  the method is not in `mechanics/shared/src/conflict.ts` yet.
- **Meanwhile:** standoff-tribunal provides it on a local API (`StandoffTribunalTaskApi`, name
  `standoff-tribunal-task`) with the frozen signature, and keeps `StandoffTribunalApi` with
  `kit.provide`.
- **Proposed:** add to `StandoffTribunalApi`:
  `taskLine: query("The holdout rule under every door's task in a run with the gamemaker (old #withHoldoutRule), else null.", OfResident, Type.Union([Type.String(), Type.Null()]))`.
