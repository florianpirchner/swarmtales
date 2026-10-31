# Carve round 3, team T3 (progress): puzzles, progression, goals

Read first:
- the round-2 section of `carve-decisions.md` (R2-D1 to R2-D24);
- the T3 part of `challenge-round2.md`, section A.

Rules:
- Do not edit `mechanics/shared`, the core or the testkit. A gap is a request in
  `carve-requests-round3-T3.md`.
- Cast (for `CastApi.active`) belongs to T2.
- Line numbers are those of the review (commit `91408d5`).

## Done by the integrator (check, do not redo)

- **A1, the seal and goals listener modes (R2-D15).**
  - The seal's `act_started` and `act_ended` listeners are immediate now, like the goals'.
  - The loader refuses ordered listeners of one event that differ in `immediate`.
  - The real-mechanics order test is still T3's (must-fix 1).
- **A2, the core part (R2-D13).** `ctx.access.open` and `isOpen` apply every lock handler.
  `getStatus` and `activeTools` now list what the old `enabledTools` listed for every mechanic that
  locks through a handler.
- **A5, the core part (R2-D10).** `StandoffTribunalApi.taskLine({ resident })` is in shared.
- **A6, the converter part (R2-D16).** The progression slice of version 0 has `delivered`, as the
  old `arena.delivered` (`{ agent, level, finished }`).
- **A7, the core part (R2-D9).** `HOOK_ORDER.runResumed = { motives: 100, cast: 200, progression: 300, puzzles: 400 }`.
  The host runs these once at the snapshot's minute, before `minute_started`.
- **T3 request 8 (R2-D6).** A schema failure answers the bare `INVALID_ARGUMENTS`. The arguments are
  converted first, as pi did, so the twin tests may now call with strings for numbers.

## Decisions that affect T3

| Decision | What T3 does |
|---|---|
| R2-D9 runResumed | progression's door, act starts and locks, and puzzles' re-deal move to `runResumed`; the literal `order: 10` and `progressionDoor - 10` go |
| R2-D10 task line | progression `uses` `StandoffTribunalApi`; the line goes between the names and the marks line |
| R2-D13 open tools | the gate lock of `submitSolution` is a lock handler |
| R2-D15 listener modes | `goldenOrder([... "goals", "seal"])` on the real mechanics |
| R2-D16 delivered | `migrateV0` reads `delivered` |
| R2-D19 active cast | `listAgents` lists the active cast once T2 adds `CastApi.active` |
| R2-D24 | progression's `NamesApi` in `uses` is acknowledged |

## Must-fix

1. **Real-mechanics order at the act end** (A1).
   - In a host with real goals and seal, golden cityofkeys-f10g10 #835 (`seal_expired`) comes before
     #836-837 (the goal ledger line and `goal_resolved`).
   - Write the gate's `goldenOrder([... "goals", "seal"])` test. `test/mechanics/order.test.ts` uses
     deferred stand-ins and cannot see this.
2. **Tool lists at the gate and in phases** (A2, T4a must-fix 2).
   - Write the gate lock of `submitSolution` as a progression lock handler: refused while
     `ExileApi.standing` is `gate` (old world.ts:1446-1448).
   - Scenario: A03 at the gate until minute 41 submits a correct code at minute 38. Old:
     `TOOL_LOCKED`. New: no `level_up`.
   - Compare the f4g4 `getStatus` replies at minute 5 with the golden (no `chooseName`). In
     `status.test.ts:104-109`, stop filtering both lines to `GRANTED`, and grant in the story's order
     (`twin.ts:110`).
3. **The door of a version-1 resume** (A3, `mechanics/progression/src/model.ts:181`).
   - Read `data.door ?? doorIn(options)`, as the old `state.door ?? holdAfter` (world.ts:3100).
   - Scratch scenario: `loadState({ door absent, locksStale false }, holdAfter 7)` gives 7.
