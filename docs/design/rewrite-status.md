# Rewrite status (2026-11-02) and how to continue

Branch `claude/project-thread-b71bdz`, nothing is on `main` yet (Flo: everything lands in one pass).
`pnpm check` is green on this branch (1509 tests; lint needs a 12 GB heap, the whole check takes about 7 minutes).
The CLI runs on the new core (host, 19 mechanics, overseers) since the final step-18 integrator pass. The old engine
(`packages/engine`) was deleted by team D4; the old side of every differential test is a recording in
`test/fixtures/old-engine/`. Golden files in `test/golden` were regenerated once, in the core motive rename commit.

## Done

| Wave | What | Where |
|---|---|---|
| 1 | Golden-run tests (cityofkeys f4g4, f10g10, whispers f10 + grudge), prompts in `library/prompts` (404 files, typed loader), import cycles broken (contracts layer), pnpm workspace with tsdown, `swt` | `test/golden`, `packages/prompts`, `apps/cli` |
| 2 | New core: `packages/contracts/src/core`, `packages/kernel/src/host`, `packages/testkit`, legacy event adapter and legacy snapshot converter (all 5 example snapshots and 12 real run logs round-trip byte-equal) | `docs/design/mechanic-api.md` |
| 3.0 | 12 core fixes from the challenger review, 19 empty `mechanics/*` packages, frozen `mechanics/shared` | `docs/design/core-review-2c.md` |
| 3 | Four teams carved the mechanics; challengers found many divergences | `docs/design/challenge-wave3.md` |
| 3.5 | Integrator decided every request, explicit hook/listener order table, strict golden gates with self-test | `docs/design/carve-decisions.md`, `mechanics/shared/src/order.ts` |
| 3.6 | Round 2: T1 (names, ledger, marks, receipts, whispers) complete with differential tests; T3 (puzzles, progression, goals) mostly; T4a (exile, tribunal) and T4b (seal, standoff-tribunal, standoff) carved; T2 (channels, petitions, cast, motives) production code and, in the proof pass, strict golden gates, differential tests and legacy resume tests | `docs/design/carve-round2-T*.md`, `docs/design/carve-requests-round2-*.md` |
| 3.7 | Round-2 challengers (T1, T3, T4a, T4b); integrator's second pass: absent slices, `ctx.roles`, fact queries, old argument handling and `TOOL_LOCKED` text, lock-aware `access.open`/`isOpen`, `runResumed`, listener-mode check, ledger `open`/`has`/`idempotencyKey`, `PuzzlesApi.secrets`, shared `StandoffTribunalApi.taskLine`, `defy` owned by channels, converter copies, mutation helper | `docs/design/carve-decisions.md` (round 2), `docs/design/carve-round3-*.md`, `docs/design/challenge-round2.md` |
| 3.9 | Step 18 waves A-C1/C2: `script`, `arena`, overseer core, scheduling, orders, human hand, `grants: "auto"`, judge, classifier, weaver and gamemaker as overseers | `docs/design/step18-requests-*.md` |
| 3.10 | Step-18 integrator pass 1 (2026-11-02): every wave request decided; `TOOL_LOCKED` for a resident who may not act, `OVERSEER_ORDER` in shared, seq translation and owners of the overseers' old events, names off switch, the production story mapping `apps/cli/src/host/story.ts` (proven: all three goldens replayed on it, every line outside the app equal in order), progression's `managed` tools, Tribunal section renderer as a gate, `--no-guards` drops `minRun`, resume at the old minute (L1), `WhispersApi` (L2) | `docs/design/step18-decisions.md` |
| 3.8 | Fix round 3 for all five teams (T1, T2, T3, T4a, T4b): every listed mutant killed (`pnpm mutants` over `test/mechanics/t1/mutants.json`, `test/mechanics/t4b/mutants.json`, `docs/design/mutants-round3-T3.json` and the T2 list), differentials against the old World, legacy L7 resumes; merged with an integration commit that aligns the teams' tests (removed options, moved APIs) | `docs/design/carve-requests-round3-*.md` |

## Step 18 items 7 and 8: state after team D4 (2026-11-02)

Item 7 is **done**: `packages/engine` is deleted with its `check-packages` row, tsconfig references, manifest and
lockfile entries; `apps/cli/src/compose.ts`, `test/helpers/fixture.ts`, `test/helpers/old-engine-recorder.ts`,
`test/golden/scripts.ts`, the old `Gamemaker` role and the `World`-based `describeSituation` are gone, and no test runs
an old engine side live. Item 8 (the core motive rename) is **done**, as the last commit of D4 (`rename-core-motive.md`,
"Done at step 18"); the goldens were regenerated there, once. Details, every changed assertion and every deleted file
with its covering test: `step18-decisions.md`, "Team D4".

