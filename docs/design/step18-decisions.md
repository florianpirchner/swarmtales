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
