# Parallel run fixture

A log of the scheduler sample `parallel` (section 3 of the M4 specification), for the tests of the viewer
(`viewer-core`, `viewer-ui`): activations that are open at the same time, whose calls interleave in the order of
commit, each call with its `basis`.

- The game is the race of test 5 of section 3.7: the sample's test mechanic `board`, four residents, the
  activation `onNews`, two activations a tick, four ticks. The drivers wait a seeded random time before each of
  their zero to two posts; seed 3. Under `onNews` a driver is pending one time in three, so the log holds an
  activation with the reason `answer` (seq 51).
- `events.jsonl` (153 lines) is the log as `play` of the testkit gives it: envelopes without the stamp `at`, no
  chain and no manifest. A test that loads it as a run folder adds a manifest of its own.
- What it shows at tick 0: A01, A02, A03 and A04 open at seq 3 to 6 with `basis` 2. A03 posts first (seq 7 to 9);
  A02 posts at seq 14 with `basis` 2, so it could not know A03's post of seq 8; its second post (seq 23) has
  `basis` 16, its own answer before.

The recorder is `samples/own-scheduler/test/viewer-fixture.test.ts` (the layer rules keep the sample's code out of
the viewer's packages). A race is not reproducible, so it does not compare a new race with this log: it replays
this log by the close line and fails when the platform does not write it again. To record the fixture anew, delete
`events.jsonl` and run `pnpm vitest --run samples/own-scheduler/test/viewer-fixture.test.ts`.
