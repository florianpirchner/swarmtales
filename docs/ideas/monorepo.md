# Idea: Swarm Tales as a monorepo of packages

Status: proposal (2026-10-30). Nothing is built. Flo asked for a structure worthy of a senior
project, extensible with custom tools and puzzles, with no prompts in code and a director that only
guards the hard limits of the game.

## 1. Where we stand

About 29k lines in `src/`, 15k lines of tests, one story (`stories/cityofkeys/`), one package.
The code is clean inside a file, but the boundaries between folders are not:

| Finding | Evidence | Why it matters for packages |
|---|---|---|
| Import cycles between folders | `engine ↔ tools`, `engine ↔ interpret`, `interpret ↔ agents`, `story → tools` (the `ToolName` catalog), `snapshot → gamemaker/agents/tools` | A package graph must be acyclic. These cycles have to go before anything moves. |
| `World` is a god object | `src/engine/world.ts`, 2529 lines: levels, puzzles, marks, receipts, mail, names, seal, petitions, groups, escrow, tribunal hooks | A new mechanic means editing `World`. No plugin can add state of its own. |
| Closed vocabularies | `TOOL_NAMES` (34 names) in `src/tools/catalog.ts`; `TRIGGER_KINDS`, `CONDITION_KINDS`, `ACTION_KINDS` in `src/story/types.ts`; one event union in `src/engine/events.ts` | Great for typo safety, but every extension edits the core. |
| Prompts in code | ~2700 lines in `agents/system-prompt.ts`, `gamemaker/system-prompt.ts`, `novel/prompts.ts`, `report/prompt.ts`, `digest/chronicle-prompt.ts`, `interpret/*`, `engine/turn-input.ts`; ~80 tool descriptions; courier and city lines in `stories/cityofkeys/story.ts`; replies such as `LOCKED_DETAIL` in `tools/tool.ts` | Every prompt tweak is a code change; prompt variants (dials, temperaments) are `if` chains in TS. |
| The director is a story interpreter | `src/engine/director.ts` runs the story's rules (courier lines, factor releases, feast, standings bands). The real hard limits sit elsewhere: act brakes in `arena.ts#applyBrakes`, tribunal deadlines in `engine/tribunal.ts`, the budget stop in `arena.ts` | "Director" means two things today: staging and referee. |
| "City" baked into the engine | `CITY` used 60 times in `src/`; the level ladder is the only world shape | Other story shapes (open world, Whispers) fight the engine. |
| The CLI is the composition root | `cli/compose.ts` (601 lines) and `cli/main.ts` (532 lines) wire everything | A backend would have to copy that wiring. |

## 2. Target layout

pnpm workspace, TypeScript project references, every package strict and ESM.

```
apps/
  cli/            today's pnpm start / report / digest / novel / validate commands
  backend/        run server: starts runs, streams events over WebSocket, serves runs and novels (later)
  ui/             React viewer: live run, board, timeline, relationships, novel reader (later)

packages/
  contracts/      Typebox schemas + types only: events, snapshots, story shape, plugin API,
                  tool contract, prompt keys. Depends on typebox and nothing else.
  kernel/         rng, clock, ids, ledger, result (today's src/core)
  engine/         world core (residents, levels, points, mail, board), scheduler, module host,
                  referee (hard limits), snapshot read/write
  sdk/            story builder DSL + validator; what a story or plugin author imports
  prompts/        prompt loader and renderer; the built-in prompt files live here as .md
  models/         providers, model settings, pi-agent runner, scripted offline source
  roles/          the model-backed roles: gamemaker, judge, classifier, souffleur, weaver
  chronicle/      event logs, digest, run reporter (log/, digest/, report/)
  novelist/       the novel pipeline
  testkit/        scripted competitors, fake world builders, golden-file helpers

plugins/          first-party mechanics, each a package built only on sdk + contracts
  core-channels/  board, DM, groups, transfers, receipts
  marks/          message stamps
  puzzles/        fragments, additive (and later new ones)
  tribunal/       tribunal, blame, wills, ransom, factions
  seal/           black seal
  standoff/       ultimatums, claimPiece, confiscation
  cast/           figures, cores, goals, names, archetypes

stories/
  cityofkeys/     story.ts + texts/*.md + README.md (+ cast/)
  whispers/       next story

examples/         run data stays where it is
docs/
```

