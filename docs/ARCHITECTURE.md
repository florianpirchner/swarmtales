# Architecture

How [`SPEC.md`](SPEC.md) maps to code. This file is normative for structure and coding
rules; the spec is normative for game behavior.

## 1. Principles

1. **Engine provides mechanics, stories provide content.** No story text, level data,
   courier line or NPC behavior lives in engine code. The engine only knows primitives.
2. **Stories are data.** A story is a TypeScript module whose default export is the
   result of `defineStory(...)`: a deeply readonly, JSON-serializable
   `StoryDefinition`. No callbacks, no closures, no I/O. The engine interprets it.
3. **Determinism.** All randomness flows from the run seed through `core/random.ts`.
   Engine code never calls `Math.random()` or reads wall-clock time; only log sinks
   may stamp wall-clock timestamps.
4. **One source of truth for tools.** A per-agent unlock set decides (a) which schemas
   reach the model, (b) which names `getStatus` reports, (c) which calls the gateway
   accepts.
5. **Everything is an event.** Every state change emits a typed event. Logs, reports
   and the digest consume events; they never reach into world internals.

## 2. Layout

```
src/
  core/        random, ledger, clock, ids, result helpers
  engine/      world state, scheduler (Arena), tool gateway, director interpreter,
               petitions, receipts, standings, puzzles/ (fragments, additive)
  tools/       one file per tool family; typebox schemas; English descriptions
  agents/      pi-agent runner, system prompt, personas, model binding
  model/       providers, model settings, scripted (offline) source
  story/       DSL: types.ts, define.ts, validate.ts, templates.ts
  log/         event sinks, run artifacts, transcripts, minute report, usage
  digest/      [M3] detectors, relationship graph, timeline, chronicle
  report/      run reporter (SPEC 15): facts computed from the run's files (facts.ts,
               run-log.ts), evidence pack, prompt, model binding, REPORT.md rendering;
               reporter.ts validates the model's JSON and writes the file
  snapshot/    run snapshots (SPEC 17): typebox schemas of the file, its events and the
               model contexts; read, check and write
  cli/         main.ts, validate.ts, digest.ts, report.ts, run-report.ts
stories/       one folder per story: nexus/story.ts (default) with its README; index.ts
               (registry by name)
test/          mirrors src/; offline only (scripted provider)
docs/          SPEC.md, ARCHITECTURE.md, MODELS.md
```

Old directories (`arena/`, `game/`, `tutorial/`, `scenarios/`, `scripts/`,
`arena-configs/`) disappear.

## 3. Story DSL

### 3.1 Shape

```ts
import { defineStory, level, at, onFirstEnter, act, team } from "../story/index.ts";

export default defineStory({
	id: "nexus",
	title: "NEXUS — The City of Keys",
	run: { agents: 6, minutes: 60, seed: 7, survivors: 2, startPoints: 15,
	       activation: "onNovelty", passesPerMinute: 3, blockSize: 1 },
	model: { provider: "openrouter", id: "z-ai/glm-5.3-flash" },
	rules: { penalty: 5, maxAttemptsPerWindow: 3, attemptWindowMinutes: 5,
	         marks: { fromLevel: 5, perLevel: 8, prices: { board: 0, group: 1, dm: 2 } } },
	cast: { ORION: { level: 8, hidden: true, escrow: 0 } },
	personas: [ /* ... */ ],
	levels: [
		level(1, { title: "The first door", puzzle: { kind: "fragments", length: [6, 10] },
		           team: team.solo(), reward: 5, tools: ["getStatus", "getProblem", "submitSolution", "listAgents"],
		           task: "Your password is {fragment}. Submit it with submitSolution." }),
		// ...
	],
	director: [
		onFirstEnter(2, [act.post("COURIER", "The city watches who shares.")]),
		at(18, [act.publishStandings("bands")]),
	],
});
```

### 3.2 Typing requirements

- `defineStory` uses `const` type parameters so cast IDs become a literal union.
  `act.post("ORIN", …)` must be a **compile error** when `ORIN` is not declared.
- Tool names are a literal union derived from the tool catalog
  (`ToolName`); a typo is a compile error.
- Placeholders are typed per context where feasible; anything the type system cannot
  catch is caught by `validateStory()` (run by `pnpm validate` and at startup).
- Triggers, conditions and actions are discriminated unions on `kind`. The interpreter
  uses exhaustive `switch` with a `never` check.

### 3.3 Serialization

`000-run.json` contains `JSON.stringify(story)`. A test asserts that every shipped story
round-trips through JSON unchanged (proves it is pure data).

### 3.4 Registry and CLI

`stories/index.ts` maps names to stories. `pnpm start --story nexus` (default
`nexus`). CLI flags override run parameters: `--agents --minutes --seed --provider
--model --level --only --stop-when-done --passes --block-size --no-personas --no-gamemaker --no-classifier
--classifier-provider --classifier-model --snapshot-after --stop-after-snapshot --resume`.
The gamemaker (`src/gamemaker/`) is an `EventSink` and a round observer of the arena.
The statement classifier (`src/interpret/`) is an `EventSink` and the arena's interpreter:
it labels each round before the gamemaker looks and writes `interpretation` events.

