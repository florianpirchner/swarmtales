# Challenger review of the new core (waves 2a and 2b)

> **Carried from the old platform.** This paper was written for the old platform, before the rewrite, and is kept as
> it was, except for its links. Links to the other papers of [`docs/history/`](../README.md) stay relative; paths into
> code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do not exist on this
> branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Verdict: fix first. Problems 1-8 are core design fixes; they are cheap now and expensive once 18
mechanics are written against today's behaviour. Probe scripts that reproduce 5-8 are not kept; the
scenarios below are exact enough to turn into tests.

**Status (wave 3.0):** problems 1-12, the adapter's `at` and the carve plan corrections are fixed;
each fix has a test that failed first: `test/host/review-ordering.test.ts` (1),
`review-basics.test.ts` (2, 4, parts of 11), `review-uses.test.ts` (3),
`review-lifecycle.test.ts` (5, 6, 7), `review-policies.test.ts` (8, 9),
`test/snapshot/legacy-snapshot.test.ts` and `test/log/legacy-files.test.ts` (10 and the 12 run logs),
`review-layering.test.ts` and `conformance.test.ts` (12). The core grew with the fixes: 3508 lines in
`packages/contracts/src/core` and `packages/kernel/src/host` (2608 without blank and comment
lines; 3082 before the fixes), about 1.7 times the ~1500 budget. Not trimmed in wave 3.0, since
the teams build against it; candidates are the guard and consult waits (`waits.ts`,
`core/consult.ts`, about 130 code lines, could be a pipeline module), the story rules stand-ins
and facts (about 60), and the generic boilerplate of `defineHead`/`defineMechanic` (about 40).
[`carve-plan.md`](carve-plan.md) carries the corrected order and the team briefs.

## Ranked problems

1. **Event ordering cannot reproduce the golden logs** (`kernel/src/host/log.ts:195-244`,
   `gateway.ts:101-113,155`). Listeners run later, breadth first; staged calls run after the whole call.
   Golden `cityofkeys-f10g10` seq 36-41: `ledger_entry, receipt_issued, level_up, director_action,
   board_post, submission` (the director reacts synchronously inside enterLevel). Built as the carve plan
   says, the new log reads `... level_up, submission, director_action, board_post`. A rule with several
   actions alternates action/effect (16 times `notice -> notify -> notice`); staging all actions gives
   action, action, effect, effect. Progression cannot call the script directly (requires cycle).
   Fix: an immediate (depth-first) listener mode, e.g. `kit.listen(..., { immediate: true })`; the script
   runs one action at a time, chaining with `then`.
2. **A mechanic cannot reproduce the old random draws** (`loader.ts:143-150`, `kit.ts:253-285`,
   `context.ts:388-424`). The old engine uses labelled streams `rngFor(seed, "puzzle", level)`
   (world.ts, lottery, seal, holdout-lot, factions, tribunal, teams, whisperer, cores, names, goals).
   `ctx.random()` derives from seed + mechanic id + log position and `seed` is not exposed, so the puzzle
   deal differs and every golden diverges in minute 0; adding or removing any event (including core events
   the adapter drops) moves every later draw. Fix: `ctx.rng(...labels)` and the seed in the state setup.
3. **No optional dependency** (`loader.ts:30-40`). Script needs "a story without a rule for a mechanic
   does not need it loaded"; whispers needs `isExiled` but the whispers golden has no exile; exile's
   `#onExiled` calls goals then seal synchronously, in that order, when loaded (world.ts:2810-2811);
   seal and exile form a cycle (seal strikes through exile, exile tells seal); channels needs
   `holdout.exemptFromCap` (world.ts:2108) from a later mechanic. Fix: optional requires (`uses: [Api]`)
   with `ctx.has` / `ctx.tryCall`, and define how cycles between optional uses are allowed.
4. **Status line cannot be joined in the old order** (`turns.ts:45-54` joins in load order). Old order
   (turn-input.ts:13-47): minute and level, points, rank, marks, receipts, held pieces, waiting for code,
   tribunal, seal, goal, DM window, popularity, holdout, "you are". Load order would differ in every golden
   `turn_input`. Fix: a sort key within a kind (`TurnLine.order`).
5. **A snapshot loses calls staged in the minute's last events** (`host.ts:260-268,299-321`). Calls
   staged by listeners of `minute_ended`, `referee_intervened`, `run_ended` are neither run before the
   snapshot nor saved: the whole run logs 21 events, the resumed run 19. Fix: run staged calls after
   `minute_ended`; `snapshot()` asserts an empty queue.
6. **Refused calls never count as steps** (`referee.ts:61-71` is reached only after lock and parse,
   `gateway.ts:126-142`). 20 calls to a locked tool or with bad arguments and `maxStepsPerMinute: 3` give
   0 `STEP_LIMIT`; contradicts `story.ts:18-19`, `referee.ts:60`. Fix: count the step for resident callers
   before the lock stage.
7. **A thrown error leaks state** (`gateway.ts:155` has no try; `host.ts:228` no failure path). A throwing
   `execute` leaves `tool_called` and its own event in the log; the call it staged then runs inside the
   next unrelated gamemaker call with `causedBy` pointing at the failed call; `playMinute` can be called
   again and replays the minute. Fix: drop what the failed call staged, end the run with reason `error`,
   refuse further use of the host.
8. **A story's tool policy hits every role variant of a name** (`host.ts:130-134`, `gateway.ts:188`). A
   story limit of 1/minute on `poke` meant for residents refuses the gamemaker's second `poke`; the story's
   `maxLength` on `postBoard` also binds the gamemaker's `postBoard`. Fix: key policies by name and role.
