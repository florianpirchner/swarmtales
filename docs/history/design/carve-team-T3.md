# Carve team T3: progress

> **Carried from the old platform.** This paper was written for the old platform, before the rewrite, and is kept as
> it was, except for its links. Links to the other papers of [`docs/history/`](../README.md) stay relative; paths into
> code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do not exist on this
> branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Wave 3 brief for the team that carves puzzles, progression and goals out of
`packages/engine/src/world.ts`, and later the script and the turn loop. Read
[`carve-plan.md`](carve-plan.md) ("How to carve one mechanic", the entries of steps 7, 8, 9, 16
and 18, "Teams, gates and shared files") and [`mechanic-api.md`](mechanic-api.md) first; this
brief says what is yours and what is not.

## Scope

| Step | Package | Provides | Requires | Uses | Old events (golden filter) |
|---|---|---|---|---|---|
| 7 | `mechanics/puzzles` | `PuzzlesApi`; `guard.secrets`, `guard.leaks` | none | | `fragments_dealt`, `factors_dealt`, `factor_revealed`, `factor_burned`, `level_contracted` |
| 8 | `mechanics/progression` | `ProgressionApi`, `ProgressionEvents`; the `status` frame (`minute`, `level`, `rank`, `awaitsCode`), the `task` input kind; tools `getStatus`, `getProblem`, `submitSolution`, `listAgents`, `activeTools` | `PuzzlesApi`, `LedgerApi`, `ChannelsApi`, `ReceiptsApi` | | `submission`, `level_up`, `tools_unlocked` |
| 9 | `mechanics/goals` | `GoalsApi`, `goal` status part | `ProgressionApi`, `ChannelsApi` | | `goal_dealt`, `goal_resolved` |
| 16 | `mechanics/script` | the director as staged calls and listeners | none | `ChannelsApi`, `ProgressionApi`, `CastApi`, `PetitionsApi`, `LedgerApi`, `PuzzlesApi` | `director_action`, `director_skipped`, `standings_published` |
| 18 | `mechanics/arena` | `run_start`, `round_end`, `act_brake`, `run_end`; the turn policy (`turns.order` = `rngFor(seed, "order", round, pass)`, `turns.inputs` = `INPUT_KINDS`) | none | `ProgressionApi`, `LedgerApi` | `run_start`, `round_start`, `pass_start`, `round_end`, `turn_skipped`, `act_brake`, `run_end` |

`level_contracted` moved from progression to puzzles in wave 3.0 (the exclusions are puzzles'
state; exile calls `PuzzlesApi.contract`).

## Order inside the team

puzzles, then progression, then goals. Script and arena wait until every mechanic they direct has
landed (they are the integration steps; step 18 also cuts `world.ts`). Progression needs
`ChannelsApi` (T2) and `ReceiptsApi` (T1): stand-ins until they land; its reply text names the
receipt (`receipt R-0001`) and `receipt_issued` comes before `level_up` in the goldens.

## Gate

For each golden log in `test/golden/` and each of your mechanics:
`compareGolden(ownedBy(readLegacyLog(path), ["<id>"]), linesYourMechanicWrote)` is `undefined`,
with the calls of `goldenCalls(...)` replayed and the replies equal to the old `tool_result`
texts. Snapshot: `examples/cityofkeys-act1-06a-04/snapshot-L7.json` resumes with your mechanics and
`standInsFor(snapshot, [yourIds])`. Progression rebuilds the locks on load (migration 0 → 1): the
converted snapshot carries none. Step 18 runs the whole golden comparison.

## Frozen for you

- **You emit, others listen:** `submission`, `level_up` (`ProgressionEvents`: script, cast, goals).
  Build payloads in the order of the schema.
- **You listen:** `exiled` (goals, script; `ExileEvents`), `petition_resolved`
  (`PetitionsEvents`), `cast_dm` (`CastEvents`), `ledger_entry` (`LedgerEvents`).
- **APIs:** `PuzzlesApi`, `ProgressionApi`, `GoalsApi` (`mechanics/shared/src/progress.ts`). You
  implement them; you do not change them.
- **Random streams:** `ctx.rng("puzzle", level)` deals as before; the lottery is cast's.
- **Status order and kinds:** you own the frame; every other mechanic's part carries its
  `STATUS_ORDER` value. The finished notice is a `task` line, so it stays before the DMs.

## Do not edit

`mechanics/shared`, `packages/engine` (copy from it; step 18 cuts it, with the integration owner),
`packages/contracts/src/story.ts`, `tool-names.ts`, `turn-input.ts`,
`library/prompts/competitor/status/*`, `legacy-owners.ts`, `LEGACY_WORLD_OWNERS`, the core
(`packages/contracts/src/core`, `packages/kernel/src/host`), `carve-plan.md`, the workspace files
(`pnpm-workspace.yaml`, root `tsconfig.json`, root `package.json`, `knip.json`,
`scripts/check-packages.ts`), `test/golden/`. Your own files are `mechanics/<your ids>/**` and
tests under `test/mechanics/<your id>/`.

## Watch out

- The script reacts to `level_up` with an immediate listener (`{ immediate: true }`): its actions
  are written before the `submission` that caused them, as in the goldens. Staged actions run one
  at a time, depth first; chain with `then`.
- Calls staged in `runEnded` are dropped: the director's last actions run in `minuteEnded`.
- `#planner` (teams per level) is listed with progression's fields but the deal needs it: keep it
  in puzzles if the deal is the only user, and say so in the PR.
- "Task once per level" (`#deliveredLevel`, `#deliveredFinished`) moves from the arena into
  progression.
