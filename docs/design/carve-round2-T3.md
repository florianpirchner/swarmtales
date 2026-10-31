# Carve round 2, team T3 (progress): puzzles, progression, goals

Read first: `carve-decisions.md` (D-1, D-2, D-3, D-5, D-6, D-12, D-14). Do not edit
`mechanics/shared`, the core or the testkit; a gap is a request.

## Decisions that affect T3

| Decision | What T3 does |
|---|---|
| D-1 order | progression: runStarted 600 (`act_started`, locks), minuteStarted `progressionDoor` 100 (not at minute 0), `progressionClock` 700, `progressionDoorAgain` 1000, runEnded 100 (`act_ended`); status parts and the task at `turnInputs.status` (200) |
| D-2 events | progression emits `level_entered` after `level_up` and `notifyHolders`, `act_started` and `act_ended`; goals listen to the act events at `LISTENER_ORDER.act_started.goals` / `act_ended.goals`; the script's `onEnter` listens to `level_entered` `{ immediate: true, order: 900 }`, `onCollect` to `cast_collected` |
| D-3 task parts | progression appends `NamesApi.taskLine`, `StandoffTribunalApi.taskLine`, `MarksApi.taskLine` (each through `uses`, nulls left out), joined with `\n` after `trimEnd` |
| D-5 | progression provides `nextPenalty`, `nextBlamePenalty`, `chargeBlame` in `ProgressionApi` (shared now) |
| D-6 | the local `puzzles-extras`, `progression-extras`, `goals-extras`, `cores-extras` APIs are folded into the shared ones: delete the copies and their equality test; provide `PuzzlesApi` (`kindOf`, `taskValues`, `holders`, `revealFactor`, `heldPieces`, `fragmentOf`, `inherited`, `openFragmentDoors`, `isHandover`), `ProgressionApi` (`endAct`, `isOpenOnClock`, `opensAt`, `bounds`), `GoalsApi` (`noteLeaders`, `noteHeir`, `goalOf`); goals read `CoresApi.drivesOf` |

## Must-fix (`challenge-wave3.md`, T3 section)

1. **Director before the holder notices** (`progression/src/submit.ts:97-98`): emit
   `level_entered` after `notifyHolders`; the script moves its `onEnter` listener there (D-2).
   Golden f4g4 483-486.
2. **Holder notice price** (`submit.ts:110-111`): `MarksApi.priceOf` ("giving it costs only 2
   marks", 23 notices per cityofkeys log).
3. **Task addenda** (`task.ts:146-165`, closed door `:172-175`, the door-open notice): D-3.
4. **`getStatus` and `activeTools`** (`tools.ts:30-53`): the `unread DMs` line
   (`ChannelsApi.pendingDms`), each receipt's line (`ReceiptsApi.list`), the tools from
   `ctx.access.open(resident)` in grant order (old `enabledTools`, world.ts:1437-1471).
5. **The enabled-tool count** of `round_end`/`run_end` standings (`"tools":22`):
   `ctx.access.open(resident).length` (step 18, arena).
6. **Act signals** (`levels.ts:113-133`): D-2.
7. **Wiring nobody provides:** D-6 (`cores-extras`, `progression-extras`, `goals-extras`).
8. **Second door chance** (`index.ts:29-31`): the `progressionDoorAgain` phase (1000).
9. **Resume** (none had a fixture): door `state.door ?? holdAfter` and `doorReleased` only when
   unchanged (`model.ts:180`, old world.ts:3101); deal levels not in the snapshot and not behind a
   door in the first `minuteStarted` after a resume (old world.ts:3104-3116), re-deal unreached
   levels from the current story and announce changes (:3108-3115), check reached levels against
   the story (:3120-3135); `actStarts` default `startLevel -> 0` (:3103) and `#noteActStarts(max
   reached)`; `migrateV0` (`model.ts:195-197`) reads the arena's `delivered` and `finished`.
10. **Guard secrets count undelivered DMs** (`guard.ts:136-137`): only DMs with `deliveredMinute`.
11. **Should fix:** `listAgents` lists active cast members (`tools.ts:117`, old world.ts:1408-1413);
    `lastProgress` returns -1 from level receipts as the old port (`services.ts:37-40`); the catch
    in `levels.ts:151` only for "tool not defined"; the task is marked shown in `turnOpened`, not in
    `turnInputs` (`task.ts:197-199`). `runEnded` on stop (`index.ts:43`): keep until step 18 (D-14).
12. **Provide completely:** puzzles, progression and goals provide with `kit.provideSome` since
    wave 3.5 (`puzzles/src/index.ts:21`, `progression/src/index.ts:22`, `goals/src/index.ts:21`);
    switch back to `kit.provide`.

## Final shared APIs

```ts
PuzzlesApi: deal, isDealt, solutionOf, teamOf, passwordPiece, lacking, carriesSecret, burn, contract,
  kindOf, taskValues, holders, revealFactor, heldPieces({ resident }), fragmentOf({ resident, level }),
  inherited({ resident, level }), openFragmentDoors({}), isHandover({ text })
ProgressionApi: levelOf, ..., firstSolveMinute, nextPenalty, nextBlamePenalty, chargeBlame, endAct({ fromLevel }),
  isOpenOnClock({ level }), opensAt({ level }), bounds({}): { startLevel, lastLevel, survivors }
GoalsApi: onExiled, noteLeaders({ leaders }), noteHeir({ heir }), goalOf({ resident })
ProgressionEvents: submission, level_up, level_entered, act_started, act_ended
```

`heldPieces` lists fragment needers in **team-member order** (old world.ts:2689-2693), certificates
and counters in holding order (T4 relies on it).

## Gate

- `pnpm check` green; goldens and `packages/engine` unchanged.
- Per golden: `goldenDiff(ownedBy(lines, [id]), written)` empty for puzzles (all minutes, not only
  minute 0, `puzzles.test.ts:21`), progression and goals.
- `compareReplies` over **every** golden call of progression's tools, `getStatus` and
  `activeTools` included (`test/mechanics/progression/harness.ts:68` filters them out today).
- `goldenNotices` (holder notices, door notices) and `goldenTurnInputs` (the status line, the
  task with its addenda, the finished notice) equal the golden for every turn.
- `goldenOrder(lines, ["progression", "script", "channels", "goals", "seal"])` equals the golden
  (director after the notices; `seal_expired` before the goals resolve).
- Snapshot test compares the whole slice, not only `competitors` (`progression.test.ts:66-70`);
  fixtures for every resume item of must-fix 9.
- Every API provided with `kit.provide`.
