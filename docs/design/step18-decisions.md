# Step 18: the integrator's decisions on the wave A-C requests

Integrator pass of 2026-11-02 over `docs/design/step18-requests-{O1,O2,S1,A1,G1,C1,C2}.md`. Every request has a
decision. **Built** means it landed in this pass (commit named); **To build** means the decision stands and the work is
listed in `docs/design/rewrite-status.md` ("Step 18: what remains"); **Confirmed** means the team's behaviour is the
intended one and nothing changes.

## Decisions taken in this pass (S18-n)

| ID | Decision | Where |
|---|---|---|
| S18-1 | A resident who may not act is answered `TOOL_LOCKED` with the locked reply, as the old engine answered a resident with no open tools (`world.ts:1439`). `RESIDENT_INACTIVE` and `replies/core/inactive` are gone. | `kernel/src/host/gateway.ts` |
| S18-2 | `OVERSEER_ORDER = { classifier: 100, weaver: 200, gamemaker: 300 }` lives in `mechanics/shared/src/order.ts`; roles depend on the shared module for it. The gamemaker overseer sorted at 30 (before the classifier and the weaver, against its own comment); it now uses `OVERSEER_ORDER.gamemaker`. | shared, `roles/src/overseer/gamemaker.ts` |
| S18-3 | `interpretation*` belong to the classifier, `fate_shift` to the weaver (`LEGACY_OVERSEERS`, not mechanics). The legacy adapter maps the envelope seqs in `interpretation.ref` and `fate_shift.evidence` to the legacy seq of the line each envelope became (a dropped envelope: the last line before it; an unseen seq is kept). The models keep seeing envelope numbers (the host log is what overseers read); `events.jsonl` points at its own lines. | `chronicle/src/log/legacy-*.ts` |
| S18-4 | The names book has an off switch (`off`, `namesOff()`): loaded, so `NamesApi` readers find it, but no names, `chooseName` locked, no status line; the snapshot keeps `off: true`. | `mechanics/names` |
| S18-5 | The story option mapping (R2-D17) is production code: `apps/cli/src/host/story.ts` (`hostStoryOf`). Every mechanic is real, `grants: "auto"` plus the dials' `grantTweaks`, the guards as tool policies. `apps/cli` depends on every mechanic package. | `apps/cli/src/host/story.ts` |
| S18-6 | Progression gets the option `managed`: the tools no level lists that stay closed until the director unlocks them. The old engine kept every non-feature tool closed unless the level or an unlock opened it; without the option, `signPetition`/`listPetitions` were open on the host and the standings counted 10 tools instead of 8. A finished resident gets every level's tools plus its unlocks (old `#finalTools`). | `mechanics/progression` |
| S18-7 | Per-feature grants as `storyToolNames` bound them: `forgeReceipt` only with `whisperer.forgery`, `nameFavourite` only with `popularity`, `chooseName` only when the run names its residents. Tools of a mechanic that is not loaded (the seal without a tribunal, the tribunal's votes without a tribunal) are not granted; the old engine bound them but never opened them, so no request line or tools notice showed them. | `grantTweaksOf` |
| S18-8 | The gamemaker's "Tribunal:" section renderer is production code (`renderTribunalSection` from the `tribunal.section` fact) and a repo gate compares it with every golden gamemaker look. | `mechanics/tribunal/src/section.ts`, `test/cli/host-story-golden.test.ts` |
| S18-9 | `--no-guards` drops the tool policies and `receipts.minRun` together (`minRunOf(story, guards)`). | `apps/cli/src/host/story.ts` |
| S18-10 | A resumed run's `runResumed` phases run at the snapshot's last played minute (the old restore's clock), not one minute later (round-3 challenge L1). The T3 twin no longer forces the old world one minute ahead. | `kernel/src/host/host.ts` |
| S18-11 | `WhispersApi.whisperer` (shared): channels (`defy`, the role check in notes) and motives ask whispers before reading `whisperer_chosen` from the log, so a resumed run whose file had no whispers slice keeps its whisperer (round-3 challenge L2). | shared, whispers, channels, motives |
| S18-12 | **The core motive rename is not done in this pass.** `rename-core-motive.md` ties it to the cut-over: "when `world.ts` is replaced, rename the event ... and update the golden files once". The goldens are still written by the old engine (`test/golden/golden.test.ts` runs `composeRun`), so renaming now would have to rename the old engine's event, schema, readers and the pinned prompt strings as well, and would mix a behaviour change into the step whose proof is "byte-identical except the rename". It stays the last commit of the cut-over. | `rewrite-status.md` |

## Integrator pass 2 (final integrator, 2026-11-02): the CLI on the host

The CLI (`apps/cli/src/main.ts`) runs on the new host: `composeHostRun` (`apps/cli/src/host/run.ts`) replaces `composeRun`
for every run the command line starts. `compose.ts` stays only for the tests that still play the old engine as the other
side of a differential (see "What remains" in `rewrite-status.md`).

| ID | Decision | Where |
|---|---|---|
| S18-13 | **Probe host.** The overseers' options need facts of the dealt city (the residents' characters for the weaver, the gamemaker's prompt input: whisperer, dealt motives, names). `composeHostRun` first starts (or resumes) the story **without overseers** on a probe host, reads its facts, then builds the real host with the overseers. The probe is resumed from the snapshot without its `overseers` slices (it loads none). Both hosts deal from the same seed, so the facts are the real host's. | `apps/cli/src/host/run.ts` |
| S18-14 | **App lines on resume.** What the app records on a resumed host before its first minute (`run_resumed`, the `agent_profile` lines) is stamped with the snapshot's last played minute, as the old restore wrote them (S18-10). `recordProfiles()` runs on a resume too (the old arena wrote the profiles again). | `kernel/src/host/host.ts` (`record`) |
| S18-15 | **An overseer reads its refusals as written.** The gateway formats a running overseer's successful replies through `display` (names for ids) but hands it its refusals unchanged, as the old gamemaker's `ToolRefusal` text never went through `display` (`REPEATED: you wrote nearly the same to A03 ...`). `gamemakerRuntime` shows a refusal as `CODE: detail` (the bare code without detail, e.g. `INVALID_ARGUMENTS`), as the old wrapper did. Found by the CLI resume differential; no golden had a gamemaker refusal. | `kernel/src/host/gateway.ts`, `roles/src/overseer/gamemaker-runtime.ts` |
| S18-16 | **Run length for the overseers' last-round rule** (C1-8, C2-6): `runMinutes` reads the last `run_resumed` (a resumed run may play another length), then the core's `run_started`, then the old engine's `run_start` of a converted legacy log. Without the fallback a run resumed from an old file looked once more after its last round. | `roles/src/overseer/recent.ts` |
| S18-17 | **The new run file** `swarmtales-run` v1 (`apps/cli/src/host/snapshot.ts`): the host snapshot, its envelopes, the residents' messages (`competitors`), the weaver desk's state and the run's dials. `--resume` reads both this format and the old `agent-arena-snapshot` (converted with `convertLegacySnapshot`, the old roles' state through `overseerEntriesAtResume`). The CLI writes only the new format; `toLegacySnapshot` stays as the round-trip proof of the converter and is not needed by the CLI (R3-4 closed by this decision). File names stay `snapshot-L<level>.json` / `snapshot-L<level>-M<minute>.json`. | `apps/cli/src/host/snapshot.ts` |
| S18-18 | **One budget.** The run's budget (`--budget`, `run.budgetUsd`) is the arena's `budgetUsd`, counted from the app's `usage` lines (every model call of residents, gamemaker, classifier, weaver, judge, guard, souffleur writes one). The CLI sets no referee `maxCostUsd`, so no spend is counted twice. `composeHostRun` counts it only with `budget: true` (the CLI); the tests leave it off. | `apps/cli/src/host/run.ts` |
| S18-19 | **The weaver desk.** The old app's `takeVoices`/`returnVoices` and `rewrite` callback become `WeaverDesk` in the CLI: it reads `host.overseerSlice("weaver")` before each turn, applies a new hard shift to the resident's system prompt (`rewriteSystemPrompt`), hands the inner voices not heard yet to the runner and keeps a per-resident "heard up to" mark; the mark and the applied shifts go into the run file (`weaver`) and are re-applied on resume. No new event and no kernel change (R1-7, R3-2). | `apps/cli/src/host/weaver-desk.ts` |
| S18-20 | **Definition-id router** (C2-11, R3-1): `overseerRouter({ gamemaker, classifier, weaver, judge })` maps the definition id of a call to its runtime; every runtime refuses a foreign definition, so the router is a lookup. The CLI builds the backends with `classifierBackend` (chat or decider), `judgeBackend`, `weaverBackend` and the gamemaker binding. | `roles/src/overseer/backends.ts` |
| S18-21 | **The gamemaker's system prompt from host data** (R2-5): `gamemakerUse` builds `gamemakerOptions(...)` from the probe's facts (whisperer, dealt motives, names, the seal mechanic loaded, the whisperer's duty) and the run's dials; `run.gamemakerPrompt` reads it back for `prompts.json`. | `apps/cli/src/host/run.ts` |
| S18-22 | **`--snapshot-at`**: a minute cut sets the arena's snapshot `afterLevel` past the last played level (the arena takes the cut at the minute; its option refuses 0) and no door (`holdAfter`); a level cut sets `holdAfter` on puzzles and progression, as the old `holdAfter`. | `apps/cli/src/host/run.ts`, `apps/cli/src/host/story.ts` |
| S18-23 | **`--level` reaches puzzles.** The mapping passes the run's first level to puzzles as well (`startLevel`); without it a run started at level 2 dealt level 1 too (an extra `fragments_dealt`). Found by `test/cli/host-weaver.test.ts`; no golden starts past level 1. | `apps/cli/src/host/story.ts` |
| S18-24 | **Model-visible log numbers** (S18-3 extended): the gamemaker's report reads a fate shift's evidence from the host log, so its "(after #n)" is a host envelope number where the old report showed the legacy line number. The models see host numbers everywhere (classifier, weaver, gamemaker); `events.jsonl` keeps its own. The differentials compare these numbers out. | `test/cli/host-*.test.ts` |

**The names-off question (R1-1): kept the old prompt bytes.** A run of a story **with** names but names off (`--no-names`,
a run that starts past the first level, a resume of such a run) still grants `chooseName`; the names book is loaded
switched off (`namesOff()`) and keeps the tool locked, so the model sees the declaration the old engine bound, in the old
order, and every request, tools notice and `usage` line is the old one. Only a story **without** names drops it (the old
`storyToolNames` never bound it there either). `test/cli/host-residents-differential.test.ts` now expects the old tool
declarations for every one of its 53 dial combinations, with no exception. S18-7 and G1-4 are amended accordingly.

### R1 (host resident runner)

1. `chooseName` with names off: **Built** as above (granted, locked).
2. Turn loop order (each member's agent starts right after its inputs): **Confirmed**.
3. `Host.openTools(resident)`: **Confirmed** under that name.
4. CLI wiring: **Built** (`composeHostRun`). `personas` stays an option of `hostResidents` (filled from the effective run), not a field of `HostRun`: the story mapping does not read it.
5. Resume: **Built**: the run file keeps the residents' messages (`competitors`), restored after `hostResidents`; `names` on resume is what the snapshot played (`namesOfSnapshot`).
6. Money: **Decided** as S18-18 (one budget, the arena's).
7. Weaver hooks: **Built** as S18-19.
8. `VOICE_RULE` and `DirectionLevel` out of the engine: **Built** (commit `9919fcf`: `DirectionLevel`, `DIRECTION_LEVELS`, `DEFAULT_DIRECTION` in `@swarmtales/contracts`, next to the story's `FigureDirection` in `story.ts`, a file the core-words gate lists as legacy; `VOICE_RULE` in `@swarmtales/roles`).
9. The golden gate with the gamemaker: **Built**: `test/golden/golden.test.ts` plays all three goldens on the host (`test/helpers/host-fixture.ts`, `test/golden/host-scripts.ts`), every line including the gamemaker's and `prompts.json`, no filter; byte-identical, `GOLDEN_UPDATE` not used.

### R2 (host-backed gamemaker report)

1. Exiled residents' tool count in the standings: **To build** (arena; the old wrote 0). Masked by name in the 30-minute differential; no golden and no CLI differential reaches it.
2. `run_end` minute after the tribunal's stop: **To check** after A1-1 (R3 built it); the differential still masks it.
3. The runner's `text` and `tool_call` lines on the host log before `between`: **Built** (the host runner writes them through `turn.record`).
4. Secrets in facts (`puzzles.secrets`, `puzzles.solutions`, `standoff.outstanding`): **Confirmed**; no model reads facts. `puzzles.solutions` (new, for the scripted oracle) is the same kind.
5. CLI wiring: **Built** (S18-20, S18-21).
6. Paths no old run reaches: **Confirmed** as unit-pinned.
7. Undealt level in the wait lines: **Confirmed** (no story reaches it).
8. Fact cost: **Confirmed** for 6 residents; a lazy `facts(names)` before the 48/96-resident runs.

### R3 (classifier, weaver, judge runtimes)

1. Router and CLI wiring: **Built** (S18-20).
2. Weaver app state: **Built** (S18-19).
3. Resume wiring: **Built**: `overseerEntriesAtResume` fills `overseers` of the converted legacy snapshot under the names `classifier`, `weaver`, `gamemaker`.
4. `toLegacySnapshot` for the other mechanics: **Not needed** (S18-17).
5. A1-7, S1-1/2/3, S1-6/7, O2-10: **To build** (unchanged; no golden or CLI differential reaches them).
6. Decider details: **Confirmed**.
7. `hasSolved` in the arena: **Confirmed**.
8. Merge note on `FINGERPRINT`: noted (unchanged in this pass).
9. Tests changed on purpose: **Confirmed**.
10. Weaver act-end firing at the last minute: **Confirmed** (skipped, as the old).
11. Equivalent mutants: **Confirmed**.

### Proof of this pass

- `test/golden/golden.test.ts`: all three goldens on the host, every line and `prompts.json`, byte-identical; golden files unchanged.
- `test/cli/host-resume.test.ts`: a scripted City of Keys run with gamemaker and classifier (names on), held at the door of level 7: (1) logs what the old engine logged, line for line; (2) resumed from its own `swarmtales-run` file (through JSON and the schema) it continues exactly like the uninterrupted run; (3) resumed from the old engine's `agent-arena-snapshot` file it logs what the old engine logged resuming it; (4) the same seed plays the same run twice. The classifier's token counts are not compared (its prompt carries host seqs, S18-3).
- `test/cli/host-weaver.test.ts`: the scripted weaver run (classifier, gamemaker, weaver, start at level 2) against the old engine line for line, including the inner voices in A02's inputs and A02's rewritten system prompt per request; and a cut at minute 4 resumed from its own run file equals the uncut run. It found S18-23 and a desk wiring bug (the runners were built before the desk, so no inner voice reached them).
- The 14 real run logs and the legacy snapshots still round-trip (`test/log/*`, `test/snapshot/*`, unchanged).

## O1 (overseer core)

1. `HostOptions.human`: **Confirmed** in O2's form (O2-4): `boolean | HumanChannel`.
2. Decisions open at the run's end: **Confirmed** as O2-3 (settle with the original proposal, `changed: false`, no `by`).
3. `script` never holds a decision: **Confirmed**; the `reachable` rule changes only when scripts get turns.
4. The story's decision window overrides the mechanic's: **Confirmed** (the story is the author's last word).
5. Prompt ids under `core/tools`, `core/replies` and `replies/core/decision-*`: **Confirmed**.
6. The tribunal's immediate path equals the old close only while nothing between ranking and commit exiles: **Confirmed** as a known limit; a future exiling penalty needs a differential.

## O2 (overseer runtime)

1. Named overseer orders: **Built** (S18-2). A trigger without an order sorts at 0.
2. `between` order (human safe stop, overseers, then the app's `between`): **Confirmed**.
3. Open decisions settle with the original proposal at `#finish`; on a stop between minutes without the settle stages: **Confirmed**.
4. `HostOptions.human: boolean | HumanChannel`: **Confirmed**.
5. Fact triggers are levels: **Confirmed**; an edge keeps the last value in the overseer's state.
6. Only `ctx.log` and event triggers are filtered by audience: **Confirmed**.
7. `copyTo` copies by audience only; `gamemakerKnows` stays with the story: **Confirmed**.
8. Standing orders for an app-driven gamemaker are stored, not rendered: **Confirmed** until the CLI runs the gamemaker overseer (then they render through `{{standingOrders}}`).
9. `runEnded` overseers do not run on a stop between minutes: **Confirmed**.
10. A non-object output gains no `orders`: **To build**: the loader refuses a head whose output is not an object when a story lets it take `order`-mode orders.
11. A consult makes exactly one call: **Confirmed**.
12. The reporter's "human-influenced" flag: **To build** (wave 4, reporter).
13. `scriptedHuman` replays only calls at safe stops: **Confirmed**.
14. Conformance test in `test/host/overseer-conformance.test.ts`: **Confirmed**.
15. `stubOverseer` with `defineOverseer`: **Confirmed**.
16. "safe point" is `SafeStop` in code: **Confirmed**; the design text keeps "safe point" as prose until the docs pass (rewrite-status item 6).

## S1 (script)

1. `PuzzlesApi.teams`, 2. `CastApi.collection`, 3. `PetitionsApi.status`: **To build** (shared additions, then the script calls them instead of reading the log). The log derivations are proven by the differentials and stay until then.
4. `script: ["directorMinute", "resolvePetition"]` in every story: **Built** through `grants: "auto"` (the tools suggest `script`); `test/cli/host-story.test.ts` checks both stories.
5. `toLegacySnapshot` writes version-0 slices only (also A1-5): **To build**: a per-slice "back to the old shape" function (script, arena; arena merges `delivered`/`seenBoard` from progression and channels). Needed before the CLI writes an old-format snapshot from the host.
6. Minute start: cast shortens before the petitions resolve on the host: **To build**: the cast shortens in a staged call after the petitions' (order 1200 after 1100), as the old `startMinute`.
7. Run end: treasuries before the petitions' last resolutions: **To build**: channels settles the treasuries after the staged resolutions ran (a staged call or a later `runEnded` order). No golden reaches either case.
8. The figure cues are the app's: **Confirmed**; they move into the CLI's host runner.

## A1 (arena)

1. `run_end` one minute late after a stop at a minute's start: **To build** (kernel): the host finishes at the minute of the breach when no pass of it started; then `endShift` goes.
2. A budget stop no longer plays the next minute's start: **Confirmed** as an intended change (nothing after the breach).
3. Apps read `arena.stopping` before spending outside `between`: **Confirmed**.
4. The app's stop text in `run_end`: **To build**: `host.stop(reason)` hands its text to `runEnded`; the arena writes it when it has no reason of its own.
5. See S1-5.
6. `ProgressionApi.hasSolved`: **To build** (shared), then `reachablePoints` uses it.
7. Brakes after another mechanic's breach: **To build**: the breach on `minute_ended` (or `ctx.halted`), the arena skips brakes and the snapshot then.
8. The tribunal's stop has no differential: **To build** with the real holdout tribunal.
9. Exiled residents' `tools` count: **Built** as far as the goldens go: the production mapping replays both City of Keys goldens with the real exile, tribunal and seal and every `round_end` (standings, tools) is equal.
10. Turn policy from the story: **Built** (`hostStoryOf` passes `legacyTurns` from `arenaFromStory`).
11. `UNPROVIDED: ["ending"]` in the package gate: **Confirmed** until a mechanic provides `EndingApi`.
12. Goals dealt differently on resume: **To check** again after S18-10 (the resume minute moved to the old one; the twin's resume cases with goals now match).

## G1 (grants: auto)

1. Story mapping with `grants: "auto"` and the dials' tweaks: **Built** (S18-5, S18-7).
2. Overseer needs by `suggest: ["<definition id>"]` first, `grantTweaks` otherwise: **Confirmed**.
3. The human's core tools stay explicit (the `CORE_OWNER` skip stays): **Confirmed** until Flo asks otherwise.
4. A story without names: **Built** (S18-4; `chooseName` dropped from the lists).
5. Derived order is load order: **To build** in the CLI: the request's and the tools notice's tool lists sort by `TOOL_NAMES` (the old catalog order); the mechanic lines are unaffected (golden replay equal).
6. Fresh worktree needs `pnpm install --offline --frozen-lockfile`: noted.
7. Docs: `rewrite-status.md` updated in this pass.

## C1 (judge, classifier, weaver)

1. Slot orders: **Built** (S18-2).
2. One judge per temper (`judgeFor(temper)`): **Confirmed**.
3. Model slots (judge and classifier on `classifier`, the weaver on `weaver`, falling back to the classifier's model in the config): **Confirmed**.
4. Seq translation: **Built** (S18-3); the models see envelope numbers.
5. Owners: **Built** (S18-3).
6. `usage` events (also C1-16, C2-10): **Decided**: the model runtime adapters write the old `usage` app event per request (`host.record`, with provider and model) as the old roles did; the referee counts `costUsd` from replies only and never reads `usage`; the reporter and the digest read `usage` only. One source per consumer, no double count. **To build** in the CLI's runtime adapters; the classifier's `label` comes from the resolved model.
7. Decider backend: **Decided**: the adapter fails the whole call when any per-label request failed (the round is retried as before). **To build**.
8. Classifier and weaver after the last minute: **Decided** as C2-6: overseers read `run_started.minutes` and the arena's `arena.stopping`; no kernel change. **To build** in the weaver.
9. Weaver state for the app: **Decided**: a read-only `host.overseerSlice(name)`. **To build** with the CLI wiring.
10. `characters` and `acts` as options filled by the CLI: **Confirmed**.
11. Exile read from the log: **Confirmed**.
12. Two acts ending in one minute: **Confirmed** as a known difference.
13. No legacy migration of the overseer slices: **Decided**: the CLI writes the cursor (last legacy seq mapped to the host log) when it converts a legacy snapshot. **To build**.
14. Judge words: **Decided**: the runtime's answer tool enforces 400 characters as the old verdict tool did; `JudgeVerdict` stays without `maxLength`. **To build**.
15. Round numbers: **To check** once the CLI runs the overseers against the arena's `round_end`.
16. See 6.
17. `dist-types`: noted.
18. The whispers golden after `main`'s grudge wording: done on the branch before this pass (commit `12e2967`, documented reason).

## C2 (gamemaker overseer)

1. `OverseerBody.system?(ctx)`: **Confirmed**.
2. Lock-filtered overseer tool lists (`#overseerTools`, `actorLockProbe`): **Confirmed**; this is the wiring-list item "the gamemaker's tool list must respect locks".
3. `OLD_MAX_NOTE` in the channels' gamemaker tool descriptions: **Confirmed**; tie it to `noteMaxLength` when that option changes.
4. A host-backed report: **To build** (the largest open item of the cut-over). Facts per owner: progression (ranking, standing, levels and times, waits and next penalty, rewards, open points), motives (`motives.prose`/`lines` exist), goals (goal per resident), whispers (whisperer, duty), puzzles (`PuzzlesApi.secrets` for the secret guard, dependencies), standoff (debts, city pieces, ultimatums), seal (auction, holder), exile (risk, gates), tribunal (**built**: `tribunal.section` and `renderTribunalSection`, S18-8), standoff-tribunal (holdout lines). The renderers move next to their facts as the tribunal's did, each gated against the golden looks.
5. Order table: **Built** (S18-2).
6. Last-round and stop rule via `run_started.minutes` and `arena.stopping`: **Confirmed**; the fact name stays.
7. The tribunal compares the actor with bare `gamemaker`: **Confirmed**; the overseer is used under the name `gamemaker`.
8. Grants mapping: **Built** (`grantTweaksOf`, `tribunalGamemakerRoles`; `apps/cli` depends on `@swarmtales/mechanic-standoff`).
9. Snapshot migration of `recentFrom`: **Decided**: at resume `seen` is the host log's last seq (the first look after a resume drops its "since your last look" lines, as an old resumed gamemaker started fresh). **To build**.
10. Double cost counting: see C1-6.
11. One runtime per definition: **Decided**: a router (definition id to runtime) in `apps/cli`. **To build**.
12. CLI wiring: **To build** (see rewrite-status).
13. Standing orders end to end: **To build** (a host test with `host.hand()` instructing the gamemaker).

## Team D1 (step 18 items 7 and 8, 2026-11-02)

No test was deleted, and no assertion was weakened or dropped. The golden files are unchanged, and `GOLDEN_UPDATE` was
not used. What remains is listed in `rewrite-status.md` ("Step 18 items 7 and 8: state after team D1").

1. `Host.fact(key)`: **Built**. It computes a single mechanic fact and checks it against its schema. It returns
   `undefined` for a key that no mechanic declares. `facts()` computes every fact on every call; the oracle and the
   tests need one fact per turn.
2. Event types and labels: **Built** in a new leaf package, `@swarmtales/legacy-log` (`packages/legacy-log`, which
   depends only on contracts). They cannot go into contracts: the core has no game words
   (`test/host/core-words.test.ts`, whose legacy list may only shrink). They cannot go into chronicle either, because
   the engine and roles need them and chronicle depends on roles. The engine's `events.ts` and `labels.ts` stay as
   re-export shims until the engine is deleted. Once the run log is read from the host's own lines, the package can be
   merged into chronicle. `EventBus` stays in the engine, because only `World` uses it.
3. `MemorySink`: **Built** in `packages/chronicle/src/log/sinks.ts`. `labelMeaning` and `LABEL_PROMPTS` go with the
   classifier, in `packages/roles/src/interpret/classifier.ts`.
4. `CoreMotive` helpers: **Built** in `packages/roles/src/agents/core-motive.ts` (the system prompt and the gamemaker use
   them).
5. Legacy snapshot shapes: **Built** as Typebox schemas in chronicle, so chronicle no longer depends on the engine. The
   types are `Frozen<Static<...>>`. `compose.ts` checks them against the engine's types in both directions, so the two
   cannot drift apart while both exist.
6. The old side of a differential: **Built** as a recorded file (`test/fixtures/old-engine/`, read through `recordedOld`).
   It is recorded by the test's own `playOld`, unchanged, at a named commit and never regenerated. The motives
   differential is the first one. Its "not vacuous" check now also covers the new side.
7. Tests kept on the old fixture, each with a comment in the test: two tests in `test/engine/arena.test.ts` (they write
   into the `World` before the run), one in `test/engine/director-society.test.ts` (it drives the `Director` by hand),
   and the full run of one test in `test/engine/petitions.test.ts` (see 8).
8. End-of-run petitions after `run_end`: **Built** by team D2 (see there; new, close to S1-7). The host resolves a petition that is still
   open at the end after `run_end`; the old engine resolved it before.
9. The arena budget test (`test/engine/arena.test.ts`): the scripted provider reports no cost, so the test records a
   second `usage` app event of 0.3 USD per reply through `host.record`. The budget reads only `usage`, which is the
   path a real model takes.
10. `test/report/drama.test.ts` no longer calls `closeActs()` itself, because the host's `runEnded` closes the acts.

## Team D2 (step 18 items 7 and 8, continued, 2026-11-02)

No test was deleted, and no assertion was weakened or dropped. The golden files are unchanged, and `GOLDEN_UPDATE` was
not used. What remains is listed in `rewrite-status.md` ("Step 18 items 7 and 8: state after team D2").

1. The old side of every differential that compares old and new answers is **recorded** (`test/fixtures/old-engine/`,
   gzipped, one scenario per line; the README there describes the format). Each test keeps its old code as a "live"
   function that runs only with `OLD_ENGINE_RECORD=1` (`test/helpers/old-engine-recorder.ts`); without it the test reads
   the recording, and the fingerprint of the inputs (plan table, story, overrides, snapshot digest) must match.
   - Whole old runs or values: `oldRun` / `oldRunAsync` (the value, or the error the old code threw).
   - Old worlds read after a run: `recordWorld` / `RecordedWorld` (`test/helpers/old-world.ts`), with the old method names.
   - Tests that drive the old world step by step beside the host (the T3 twin, the goals differential): `OldTrace`, every
     answer with the question it answered, in order; a replay that asks something else fails.
   - A fingerprint leaves out what the faux model helpers draw fresh on every call (tool call ids, timestamps):
     `stableScript` in `test/cli/host-runner-differential.test.ts`.
2. `test/roles/gamemaker-overseer/{differential.test.ts,shadow.ts}` is **not recorded**: its new side is
   `worldReport(world)`, the overseer reading the live old `World`, so it cannot run without the engine. When the
   engine goes, it is deleted with this coverage (to be confirmed by the deleting commit): the three golden runs' looks
   byte for byte on the host-backed report (`test/cli/host-gamemaker-golden.test.ts`), the overseer's notes and budget
   line against the goldens (`test/roles/gamemaker-overseer/host.test.ts`), and the holdout tribunal of Whispers with its
   tribunal notes (`test/cli/host-gamemaker-differential.test.ts`, third case). The slice round trip of its third case
   ("a resumed overseer makes the very look the running one makes") has no host counterpart yet and must be ported
   before the deletion.
3. End-of-run petitions after `run_end` (D1 item 8): **Built**, the old order is the reference. The kernel's `#finish`
   now settles the calls each `runEnded` phase stages before the next phase runs, so `closePetitions`' resolutions,
   their board posts and the director's `onFail` / `onPetitionResolved` answers come before the treasuries settle and
   before `run_end`, as in the old `Arena.run`. The goldens did not change. The full run of "fails a petition still open
   when the run ends" in `test/engine/petitions.test.ts` is ported to the host fixture and checks the order.

## Team D3 (step 18 items 7 and 8, continued, 2026-11-02)

The golden files are unchanged, and `GOLDEN_UPDATE` was not used. What remains is listed in `rewrite-status.md` ("Step
18 items 7 and 8: state after team D3").

1. **Ported to the host fixture** (`test/helpers/host-fixture.ts`, `host-inspect.ts`), every assertion kept unless named
   in item 3: `test/engine/{direction,standoff-world,marks,names,receipts,seal,factors,world,whispers}`,
   `test/tools/{blame,gateway}`, `test/gamemaker/{situation,privacy,director,gamemaker,holdout}`,
   `test/interpret/interpreter`, the two kept tests of `test/engine/arena` and the director-targets test of
   `test/engine/director-society` (a bare host with the real city and the script mechanic, since validation rejects its
   unknown ids). `test/engine/{puzzles/additive,puzzles/fragments,teams,petitions}` now test the mechanics' own copies
   (`@swarmtales/mechanic-puzzles` `TeamPlanner`, `@swarmtales/mechanic-petitions` `PetitionBook`). The fixture exports
   `LOCKED_REPLY` (the prompt `replies/core/locked` behind `TOOL_LOCKED`).
2. **Three production bugs found by the ports, fixed:**
   - `createGroup` never ran the tool guard on the group name (`mechanics/channels/src/tools.ts`: `guardText` added).
   - The privacy guard read only interpretations with source `"app"`; the host's classifier writes `"classifier"`, so
     `PRIVATE_BLOCKED` never fired on the host (`mechanics/channels/src/notes.ts`, `privateLabels`).
   - A budget breach in the last turn block of a minute let the between-slot classifier run anyway
     (`packages/kernel/src/host/host.ts`: the referee's breach is read after the last block, too).
3. **Assertions that changed with the port** (the host answers differently on purpose, or the old value was an engine
   internal):
   - `test/engine/whispers`: naming a favourite between rounds answers `TOOL_LOCKED` (old `NO_VOTE`); the DM window is
     read from `getStatus` ("DMs: 2 of 2 sent since minute 0"); `mayForge` is checked as the run's whisperer;
     `PopularityVote` unit cases now use the mechanic's `restoreVote` and a host label run with names.
   - `test/engine/world`: `world.revealFactor(2, "board")` and `world.teamsOf(2).length > 0` (old `World` internals)
     have no host call; coverage: `NOT_ADDITIVE` / `NOT_PLAYED` in `test/mechanics/puzzles/puzzles.test.ts` and the door
     cases of `test/mechanics/t3` (twin-basic, edges).
   - `test/tools/gateway`: `INVALID_ARGUMENTS` is checked through `host.call`, since the model layer validates the
     schema before a tool runs; the catalog is every registered story's `host.toolSpecs("resident")`.
   - `test/tools/blame`: the judge is a scripted chat judge (`judgeScript`); `SELF_BLAME` / `UNKNOWN_AGENT` are checked
     with a judge present, since `JUDGE_ABSENT` comes first; the old `BlameDesk` unit cases use the receipts mechanic's
     `checkBlame`.
   - `test/interpret/interpreter`: the interpreter's context cases run on the classifier overseer (bare host, harness of
     `test/overseers`); the old "partial batch" case has no overseer equivalent, coverage: `test/overseers/runtime-chat`
     ("takes several label calls of one turn as one answer").
4. **Deleted:** `test/roles/gamemaker-overseer/differential.test.ts` and `shadow.ts` (the overseer read the live old
   `World`). Coverage: `test/cli/host-gamemaker-golden.test.ts` (the three golden runs' looks byte for byte),
   `test/roles/gamemaker-overseer/host.test.ts` (notes and budget line), `test/cli/host-gamemaker-differential.test.ts`
   (third case, the holdout tribunal of Whispers), and the new `test/roles/gamemaker-overseer/resume.test.ts`, which ports
   the slice round trip of the old third case: the holdout run cut at minute 7 and resumed from the snapshot file makes
   the very looks the uninterrupted run makes after the cut, and the snapshot's overseer slice holds the tribunal notes.
   No other test was deleted. With it, the `World`-typed `grudgeAddenda`, `whispersCast` and `whispersScript` in
   `test/golden/scripts.ts` lost their last users and were removed (the host copies live in `test/golden/host-scripts.ts`).

## Team P1 (step 18 item 7, the snapshot and story group, 2026-11-02)

Group: `test/stories/cityofkeys-tribunal`, `test/snapshot/{act-brake,components,file,legacy-writeback,resume,society,v09,weaver,whispers}`,
`test/stories/{cityofkeys,cityofkeys-levels,cityofkeys-wall,whispers,whispers-direction,registry}`, `test/scale/whole-story`,
`test/golden/scripts.ts`.

1. **Ported.** Every test of the group runs on `createHostFixture` and reads the host's run file through the new
   `test/helpers/host-snapshot.ts` (`snapshotTaker` keeps what the run writes, through JSON and `RunFileSchema`;
   `sliceIn` / `overseerSliceIn` parse a mechanic's or overseer's slice; `resumeMarkers`, `comparable`). The story tests
   take their constants from contracts and the mechanics (`TOOL_NAMES`, `DIRECTOR_SUPPORT`, `LOCKED_REPLY`,
   `addFactors` / `ownCharsOf` / `validatePuzzle`, `exileTarget`, `tallyWhispers`, `render("competitor/direction/author-line")`);
   `legacy-writeback` takes `resolveBlockSize` from `run-options.ts`. Small additive exports for this:
   `exileTarget` (mechanic-tribunal), `tallyWhispers` (mechanic-whispers), `Board`, `GroupRegistry`, `GroupResult`,
   `Mailbox`, `MessageNumbers` (mechanic-channels), `CastRegistry` (mechanic-cast).
2. **Production fixes the ports found** (each in its own commit):
   - The whispers mechanic's resume refusal named "without control" again instead of "without --no-whisperer (a
     control run must start fresh)": the old words are back.
   - A resumed pre-v09 checkpoint dealt its late core motives only in the run's first minute, after the residents'
     prompts were built, so the prompts lacked them. `Host.start()` on a resumed host now runs the resume work at once
     (kernel; `#play` no longer runs it a second time); the app's probe host always starts, and a resumed run builds
     its prompts from the probe's facts (`hostResidents` option `promptHost`).
   - A run resumed without the weaver was refused ("overseer weaver, which the story does not declare"); the app now
     passes the host only the slices of the run's own overseers (`onlyDeclared` in `apps/cli/src/host/run.ts`), as the
     old engine ignored a role the resumed run left out.
3. **Changed assertions** (same intent, new place of the state):
   - `snapshot.world.*`, `snapshot.director`, `snapshot.gamemaker`, `snapshot.interpreter` are read from the run file's
     slices (`progression`, `puzzles`, `names`, `channels`, `receipts`, `petitions`, `cast`, `goals`, `seal`, `motives`,
     `whispers`, `script`, `tribunal`, `standoff`; overseers `gamemaker`, `classifier`). The brake is the run file's `brake`.
   - Resume cut: `prefixLines(point)` instead of `snapshot.events.length`; a resumed run's lines after the cut are
     compared with `comparable(…, resumeMarkers(point))` (the `run_resumed` and `agent_profile` lines move the numbers).
   - Whispers: the slice keeps `forgeries: [{ minute, to }]`, `round` and `phase` instead of `forgeries: [3]`,
     `forgedTo` and `popularity.{round,state}`; the "older snapshot" case removes `to` from the forgeries.
   - v09: a checkpoint from before v09 says `coresDealt: false` instead of `world.cores` undefined.
   - Weaver: the gamemaker's "(after #N)" uses host numbers (S18-3), so the evidence is compared with the host log's
     `weaver` `fate_shift` events, not the legacy line numbers.
   - File: the schema checks of the old file (`agent-arena-snapshot` v2, still read by `--resume`) run on the old
     engine's snapshot of the tiny run, recorded once by the test's live old side
     (`test/fixtures/old-engine/snapshot-file.json.gz`; the live side goes with the engine). The write case uses the
     host's `writeRunFile` / `readResumePoint` / `runFileName`.
   - Tribunal: a DM receipt is found by its text (`R-…: DM #id from A01, delivered to A02 at minute m`; the shared
     receipt has no `number` / `from`); `world.lastWill` outside the gate is `host.call(… "lastWill")` with code
     `TOOL_LOCKED` (the tool is not open there; `NOT_AT_GATE` itself is covered by
     `test/mechanics/tribunal/differential.test.ts`, "reached every refusal"); factor deals are read contracted
     (`contractDeal` of the `level_contracted` exclusions); the act start comes from progression's `actStarts`; the
     city's pieces from the standoff slice's `city`; a removed draft group is the channels slice's `removed` flag;
     `sendDm` / `ranking` / `enabledTools` / `ledger.*` are `host.call("sendDM")` (code `EXILED`), `rankingOf`,
     `host.openTools`, `balanceOf` / `ledgerTotal`; the mid-draft snapshot is the run's own snapshot at minute 31,
     parsed back through `parseResumePoint`.
   - Components: the store classes are the mechanics' (`Board` and `GroupRegistry` take a `MessageNumbers`, posts take
     their kind; a `PetitionBook` round-trips `records()`, a sign answers `{ ok, code }` / `{ ok, passed }`; the
     `CastRegistry` restores `(members, collections)`; a group deposit is the treasury's, the registry checks it with
     `checkDeposit`; `inspect()` became `info("G1")`). The world, director and context cases run a host and resume it:
     an unchanged story's resumed run logs exactly what the run that went on logged and ends with the same host
     snapshot (its counter ahead by the resume's lines); a changed level nobody reached is dealt anew, one
     `fragments_dealt` more than an unchanged resume logs; a reached level whose teams changed is refused; the script
     slice keeps `fired` / `enteredLevels` and drops a petition its rules no longer hold; the resident contexts are the
     run file's `competitors`, the gamemaker's notes and tracks and the classifier's history its overseer slices,
     carried into a resumed run. Receipts are checked the same way: the slice runs R-0001, …, a resumed run numbers on
     like the run that went on, and a file whose first receipt is `R-0007` is refused (`expected R-0001`).
4. **Deleted** (with the test that covers it):
   - Components "marks: the allowance of the level in play" (`MarksBook` is gone; the allowance is the marks slice):
     `test/mechanics/marks/marks.test.ts` ("is deterministic and survives snapshot round trips"; "is free below its
     first level, and a level change gives a fresh allowance of the new level").
   - Components "event bus: a replayed prefix reaches sinks once and numbering continues after it" (the engine's
     `EventBus`; the host rebuilds the prefix from the run file's own events, so no foreign prefix can be replayed):
     `test/snapshot/resume.test.ts` (the prefix lines equal the first run's, `run_resumed` has seq `cut + 1`) and the
     world cases above. The two refusals of a misnumbered prefix belong to the old bus only; the old file's own
     numbering check stays in `test/snapshot/file.test.ts` (`event 1 has seq 2`).
   No other test was deleted.
5. **Left as it is:** `test/golden/scripts.ts`. Its `World`-typed `cityScript` / `gamemakerSteps` serve only the live
   old side of `test/cli/host-gamemaker-differential.test.ts` (outside this group) and go with the engine (step 5).
   `test/snapshot/file.test.ts` keeps its live old side for recording (D2 pattern) until then.

## Team P2 (step 18, D3 remaining items 2 and 3, 2026-11-02)

Scope: the old engine unit tests (`test/engine/{board,mailbox,groups,cast,goals,motives,passes,scheduler,penalties,standoff,holdout,tribunal}`)
and the engine and `compose.ts` importers of `test/story/validate*`, `test/overseers/harness.ts`, `test/log/*`, `test/agents/*`,
`test/cli/args`, `test/interpret/{guard,weaver}`, `test/host/conformance`, `test/helpers/event-log.ts`, the `test/mechanics/**`
differentials and twins and `test/mechanics/progression/standins.ts`. Goldens unchanged, no `GOLDEN_UPDATE`.

1. **Production moves (additive):** the old `EventBus` moved to `packages/legacy-log/src/bus.ts`;
   `packages/engine/src/events.ts` re-exports it, so the engine is unchanged for its users. The mechanic indexes export the
   copies the tests now use: channels (`Board`, `Mailbox`, `MessageNumbers`, `GroupRegistry`, `groupAccountId`,
   `MAX_FOUNDED_GROUPS`), cast (`escrowAccountId`), motives (`aboveAllCap`, `lightCount`), goals (`dealGoals`,
   `GoalSchema`), standoff (`StandoffBook`, `emptyStandoff`, `carriesValue`, `standoffSnapshot`), tribunal (the pacing
   rules of `rules.ts`), marks (`activeOn`). **Decided.**
2. **Replay only:** every live old side in `test/mechanics/**` (the `RECORDING` branches, `recordOld` / `recordWorld`, the
   composed old runs, the old `Director` and `World` constructions) is gone; each harness reads its recording from
   `test/fixtures/old-engine/` and still checks the fingerprint of its inputs. The t3 twin and the goals differential read
   their question-by-question trace through the new replay-only `RecordedTrace` (`test/helpers/old-engine.ts`); the twin's
   receipts stand-in keeps its book with the receipts mechanic's `nextId` / `partiesOf` / `receiptsOf` / `describeReceipt`
   (the old `ReceiptBook.restore` id check kept inline). A recording can no longer be re-made from these files: the
   fixtures are final once the engine goes. **Decided** (step 18, item 7b).
3. **Assertions that changed with the port** (same intent, a different API; nothing loosened):
   - `test/engine/groups`: `groups.isRemoved("G1")` became `expect(groups.liveIds()).not.toContain("G1")` (the mechanic's
     registry has no `isRemoved`); the treasury cases book a kernel `PointsLedger` the way `treasury.ts` and
     `group-actions.ts` do.
   - `test/engine/board`, `mailbox`: the board takes `new Board(new MessageNumbers())` and an explicit `"player"` kind.
   - `test/engine/goals`: the dealing cases call the mechanic's `dealGoals` with the old stream `rngFor(seed, "goals", act)`;
     the goal-book cases run on a host (t3 stand-ins): the status line is read from `playMinute`'s turn inputs, the
     `grants` from the stand-in balances, and the snapshot case compares the resumed host's goals slice and the
     `goals.running` fact (with a new `toHaveLength(5)`).
   - `test/engine/standoff`: on the mechanic's `StandoffBook`; events are compared in the mechanic's
     `{ type, ...payload }` shape, snapshot and restore go through `standoffSnapshot.save` / `load`.
   - `test/engine/scheduler`, `passes`: the order is the host's `legacyTurnOrder` (the old `activationOrder`, round =
     minute + 1); a new case checks that those who may not act are left out. The block cases run through the host
     fixture (`tinyStory({ agents: 5 })` at block sizes 1, 2 and 9, read from `pass_start`).
   - `test/engine/motives`, `tribunal` (pacing), `test/story/validate-drama`: the story spec is parsed into the
     mechanic's options (`Parse(CoreMotivesOptions, ...)`, `Parse(TribunalOptions, ...)`) before the mechanic's copy runs.
   - `test/host/conformance`: the example of a forbidden import is now `@swarmtales/roles`; the expected message is
     `"bad.ts: imports @swarmtales/roles"` (was the engine, which goes).
   - `test/engine/penalties`, `cast`, `test/story/validate*`, `test/helpers/event-log.ts`, `test/log/*`, `test/agents/*`,
     `test/interpret/*`, `test/overseers/harness.ts`, `test/cli/args`: imports only (`@swarmtales/sdk`,
     `@swarmtales/contracts` `DIRECTOR_SUPPORT`, `@swarmtales/legacy-log`, `apps/cli/src/run-options.ts`).
   - `test/mechanics/progression/standins.ts`: the marks stand-in uses the marks mechanic's book functions with a local
     copy of the old `#withMarks` terms line.
4. **Deleted checks** (no test file deleted):
   - `test/engine/scheduler`: `blocksOf(order, 0)` throwing a `RangeError`. Coverage: `test/host/turns.test.ts` ("refuses
     bad policies"); a block size of 0 is refused by story validation before a host exists.
   - `test/engine/scheduler`: `blocksOf([], 2)` returning `[]`. The host has no public block splitter and never plays a
     pass with nobody in it; no direct counterpart. **Open** for the reviewer.
5. **Remaining on the engine** (not ported in this pass; they read the old `Tribunal` and `World` classes directly):
   - `test/engine/tribunal.test.ts`: the `harness()` cases on the old `Tribunal` (first tribunal, scheduleTribunal, the
     city's own tribunals, tribunal, faction draft) and the last-will cases on the old `World`. Most are mirrored by
     `test/mechanics/tribunal/differential.test.ts`, but not assertion for assertion (e.g. the ransom's median, mix and
     cap; the draft's seeded tie-break), so deleting them would weaken the suite. Port: on the host with the tribunal and
     exile mechanics and the stand-ins of `test/mechanics/tribunal/support/twin.ts`.
   - `test/engine/holdout.test.ts`: the old `World` with the holdout tribunal (blockers, calling, rules, snapshot,
     story). Partly mirrored by `test/mechanics/standoff-tribunal/holdout*.test.ts`; same reason and plan.
   - With their last users gone, `recordWorld`, `oldValue` and `OldTrace` left `test/helpers/old-engine-recorder.ts` (so it
     no longer imports the engine), and `apps/cli/src/compose.ts` no longer re-exports `effectiveRun` (its importers read
     `run-options.ts`; knip).
   - Shared helpers kept for other groups: `test/helpers/old-engine-recorder.ts` (`oldRun` / `oldRunAsync`, still imported by the
     `test/cli/host-*` differentials and `test/roles/gamemaker-overseer/host.test.ts`) and `test/helpers/old-world.ts`.
   - Outside this group: `test/overseers/runtime-chat` and `runtime-host` still import `compose.ts`.

## Team D4 (step 18 items 7 and 8, the engine deleted, 2026-11-02)

Goldens byte-identical until the rename commit, `GOLDEN_UPDATE` used only there (item 6).

1. **The last two engine unit tests ported** (P2's item 5), every case kept unless named here.
   - `test/engine/tribunal.test.ts` plays the tribunal and the exile mechanics on a host over the stand-ins of
     `test/mechanics/exile/support/city.ts` (the old ports' successors); a call comes between two minutes, after the
     minute's hooks, where the old calls fell. The old fields are read through the mechanics: `session`, `ended`, the
     draft's group and leaders from the facts; `gates`, `exiled`, `standing`, `isExiled` from `ExileApi`; `missing` from
     `TribunalApi`; `schedulingWindow`, `endReason`, `busy` from `TribunalViewApi` (`stop`); `snapshot()` is the tribunal
     slice (`TribunalSlice`, exported), `draftPhase` the mechanic's `phaseOf` over the slice's draft (exported). Changed
     assertions (same intent, the host's place for it):
     - `announced` false: no `tribunal_announced` event; `active` false: `stop.pursuing` false.
     - `actEnd` 60 and 68: the act ends (`tribunal.ended`) with every `exile_gate` closing before minute 60 or 68.
     - Refusals the host's tool locks answer first, so the call is `TOOL_LOCKED` and the test also checks which tools
       are open: `scheduleTribunal` before the first call and during a vote (old `NOT_NOW`; the window's `why` is
       checked), a second `vote` (old `ALREADY_VOTED`), `join` during the nominations and `nominate` after them (old
       `NO_DRAFT`), `join` by a leader (old `IS_LEADER`), `refuse` by a non-leader (old `NOT_A_LEADER`), every draft
       tool once the factions are formed (old `NOT_A_LEADER`, `NOT_IN_DRAFT`).
     - Below a schema minimum the gateway answers `INVALID_ARGUMENTS` before the mechanic: `count: 0` (old
       `INVALID_COUNT`), `factions: 1` (old `INVALID_FACTIONS`), a ransom of 0 (old `INVALID_AMOUNT`). `count: 1.5` is
       dropped: the gateway converts arguments to the schema as the model layer does, so it arrives as 1 (old
       `INVALID_COUNT` from the direct call). The mechanics' own range checks stay (`INVALID_COUNT` for 3,
       `INVALID_FACTIONS` for 3, the minute checks).
     - `schedule` and `payRansom` values are the `tribunal_scheduled` and `ransom_paid` payloads (`freed`: a `ransomed`
       event followed).
     - The seal strike after a will: old `onExiled(agent, ["F1"])`; now the city keeps only the piece the will did not
       bequeath (the stand-in standoff's `keep`).
     - Restore: the resumed host's tribunal and exile slices equal the original's. The pre-v06 part (an old
       `TribunalSnapshot` without numbers) is covered by `test/mechanics/tribunal/differential.test.ts` ("continues an
       old file from before v06 like the old restore ...").
     - **Deleted cases** (the old `World` at the gate): "caps the points each heir receives ..." and "leaves factors free
       of the cap". Coverage: `test/mechanics/exile/world.test.ts`, "refuses wills in the old order with the old details"
       (`BEQUEST_CAP` with the old detail, two bequests to one heir counted together) and "executes a will at once and,
       when the gate closes, ..." (five heirs at the cap of 5 of 50 points plus a factor, the burn of the rest at exile),
       both against the recorded old `World`. "states the cap in the announcement" runs on the host harness.
   - `test/engine/holdout.test.ts` plays Whispers on a bare host with every real mechanic (`hostStoryOf`, names off) and a
     probe for the puzzles' `lacking` and the exile's `alive`; it holds each played minute open in its `between` slot,
     so the residents' and the gamemaker's calls fall in that minute, as the old ones did. Changed assertions:
     - The host counts a DM's fragment when it is sent (`dmRecords`); a mailbox still holds one unread DM per sender, so
       where the old test sent one reader two DMs of one sender in a minute (reading each at once) the second goes a
       minute later: A02's forwards after minute 1; in the DM-cap case A01's eight DMs go to four readers over minutes 3
       and 4 (old: eight to A02 at minute 4), A02's three more to A04-A06 and its refused one to A03 (old A05).
     - `dmWindow` is read from `getStatus` ("DMs: 8 of 8 sent since minute 0"); `holdout.blockers`, `session`,
       `pending`, `cooldownUntil`, `lackingNow` from the standoff-tribunal facts (`BlockersFact`, `SessionFact`,
       `PendingFact` exported); `ballotOf` from the slice; the call's and the lot's values from the session fact and
       `holdout_called`; `isExiled` from the `struck` fact and `exiled`; `ranking().at(-1)` from the minute's last
       `round_end`; `enabledTools` / `isToolEnabled` from `host.openTools`; `currentProblem` from `getProblem`;
       `isFinished` as a level past the last door.
     - `callTribunal` with no accused: `INVALID_ARGUMENTS` (schema `minItems: 1`; old `INVALID_ACCUSED`); the accused's
       own `tribunalVote`: `TOOL_LOCKED` (old `NOT_A_VOTER`).
     - The second tribunal's reason is reworded: the gamemaker's note desk refuses a text nearly the same as an earlier
       one (`REPEATED`), which the old direct call bypassed.
     - `holdout: false`: a run without the gamemaker, since `hostStoryOf` loads the holdout tribunal only with one.
2. **Every live old side dropped from the tests** (P2's item 5). The old side of every differential is the recording in
   `test/fixtures/old-engine/` (`replayOld`); the fingerprints did not change (they hold the inputs' data, never the
   script functions). Removed live functions: `oldSideLive` (host-residents-differential), `playOldLive` (host-resume,
   host-runner-differential, host-weaver), `recordOldLive` (`test/cli/support/report-replay.ts`, whose `recordOld` now
   takes a data-only `OldOptions`), `oldSystemPromptLive` (host-gamemaker-golden, `test/roles/gamemaker-overseer/host.test.ts`),
   `liveOldSnapshot` (`test/snapshot/file.test.ts`), the `old.*` live bodies of `test/cli/host-direction.test.ts`, and
   the `World`-typed scripts of `test/cli/host-gamemaker-differential.test.ts` (what each recorded run did is now a
   comment there). No assertion changed; every test of these files still runs.
3. **Deleted files** (none is a test file; no test case was deleted in this step):
   - `test/helpers/fixture.ts` (the old `World` fixture): its users were ported to `test/helpers/host-fixture.ts` by
     D1-D3; nothing imported it any more.
   - `test/helpers/old-engine-recorder.ts` (`oldRun`, `oldRunAsync`, which ran the old side live and checked it against
     the recording): replaced by `replayOld` (`test/helpers/old-engine.ts`), which every former caller uses.
   - `test/golden/scripts.ts` (the `World`-typed golden scripts): only the live old sides used it; the goldens play the
     host copy `test/golden/host-scripts.ts`.
   - `apps/cli/src/compose.ts` (`composeRun`): the CLI composes with `apps/cli/src/host/run.ts`; `DEFAULT_LIMITS`,
     `effectiveRun` and the rest were already in `run-options.ts` (`test/overseers/runtime-{chat,host}.test.ts` import
     it from there). `worldOracle` (`apps/cli/src/oracle.ts`) went with it; `hostOracle` stays.
   - `packages/engine` (all of it), with its `check-packages` row, the tsconfig references (root, `stories`, `apps/cli`,
     `packages/sdk`, `packages/roles`), the manifests' dependencies and the lockfile entries.
   - In `packages/roles`: the old `Gamemaker` role (gamemaker.ts keeps `GAMEMAKER_ID` and `GamemakerSnapshot`, which
     the legacy snapshot reader types), `worldReport`, `dealtLevels`, `secretGuardOf` and the `World`-based
     `describeSituation` with its section helpers (`characterLines`, `holdoutLines`, `standoffLines`, `riskLines`, ...).
     Nothing instantiated the role since the CLI switched; the host-backed report (`apps/cli/src/host/report.ts`)
     replaces the rest and is proven against the old one by `test/cli/host-gamemaker-golden.test.ts` and
     `test/cli/host-gamemaker-differential.test.ts` (recorded old looks, byte for byte).
   - The prompt `gamemaker/replies/no-tribunal` (only the old role used it; the tribunal mechanic answers `NO_TRIBUNAL`
     with its own text). The prompt validator's scan for code that mentions a prompt now reads `mechanics/` too:
     before, the engine's mentions hid that the mechanics' prompts were not scanned.
4. **What moved instead of the engine's imports:** `DIRECTOR_SUPPORT` from `@swarmtales/contracts` (CLI validate and
   run options); the penalty ladder (`ladderSteps`, `penaltyAt`, `ladderText`) and the tribunal pacing the validator
   checks (`tribunalHeld`, `actEnd`, `fitsBefore`, `maxFactions`) into `packages/sdk/src/rules.ts` (the sdk depends on
   contracts and kernel only, and the core may name no points, so it is a copy beside the mechanics' copies); the
   gamemaker system prompt keeps a private `ladderText` (roles may not import the sdk); `EventBus` from
   `@swarmtales/legacy-log` in the old runner, interpreter and weaver; the runner's `BoundTool` is a local type.
5. **Not done here (see rewrite-status.md):** the old `AgentRunner`, `Interpreter` and `Weaver` classes in
   `packages/roles` no longer touch the engine but are still the old side of seven test files
   (`test/agents/{host-runner,souffleur}`, `test/interpret/{interpreter,weaver}`, `test/overseers/{classifier,
   runtime-decider,weaver}`); they go once those old sides are recorded like the engine's.
6. **Item 8, "core becomes core motive"**, the last commit: as `rename-core-motive.md`, "Done at step 18", describes.
   Changed assertions: `test/gamemaker/director.test.ts` expects the reworded report line and system prompt;
   `test/cli/host-resume.test.ts` and `test/cli/host-weaver.test.ts` leave the gamemaker's prompt size out of the
   comparison with the recording (as they did for the classifier's and the weaver's), since its bytes changed after the
   recording; `test/cli/host-gamemaker-golden.test.ts` still pins the gamemaker's token counts against the regenerated
   goldens. Added: `test/log/legacy-files.test.ts`, "the old event names". No test was deleted.

## H1 (signed event log, rewrite-status item 5a)

Built as `docs/design/event-log-signing.md` describes; mutants `docs/design/mutants-step18-H1.json` (23, all killed).

1. Sidecar, not a field in `events.jsonl`: **Decided** (the goldens and every reader keep their bytes).
2. The chain hashes the lines `JsonlEventLog` writes (after the legacy adapter, `at` included), not the host's envelopes: **Decided**; the chain proves what the published file holds.
3. Heads are signed at `run_end`, at every snapshot (the run file's `chain` checkpoint) and at close; `verify` refuses a log that does not end with `run_end`, so a cut back to a checkpoint shows: **Decided**.
4. A resumed run's log repeats its prefix with fresh `at` stamps, so its chain covers those lines too and its genesis chains from the checkpoint; `--previous` checks the prefix against the previous run without `at`: **Decided**.
5. No CLI flag turns the chain off; only library callers (tests) build a `JsonlEventLog` without one: **Decided**.
6. External anchor of the public key: **Open** (publishing needs Flo's go).
