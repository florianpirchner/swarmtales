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
4. **One source of truth for tools.** A per-agent unlock set decides (a) which tools the
   `[tools]` notice and `activeTools` name, (b) which names `getStatus` reports, (c) which
   calls the gateway accepts. Every schema reaches the model in every request, so the
   cached prefix stays stable (P46).
5. **Everything is an event.** Every state change emits a typed event. Logs, reports
   and the digest consume events; they never reach into world internals.

## 2. Layout

A pnpm workspace (`pnpm-workspace.yaml`) with TypeScript project references (`tsc -b`). Every package
has `@swarmtales/<name>` as its name, ESM only, no native dependencies, and exports from its
`src/index.ts` (the `development` condition, used by tsx, Vitest and the editor) or from its built
`dist/` (the default condition, built with tsdown). The plan behind it is `docs/ideas/monorepo.md`.

```
packages/
  contracts/   types, interfaces and closed vocabularies only: ids, tool names, the story shape
               (story.ts), the turn/competitor contract, the judge, guard and souffleur interfaces;
               core/: the mechanic API of the new core (Typebox schemas and types)
  kernel/      random, ledger, clock, ids, result helpers, text templates (templates.ts, counts.ts);
               host/: the new core (mechanic host, tool pipeline, referee, event bus, turn loop, overseers);
               the CLI runs every run on it, see docs/design/mechanic-api.md
  prompts/     the prompt loader: Markdown files with `{{variable}}` placeholders, a typed registry
               (`keys/`) of ids and their variables, lookup story -> library, checks for `pnpm validate`
  legacy-log/  the old run log's event types (`RecordedEvent`, `ArenaEvent`, `EventSink`) and the
               statement labels, which the CLI, roles and chronicle read and write; depends on
               contracts only
mechanics/     the game rules of the new core, one package each (names, ledger, marks, receipts,
               channels, petitions, cast, motives, puzzles, progression, goals, whispers, exile,
               tribunal, seal, standoff, standoff-tribunal, script, arena) and the frozen `shared` APIs
  sdk/         the story DSL (define.ts), the validator (validate.ts), the archetype reader (cast/)
  models/      providers, model settings, request defaults, scripted (offline) source
  roles/       agents/ (pi-agent runner, system prompt, personas), interpret/ (judge, guard,
               classifier, souffleur, weaver), gamemaker/
  chronicle/   log/ (event sinks, run artifacts, transcripts, minute report, usage), snapshot/
               (SPEC 17), digest/ (detectors, relationships, timeline, chronicle), report/ (run reporter)
  novelist/    the novelist (SPEC 15): casting, outline, scene packs, writer, prompts
  testkit/     scripted agents, story runs and module conformance checks for the new core
apps/cli/      the `swt` / `swarmtales` binary (src/swt.ts dispatches to main.ts, validate.ts, digest.ts,
               novel.ts, report.ts, run-report.ts, ...) and the composition root host/run.ts
               (`composeHostRun`: story mapping host/story.ts, residents host/residents.ts, the
               gamemaker report host/report.ts, run files host/snapshot.ts, the weaver desk)
library/prompts/  every text a model reads (system prompts, tool descriptions and replies, role
               prompts), one file per piece; story overrides in `stories/<name>/prompts/` are planned,
               `pnpm validate` rejects them until the callers pass the story. Found by walking up from
               the prompts package, so it resolves from the sources and from a build.
stories/       one folder per story: cityofkeys/story.ts (default) with its README; index.ts
               (registry by name); its own tsconfig project
test/          offline only (scripted provider); imports the packages by name
scripts/       check-packages.ts (dependency rule, import cycles, no native dependencies),
               smoke-built-cli.mjs (runs the built `swt`)
docs/          SPEC.md, ARCHITECTURE.md, MODELS.md
```

Dependencies point downwards only: `contracts` < `kernel` < `mechanics/*` and `sdk`; `legacy-log` <
`models` < `roles` < `chronicle` < `novelist`; `apps/cli` wires everything. `pnpm check:packages`
enforces the allowed dependencies per package and fails on an import cycle between the files of a
package or on a native runtime dependency. The old engine (`packages/engine`, the `World`) was deleted
in step 18; the old side of every differential test is a recording in `test/fixtures/old-engine/`.
The sdk keeps its own copy of the penalty ladder and the tribunal pacing its validator checks
(`packages/sdk/src/rules.ts`); the mechanics hold the rules they play.

Commands: `pnpm check` (typecheck, lint, package rules, knip, tests, validate, build, smoke),
`pnpm build` (dist of every package and the CLI), `pnpm smoke` (runs the built `swt --help`).

Old directories (`arena/`, `game/`, `tutorial/`, `scenarios/`,
`arena-configs/`) disappear.

## 3. Story DSL

### 3.1 Shape

