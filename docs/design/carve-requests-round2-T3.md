# Carve round 2, team T3: requests to the integration owner

T3 (puzzles, progression, goals) did not edit `mechanics/shared`, the core, the testkit,
`packages/engine` or `test/golden`. Each gap below is worked around locally and named in the tests.

1. **`StandoffTribunalApi.taskLine({ resident })`** (shared, owner T4). The holdout tribunal's rule is
   appended under every task while the tribunal plays (old `#withHoldoutRule`, world.ts:1591), between
   the names line and the marks line (D-3). The API has only `exemptFromCap`, so progression cannot
   append it. Until it exists the Whispers task lacks that one line. The tests strip the line from the
   golden text (`notices.test.ts`, `turns.test.ts`) and the twin plays the old world without the
   holdout tribunal. Progression then reads it with `ctx.tryCall` and adds it to `uses`.
2. **Hook orders outside the table.** `HOOK_ORDER.minuteStarted` has no slot for what a resume needs
   before the door: puzzles `repairAfterResume` runs at literal 10 (before `cores: 50`, the cores'
   deal on an old snapshot does not read levels) and progression rebuilds the locks and notes the acts
   at `progressionDoor - 10` (90). Please add `puzzles: 10` and `progressionLocks: 90` to
   `HOOK_ORDER.minuteStarted`. `turnOpened` has no table; progression marks the task shown there at
   the default order, which needs none.
3. **Converter: the arena's `delivered`.** `convertLegacySnapshot` should copy `arena.delivered`
   (`{ agent, level, finished }` per resident) into the progression slice of version 0 (`delivered`),
   and `finished`. `migrateV0` now assumes the task of the level a resident stands on was shown
   (true at every cut after a round); a cut inside a minute would show a task twice or never.
4. **`CastApi` query for the active cast.** Old `residents()` and with it `listAgents` list the
   competitors and the active cast members with their level (world.ts:1407-1413). `CastApi` has
   `isActive({ cast })` only; add `active({}): { id, level }[]`. Until then `listAgents` lists the
   competitors only (cast members are absent from the reply).
5. **Step 18, the enabled-tool count of the standings (`"tools":22`).** It is
   `ctx.access.open(resident).length` and belongs to the arena (round_end, run_end). The old
   `enabledTools` also adds tools by phase (tribunal `vote`/`nominate`/`join`/`refuse`, `payRansom`,
   `lastWill`, the seal's `bid`/`permaDeath`, `chooseName`, `defy`, `claimPiece`, `forgeReceipt`,
   `nameFavourite`, `tribunalVote`); each of those mechanics must lock and unlock its own tool for
   `ctx.access.open` to equal it. `getStatus` and `activeTools` list `ctx.access.open(resident)` as
   they are: the progression tests compare the tools of the levels, the twin tests play the old world
   without those mechanics.
6. **The script's `onEnter`** (T1/script) listens to `level_entered` with `{ immediate: true, order:
   900 }`: progression writes it after `level_up` and after the holder notices
   (`LISTENER_ORDER.level_entered.script`), golden f4g4 483-486.
7. **`runEnded` on a stop** stays skipped (D-14): progression's `act_ended` and the goals' resolution
   do not run when the reason is `stopped`, as before step 18.
8. **Gateway message of a schema failure.** The old tool wrapper answered `INVALID_ARGUMENTS` alone;
   the host adds the detail (`INVALID_ARGUMENTS: the arguments do not ...`). T3 cannot change it;
   the twin tests avoid calls with invalid arguments.
9. **`progressionHead` gained `NamesApi` in `uses`** (for `NamesApi.taskLine`). The frozen head test
   still passes (it reads `provides` and `requires`); please acknowledge when `uses` is frozen.
