# Rewrite status (2026-11-02) and how to continue

Branch `claude/project-thread-b71bdz`, nothing is on `main` yet (Flo: everything lands in one pass).
`pnpm check` is green on this branch (1509 tests; lint needs a 12 GB heap, the whole check takes about 7 minutes).
The CLI runs on the new core (host, 19 mechanics, overseers) since the final step-18 integrator pass; the old engine
(`packages/engine`, `world.ts`) is still in the tree as the other side of the differential tests. Golden files in
`test/golden` were never regenerated; the goldens now play on the host, byte-identical.

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

1. **Item 7, delete `world.ts` and the engine game code.** Not done: about 70 test files still play the old engine through
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
5a. **Signed event log** (Flo's requirement 2026-11-01, priority: right after the wave C golden compare, before the final PR and
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
