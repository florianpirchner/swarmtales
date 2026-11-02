# The old engine's side of the differentials

Step 18, item 7b. Every file here is what the old engine (`packages/engine`, the `World` composed by
`apps/cli/src/compose.ts`) produced for the scenarios of one differential test, played one last time
before the engine is deleted. The differential tests now compare the mechanics against these files
(`recordedOld` and its helpers in `test/helpers/old-engine.ts`); nothing here is regenerated, because
the code that wrote it is gone.

Each file is a JSON object of scenarios, gzipped (`<name>.json.gz`; only the first recording,
`motives-differential.json`, is plain JSON). `motives-differential.json` is keyed as its test names the
scenarios. Every other file is named after its test file (its path under `test/`, slashes as dashes)
and keyed by the test's full name and the number of the old side it played (` #1`, ` #2`, ...;
`currentScenario()`).

**How they were recorded.** Each harness kept its old side (`playOld`, `resumeOld`, `runOld`, ...)
unchanged as a live function and wrote its result with `OLD_ENGINE_RECORD=1`
(`test/helpers/old-engine-recorder.ts`), on the commit that added the file
(`git log --diff-filter=A -- test/fixtures/old-engine/<file>`). The recorder and the live old sides
were deleted with the engine.

**What a scenario holds.** A `fingerprint` of the scenario's inputs (the story, the roster, every call
the plan makes, per resident and minute; for a resume also the snapshot file), so a recorded old side
refuses a test whose plan changed since. Then what the test reads of the old run: the replies, the
log lines, and the old world after the run (`world`: its snapshot, each resident's level, pieces,
passed doors, codes, points and display, read back as `RecordedWorld` in `test/helpers/old-world.ts`).
A harness that ran an old component on its own (`runOld` of the seal and the holdout tribunal, the
unit differentials) holds `{ fingerprint, value }`, or `{ fingerprint, error }` where the old code threw
(`replayOld`). A test that drives the old world step by step beside the new host (the T3 twin,
`test/mechanics/t3/twin.ts`) holds a trace: every answer the old world gave, in the order the test and the
twin's stand-ins asked for it, each with the question it answered (`OldTrace`); the replay refuses a test
that asks something else.

| File | Test | Recorded on | What a scenario holds |
| --- | --- | --- | --- |
| `motives-differential.json` | `test/mechanics/motives/differential.test.ts` | `fa9ba71` (the test's own `playOld`, unchanged) | the `core_dealt` lines (`ownedBy(log, ["motives"])`) and the snapshot's `cores` after one minute of City of Keys, per `<agents>-<seed>` (`6-5-cast`: three named figures) |
| `mechanics-*.json.gz`, `overseers-*.json.gz`, `cli-*.json.gz`, `roles-*.json.gz` | the test file the name gives | the commit that added the file | see above |