9. **Limit windows and stage order do not fit the real caps.** The old DM cap (world.ts:2106-2109,
   2130-2138) counts DMs plus memo transfers across two tools in aligned N-minute windows with a holdout
   exemption; `rules.maxAttemptsPerWindow` also uses N-minute windows. `LimitWindow` (`tools.ts:431`) has
   only minute, run, resetOn. Old `sendDm` checks unknown recipient, self, exiled, invalid text, DM cap,
   then marks; a DM to an exiled resident by a resident without marks is answered `EXILED` by the old code
   and `NO_MARKS` by the new pipeline. Fix: an `{ minutes: N }` window and a shared counter key; carve rule:
   keep the old check order inside the tool's `rule`/`execute`.
10. **Snapshot converter and resume.** Locks default to `{}` (`legacy-snapshot.ts:123`) and
    `host.ts:375` replaces all locks with them, so a resume silently unlocks every story-locked tool.
    Unknown competitor fields are dropped silently (`legacy-snapshot.ts:109-110` uses `pick`), unknown
    world fields throw (line 99). The host throws on a slice whose mechanic is not loaded (`host.ts:389`)
    and on a stateful mechanic without a slice (`host.ts:386`); the test's local `standIn()` belongs in the
    testkit so teams can resume `snapshot-L7` with a partial carve.
11. **Typing and API weak spots.** `ctx.stage(tool: string, params: unknown)` (`context.ts:409`) is not
    type-checked and refusals of staged calls are dropped by the legacy adapter. `kit.listen(definition,
    ...)` needs a value import of the other mechanic (`mechanic.ts:163`), which makes package cycles
    (seal<->exile, channels<->standoff, goals->exile): declare events apart from mechanics like `defineApi`.
    `parseOptions` writes typebox defaults into the story's own option objects (`define.ts:306`), so
    `storyData()` depends on whether a host was created: clone first. `residents.attribute(id, key, owner)`
    lets any mechanic read another's attributes, bypassing APIs.
12. **Layering and docs.** The new core imports the legacy `contracts/roles.ts` (`GuardSecret`, `GuardJudge`
    with `agent: CompetitorId`) in `mechanic.ts:8`, `consult.ts:6`. Mechanics may import
    `@swarmtales/kernel` (createHost, old Ledger); `conformance.ts:64` does not forbid it. The core is about
    3000 lines against the ~1500 budget of monorepo.md 2a. `resolve` runs after the mechanics' lock handlers
    (`gateway.ts:134-138`) but `mechanic-api.md:131` says before lock. `host.record` is not gated by
    `turn.ready` (`host.ts:327`); with log-position randomness, a runner recording model output on arrival
    would change log and game: add `Turn.record` that waits for `ready`.

## Adapter and converter

All 5 `examples/*/snapshot-L7.json` convert and write back byte-equal. All 12 real `run/events.jsonl`
files (examples and `stories/*/runs`) FAIL on every line: live logs carry a sink field `at` after `minute`;
the adapter moves it before `seq` and `envelopeFromLegacy` puts it into the payload. With `at` stripped
all 12 round-trip, nothing dropped or renumbered. No example snapshot contains standoff, holdout, seal or
whispers state, so those slices are never exercised. The round-trip test proves the format, not that
mechanics will emit the right payloads.

## Carve plan corrections

- progression must require `ReceiptsApi` (its reply contains "receipt R-0001"; `receipt_issued` precedes `level_up`).
- tribunal must require `ProgressionApi` (`lastProgress`, `passed`, `doorShut`, `actStart`, `tribunal.ts:82-90`).
- seal needs `ExileApi` (standing, strike) and `TribunalApi` (`missing`) (`seal.ts:31-39`): it comes after exile and tribunal, not at step 10, and forms a cycle with exile.
- exile needs `StandoffApi` (`heldPieces`, `keep`) and `PuzzlesApi` (exclusions, `factor_burned`) (world.ts:2795-2819) and emits `level_contracted`, which the plan gives to progression.
- whispers does not need `TribunalApi` (duty follows the popularity count, world.ts:988-998); it needs Ledger and Marks and optionally Exile, so it can move earlier.
- channels depends backwards on standoff (`noteText`) and standoff-tribunal (`exemptFromCap`).
- The only cross-mechanic check is the golden comparison at step 18: each team needs its own gate, e.g. the golden events filtered to its mechanic's event types.

## Recommended partition for wave 3

Wave 3.0 (one team, serial, blocks the rest): core fixes 1-12; a `mechanics/*` workspace with an empty
package per id (workspace file, tsconfig references, knip, core-words list, so no team edits shared config
later); one shared module with every `defineApi`, event schema and spec schema, frozen before the teams
start; testkit helpers (stand-ins for resuming a snapshot, per-mechanic golden filter).
Then four teams: T1 economy (names, ledger, marks, receipts including blame, whispers); T2 messages
(channels with 13 tools, petitions, cast, cores); T3 progress (puzzles, progression owning the status line
and the `task` kind, goals; later script and the turn loop); T4 conflict (standoff, exile, tribunal, seal,
standoff-tribunal, mutually coupled, one team). Each gamemaker tool goes to the team that owns its mechanic.
Shared files, one owner each: nobody edits `world.ts` before the last step (teams copy from it, they do not
cut); `turn-input.ts`, `contracts/story.ts`, `tool-names.ts`, `library/prompts/competitor/status/*`,
`legacy-owners.ts`, `LEGACY_WORLD_OWNERS`, `carve-plan.md`. Shared events to freeze in 3.0: `exiled` (T4
emits; T1, T2, T3 listen), `level_up` / `submission` (T3 emits; script and cast listen), `dm_sent` /
`board_post` (T2 emits; T1 and T4 listen), `ledger_entry` / `transfer` (T1 emits; T2 listens).