**What remains:**

1. **The old role classes the overseers and the host runner replaced:** `AgentRunner` (`packages/roles/src/agents/
   runner.ts`; `host-runner.ts` still imports its helpers `isSafeguardRefusal`, `lastAnnounced`, `LOST_INPUTS`,
   `toolsNotice`, `ContextMessage`, `InnerVoice`, which move into `host-runner.ts`), `Interpreter`
   (`interpret/interpreter.ts`; `CONTEXT_MESSAGES` and `InterpreterSnapshot` stay) and `Weaver`
   (`interpret/weaver.ts`; `MAX_SOFT`, `MAX_HARD`, `WeaverSnapshot` stay). They no longer touch the engine, but they
   are the live old side of `test/agents/{host-runner,souffleur}`, `test/interpret/{interpreter,weaver}` and
   `test/overseers/{classifier,runtime-decider,weaver}`. Record those old sides into `test/fixtures/old-engine/` (a
   recorder like the deleted `old-engine-recorder.ts`, run once at the commit before the deletion), switch the tests to
   the replay, then delete the classes and list the files in `step18-decisions.md`.
2. **Comments** in `mechanics/**` and `test/mechanics/**` still name `packages/engine/src/*.ts` as the origin of a
   ported rule; they are history, readable at the commit before D4's deletion (`git log -- packages/engine`).

## Step 18 items 7 and 8: state after team D3 (2026-11-02)

Item 7 is still **partly done**; item 8 (the core motive rename) is **not started** and stays the last commit, after the
engine is gone. Goldens are unchanged, `GOLDEN_UPDATE` was not used. Details: `step18-decisions.md`, "Team D3".

