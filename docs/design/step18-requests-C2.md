# Step 18 requests from C2 (the gamemaker as an overseer)

Requests to the integrator from team C2 (`docs/design/overseer-api.md` §1.5, §6 step 7). The
gamemaker is carved out as a long-lived overseer next to the old role; nothing old was deleted
(`packages/engine`, `world.ts` and the old `Gamemaker` in `packages/roles/src/gamemaker/` run as
before, golden logs untouched). C2 did not touch the judge, classifier or weaver files (C1).

## What exists now

- `packages/roles/src/overseer/gamemaker.ts`: `defineGamemaker(report)`, id and name `gamemaker`,
  lifetime `long`, trigger `schedule { every: 1 }` at `GAMEMAKER_ORDER` 30. Options: `every`,
  `direction` (0/4/6/8/10), `notesPerAgent`, `boardPosts`, `windowMinutes`, `system`.
  `gamemakerOptions(...)` fills them from the story's spec and composes the system prompt per
  direction (`gamemakerSystemPrompt`, unchanged bytes). Input `gamemaker/look`:
  `{{situation}}{{standingOrders}}`, so with no order the input is the old `gamemaker_turn.input`
  byte for byte.
- `packages/roles/src/overseer/gamemaker-runtime.ts`: the old look loop (pi `Agent`, sessionId
  `GM`, sequential tools, `modelCallsPerTurn`) as an `OverseerRuntime`; it writes the old app
  events (`GAMEMAKER_APP_EVENTS`) through `host.record`. `done` is offered only when a standing
  order makes the answer schema non-empty (order mode).
- `packages/roles/src/overseer/recent.ts`: Typebox-checked reads of the host log in the old flat
  shape. `packages/roles/src/overseer/mapping.ts`: `gamemakerGrantTweaks`, `tribunalGamemakerRoles`.
- Proof: `test/roles/gamemaker-overseer/` (differential against the old role on three golden runs
  and the holdout tribunal; full-log equality on the new host for City of Keys f4g4 and f10g10,
  gamemaker lines for Whispers; lock filter; unit rules). Mutants:
  `docs/design/mutants-step18-C2.json`.

## Requests

1. **Kernel extension `body.system` (please confirm).** `OverseerBody.system?(ctx)` composes the
   system prompt from options in place of the head's `system` prompt id; the host asks once, at the
   first call, and pins it (`overseers.ts` `#prepare`). An empty string is refused at define time.
   The gamemaker needs it because its prompt is composed from story, dial and features; a prompt
   template cannot express that without moving the composer into the registry.
2. **Lock-filtered overseer tool lists (please confirm).** `RunnerParts.tools` now goes through
   `#overseerTools` (host.ts) with `actorLockProbe` (probe.ts): a tool a mechanic's `pipeline.lock`
   refuses the overseer now is left out of `call.tools`; called anyway it is still refused at stage
   `lock`. This applies to every overseer, not just the gamemaker. A lock handler that emits while
   probed throws, as for residents.
3. **The channels tool descriptions changed (T2's mechanic).** `notify` and `postBoard` described
   their text as "The note" / "The post"; the old tools said "The note, 1-400 characters" /
   "The post, 1-400 characters". The schema bytes reach the model, so the differential found 9
   tokens of difference in the usage lines. Fixed in `mechanics/channels/src/gamemaker.ts`
   (`OLD_MAX_NOTE`); please have T2 confirm, or tie the number to `noteMaxLength`.
4. **A host-backed report.** The city part of the look is still the old `describeSituation` on the
   old `World` (`worldReport`); on the host the replay hands in the golden input. To build it from
   host facts the gamemaker needs facts for: the ranking and standing per resident, waits and the
   next penalty, rewards per level, characters (core motives, secret goals, whisperer orders),
   risk/blame lines, the seal and tribunal state, and the secret guard (passwords and fragments
   dealt so far). Please assign the facts (or a `report` service) to the owning mechanics.
5. **The `ORDER` table.** `GAMEMAKER_ORDER` 30 (after the classifier and the weaver in `between`)
   is a bare number in roles; please add it to the shared order table with C1's weaver order.
6. **The last-round and stop rule.** The old arena made no gamemaker or weaver look after the last
   round or once `#stopReason()` fired (arena.ts:206). The overseer reads `run_started.minutes` and
   the arena's fact `arena.stopping` (mechanics/arena/src/index.ts; non-null means stopping). Please
   tell C1 so the weaver uses the same rule, and keep the fact's name stable.
7. **Tribunal actor check.** `mayScheduleTribunal` (mechanics/tribunal/src/view.ts) compares the
   actor with the bare `"gamemaker"`. The overseer therefore must be used under the name
   `gamemaker`. If stories should rename it, the tribunal needs the name as an option.
8. **Grants mapping.** With `grants: "auto"` the standoff suggests `ultimatum` to the gamemaker.
   The story mapping should merge `gamemakerGrantTweaks({ ultimatum: grantsUltimatum(direction,
   hasUltimatums), standoff })` into `grantTweaks`, and pass `tribunalGamemakerRoles(spec.roles)`
   as the tribunal's `gamemakerRoles`. Roles may not depend on mechanics (check-packages), so the
   caller (apps/cli compose) computes the boolean; apps/cli would then need
   `@swarmtales/mechanic-standoff` as a dependency (lockfile change, not done here).
9. **Snapshot migration.** The overseer's slice is `{ tracks, notes, seen }` with `seen` a host log
   seq. The old `GamemakerSnapshot` keeps `recentFrom` as an old bus seq. Resuming an old L7
   checkpoint needs a migration that maps it to the host seq (or sets `seen` to the log's last seq
   at resume, which drops the first look's "since your last look" lines).
10. **Double cost counting.** The runtime returns `costUsd` in the reply (the runner counts it) and
    also records the old `usage` line. If the referee or the reporter sums both, the gamemaker's
    cost is counted twice. Please pick one source.
11. **One runtime per definition.** `HostOptions.overseers` is one runtime. The gamemaker's runtime
    rejects other definitions. A small router (definition id to runtime) in the kernel or in
    apps/cli would let the gamemaker and C1's overseers run in one host.
12. **CLI wiring.** apps/cli still runs the old role. Switching needs: the overseer in the story's
    `overseers`, `gamemakerRuntime` registered, `GAMEMAKER_APP_EVENTS` in `app.events`, the
    report seam (request 4) and the grants mapping (request 8).
13. **Standing orders end to end.** The template and the order-mode `done` tool are in place and
    the render is unit-tested; a host test with `host.hand()` instructing the gamemaker and the
    answer carrying `orders` is not written yet.