### 3.5 Run snapshots

A run snapshot (SPEC 17) serializes the engine objects explicitly instead of replaying
the run: every stateful component has `snapshot()` and `restore()` (ledger, board,
mailbox, marks, receipts, petitions, cast, groups, world with its level states,
director, arena, agent runner, gamemaker, interpreter), and `composeRun` assembles
them into one versioned file (`src/snapshot/snapshot.ts`). Restoring emits nothing; the
bus replays the recorded prefix to the log sinks (`EventSink.replay`) and numbering
continues after it. Replaying a live run would need every model answer again and would
break with any engine change; explicit state does not, and a test proves it exact: a
resumed scripted run logs, after the cut, the same events as the uninterrupted run with
the same `--snapshot-after` that is not stopped.

The cut is a door in the world (`WorldOptions.holdAfter`): a competitor who passes
level n is marked `held` and stays on level n; levels behind the door are never dealt
(`#levelState` refuses them, teams come from the planner). `Arena` takes the snapshot
once `world.hasPassed` holds for everyone, and `#nextMinute` calls `world.openDoor()`
after the clock advances and before the director's minute triggers. A resumed run starts
with `#nextMinute`, so it opens the door at the same point as the run that goes on, and
deals the later levels from the story it was given. The gamemaker rebuilds its secret
guard whenever more levels are dealt. `UsageCollector` keeps the replayed prefix's usage
apart (`replay`), so the budget counts only the run's own spend.

The file is untrusted input. `parseSnapshot` checks it against typebox schemas whose
static types are assignable to the engine's snapshot types (no casts); the event schema
and the pi message schema carry compile-time checks against the engine's event union
and pi's message type, so a new event type or field that the schema misses stops the build.

## 4. Coding rules

Enforced by `tsc`, ESLint and a code-rules test. CI runs all of them.

- **English only:** identifiers, comments, strings, prompts, test names, docs. A test
  scans `src/`, `test/` and `docs/` for German umlauts, the sharp s and common German words.
- **Strict TypeScript:** keep `strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`.
- **ESLint:** `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`.
- **No `any`** in any form. **No double casts** (`as unknown as X`, `as any as X`).
- **No type assertions** (`as X`) except `as const`. Narrow with type guards or parse
  with typebox `Parse` at boundaries.
- **No non-null assertions** (`x!`).
- Exhaustive `switch` over unions with a `never` default.
- Errors returned to agents are structured codes (`TOOL_LOCKED`, `NO_MARKS`, …), never
  stack traces.
- Small modules; one responsibility each. Prefer `readonly` data and `#private` fields.

## 5. Testing

- All tests run offline with the scripted provider; no API key needed.
- Mechanics tests (ledger invariants, puzzle invariants, mailbox, groups, marks, gating,
  scheduler fairness, director triggers/actions, petitions, receipts) are independent
  of story text.
- Story tests load `nexus` and drive full levels with scripted agents.
- Scheduler fairness test: over many rounds and passes, each agent's average position is
  close to the middle; order is reproducible for a fixed seed.
- Scheduler passes and blocks (SPEC §3): a block's model calls run concurrently (a scripted
  model with delays answers out of order), yet answers and tools land in the seeded order.

## 6. Milestones and acceptance

| Milestone | Scope | Done when |
|---|---|---|
| **M1 Foundation** | ESLint + CI + English code-rules test; new layout; story DSL and validator; `nexus` tutorial P1–P7 as TS story; seeded turn order; YAML, JSON schema, `yaml`, `ajv` removed; README rewritten in English | `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm validate` green; scripted run of `nexus` completes and writes run artifacts incl. serialized story |
| **M2 Director & society** | director interpreter (all triggers/conditions/actions in SPEC §10), cast, personas, per-agent models, receipts + `showReceipt`, petitions + `signPetition`/`listPetitions`, standings; nexus Act I beats moved into the story | same checks; every SPEC §10–§11 primitive has a test; no story text left in engine |
| **M3 Digest** | `pnpm digest` deterministic layer + optional chronicle | detectors tested on synthetic event logs; digest of a scripted run produces all files |
| **M4 Act II** | additive-secret puzzle (`puzzle.additive`, `{factors}`, `factors_dealt`), `revealFactor`, `onCollect`, `collectDms` with `forMinutes`/`distinctSenders`, factor secrets in the gamemaker guard, factor shares and `falseFactor` in the digest; nexus levels 8-10 with the feast | same checks; generator invariants per topology; a scripted nexus run that works only from what reached each resident passes level 10 |
| **M5 Run snapshots** | `--snapshot-after`, `--stop-after-snapshot`, `--resume`; `snapshot()`/`restore()` per component; versioned, schema-checked snapshot file | same checks; a scripted nexus run snapshotted after level 7 and resumed logs the same events after the cut as an uninterrupted run |