**Done by D3:** D2's steps 1 and 2 below in large part (ports to the host fixture, three production bugs fixed, the
gamemaker-overseer differential replaced by `test/roles/gamemaker-overseer/resume.test.ts` and deleted), and of step 3
the puzzles, teams and petitions unit tests (now on the mechanics' copies).

**What remains, in this order** (find the importers with
`grep -rlE "@swarmtales/engine|compose\.ts|helpers/fixture" test` and
`grep -rlE "@swarmtales/engine" apps/cli/src packages/sdk/src packages/roles/src`):

1. **Port the last users of the old fixture or `composeRun`:** `test/stories/cityofkeys-tribunal.test.ts` (reads
   `world.tribunal` internals mid-minute; read the log or facts instead), `test/snapshot/{act-brake,components,file,
   legacy-writeback,resume,society,v09,weaver,whispers}`, `test/stories/{cityofkeys,cityofkeys-levels,cityofkeys-wall,
   whispers,whispers-direction,registry}`, `test/scale/whole-story`, `test/golden/scripts.ts` (its `World`-typed helpers
   feed `test/cli/support/report-replay.ts`'s live old side and become dead code with the engine).
2. **Old engine unit tests** still importing the engine: `test/engine/{board,mailbox,groups,cast,goals,motives,passes,
   scheduler,penalties,standoff,holdout,tribunal}`. Point each at the mechanic's copy where one exists (channels
   `Board` takes `new MessageNumbers()` and an explicit post kind; channels `Mailbox`, `GroupRegistry(numbers)`;
   cast `escrowAccountId`; goals `dealGoals`; motives `aboveAllCap`, `lightCount` need exports from
   `mechanics/motives/src/deal.ts`; `ladderText` / `penaltyAt` in `@swarmtales/sdk`; standoff `StandoffBook`,
   `carriesValue`), export what is needed from the mechanic's `index.ts`, and name a covering test in
   `step18-decisions.md` before deleting a case with no copy (`activationOrder` / `blocksOf` exist only in the engine;
   the kernel's turns use `rngFor(seed, "turns", minute[, pass])`).
3. **Other test importers:** `test/story/validate*.test.ts` (`DIRECTOR_SUPPORT` is now in `@swarmtales/contracts`),
   `test/overseers/harness.ts`, `test/log/*`, `test/agents/*` (`EventBus`), `test/cli/args` (`resolveBlockSize`,
   `effectiveRun`), `test/interpret/{guard,weaver}`, `test/host/conformance`, `test/helpers/event-log.ts`, the
   `test/mechanics/**` differentials and twins (their live old functions go in step 5) and
   `test/mechanics/progression/standins.ts` (`MarksBook`).
4. **Move what production still imports from the engine:** `apps/cli/src/{oracle,run-options,validate}.ts`,
   `packages/sdk/src/{index,validate}.ts`, `packages/roles/src/{agents/runner,gamemaker/gamemaker,gamemaker/look,
   gamemaker/situation,gamemaker/system-prompt,interpret/interpreter,interpret/weaver,overseer/gamemaker}.ts`.
5. **Delete** as D2's step 5 says (old roles, `apps/cli/src/compose.ts`, `test/helpers/fixture.ts`,
   `test/helpers/old-engine-recorder.ts`, `packages/engine` with its `check-packages` row and tsconfig references, every
   live old function); update `docs/ARCHITECTURE.md` and `docs/HOW-IT-WORKS.md`.
6. **Item 8, the core motive rename**, unchanged (D2's step 6).

## Step 18 items 7 and 8: state after team D2 (2026-11-02)

Item 7 is still **partly done**; item 8 (the core motive rename) is **not started** and stays the last commit, after the
engine is gone. Goldens are unchanged, `GOLDEN_UPDATE` was not used, and no test was deleted
(`step18-decisions.md`, "Team D2"). Team D2 did D1's step 2 (record the old side) and the petitions order; steps 1 and 3
to 6 below are open, in this order.

**Done by D2:**

- **The old side of the differentials is recorded** (D1's list, item 2 below, except the shadow test): the
  `test/mechanics/**` differentials and twins (arena, channels, script, seal, standoff-tribunal, t1, t3, tribunal, goals,
  marks, exile, standoff, holdout), `test/overseers` (judge), `test/cli/host-{runner,residents,gamemaker}-differential`,
  `host-resume`, `host-weaver`, `host-direction`, `host-gamemaker-golden`, `test/cli/support/report-replay.ts` and
  `test/roles/gamemaker-overseer/host.test.ts`. The recordings are `test/fixtures/old-engine/*.json.gz` (README there).
  Each test still holds its old code as a live function, run only with `OLD_ENGINE_RECORD=1` through
  `test/helpers/old-engine-recorder.ts`; the replay (`test/helpers/old-engine.ts`, `old-world.ts`) needs no engine.
- **Petitions at the end of the run** come before `run_end` again (the kernel settles each `runEnded` phase's staged
  calls before the next phase). `test/engine/petitions.test.ts` runs fully on the host fixture.

**What remains, in this order:**

1. **Port the remaining users of the old fixture or `composeRun`** to `test/helpers/host-fixture.ts`, keeping every
   assertion (D1's list below, unchanged except petitions): `test/engine/{direction,factors,marks,names,receipts,seal,
   standoff-world,whispers,world}`, `test/stories/cityofkeys-tribunal`, `test/tools/{blame,gateway}`,
   `test/gamemaker/{director,gamemaker,holdout,privacy,situation}`, `test/interpret/interpreter`, `test/snapshot/*`,
   `test/golden/scripts.ts` (its `World`-typed script helpers feed the recorded old runs of report-replay and the
   overseer tests: they become dead code with the engine), and the two kept tests in `test/engine/arena.test.ts` and the
   one in `test/engine/director-society.test.ts`. Find them with
   `grep -rlE "@swarmtales/engine|compose\.ts|helpers/fixture" test`.
2. **One differential is not recorded:** `test/roles/gamemaker-overseer/{differential.test.ts,shadow.ts}` (the overseer
   reads the live old `World` through `worldReport`). Port the slice round trip of its third case to a host test, then
   delete it with the coverage named in `step18-decisions.md` (Team D2, item 2).
3. **Unit tests of the old engine modules** (`test/engine/{board,scheduler,mailbox,groups,teams,goals,standoff,motives,
   holdout,tribunal,puzzles/*,direction}` and the old-module parts of the files above): delete each only after naming
   its covering mechanic test in `step18-decisions.md`; port any case that nothing covers.
4. **Move what the apps, the SDK and the tests still import from the engine:** apps/cli (`compose.ts`,
   `host/{report,residents,run}.ts`, `oracle.ts`, `run-options.ts`, `validate.ts`), packages/sdk (`index.ts`,
   `validate.ts`), packages/roles (`agents/runner.ts`, `gamemaker/*`, `interpret/{interpreter,weaver}.ts`,
   `overseer/gamemaker.ts`), and the pure helpers tests use: `storyToolNames`, `LOCKED_REPLY`, `MarksBook`
   (`test/mechanics/progression/standins.ts`), `ReceiptBook`, `describeReceipt`, `refillText` (the T3 twin's receipts
   stand-in), `exileTarget`, `DIRECTION_LEVELS`, `EventBus` (`test/log/*`, `test/agents/*`, `test/overseers/harness.ts`),
   `BoundTool`, `DEFAULT_LIMITS` (import it from `run-options.ts`), `resolveBlockSize` / `effectiveRun` (`test/cli/args`).
5. **Delete** the old roles, `apps/cli/src/compose.ts`, `test/helpers/fixture.ts`, `packages/engine` (its
   `check-packages` row, tsconfig references), and with them `test/helpers/old-engine-recorder.ts` and every test's
   live old function (`playOldLive`, `oldSideLive`, `recordOldLive`, `oldSystemPromptLive`, the `RECORDING` branches
   of the twins): the tests then call `replayOld`, `recordedOld` and a replay-only `OldTrace`. Keep
   `LegacyWorldSnapshotSchema` (chronicle) and `RecordedWorld`. Update `docs/ARCHITECTURE.md` and
   `docs/HOW-IT-WORKS.md` where they still describe the engine.
6. **Item 8, the core motive rename** (`rename-core-motive.md`): a separate last commit, `GOLDEN_UPDATE=1` once, a golden
   diff of only the rename; the 14 real run logs and the legacy snapshots must still convert. Recordings in
   `test/fixtures/old-engine/` hold old names (`core_dealt`, `cores`) and stay as recorded; the replaying tests map them.

## Step 18 items 7 and 8: state after team D1 (2026-11-02)

Item 7 is **partly done**, item 8 (the core motive rename) is **not started**: it stays the last commit, after the engine
is gone. Goldens are unchanged, `GOLDEN_UPDATE` was not used, and no test was deleted (`step18-decisions.md`, "Team D1").

**Done:**

- (a) About 30 test files play the host through `test/helpers/host-fixture.ts` now, and every assertion was kept. The
  ported files are `test/model/scripted`, `test/engine/{tribunal-stop,arena,cast,director,director-society,feast,passes,
  penalties,numbers,petitions}`, `test/tools/status`, `test/scale/whole-story`, `test/log/{transcripts,minute-report}`,
  `test/digest/{end-to-end,event-log}`, `test/stories/{cityofkeys,cityofkeys-beats,cityofkeys-levels,cityofkeys-wall,
  whispers,whispers-direction}`, `test/report/{drama,reporter}` and `test/agents/personas`.
  - The white-box readers they need are in `test/helpers/host-inspect.ts`. They read facts (`host.fact(key)`, new in
    `Host`), slices (`host.snapshot().mechanics[id].data`, parsed with the mechanic's schema) or log lines.
  - `hostOracle` reads its two facts with `host.fact`, which made the 48-agent whole-story test about 5 times faster.
- (b) The pattern for recording the old side is built: `recordedOld(name, scenario, schema)` in
  `test/helpers/old-engine.ts`, which reads the files in `test/fixtures/old-engine/` (a README table lists each file and
  the commit it was recorded on). One differential uses it so far: `test/mechanics/motives/differential.test.ts`.
- (c) The event types moved to a new leaf package, `@swarmtales/legacy-log` (`packages/legacy-log/src/{events,labels}.ts`,
  which depends only on contracts; the core may not contain game words). `packages/engine/src/events.ts`
  and `labels.ts` are re-export shims; the engine keeps only `EventBus`.
  - `MemorySink` moved to `packages/chronicle/src/log/sinks.ts`, and `labelMeaning`/`LABEL_PROMPTS` to
    `packages/roles/src/interpret/classifier.ts`.
  - `CoreMotive`, `renderCoreMotive` and `coreMotiveLine` moved to `packages/roles/src/agents/core-motive.ts`.
  - **`packages/chronicle` no longer depends on the engine.** The legacy snapshot shapes are Typebox schemas in
    `chronicle/src/snapshot/snapshot.ts` (`LegacyArenaSnapshot`, `LegacyWorldSnapshot`, `LegacyDirectorSnapshot`), and
    `compose.ts` checks the engine types against them in both directions.

**New open item, found while porting:** at the end of a run the host writes `petition_resolved` and its board posts
**after** `run_end`; the old engine wrote them before it. This is close to S1-7, the order of treasuries and the
petitions' last resolutions. Because of it, the full run in `test/engine/petitions.test.ts` "fails a petition still open
when the run ends" stays on the old fixture. Fix the order of the host's `runEnded` (or decide that the new order is
right), then port that test.

**What remains, in this order:**

1. **Port the remaining users of the old fixture or `composeRun`** (about 50 files). Port each one to the host fixture;
   where a test needs the old side, record that side once with `recordedOld`.
   - Not ported yet: `test/engine/{direction,factors,marks,names,receipts,seal,standoff-world,whispers,world}`,
     `test/stories/cityofkeys-tribunal` (resumes from a legacy snapshot, heavily white-box), `test/tools/{blame,gateway}`,
     `test/gamemaker/{director,gamemaker,holdout,privacy,situation}`, `test/interpret/interpreter`, all of
     `test/snapshot/*` (they need recorded legacy snapshots and a host resume), and `test/golden/scripts.ts`.
   - Tests kept on the old fixture on purpose, each with a comment in the test (move them when their reason is gone):
     - in `test/engine/arena.test.ts`, "does not wake ... group posts while readGroup is locked" and "... board posts
       while readBoard is locked" (their setup writes into the `World` before the run; the host needs a pre-run hook or
       a scripted minute 0);
     - in `test/engine/director-society.test.ts`, "skips listed IDs that are not competitors" (it drives the old
       `Director` by hand with a script the validator refuses);
     - in `test/engine/petitions.test.ts`, the full run of "fails a petition still open ..." (the order difference above).
2. **Record the old side of the remaining differentials** with `recordedOld`, using the test's own `playOld` unchanged,
   at a commit where the engine still runs, and write that commit in the README table. These are
   `test/mechanics/{arena,channels,script,seal,standoff-tribunal,t1,t3,tribunal,whispers,goals,marks,exile,standoff}/**`,
   `test/mechanics/auto-grants-equality`, `test/roles/gamemaker-overseer/{differential,host,shadow}` and
   `test/cli/host-{gamemaker,residents,runner}-differential`, `host-resume`, `host-weaver`, `host-gamemaker-golden` and
   `test/cli/support/report-replay.ts`.
3. **Unit tests of the old engine modules** (`test/engine/{board,scheduler,mailbox,groups,teams,goals,standoff,motives,
   holdout,tribunal,puzzles/*,direction}` and the old-module parts of the files above): delete them when the engine
   goes. Before deleting each file, name in `step18-decisions.md` the mechanic test that covers each of its cases; port
   any case that no mechanic test covers.
4. **Move what the apps and the SDK still import from the engine.**
   - `apps/cli` (`compose.ts`, `host/{report,residents,run}.ts`, `oracle.ts`, `run-options.ts`, `validate.ts`):
     `DIRECTOR_SUPPORT`, `directFigure`, `figureOf`, `DirectionLevel`, `worldOracle`.
   - `packages/sdk` (`index.ts`, `validate.ts`): `ladderSteps`, `ladderText`, `penaltyAt`, `actEnd`, `fitsBefore`,
     `maxFactions`, `tribunalHeld`.
   - Test helpers that use pure engine helpers or constants (`LOCKED_REPLY`, `PetitionBook`, ...): see
     `grep -rl @swarmtales/engine test`.
5. **Delete the old roles**: `roles/src/gamemaker/{gamemaker,look,situation,system-prompt}.ts` (look at what the overseer
   gamemaker still imports first), `agents/runner.ts`, `interpret/{interpreter,weaver}.ts` and
   `roles/src/overseer/gamemaker.ts`'s engine imports. Then delete `apps/cli/src/compose.ts`, `test/helpers/fixture.ts`,
   `packages/engine`, its `check-packages` row and its tsconfig references.
6. **Item 8, the core motive rename** (`rename-core-motive.md`): a separate last commit. Run `GOLDEN_UPDATE=1` once, and
   show that the golden diff contains only the rename.

## Step 18: state after the final integrator pass (2026-11-02)

**Done in this pass** (decisions S18-13..S18-22 and the R1/R2/R3 answers in `step18-decisions.md`):

- Items 1-3 and 5: the CLI (`apps/cli/src/main.ts`) runs on the host through `composeHostRun`
  (`apps/cli/src/host/run.ts`): the dials reach the host (`hostStoryOf`), the residents' messages are stored in the new run
  file `swarmtales-run` and restored on resume (`apps/cli/src/host/snapshot.ts`; old `agent-arena-snapshot` files are still
  read and converted), one budget (the arena's `budgetUsd` from `usage`), the weaver desk (`apps/cli/src/host/weaver-desk.ts`),
  the gamemaker's system prompt from host facts, the definition-id router (`overseerRouter`), personas, the scripted oracle
  from host facts (`hostOracle`). `VOICE_RULE` and `DirectionLevel` left the engine. The lab scripts start `pnpm start` with
  old snapshot files, so they run on the host through the converter without a change.
- Item 6: `test/golden/golden.test.ts` plays all three goldens on the host, every line including the gamemaker's and
  `prompts.json`, no filter; byte-identical, golden files unchanged, `GOLDEN_UPDATE` not used. New proofs:
  `test/cli/host-resume.test.ts` (old vs new with snapshot after level 7; resume of the own file equals the uninterrupted run;
  resume of the old engine's file equals the old engine's resume; same seed twice) and `test/cli/host-weaver.test.ts` (the
  weaver run line for line against the old, and its cut-and-resume). The real run logs and legacy snapshots round-trip as
  before (`test/log/legacy-files.test.ts`, `test/snapshot/legacy-*.test.ts`).
- R1-1: a story with names but names off keeps `chooseName` granted and locked, so the prompt bytes are the old ones.

**What remains (not started in this pass):**

1. **Item 7, delete `world.ts` and the engine game code.** (Partly done since: see "state after team D1" above.) Not done: about 70 test files still play the old engine through
   `composeRun` (`test/helpers/fixture.ts` and its users, `test/snapshot/*`, `test/engine/*`, `test/gamemaker/*`,
   `test/stories/*`, `test/mechanics/**` differentials, `test/cli/host-*-differential.test.ts`), and `packages/chronicle` and
   `packages/roles` (old `Gamemaker`, `AgentRunner`, interpreter, weaver, `describeSituation`) import engine types
   (`RecordedEvent`, `World`, `EventBus`). The order to do it: (a) port `test/helpers/fixture.ts` users to
   `test/helpers/host-fixture.ts` (same defaults; scripts get the host), file by file, keeping each assertion; (b) turn the
   old-vs-new differentials into golden or recorded-log comparisons (record the old side's logs once into
   `test/fixtures/` before the engine goes, then compare the mechanic against the recorded file); (c) move `RecordedEvent`,
   the event types, `MemorySink` and the sinks from `packages/engine` into `packages/chronicle` (or contracts); (d) delete the
   old roles (`roles/src/gamemaker/gamemaker.ts`, `agents/runner.ts`, `interpret/{interpreter,weaver,classifier}.ts`) and
   `compose.ts`; (e) delete `packages/engine/src/{world,arena,director,tribunal,holdout,standoff,seal,...}.ts`. No test was
   deleted in this pass.
2. **Item 8, the core motive rename** (`rename-core-motive.md`): still the last commit, after item 7. While the old engine
   runs as the other side of the differentials, renaming `core_dealt` would have to rename the old engine's event too.
3. Open requests that stay **To build**: R2-1 (exiled residents' tool count 0 in the standings), R2-2 (`run_end` minute after
   the tribunal's stop, check after A1-1), A1-7, S1-1/2/3, S1-6/7, O2-10, C1-7 per-statement decider errors, O2-12 the
   reporter's human-influenced flag.
4. **Docs**: `docs/ARCHITECTURE.md` (layout, CLI on the host, run files) and `docs/HOW-IT-WORKS.md` (the run file format)
   describe the host path now; their paragraphs on the old engine's `World`, `Arena` and roles stay, marked as the old
   engine's, and are rewritten with item 7.

## Step 18: what remains (after integrator pass 1, 2026-11-02; items 1-3, 5 and 6 done in the final pass above)

`world.ts` still runs the product: `apps/cli` (`compose.ts`, `main.ts`) composes the old `World`, and `test/golden/golden.test.ts`
records the goldens through `composeRun`. What the new host already does is proven by `test/cli/host-story-golden.test.ts`:
on the production mapping (`hostStoryOf`) every golden line outside the app (every mechanic line, the arena's standings, the
order) is equal for all three goldens, and the gamemaker's Tribunal section from the `tribunal.section` fact equals every golden
look. What is missing are the **app lines** (runner, gamemaker, usage, `turn_input`'s app parts) and the CLI around them.
In order:

1. **A host-backed resident runner** in `apps/cli` (replaces `Arena` + `AgentRunner` on `World`): `host.run(turn => ...)` drives
   the model per turn and writes the old app lines through `host.record` exactly as today: `turn_input` (the mechanics' inputs
   plus the runner's `[tools]` notice and the figure cues of `packages/engine/src/direction.ts`, which move into the CLI),
   `request` (open tools sorted by `TOOL_NAMES`, G1-5), `text`, `thinking`, `tool_call`, `tool_result`, `turn_error`,
   `usage`, `agent_profile`, `souffleur_rewrite`; the residents' system prompts (`roles/agents/system-prompt.ts`, today fed by
   `World`: names, core motive prose from `motives.prose`, goals, personas, addenda). Gate: the golden `prompts.json` and every
   app line of the three goldens.
2. **The host-backed gamemaker report** (C2-4): facts and renderers per owner, each gated against the golden
   `gamemaker_turn.input` like the tribunal section (S18-8). Then the gamemaker overseer with `gamemakerRuntime` replaces the app
   `between` gamemaker; a definition-id router for runtimes (C2-11).
3. **Classifier, weaver, judge runtimes** (DONE by R3 as runtimes in `packages/roles`, differential-tested; the CLI wiring and the router are items 2 and 5; open points in `step18-requests-R3.md`) (C1-6 `usage`, C1-7 decider, C1-8 last minute, C1-9 `overseerSlice`,
   C1-13 cursor at legacy conversion, C1-14 400 characters, C2-9 `seen` at resume).
4. **Kernel and shared items** (decided, small; DONE by R3: A1-1, A1-4, A1-6, S1-5 for arena/progression/channels/script; still open: A1-7, S1-5 for the other mechanics): A1-1 `run_end` at the breach minute, A1-4 stop text, A1-7 breach on
   `minute_ended`, A1-6 `hasSolved`, S1-1/2/3 shared queries, S1-5 per-slice write-back to the old snapshot shape, S1-6/S1-7
   cast and treasury order, O2-10 loader refusal.
5. **Switch the CLI** (`main.ts`, `compose.ts`, `oracle.ts`, lab scripts' engine imports) to `hostStoryOf` + the host runner;
   `--figure-direction`/`--gm-direction`/defiance are already mapped in `hostStoryOf`; resume converts the legacy snapshot
   (`convertLegacySnapshot`) and writes `run_resumed` from the CLI.
6. **Golden proof on the new host**: `test/golden/golden.test.ts` runs the host path; byte-identical for all three goldens,
   the 14 real run logs and the legacy snapshots still round-trip (`test/log/legacy-files.test.ts`, `test/snapshot/*`).
7. **Delete** `world.ts` and the engine game code the mechanics replaced (`packages/engine/src/{world,arena,director,tribunal,
   holdout,standoff,seal,...}.ts`), port the differential tests (`test/mechanics/**` compare old `World` against the mechanics:
   they become golden-gated tests of the mechanic or are dropped with a note when a golden gate covers them), keep what the
   apps still need (event types, `MemorySink`, sinks, `RecordedEvent` until the readers move).
8. **Last commit: the core motive rename** (`rename-core-motive.md`, decision S18-12): `motive_dealt`, the snapshot key
   migration, the pinned strings; `GOLDEN_UPDATE=1` once, and show that the golden diff is only the rename.

Still open from the round-3 challengers (not re-checked in pass 1): the DM count in `whispers` `dutyNow.busiest`; A1-12 goals on
resume after S18-10.

## Open, in this order

1. **Round 3 challengers are done** (reports: `/mnt/project-files/notes/challenge-round3-*.md`). Golden logs are safe in every
   team's area. Code blockers (one Sonnet agent fixes them): the DM count in `whispers` `dutyNow.busiest`, the active cast in
   progression's `listAgents` (`CastExtrasApi.active` into `mechanics/shared`), the wrong `defiance` mapping in R2-D5/R2-D17
   (`defiance = story.gamemaker !== undefined && gmDirection >= 10`; `whispererDefies` is a separate flag). Also a core decision
   already made: a resident struck by the seal mid-block must get `TOOL_LOCKED` + `LOCKED_REPLY` as in `world.ts:1439`, not
   `RESIDENT_INACTIVE` (`kernel/src/host/gateway.ts:209`).
   **Step-18 wiring list: done in integrator pass 1** (`step18-decisions.md`): `script` and `arena` exist; the overseers' tool
   lists respect locks (C2-2); `gamemakerRoles` and `grantsUltimatum` are mapped (`hostStoryOf`); `resolvePetition` is granted
   to `script` by `suggest`; the Tribunal section renderer is production code with a golden gate; `--no-guards` drops
   `receipts.minRun`; names has an off switch; resume work is written at the old minute (L1) and the whisperer survives a file
   without `whisperer_chosen` (L2); `TOOL_LOCKED` instead of `RESIDENT_INACTIVE`; the defiance mapping is `hostStoryOf`'s.
2. **Overseers and the decision gate** (idea, Flo decided the name Overseer; API sketch still to write and to read before building): `docs/ideas/overseers-and-plugins.md`.
   Step 18 wave plan (Flo gave the go 2026-11-01): wave A (running) O1 overseer core steps 1-4, S1 `script`, A1 `arena`; wave B overseer
   scheduling, orders, human hand, testkit, `grants: auto`; wave C roles as overseers, CLI wiring, delete `world.ts`, golden compare; challengers after each wave.
3. **Story option mapping** (R2-D17) when step 18 composes the stories.
4. **Step 18: replace `world.ts`** with the turn loop (`legacyTurns`), the script mechanic and the arena; delete
   `packages/engine` game code; golden comparison over all runs; story prompt overrides become possible there
   (`pnpm validate` refuses them until then); wire `defiance` and `direction` in the CLI.
   **Decision point (core motive rename, `docs/design/rename-core-motive.md`):** until here the new core writes the legacy
   names through the adapter (event `core_dealt`, snapshot key `cores`, the pinned gamemaker strings that still say "core").
   At step 18 the event becomes `motive_dealt`, the snapshot key gets a migration, the pinned strings are reworded, and the golden
   files are updated once, deliberately, with the documented reason "core becomes core motive".
5. **Wave 4:** `swt` commands (noun-verb, Ink TUI, `watch`), story schema and YAML loader, expression language,
   sandbox spike, VS Code extension; first npm publish needs Flo's go; `library/` copy at publish; curated public API
   instead of `export *` barrels; `max-lines` ratchet; reduce lint memory (typed linting over 30+ packages).
5a. **Signed event log: built (step 18, team H1, `docs/design/event-log-signing.md`).** Sidecar `events.chain.jsonl` + `run.pub`
   beside the unchanged `events.jsonl` (`EventChain` in `packages/chronicle/src/log/chain.ts`, fed by `JsonlEventLog`); signed
   heads at `run_end`, at every snapshot (the run file's `chain` checkpoint, which a resumed run's genesis chains from) and at
   close; `swt log verify <run> [--key] [--previous]`; tests in `test/log/chain.test.ts`, `test/log/canonical.test.ts`,
   `test/golden/golden-chain.test.ts`, `test/cli/log-verify.test.ts`, `test/cli/main.test.ts`; mutants
   `docs/design/mutants-step18-H1.json`. Open: an external anchor of the public key (publishing it needs Flo's go); the ISTAnt
   treatment commitment goes into `commitments` when the replica is built. The original brief follows.
   (Flo's requirement 2026-11-01, priority: right after the wave C golden compare, before the final PR and
   before any ISTAnt run). Every run gets its own Ed25519 key pair (node:crypto, no new dependency); the public key is stored with
   the run, the private key lives only in memory and is gone when the run ends. Each event carries `hash = sha256(previousHash,
   canonical JSON (RFC 8785) of the event)`; a genesis entry holds public key, code commit, story hash, seed and models (ISTAnt:
   also a hash of the treatment assignment); the run end is signed over the head hash. `swt log verify <run>` checks any chain
   against its public key. Resumed runs chain from the snapshot's head hash. **Golden fit:** the golden logs must stay byte-equal,
   so the first form is a sidecar (`events.chain.jsonl` + `run.pub`) over the unchanged `events.jsonl` lines; the goldens compare
   with the sidecar off or ignore it. Limit to state in the docs: without an external anchor of the public key (timestamp) an
   operator could re-sign a fake log with a fresh key, so the chain proves integrity after publication, not authenticity.
   Where: `packages/kernel/src/host/log.ts` (a log sink after the legacy adapter), verify in `apps/cli`, tests with a tampered
   line, a deleted line, a swapped order and a resume.
6. **Docs:** README and `docs/` for the new structure; change CLAUDE.md "never YAML" only in the PR that ships YAML.

## Notes for whoever continues

- Models by role (Flo): Opus for core design, hard mechanics and every challenger; Sonnet for mechanical carving.
- Open naming question for Flo: `defineMechanic` is a working name ("Mechanic" for game rules, "plugin" for the
  npm package).
- Do not run `pnpm lab:*` scripts to test `--help`: they ignore it and spend money.
- One PR at the end: say in its body that CI did not run (Actions disabled), squash-merge after `pnpm check`.
- Whispers runs 005-007 as further golden runs are planned but not built.

## Licence change on main (2026-11-01, PR #86 in swarmtales)

`main` now carries the Sustainable Use License plus Additional Terms (`LICENSE`, `LICENSE-FAQ.md`, `CONTRIBUTING.md` with CLA).
When this branch is merged into `main`: set `"license": "SEE LICENSE IN LICENSE"` in every `package.json`, except
`packages/contracts` and `packages/sdk`, which get `"Apache-2.0"` and their own copy of the Apache text as `LICENSE`.
Resolve conflicts in `LICENSE`, the README licence section and `package.json` in favour of `main`. Then look for docs that
still say Apache (`docs/ideas/monorepo.md` is already adapted). New packages (overseers, plugins, mechanics) follow the same rule.