4. **The next door clamped** (A4, `mechanics/progression/src/submit.ts:221-222`).
   - Use `doorIn(options)`, not the raw `ctx.options.holdAfter` (old world.ts:766).
   - Scenario: twin resume of `snapshot-L7` with `holdAfter: 10` keeps the door empty.
5. **The holdout rule under every task** (A5, `mechanics/progression/src/task.ts:43`).
   - Add `StandoffTribunalApi` to `uses`. Append `tryCall(StandoffTribunalApi, "taskLine", { resident })`
     between the names line and the marks line.
   - Stop stripping the rule in `turns.test.ts:32-41` and `notices.test.ts:72`.
   - Compare the 24 `turn_input` tasks of `whispers-f10-grudge`.
6. **A finished resident is not told again** (A6, `model.ts:205`). `migrateV0` reads `delivered`,
   with `finished` per resident; fall back to today's guess only when the field is absent.
7. **Resume work in `runResumed`** (A7, `puzzles/src/index.ts:34`, `progression/src/index.ts:35`).
   - Move the door, the act starts with `#noteActStarts`, the locks and the re-deal to the
     `runResumed` phases at their table slots.
   - The resume lines are then written at the snapshot minute, in the old order: cores (T2's
     motives), then act starts, then the re-deal announcements.
   - Fix the vacuous scenario at `twin-resume.test.ts:142-151` so that the re-deal-and-compare path
     runs.
8. **Gate items the review found open.**
   - `progression.test.ts:66-70` compares more than `competitors`.
   - `puzzles.test.ts:24` keeps more than the minute-0 lines.
   - `listAgents` gets a golden comparison, with the cast once `CastApi.active` exists.
   - The status part of `turn_input` is compared.
   - The twin's `bare()` keeps `minute`.

## Gate

Every must-fix has a test that fails on the mutant below. Write the list as
`docs/design/mutants-round3-T3.json` (`MutationListSchema`; `find` must occur exactly once) and run
`pnpm mutants docs/design/mutants-round3-T3.json`. Every row must say `killed`.

Mutants that survived the review (B):

| Id | Change | Must be killed by |
|---|---|---|
| M5 | a released door kept even when the door changed | resume with a new `holdAfter` |
| M6 | resume act starts removed | must-fix 7 |
| M7 | second door chance in a minute disabled | the door opening twice in one minute |
| M8 | the guard counts undelivered DMs | the guard secrets scenario |
| M10 | `migrateV0` ignores `delivered` | must-fix 6 |
| M11 | `checkReached` removed | a door reached at minute start |
| M15 | rate window `<` to `<=` | a submit exactly at the window's edge |
| M16 | act residents include the exiled | an act start with an exiled resident |
| M17 | acts ended on a stop | `runEnded` with reason `stopped` (D-14) |
| M21 | names and marks lines swapped | must-fix 5 |
| M23 | acts left unsorted | two acts noted at once |
| M25 | a re-deal always announced | must-fix 7, the fixed scenario |
| M26 | `lastProgress` default 0 | a resident with no progress (-1) |
| M27 | goals' `act_ended` listener deferred | must-fix 1 (the loader now refuses it; the test must name the refusal) |

New mutants for the must-fixes:

| Id | Change | Must be killed by |
|---|---|---|
| T3-A2 | the `submitSolution` gate lock removed | must-fix 2 |
| T3-A3 | `data.door ?? doorIn(options)` back to the round-2 expression | must-fix 3 |
| T3-A4 | `doorIn(options)` back to `ctx.options.holdAfter` in `submit.ts` | must-fix 4 |
| T3-A5 | the `taskLine` call removed | must-fix 5 |

The mutants the review saw killed must stay killed: M4, M9, M12, M14, M19, M20, M22, M24.

## Not yet (step 18)

- The enabled-tool count of the standings (T3 request 5) is the arena's.
- The director after the holder notices (`level_entered`) waits for the script mechanic.

## Hand-in

- `pnpm check` green.
- The mutant list, and the output of `pnpm mutants`.
- Requests, if any, in `carve-requests-round3-T3.md`.