Dependency rule (enforced by a lint rule, see §7):
`contracts ← kernel ← engine ← sdk ← plugins ← stories`; `prompts`, `models`, `roles`,
`chronicle`, `novelist` sit beside the engine and talk to it only through `contracts`; only
`apps/*` wire things together. No package imports an app; no plugin imports another plugin's
internals.

Naming: `@swarmtales/<name>`. Publishing to npm is optional; at first the packages are internal and
consumed as TS source (`"exports": "./src/index.ts"`, run with tsx), so there is no build step.

## 3. Extension points

One concept: a **module**. A module is what a plugin exports. The engine knows only the module
host; marks, receipts, tribunal and seal become modules like any third-party one.

```ts
export const marks = defineModule({
  id: "marks",
  options: MarksOptions,                       // Typebox schema, validated when the story loads
  state: (opts) => ({ left: new Map<CompetitorId, number>() }),
  snapshot: { schema: MarksSnapshot, save, load },   // runs stay resumable
  events: { mark_spent: MarkSpent, marks_refilled: MarksRefilled },
  tools: [stampTool],                          // ToolSpec<"stamp", Schema>
  hooks: { onMinute, onLevelEnter, beforeMessage }, // e.g. veto a DM without marks
  prompts: "./prompts",                        // its own prompt files
});
```

The pieces a plugin can contribute:

| Extension | Contract | Example |
|---|---|---|
| Tool | `name`, Typebox parameters, description key, `execute(params, ctx)`; `ctx` gives the module's own state plus a narrow world API | `forgeReceipt`, `vote` |
| Puzzle | `deal(rng, level, teams) → holdings`, `render(holding) → prompt vars`, `check(holding, code)` | fragments, additive, a new cipher |
| Mechanic state | state slice, snapshot schema, events | marks, seal, standoff |
| Hook | typed lifecycle hooks: minute start/end, level enter, message send (can veto), act end | refill marks every 3 min |
| Model role | a role with its own prompt, model choice and output schema | judge temperaments, whisperer |
| Detector | digest detector over events | blame, tribunal, new loophole detectors |

Typo safety stays: `defineStory({ modules: [marks(), receipts(), tribunal()] })` infers the union of
tool names from the modules, so a story that unlocks `"stamp"` without loading `marks` does not
compile. The event union is built the same way, so `chronicle` and `ui` still get exhaustive
switches.

Untrusted plugins (web platform, BYOK) never run code: they would be data stories that only combine
installed modules. That keeps the door open for `docs/ideas/web-platform.md` without a sandbox.

## 4. No prompts in code

Every text a model reads lives in a file:

```
packages/prompts/builtin/
  competitor/system.md
  gamemaker/system.md
  gamemaker/sections/tribunal.md
  gamemaker/sections/characters.d10.md    # dial variants are files, not if-chains
  judge/verdict.md
  novelist/outline.md, chapter.md, edit.md
  tools/sendDM.md                          # tool descriptions
  replies/locked.md                        # TOOL_LOCKED and friends
stories/cityofkeys/texts/
  courier/level-2.md ...
```

- A prompt file has frontmatter with its id and a Typebox schema of its variables; the template
  language stays tiny (`{{var}}`, `{{#if}}`, `{{#each}}`, includes). No logic beyond that.
- A code generator writes `prompt-keys.ts`, so `prompts.render("gamemaker.tribunal", { factions })`
  is type-checked: a missing key or a wrong variable is a compile error.
- `pnpm validate` renders every prompt with sample data and fails on unknown variables or
  leftovers.
