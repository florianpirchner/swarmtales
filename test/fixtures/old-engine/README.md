# The old engine's side of the differentials

Step 18, item 7b. Every file here is what the old engine (`packages/engine`, the `World` composed by
`apps/cli/src/compose.ts`) produced for the scenarios of one differential test, played one last time
before the engine is deleted. The differential tests now compare the mechanics against these files
(`recordedOld` in `test/helpers/old-engine.ts`); nothing here is regenerated, because the code that
wrote it is gone.

Each file is a JSON object of scenarios, keyed as the test names them.

| File | Test | Recorded on | What a scenario holds |
| --- | --- | --- | --- |
| `motives-differential.json` | `test/mechanics/motives/differential.test.ts` | `fa9ba71` (the test's own `playOld`, unchanged) | the `core_dealt` lines (`ownedBy(log, ["motives"])`) and the snapshot's `cores` after one minute of City of Keys, per `<agents>-<seed>` (`6-5-cast`: three named figures) |
