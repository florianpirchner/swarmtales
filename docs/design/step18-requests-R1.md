# Step 18 requests from team R1 (the host-backed resident runner)

Team R1 built item 1 of "Step 18: what remains" (`rewrite-status.md`): the resident runner on the new host. What
landed, and what the integrator (or the named owner) should decide or wire.

## What landed

- `packages/roles/src/agents/host-runner.ts`: `HostResidentRunner`, the old `AgentRunner` on a `Turn` instead of
  `World` + `EventBus`, and `RESIDENT_APP_EVENTS` (the schemas of `turn_input`, `request`, `thinking`, `text`,
  `tool_call`, `tool_result`, `turn_error`, `souffleur_rewrite`, `usage`, `agent_profile`). `turn_input` and
  `request` are written before the runner's first await (the block's order, before any member acts); the model's
  lines once `turn.ready` resolved; tool replies are `CODE: detail` (or the bare code) as the old gateway answered.
  The open tools of the notice and the request are sorted by `TOOL_NAMES` (G1-5). Souffleur, inner voices, late
  tools (`toolScope: "story"`), `rewriteSystemPrompt`, `snapshot`/`restore` as before.
- `apps/cli/src/host/residents.ts`: `hostResidents({ story, run, host, models, ... })` builds every resident's
  system prompt from the host's facts (`motives.prose`, `motives.coreMotives`, `whispers.whisperer`,
  `exile.exiled`, `standoff-tribunal.struck`, parsed with Typebox) and the run's dials, the profiles
  (`recordProfiles()` writes `agent_profile`), the figure cues, and the turn taker for `host.run`.
- `apps/cli/src/host/direction.ts`: the resident side of packages/engine/src/direction.ts moved into the CLI (S1-8).
  The engine file stays until the integrator deletes it.
- Kernel: `Host.openTools(resident)` (contracts + kernel), the old `World.enabledTools`; and the turn loop starts
  each member's agent right after its inputs are built (see R1-2).
- Gates: `test/cli/host-runner-golden.test.ts` (every golden line but the gamemaker's, app lines and `usage`
  included, and the golden `prompts.json`, for all three goldens), `test/cli/host-runner-differential.test.ts`
  (whole runs old `composeRun` against the host runner on dials the goldens do not use: blocks of 2, 3 and 6, two
  passes, activation on novelty, 12 residents with rivals over 12 minutes), `test/cli/host-residents-differential.test.ts`
  (system prompts, profiles and tool declarations for 53 dial combinations of both stories), `test/agents/host-runner.test.ts`
  (the runner against the old `AgentRunner`, scenario by scenario), `test/cli/host-direction.test.ts`, and a
  kernel test in `test/host/turns.test.ts`. Mutants: `docs/design/mutants-step18-R1.json` (21, all killed).

## Requests

1. **A run without names no longer declares `chooseName` to the model** (S18-7, G1-4). The old engine bound every
   `storyToolNames` tool, `chooseName` included, also in a run without names; the host does not grant it there, so
   the runner cannot declare it. The prompt bytes (and the provider's cache prefix and `usage`) of a `--no-names`
   run differ from the old ones; no golden plays one (the whispers golden's story has no names). The differential
   encodes the difference. Decide: accept it (document as an intended change), or let the mapping grant
   `chooseName` locked (it would then appear in `host.toolSpecs("resident")` and stay closed by the names book's
   lock). Every other dial combination declares the old tools in the old order.
2. **Kernel turn loop order (kernel owner).** The host prepared every member of a block (inputs, `turn_skipped`)
   before it started any agent, so with `activation: "onNews"` and blocks above 1 a skipped member's `turn_skipped`
   came before an earlier member's `turn_input`; the old arena stepped member by member. `TurnLoop.#block` now
   starts each agent right after its inputs (no await in the loop, so the inputs still show the block's start; an
   agent changes no state before `ready`). Mutant R1-21 and the new turns test pin it. Please confirm.
3. **`Host.openTools(resident)` (contracts, kernel owner).** Added: the granted resident tools open now, through
   the lock probe, writing nothing. The runner needs it at turn start for the notice and `request`. Please confirm
   the name, or fold it into `Turn` (`turn.open()`).
4. **CLI wiring (item 5).** `main.ts`/`compose.ts` still use the old runner. The host path: `createHost({ app: {
   events: { ...RESIDENT_APP_EVENTS, ...GAMEMAKER_APP_EVENTS } }, awaitsAnswer: (r) => residents.awaitsAnswer(r),
   ... })` (both declare the same `usage` schema), `host.start()`, then `hostResidents(...)` (it reads the dealt
   motives and the whisperer), `residents.recordProfiles()` right after the start (the old `agent_profile` lines
   follow `run_start`), then `host.run(residents.take)`. `HostRun` has no `personas`; `hostResidents` takes
   `personas` (default on). Consider adding it to `HostRun`.
5. **Resume (item 5).** `HostResidentRunner.snapshot()`/`restore()` keep the old context format (the tools notice
   is read back from the context). The host snapshot has no app slice, so the CLI must keep the residents'
   messages beside it (old `RunSnapshot.competitors`) and restore them after `hostResidents`. On a resumed host
   `HostRun.names` must be what the snapshot played (the old `restoredNames`), and the rivals skip the exiled and
   struck from the facts (tested with an injected fact, not with a real resume).
6. **Money.** The runner reports a reply's cost with `host.recordCost` (only when above 0). The old arena checked
   `--budget` against the app's own spend between blocks. With C1-6 ("the referee counts `costUsd` from replies
   only") the resident spend has no other way to the referee; decide whether the arena's `budgetUsd` or the
   referee's `maxCostUsd` is the run's one budget, so no spend is counted twice.
7. **Weaver hooks (item 3).** `hostResidents` takes `innerVoice(agent)`, and gives `characters` and
   `rewrite(agent, shift)`; nothing calls them yet. The souffleur's `usage` (agent `SF`) is written by the runner
   itself, so the CLI needs no metering wrapper for it; the judge's and the guard's `usage` belong to their runtimes.
8. **The engine's deletion (item 7).** `roles/src/agents/system-prompt.ts` still imports `VOICE_RULE` and
   `DirectionLevel` from `@swarmtales/engine`; move them (to roles or prompts) before the engine goes. Then
   `test/cli/host-direction.test.ts` and the old-side halves of the differentials have nothing to compare with:
   drop them with a note, the golden gate stays.
9. **The golden gate leaves out the gamemaker** (item 2): its looks, texts, calls, results and its `usage` of `GM`.
   Once the gamemaker runtime runs on the host, drop the `ofGamemaker` filter in `host-runner-golden.test.ts` and
   compare every line with its `seq`.