```ts
import { defineStory, level, at, onFirstEnter, act, team } from "@swarmtales/sdk";

export default defineStory({
	id: "cityofkeys",
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

`stories/index.ts` maps names to stories. `pnpm start --story cityofkeys` (default
`cityofkeys`). CLI flags override run parameters: `--agents --minutes --seed --provider
--model --level --only --stop-when-done --passes --block-size --no-personas --no-gamemaker --no-classifier
--classifier-provider --classifier-model --weaver --weaver-provider --weaver-model
--snapshot-after --stop-after-snapshot --resume`.

**On the new host** (step 18, `apps/cli/src/host/run.ts`): `hostStoryOf` maps the story and the
dials to mechanics; the residents' runner (`roles/src/agents/host-runner.ts`) takes the host's turns;
the gamemaker, classifier, weaver and judge are overseers (`roles/src/overseer/`), each with a model
runtime, routed by definition id (`overseerRouter`). The weaver's inner voices and prompt rewrites
reach the residents through the CLI's `WeaverDesk`, which reads `host.overseerSlice("weaver")`.
Every model call writes a `usage` app line; the arena's `budgetUsd` counts them (the run's one
budget). The overseers replay the old roles line for line.

The gamemaker overseer (`roles/src/overseer/gamemaker.ts`) looks after every `every` rounds; the
city's part of its report is the host-backed report from the mechanics' facts (`apps/cli/src/host/report.ts`),
the log's part (events since the last look, classifier labels, the weaver's changes) is
`roles/src/gamemaker/situation.ts`; the channels mechanic's note desk enforces its budgets. The
classifier labels each round before the gamemaker looks and writes `interpretation` events. The
weaver (`--weaver`, SPEC 10.6) sits between the two: its triggers pick the residents a round's events
touched (code, no model), its runtime asks the chat model (`weave` tool, typebox), and the answer is
applied within the caps: an inner voice the runner appends after the tools notice, or a rewrite of the
leading system message from the prompt facts plus `PromptFacts.shift`. It writes `fate_shift` events;
`log/weaver-log.ts` turns them into `weaver.md`. The old role classes `AgentRunner`, `Interpreter` and
`Weaver` are deleted; their old side lives on as recordings in `test/fixtures/old-engine/` (step18-decisions.md, "Cleanup 1").

### 3.5 Run snapshots

**On the new host** the CLI writes a `swarmtales-run` file (`apps/cli/src/host/snapshot.ts`): the
host snapshot (every mechanic's and overseer's slice, residents, locks, jobs, referee), the host's
event envelopes, every resident's model context, the weaver desk's state and the run's dials. The
cut is the arena's (`arena.snapshot` fact): after the minute in which every resident passed level n
(the door is `holdAfter` on puzzles and progression), or at a minute (`--snapshot-at`). `--resume`
reads this format or an old `agent-arena-snapshot` file, which `convertLegacySnapshot` turns into a
host snapshot (the old roles' state into overseer slices); the prefix is replayed to the log sinks
through the legacy adapter, so `events.jsonl` keeps its old lines and numbering. A test proves it
exact both ways (`test/cli/host-resume.test.ts`).

The old file (`agent-arena-snapshot`, version 2) serialized the old engine's objects (ledger, board,
mailbox, marks, receipts, petitions, cast, groups, world, director, arena, runner, gamemaker,
interpreter, weaver) and cut at a door in the world. The engine is gone; the format stays readable:
`packages/chronicle/src/snapshot/snapshot.ts` defines it as typebox schemas (`parseSnapshot`, the file
is untrusted input) and `convertLegacySnapshot` maps it to the mechanics' and overseers' slices. The
five `examples/*/snapshot-L7.json` files load and resume (`test/snapshot/legacy-snapshot.test.ts`,
`test/snapshot/v09.test.ts`).

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
- Story tests load `cityofkeys` and drive full levels with scripted agents.
- Scheduler fairness test: over many rounds and passes, each agent's average position is
  close to the middle; order is reproducible for a fixed seed.
- Scheduler passes and blocks (SPEC §3): a block's model calls run concurrently (a scripted
  model with delays answers out of order), yet answers and tools land in the seeded order.

## 6. Milestones and acceptance

| Milestone | Scope | Done when |
|---|---|---|
| **M1 Foundation** | ESLint + CI + English code-rules test; new layout; story DSL and validator; `cityofkeys` tutorial P1–P7 as TS story; seeded turn order; YAML, JSON schema, `yaml`, `ajv` removed; README rewritten in English | `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm validate` green; scripted run of `cityofkeys` completes and writes run artifacts incl. serialized story |
| **M2 Director & society** | director interpreter (all triggers/conditions/actions in SPEC §10), cast, personas, per-agent models, receipts + `showReceipt`, petitions + `signPetition`/`listPetitions`, standings; cityofkeys Act I beats moved into the story | same checks; every SPEC §10–§11 primitive has a test; no story text left in engine |
| **M3 Digest** | `pnpm digest` deterministic layer + optional chronicle | detectors tested on synthetic event logs; digest of a scripted run produces all files |
| **M4 Act II** | additive-secret puzzle (`puzzle.additive`, `{factors}`, `factors_dealt`), `revealFactor`, `onCollect`, `collectDms` with `forMinutes`/`distinctSenders`, factor secrets in the gamemaker guard, factor shares and `falseFactor` in the digest; cityofkeys levels 8-10 with the feast | same checks; generator invariants per topology; a scripted cityofkeys run that works only from what reached each resident passes level 10 |
| **M5 Run snapshots** | `--snapshot-after`, `--stop-after-snapshot`, `--resume`; `snapshot()`/`restore()` per component; versioned, schema-checked snapshot file | same checks; a scripted cityofkeys run snapshotted after level 7 and resumed logs the same events after the cut as an uninterrupted run |
