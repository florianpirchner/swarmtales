# Carve requests of team T4b, round 2 (seal, standoff-tribunal, standoff)

Requests to the integration owner for shared files team T4b may not edit (the core, `mechanics/shared`,
the testkit, the converter, the root scripts). Each names what is missing, why, the local adapter
used meanwhile and the proposed change.

## R2-1 `pnpm lint` runs out of memory at 6144 MB

- **What:** `pnpm lint` (`node --max-old-space-size=6144 node_modules/eslint/bin/eslint.js .`) aborts
  with "JavaScript heap out of memory" once `mechanics/seal` is carved. Without the seal's files it
  passes, but only just: unconstrained, the whole-repo lint peaks at about 7.1 GB of heap without the
  seal and 7.3 GB with it (measured with the ESLint API and `--max-old-space-size=12288`). Every team's
  round-2 work adds files to the one typed program, so every team will cross the line.
- **Meanwhile:** T4b runs the lint step as `node --max-old-space-size=12288 node_modules/eslint/bin/eslint.js .`
  (green) and every other step of `pnpm check` as written.
- **Proposed:** raise the limit in the root `lint` script to 12288, or lint with `--concurrency auto`
  (ESLint 9.34+), or lint per workspace project.

## R2-2 A seal (and holdout) slice for an old snapshot that has none

- **What:** the old `World` writes `seal` only once the act's seal began and `holdout` only with a
  holdout tribunal; `convertLegacySnapshot` writes a slice only for fields present. `snapshot-L7`
  (Act I) has no `seal`, so a host that loads the seal refuses the resume (`snapshot: no slice for
  mechanic "seal"`), although the old world simply started an empty seal house.
- **Meanwhile:** the resume test adds `seal: { version: 0, data: {} }` to the converted snapshot; the
  seal's version-0 migration takes `{ seal?: <old SealSnapshot> }`, so `{}` is a seal not begun.
- **Proposed:** the converter writes `{ version: 0, data: {} }` for every carved stateful mechanic
  whose old field is absent (seal, standoff-tribunal, standoff), or the host takes a mechanic's
  initial state when a resumed snapshot has no slice for it and the mechanic declares that as allowed.

## R2-3 `StandoffTribunalApi.taskLine` (D-3)

- **What:** the holdout rule under every door's task (old `#withHoldoutRule`, world.ts:1592) is
  appended by progression through `StandoffTribunalApi.taskLine({ resident }): string | null` (D-3);
  the method is not in `mechanics/shared/src/conflict.ts` yet.
- **Meanwhile:** standoff-tribunal provides it on a local API (`StandoffTribunalTaskApi`, name
  `standoff-tribunal-task`) with the frozen signature, and keeps `StandoffTribunalApi` with
  `kit.provide`.
- **Proposed:** add to `StandoffTribunalApi`:
  `taskLine: query("The holdout rule under every door's task in a run with the gamemaker (old #withHoldoutRule), else null.", OfResident, Type.Union([Type.String(), Type.Null()]))`.

## R2-4 Two tools named `permaDeath` (no change needed; a note for T4a)

- **What:** the seal's resident tool and the holdout tribunal's gamemaker tool are both called
  `permaDeath`, as in the old engine. The host refuses only a name defined twice for the same role
  (packages/kernel/src/host/loader.ts:108), and the two serve `resident` and `gamemaker`, so a story
  may load both.
- **For T4a:** a gamemaker tool `callTribunal` of the tribunal would clash with the holdout's
  (`serves: ["gamemaker"]` both); the old gamemaker had only the holdout's.

## R2-5 Facts cannot call other mechanics

- **What:** a `FactView` reads options, state, minute, residents and log, never an API. The
  gamemaker's situation needs facts made of other mechanics' data: the holdout's `lackingNow` of the
  accused (old `holdoutLines`, `PuzzlesApi.lacking`), the standoff's `outstanding`, `unused` and
  `cityPiecePrice` (D-8; they need `PuzzlesApi.heldPieces`, progression and `TribunalApi`).
- **Meanwhile:** the standoff takes these into a part of its state that is not saved, at each
  minute's end (`minuteEnded`), and its facts read that; after a resume the part is empty until the
  first minute ends. The holdout's facts give the session; the situation (step 17) asks
  `PuzzlesApi.lacking({ level: session.door, holder: session.accused })` itself.
- **Proposed:** facts get the read-only `query` methods of `requires`/`uses` (no commands), or step
  17 accepts the minute-end pattern as the rule.

## R2-6 T3 methods the holdout and the standoff call

- **What:** `PuzzlesApi.openFragmentDoors`, `PuzzlesApi.inherited`, `PuzzlesApi.heldPieces` and
  `ProgressionApi.isOpenOnClock` are frozen but the puzzles and progression mechanics do not
  implement them yet (`provideSome`). The holdout's golden gate therefore runs on stand-ins over the
  golden's deal, levels, door clock and DMs, not on the real T3 mechanics.
- **Proposed:** T3 implements them in its round 2; the gate then swaps the stand-ins for the real
  mechanics replaying the golden submissions.

## R2-7 The gamemaker's direction dial

- **What:** the old gamemaker offered `ultimatum` only at direction 10 in a story with ultimatums
  (gamemaker.ts:214, :375). The dial is a run setting (`direction`), not a story option, and no
  shared API or grant carries it.
- **Meanwhile:** standoff has an option `direction` (default 4) and locks `ultimatum` below 10 (or without an ultimatum rule).
- **Proposed:** the integration owner passes the run's dial into the standoff's options when it
  builds the story, or grants `ultimatum` to the gamemaker only at direction 10 (then the option
  goes).

## R2-8 A `minuteEnded` slot for the standoff

- **What:** `HOOK_ORDER.minuteEnded` has only `arena`. The standoff's minute-end phase (R2-5) writes
  no event, so it runs as a plain function (order 0).
- **Proposed:** add `minuteEnded.standoff` if the table must name every phase.

## R2-9 The gamemaker's name on the holdout's lines

- **What:** the old tribunal wrote the gamemaker's name (`COURIER`) on its announcements from the
  gamemaker spec; standoff-tribunal and standoff each carry an `author` option (default
  `COURIER`) for it, the same value twice.
- **Proposed:** a shared source for the gamemaker's name (the gamemaker's head, step 17), or keep the
  options and let the story set both from one constant.