- Lookup order: story → plugin → built-in. A story can override any prompt; the lab can A/B test a
  prompt variant without touching code; a German competitor prompt becomes a file.
- A test (like today's `code-rules.test.ts`) fails when a string longer than about 120 characters
  or a template literal with prose appears in `packages/*/src`.

Story structure (levels, rules, numbers) stays in the TypeScript DSL as CLAUDE.md demands; only its
prose moves to `texts/`.

## 5. Director → referee + script

Split today's director in two:

**Referee** (engine, small, no story content): guards only the hard limits and always wins.

- run limits: max minutes, max budget (USD), max steps per resident per minute
- act limits: an act's `maxMinutes` (today's brake), snapshot points
- tribunal limits: latest minute for the first tribunal, minimum gap, the exile target must be met
  before the act ends (today's forced last tribunal)
- invariants: points never negative, nothing given twice, exiled residents cannot act
- every intervention is an event (`referee_*`) with the limit that fired

**Staging** (who says what, when): today's director rules (courier lines, factor releases, feasts,
standings bands) move out of the engine. Two options:

1. **Script module** (recommended to start): the same rule vocabulary, but as a plugin
   (`plugins/script`) that a story loads. Deterministic, cheap, Act I keeps working byte-for-byte.
2. **Gamemaker as orchestrator**: the gamemaker gets staging tools (`post`, `releaseFactor`,
   `scheduleEvent`, `scheduleTribunal`) and decides everything inside the referee's limits; the
   script becomes the fallback when it stays silent. This matches the 2026-10-29 idea that Act I stays
   programmed and later acts are staged by the gamemaker.

Option 1 is the refactor; option 2 is a story/mechanic decision for later and needs its own
brainstorm.

## 6. Migration plan

Each step is one PR with `pnpm check` green and an offline golden-run test (scripted run on the
cityofkeys story, events compared to a stored file) that proves behaviour did not change.

| Step | What | Risk |
|---|---|---|
| 0 | Whispers lands first (another thread is building it in `engine/`, `tools/`, `world.ts`) | none, waiting |
| 1 | Golden-run test + break the import cycles inside `src/` (contracts folder, interfaces instead of classes) | low |
| 2 | Prompts to files + loader + codegen + validate check | medium (long diff, no logic change) |
| 3 | Workspace skeleton, `git mv` folders into packages, `apps/cli` | low, mechanical |
| 4 | Module host; carve `World` into modules one by one (marks, receipts, seal, standoff, tribunal, ...) | high, builder + challenger per module |
| 5 | Director → referee + script module | medium |
| 6 | `apps/backend` + `apps/ui` | new work, own go |

Snapshot compatibility: `examples/cityofkeys-act1-06a-04/snapshot-L7.json` must keep loading. Step 4
adds a snapshot version and a migration from today's flat shape.

## 7. Tooling

- pnpm workspaces, `tsc -b` with project references, one shared `tsconfig.base.json`
- ESLint flat config with an import-boundary rule (`eslint-plugin-boundaries` or
  dependency-cruiser) for the dependency rule in §2
- Vitest workspace, tests next to their package; `testkit` for shared fakes
- `pnpm check` keeps its meaning across the workspace
- Optional later: Changesets if packages are published, Turborepo only if `check` gets slow

## 8. Open questions for Flo

1. **Backend and UI now or later?** My proposal: create `apps/cli` now and `apps/backend` +
   `apps/ui` only after the move (step 6), with their own brainstorm.
2. **Staging:** script module first (option 1), gamemaker orchestration later as its own design?
3. **"No prompts":** do tool descriptions, error replies to models and story prose count? I count all
   three.
4. **Publish to npm** (`@swarmtales/*`) or internal only for now?
5. **Plugin trust:** code plugins only from the repo/npm, data-only stories for the web? 
6. **Timing:** start with steps 1-3 right after Whispers is merged, or wait until the first Whispers
   run is done?
7. **Names:** `kernel`, `roles`, `chronicle`, `referee` fine, or other names?
