# Idea: Swarm Tales as a monorepo of packages

Status: proposal (2026-10-30). Scope (Flo, 2026-10-30): CLI only, no web UI; everything else below stays in, including the story data format and sandboxed plugins. Nothing is built. Flo asked for a structure worthy of a senior
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
| The CLI is the composition root | `cli/compose.ts` (601 lines) and `cli/main.ts` (532 lines) wire everything | Wiring cannot be reused by tests or other entry points. |

## 2. Target layout

pnpm workspace, TypeScript project references, every package strict and ESM.

```
apps/
  cli/            today's pnpm start / report / digest / novel / validate commands (the only app)

packages/
  contracts/      Typebox schemas + types only: events, snapshots, story shape, plugin API,
                  tool contract, prompt keys. Depends on typebox and nothing else.
  kernel/         rng, clock, ids, ledger, result (today's src/core)
  engine/         the slim core (§2a): residents registry, clock and scheduler, event log, module
                  host, tool gateway and pipeline, referee, snapshot read/write. No game words.
  sdk/            story builder DSL + validator; what a story or plugin author imports
  prompts/        prompt loader and renderer (code only; the prompt files live in library/)
  models/         providers, model settings, pi-agent runner, scripted offline source
  roles/          the model-backed roles: gamemaker, judge, classifier, souffleur, weaver
  chronicle/      event logs, digest, run reporter (log/, digest/, report/)
  novelist/       the novel pipeline
  testkit/        scripted competitors, fake world builders, golden-file helpers

plugins/          first-party mechanics, each a package built only on sdk + contracts
  ledger/         points, transfers, ransom (the service others `require` to move points)
  progression/    levels, doors, who has passed what, act structure
  channels/       board, DM, groups, mailbox
  receipts/       receipts, showReceipt, forgeReceipt
  marks/          message stamps
  puzzles/        fragments, additive (and later new ones)
  exile/          exile and permaDeath as a service (status, wills, inheritance)
  tribunal/       tribunal, blame, factions; `standoff-tribunal` for Whispers (§3h)
  seal/           black seal
  standoff/       ultimatums, claimPiece, confiscation
  cast/           figures, motives, goals, names, archetypes
  script/         the programmed director: courier lines, feast, standings (§5)

library/          content anyone can replace or extend, no code
  archetypes/     drives, temperaments, professions, figures (today's archetypes/)
  prompts/        gamemaker/, judge/, competitor/, novelist/, reporter/, tools/, replies/

stories/
  cityofkeys/     story.ts + prompts/ (overrides) + texts/*.md + README.md (+ cast/)
  whispers/       next story

examples/         run data stays where it is
docs/
```

Dependency rule (enforced by a lint rule, see §7):
`contracts ← kernel ← engine ← sdk ← plugins ← stories`; `prompts`, `models`, `roles`,
`chronicle`, `novelist` sit beside the engine and talk to it only through `contracts`; only
`apps/*` wire things together. No package imports an app; no plugin imports another plugin's
internals.

Naming: `@swarmtales/<name>`. **The packages are published to npm** (Flo, 2026-10-30); see §7a for
build, versioning and release.

## 2a. The slim core (Flo, 2026-10-30)

Goal: **an extremely slim core; every mechanic is loaded as a plugin.** The test is simple: the core
contains no game word. No door, point, DM, board, tribunal, mark or level appears in it. Today's
`World` (2705 lines) is the opposite: all of that lives in one class.

| In the core (small, stable, rarely changes) | Plugin (everything with game meaning) |
|---|---|
| resident registry: id, a status bag that modules own | points, transfers, ransom (`ledger`) |
| virtual clock and the scheduler (§3g) | levels, doors, acts (`progression`) |
| append-only event log and the typed event bus | board, DM, groups (`channels`) |
| module host: load order, `requires`, services, hooks, state and snapshot slices | marks, receipts, tribunal, exile, seal, standoff |
| tool gateway and the pipeline (§3d): lock, limit, afford, rule, guard, execute, settle, after | puzzles (fragments, additive) |
| agent turn loop (who acts when, what a turn sees) | cast, motives, goals, names |
| referee: run limits (time, budget, steps) and the registry of limits that modules add | the script director, gamemaker mode, model roles |
| prompt and asset lookup (story, plugin, library) | everything else |

How it stays that small:

- **The core knows only extension points.** "Points" is not in the core; `ledger` publishes a typed
  *service* (`ledger.transfer(from, to, n)`), and the modules that need it say `requires: ["ledger"]`.
  Another story can load a different ledger (or none).
- **Residents are an id plus attributes modules own.** Exile sets `status: "exiled"` through its own
  slice; the core only asks the registry whether a resident may act.
- **The referee enforces limits it is told about.** Run limits are its own; an act's `maxMinutes`,
  tribunal deadlines and the DM cap are registered by `progression`, `tribunal` and `channels`.
- **Size budget as a check:** the core stays under about 1500 lines in files of at most 400 (§3f);
  a plugin that needs core changes is a sign the extension point is missing.
- **Two proof stories:** an empty story (zero plugins; residents exist, the clock runs, the log is
  written) and a minimal one (`channels` plus `ledger`) run in `testkit`; cityofkeys and Whispers are
  plain lists of plugins plus options.

**Built (wave 2a, 2026-10-31), where it differs from the above:** the core lives in
`packages/kernel/src/host/` with its types in `packages/contracts/src/core/`, not in `engine`, which
still holds `World` until wave 3; kernel may depend only on contracts, so the core cannot reach
`World`. The two proof stories are tests in `test/host/` with the testkit in `packages/testkit/`.
The API as built is described in [`docs/design/mechanic-api.md`](../design/mechanic-api.md).

Costs to watch: coupling between plugins (made explicit by `requires` and visible with
`swt module graph`), load order (fixed by the dependency graph, ties broken by the story's list),
event-bus overhead (measure in the golden run), and debugging across plugins (every service call and
refusal is an event).

Migration: no strangler and no transition period (Flo, 2026-10-30). Nothing is migrated piece by
piece; once Flo gives the go, everything is rewritten in one pass (§6) and `World` is deleted.

## 3. Extension points

One concept: a **module** (built as a *mechanic*, see below). A module is what a plugin exports. The engine knows only the module
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

As built in wave 2a the call is `defineMechanic(head, build)`: the head is the static part above
(id, `requires`, `provides`, options, state, events, prompts) and fixes the types; `build(kit)` runs
once per run and returns tools, services, listeners, facts, hooks, pipeline handlers, referee limits,
jobs and the snapshot slice. `requires` names APIs (`defineApi`), not module ids, so a story can swap
the provider. See [`docs/design/mechanic-api.md`](../design/mechanic-api.md).

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
compile. The event union is built the same way, so `chronicle` still gets exhaustive
switches.

Design rule: a module touches nothing but its own state, the narrow context the host passes in, and
the events it returns: no direct `World` access, no Node APIs, randomness and time only from the
host. That keeps runs deterministic and resumable, and it lets the same module run in the repo and in
the plugin sandbox (§3b).

### Services, facts and dependencies between modules

- **Services.** A module may publish typed services (`ledger.transfer`, `exile.ban`,
  `fragments.release`) and may `require` those of others. A service is a narrow function with a
  schema, not access to another module's state. If two modules offer the same service name, the story
  picks which one is loaded.
- **Events** are the loose coupling: a module can listen to events of others ("resident exiled") without
  requiring them. Rule of thumb: services for commands, events for notifications.
- **Event bus overhead.** Three costs. *Runtime:* a few thousand events per run, negligible next to
  model calls; dispatch is synchronous in a fixed order so runs stay reproducible. *Traceability:* a
  chain (A emits, B and C react) is no longer in one place in the code, so every event carries
  `causedBy` and `swt run trace <event>` prints the chain; the event log is the debugging tool.
  *Writing effort:* each event needs a Typebox schema and a declaration in its module; in return
  we get checked types, replay and facts. Keep the bus small: anything that needs an answer
  ("what does this cost?") is a service call, events only announce what has happened.
- **Facts.** A module may publish *facts*: pure functions over the event log and its own state that
  the gamemaker's situation report and the `watch` role (§3g) can read, for example "who blocks which
  door since when". They never change state, so a replay computes them again from the events.

### Writing a plugin, and using one

`defineModule` is written **once per mechanic**, in the plugin package (`plugins/marks/`). A story
only loads finished modules and passes their options; it needs no new code.

| Role | Does |
|---|---|
| Module author | `defineModule` once: options schema, state, events, tools, hooks, pipeline stages, default prompts |
| Story author | picks modules, sets options, overrides single prompts, writes levels and rules |

cityofkeys is a list of modules; Whispers is the same list plus `forgery`. Only someone inventing a
new mechanic writes a module. Workflow: `swt module new <name>` scaffolds `plugins/<name>/`
(`package.json` with `@swarmtales/sdk` as peer dependency, `src/index.ts`, `prompts/`, a test); test
with `testkit` (scripted run, no model) plus a snapshot round-trip test; use it with
`defineStory({ modules: [marks(), forgery({ marksPerForgery: 2 })] })`; third-party plugins load by
path or npm package (`swt run start --plugin ./my-plugin`) and later run in the sandbox (§3b).

```ts
const forgery = defineModule({
  id: "forgery",
  options: Type.Object({ marksPerForgery: Type.Number() }),    // O
  state: (opts) => ({ forged: new Map<string, number>() }),     // S; opts: Static<O>
  events: { receipt_forged: ReceiptForged },
  tools: [
    defineTool({
      name: "forgeReceipt",
      parameters: Type.Object({ to: Type.String(), n: Type.Number() }),
      execute(params, ctx) {
        ctx.options.marksPerForgery;  // number, from O
        ctx.state.forged;             // Map<string, number>, from S
        ctx.emit("receipt_forged", { ... });  // only declared events, typed payload
      },
    }),
  ],
  prompts: "./prompts",
});
```

**Typing.** `defineModule` is generic and derives everything from the options schema (`Static<O>`):

- options and state reach tools and hooks with their exact types; a tool reading an option that does
  not exist is a compile error
- `emit` accepts only events the module declared, with the payload of their schema
- `forgery({ marksPerForgery: 2 })` checks the options against the schema; the tool names of the
  loaded modules form the set of names allowed in `unlockTools` and in the pipeline config (§3d)
- the same schemas validate the values at load time, YAML included (via the JSON Schema), so a wrong
  option fails at start, not in the middle of a run

## 3h. Worked example: `standoff-tribunal`

The tribunal that Whispers v3 uses (the gamemaker calls it, the code only checks, counts and
carries out) as a module. Flo's rules map onto options and branches:

```ts
export const standoffTribunal = defineModule({
  id: "standoff-tribunal",
  requires: ["exile", "fragments"],
  options: Type.Object({
    calledBy:       Type.Union([Type.Literal("gamemaker"), Type.Literal("code")]),
    minOpenMinutes: Type.Number({ default: 3 }),   // a door open this long
    graceMinutes:   Type.Number({ default: 2 }),   // time for the blocker to fix it
    vote:           Type.Union([Type.Literal("yes-no"), Type.Literal("unanimous")]),
    splitRepeats:   Type.Number({ default: 3 }),   // when the vote is split
    onNoBlocker:    Type.Literal("random-permaDeath"),
  }),
  facts:    [blockers],                    // door open long enough, someone waits, X is past it
  tools:    [callTribunal, permaDeath, drawLot, vote],
  state:    () => ({ open: undefined, votes: [], rounds: 0 }),
  events:   { tribunal_called, vote_cast, tribunal_resolved },
  pipeline: { callTribunal: { limit: { minGapMinutes: 3 } } },
  hooks:    { onMinute: checkGraceAndVotes },
  prompts:  "./prompts",                   // the announcement states the full procedure
});
```

- One blocker: yes/no vote; several: `drawLot`; split vote: repeated `splitRepeats` times; otherwise
  `permaDeath` on a random resident. `drawLot` draws with the run's seed in code; the model never rolls.
- `calledBy: "gamemaker"` gives the gamemaker the tools and the code only validates; in City of Keys the
  same module runs with `"code"` and today's rules.
- `blockers` is a replaceable fact: another story can define "blocks" differently and keep the rest.
- After a ban, `exile.ban` and `fragments.release` (services) do their part; the tribunal touches no
  other module's state.

## 3a. Story format: one schema, TS or YAML

A story is already pure data (`000-run.json` holds `JSON.stringify(story)`, and a test checks the
round trip). The cut:

- **The canonical format is data**, described by a Typebox schema in `contracts`; every module adds
  the schema of its options. `pnpm build:schema` writes `story.schema.json`.
- **YAML (or JSON) stories** declare `# yaml-language-server: $schema=...` and get content assist,
  hover docs and validation in VS Code from the standard YAML extension, with no tool of our own.
- **The TS builder stays** for stories that compute (loops over levels, shared constants) and keeps
  compile-time tool names; it emits the same data.
- **A VS Code extension later** for what JSON Schema cannot do: cross-references (level exists,
  prompt key exists, tool's module is loaded), go-to-definition into `library/prompts/`, a preview of
  rendered prompts. It is a thin language server over `pnpm validate`.
- **Small logic as expressions**: conditions and formulas (`penalty = 2 * offences`,
  `atDoor >= 3`) in a small expression language (CEL or JSONLogic, to be chosen), evaluated by the
  engine. This covers most custom rules without a plugin.

CLAUDE.md's "never YAML" rule changes to "TS or YAML, both against the story schema" in the PR that
ships YAML loading.

## 3b. Plugin sandbox

Full expressiveness means new mechanics too. A third-party module is TypeScript against the `sdk`,
bundled with esbuild and run in a sandbox; first-party modules run in-process.

- Requirements: no network, filesystem, clock or randomness except through host functions (seeded
  rng, virtual minute); hard time and memory limits per call; deterministic for snapshots and resume.
- Candidates: QuickJS in WASM (quickjs-emscripten; strong isolation, built-in limits, deterministic
  by default, slower, which does not matter next to model calls), isolated-vm (V8 isolates, fast,
  native addon, same process), Deno subprocess with permissions. Not `node:vm` (no security
  boundary). Decide by a short spike that runs one real module (marks) in each.
- The host API a sandboxed module sees is exactly the module context of §3, serialised; that is why
  the design rule above matters from step 4 on.

## 3c. The CLI: `swt`

One binary, `swarmtales`, with the short name `swt` (`st` is taken by suckless's terminal). Noun
first, verb second; every command has `--help`, and `--json` for machine-readable output. It replaces
the `pnpm start` / `report:*` / `digest` / `novel` / `lab` scripts (they stay as thin aliases during
the move).

| Noun | Verbs |
|---|---|
| `swt story` | `list`, `show <name>` (acts, levels, modules, tools), `validate [name]`, `new <name>` (scaffold), `schema` (writes `story.schema.json`) |
| `swt run` | `start <story> [--agents --cast --figure-direction --gm-direction --budget --watch 1m ...]`, `resume <snapshot>`, `list`, `show <run>` (result, cost, stop reason), `cost <run>`, `watch <run>`, `stop <run>` (§3g) |
| `swt report` | `run <run>` (REPORT.md), `minutes <run>`, `private <run>` |
| `swt digest` | `build <run>`, `chronicle <run>` |
| `swt novel` | `write <run>`, `translate <novel> --to de` |
| `swt prompt` | `list`, `show <key>` (which file wins: story, plugin or library), `render <key> --vars <file>`, `check` |
| `swt archetype` | `list`, `show <name>` |
| `swt module` | `list`, `show <id>` (options schema, tools, events) |
| `swt lab` | `run`, `orders`, `judge` |
| `swt doctor` | checks node version, keys present (never printed), providers reachable |
| `swt completion` | `bash`, `zsh`, `fish` |

**Terminal UI (Flo, 2026-10-30): Ink.** Live views such as `swt run watch --tui` (§3g) are drawn with
Ink (React in the terminal, plain TypeScript, Flexbox layout). OpenTUI was checked and rejected: it
targets Bun, has a native Zig core (prebuilt per platform, but still native), and its maturity is
unclear. The dashboard only reads the run's event log. The TUI starts only on a real terminal; when
output is piped or in CI the same commands print plain lines (`--json` for machines).

Each noun is a small command module in `apps/cli/src/commands/`; options are parsed with Typebox,
like every other untrusted input. Library: commander with extra typings, or citty; decided when
building.

## 3d. Tool guards (preHook) and the tool pipeline

Some limits are soft and hard to program: "no secrets on the board", "no threats". Today each one is
code (word lists in `src/gamemaker/privacy.ts`, the memo's digit-run refusal). A **guard** puts the
rule into the story data instead: a text rule per tool, checked by a small model before the call runs.

```ts
tools: {
  postBoard: { guard: { rule: "No password fragments, seams or parts of a password.", on: "block" } },
  postGroup: { guard: { rule: "No password fragments, seams or parts of a password.", on: "block" } },
}
```

- `on` is what happens when the rule is broken: `block` (refused with the judge's one-line reason,
  nothing is posted), `rewrite` (the offending part blacked out), `charge` (passes for one mark),
  `flag` (passes; the gamemaker and the report are told).
- Two tiers: limits a program can check (length, digit runs, prices) stay in the expression language
  (§3a) without a model; only soft rules go to the guard model (Haiku via Anthropic by default).
- Every verdict is an event (`guard_verdict`: tool, agent, rule, verdict, reason), so the reporter
  can count blocks and the lab can replay them.
- Each rule gets a small case set in `lab/` (should pass / should block) before a live run, because
  false positives are the known risk (P38).
- Agents will try to slip past a guard (split a fragment, spell it out, encode it). That is story
  material; the report lists attempts as loophole candidates.
- Cost: one short model call per guarded call; only guarded tools pay it.

**One tool pipeline (Flo, 2026-10-30).** Guards, rate limits and costs are not separate mechanisms but
stages of one fixed chain every tool call runs through:

| Stage | What | Who owns it |
|---|---|---|
| 1. `lock` | is the tool open to this resident now | engine |
| 2. `limit` | hard limits, e.g. 8 DMs per resident between two door openings, text length | referee; a story can tighten, never lift |
| 3. `afford` | can the caller pay (marks, points)? nothing is charged yet | cost modules (marks, ...) |
| 4. `rule` | program-checkable rules as expressions (§3a), no model | story |
| 5. `guard` | soft text rule checked by the guard model (above) | story |
| 6. `execute` | the tool itself | tool |
| 7. `settle` | charge the cost, only when `execute` succeeded; a `charge` verdict adds its mark here | cost modules |
| 8. `after` | events, notices, labels for the gamemaker | modules |

- Built (wave 2a) with one more stage, `parse` (the arguments against the schema), between `lock`
  and `limit`; `"door"` windows are `{ resetOn: "<event type>" }`, so the core needs no door.
- Declared per tool in the story data: `sendDM: { limit: { max: 8, per: "door" }, guard: { ... } }`.
- Cheap stages first: a call that hits a limit never costs a model call, and a refused or failed
  call never costs a mark (Flo: charge only once executed).
- Every refusal is one event `tool_refused` (stage, tool, agent, reason) with a fixed reply text from
  `library/prompts/replies/`, so the reporter and the lab can count refusals per stage.
- Modules plug into the stages through the same API as everything else (§3), so marks is a
  cost module, not code in `World`.

**First use, decided by Flo 2026-10-30 (P61):** in Whispers, guard group and board posts with
`block` against fragments and password parts; group, board and DMs all stay free. Fragments can then
travel only by DM, which makes private messages matter and gives the whisperer real DMs to forge.
Built for Whispers v2 (SPEC 20: `guards`, `guard_verdict`, `GUARD_BLOCKED`, fail open); only `block`
so far.

## 3e. More seams (Flo asked for further modularisation, 2026-10-30)

Found by reading structure (file sizes, imports, what `compose.ts` wires), not every line. Ordered by
value; the marked ones are my recommendation for the first migration steps.

| # | Seam | Today | Target |
|---|---|---|---|
| 1 ★ | **One abstraction for model roles** | gamemaker, judge, classifier, souffleur, weaver, reporter and novelist each have their own file with the same pattern: build prompt, call model, parse the answer with Typebox, fall back | `defineRole({ prompt, output, model, fallback })`; a new role (the whisperer) is configuration, not a new file |
| 2 ★ | **Composition root out of the CLI** | `cli/compose.ts` (620 lines) wires everything | `createRun(config)` in the engine package; CLI and tests call the same function; the config is stored in the run folder for reproducibility |
| 3 | **One config file instead of many flags** | flags in `cli/args.ts`, models in `agents/models.ts` | `swt.config.ts` or `.yaml` with profiles (models per role, budget, dials); flags override single values; Typebox schema |
| 4 ★ | **Snapshot slice per module** | `snapshot/snapshot.ts` (532 lines) knows almost every part | each module carries its slice with schema, version and migration; old snapshots (`snapshot-L7.json`) migrate on load |
| 5 | **Read and write split in `World`** | tools and roles hold the whole `World` | read-only `WorldView` for tools and roles; changes are commands the engine applies (through the tool pipeline, §3d), so every change leaves an event |
| 6 ★ | **Dials as data** (must survive the rewrite, Flo 2026-10-30) | `engine/direction.ts` and the gamemaker prompt branch on levels 0/4/6/8/10 | profile files in `library/` (which prompt sections, which powers); see "The two direction dials" below |
| 7 | **`RunStore` interface** | `log/`, `digest/`, `report/`, `novel/` write files directly | one storage interface (filesystem now); tests run in memory |
| 8 ★ | **Module conformance tests** in `testkit` | none | same seed gives same events, snapshot round trip, no forbidden imports, every option documented; a module that fails is not loaded |

To check before recommending: whether `report/facts.ts` and `digest/facts.ts` hold duplicated logic,
and whether versioned event schemas per module (instead of the one union in `engine/events.ts`,
781 lines) are easier to maintain. Event sourcing (rebuild state from `events.jsonl`) would be the big
step behind both and is its own topic.

### The two direction dials (requirement)

`--figure-direction` and `--gm-direction` (0-10, defined levels 0/4/6/8/10, other values round down,
default 4, so f10g10 is the full-direction run) stay as they are and must behave identically after the
rewrite:

- The CLI flags and the `swt.config` keys keep their names; `swt run start --figure-direction 10
  --gm-direction 10` is the same run as today.
- The figure dial is a profile in `library/dials/figure/` (which prompt sections, how often the full
  figure text repeats, whether orders and a duty are added); the gm dial is a profile in
  `library/dials/gm/` (notes only, figure language, tendencies and rivals, scene orders). Levels are
  data, not `if` chains. Which tools and staging power the gm dial opens (§5) is declared in the same
  profile.
- Both dials are written into the run's stored config and shown in `swt run show`, so a run can always
  be reproduced.
- The golden-run test runs at f4g4 (today's default) and at f10g10; both must match the stored events.

## 3i. News from Whispers v3 and runs 003-007 (2026-10-30)

What the Whispers thread built or learned after the first paper, and where it lands in the target layout.

| News | Where it lands |
|---|---|
| **GM-called tribunal, `permaDeath`, seeded `drawLot`** (PR #75) | exactly the `standoff-tribunal` plugin of §3h; the rewrite takes this code as the reference, not a new design |
| **The whisperer is a directed figure** under `--figure-direction` (PR #79): rumour duty, the GM pushes it privately | a *role module* (`whisperer`) that reads the figure dial profile (§3e item 6); the duty text is a prompt file in `library/`, the dial level decides whether it is added |
| **Prompt addenda per resident** (`--prompt-addendum <ID>=<file>`, e.g. the grudge rule `stories/whispers/addenda/grudge.md` for A01-A05, not the whisperer) | stays a first-class feature: addenda are files in `library/addenda/` or the story folder, attached per resident in the run config (`residents.<id>.addenda`); the lab uses the same mechanism |
| **Grudge ("forgiveness") rule** works on Haiku and exposed the whisperer in run 006 (P72: honest errors are punished too; run 007 sharpens it with "ask first, shun only after a stand-off") | rule text lives only as a prompt file; if it moves into the f10 direction it becomes a section of the figure dial profile, not code |
| **Model per resident** (idea: Haiku against DeepSeek for the same story) | run config gets `models.residents` as a default plus per-resident overrides, same schema as `models.roles`; needs no engine change once the providers are behind `packages/models` |
| **Temperature and other model parameters** are not passed to Haiku today | one `params` object per model entry in `swt.config` (temperature, max tokens, thinking level); the provider adapter decides what it supports |
| **`world.ts` grew again** (now 3196 lines, the paper measured 2705 earlier) | confirms the carve-out is worth it; the size ratchet (§3f) must be re-measured when the rewrite starts |
| **LESSONS-LEARNED.md replaced LOOPHOLES.md** (design checklist and `P`/`LH` rows) | stays in `docs/`; the module conformance tests (§3e item 8) should cite the checklist lines they guard |

Requirement for the rewrite: runs 005-007 (directed whisperer, grudge addendum) are the second golden
runs next to f4g4 and f10g10 (see "The two direction dials"), so these behaviours cannot be lost.

## 3f. Size limit per file

A hard cap on lines per code file, tests excluded, enforced by lint so it cannot drift.

- Decided by Flo 2026-10-30: **400 lines** per file (`max-lines` in `eslint.config.js`, blank lines and comments not
  counted). Applies to `packages/*`, `plugins/*`, `apps/*` and `stories/*`; `test/` and generated
  files (`prompt-keys.ts`, `story.schema.json`) are exempt.
- Today 18 of 152 code files are over 400 and 7 are over 600 (`engine/world.ts` 2705,
  `story/validate.ts` 1324, `story/types.ts` 1159, `engine/tribunal.ts` 943, `engine/events.ts` 781,
  `cityofkeys/story.ts` 673, `cli/compose.ts` 620). They get a **ratchet**: the lint config lists each
  with its current size as its own limit, which may only shrink; the migration steps remove the
  entries as the files are split.
- The cap also forces the cuts of §3: `World` into modules, prose out of `story.ts` into `texts/`,
  prompts out of code.
- Second rule: functions over 60 lines warn; `sonarjs/cognitive-complexity` (limit 15) is an error (§7).

## 3g. Run watch: a cron for the run's developer

Flo, 2026-10-30: the person who starts a run wants, say once per minute, a summary of how it goes,
possibly with the recommendation to abort. This is for the **operator**, not for the game: residents
and the gamemaker never see it, and it changes nothing in the story.

**Two parts.**

1. **A scheduler in the kernel.** `every("1m", job)` and `at(minute, job)`, with two clocks: the
   *virtual* minute (a round; deterministic, the job and its output are events, so a replay needs no
   model) and the *wall clock* (for operations: heartbeat, timeout, budget burn per real minute).
   The watch uses the virtual minute by default. The script (§5) and modules use the same scheduler
   instead of each keeping their own timers.
2. **The `watch` role.** Facts are computed in code first, as the run reporter does today
   (`report/facts.ts`), then a cheap model (Haiku via Anthropic) writes the summary and a verdict:

```
minute 23 | 6/6 alive | doors: 4 4 5 5 6 6 | 0.41 USD (+0.03/min) | 2 refusals | gamemaker: 3 actions
Wall at door 5 for 8 minutes; Mercer and Harrow have exchanged 14 DMs without a transfer (#812-#869).
Verdict: CONTINUE. (stop if no door moves by minute 31)
```

   Verdict is `continue`, `watch` or `stop`, with the reason and `#seq` evidence like the report.

**Stop signals computed in code** (the model only phrases them): no door moves for N minutes
(P43, P53), cost rate above the estimate or budget share used (P47), gamemaker turns ended at the
token cap (P52), refusals or `tool_refused` spikes per stage (§3d), errors from a provider, everyone
finished.

**Delivery** is a list of sinks in `swt.config` (§3e): terminal (default), a file (`watch.md` and
`watch.jsonl` in the run folder), and later a webhook or push message. Sending outside the machine is
the operator's own configuration, never a default.

**Stopping.** A recommendation never stops the run by itself. `swt run start --watch 1m` prints it;
`--watch-autostop` lets the referee stop the run when the code-computed signals (not the model's
opinion) cross a limit, and writes a snapshot first so the run can resume. `swt run stop <run>` and
`swt run watch <run>` (follow a run started elsewhere by tailing its `events.jsonl`) are the manual
equivalents.

**Cost.** One short model call per interval; the facts block keeps it small. The calls count against
the run budget and appear in `usage`.

## 4. No prompts in code

Every text a model reads lives in a file:

```
library/prompts/
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
- Lookup order: story (`stories/<name>/prompts/`) → plugin → `library/prompts/`. A story can override any prompt; the lab can A/B test a
  prompt variant without touching code; a German competitor prompt becomes a file.
- A test (like today's `code-rules.test.ts`) fails when a string longer than about 120 characters
  or a template literal with prose appears in `packages/*/src`.

Story structure (levels, rules, numbers) stays in the TypeScript DSL as CLAUDE.md demands; only its
prose moves to `texts/`.

## 5. Director → referee, script and gamemaker mode

The director becomes three layers that do not displace each other (Flo, 2026-10-30). The gamemaker
keeps its name; there is no separate "orchestrator".

| Layer | What | Kind | Always on |
|---|---|---|---|
| **Referee** | guards only the hard limits of the game | code, small, no story content | yes, and it always wins |
| **Script** | today's programmed director: courier lines, factor releases, feast, standings bands | module (`plugins/script`), texts in `texts/` | by default; fallback |
| **Gamemaker mode** | the gamemaker stages the story with tools, inside the referee's limits | model role | switched on per act |

**Referee.**

- run limits: max minutes, max budget (USD), max steps per resident per minute
- act limits: an act's `maxMinutes` (today's brake), snapshot points
- tribunal limits: latest minute for the first tribunal, minimum gap, the exile target must be met
  before the act ends (today's forced last tribunal)
- tool limits: rate limits such as 8 DMs per resident between two door openings (§3d)
- invariants: points never negative, nothing given twice, exiled residents cannot act
- every intervention is an event (`referee_*`) with the limit that fired

**Script.** The same rule vocabulary as today, as a plugin a story loads. Deterministic and free;
Act I keeps working byte for byte (tutorial, checkpoint base, golden-run tests). It never fails
silently the way a model can (P52, P40), so it is also the fallback.

**Gamemaker mode.** The gamemaker gets staging tools (`post`, `releaseFactor`, `scheduleEvent`,
`scheduleTribunal`) and decides what happens when. The story switches it per act:
`staging: "script" | "gamemaker" | "both"`, in step with `--gm-direction`. Rules:

- every decision is an event; a replay uses the logged decisions and asks no model again
- if it calls nothing within a window, the script acts (no standstill as in P52)
- its tools run through the same tool pipeline as the residents' (§3d), so the referee can refuse
- it is an ordinary role (`defineRole`, §3e), not a special case in the core
- this matches the 2026-10-29 idea: Act I stays programmed, later acts are staged by the gamemaker
- first use: Whispers v3 (2026-10-30), where the gamemaker calls the tribunal and `permaDeath` with tools and the code only checks, counts and carries out; `drawLot` is the pattern for randomness (the code draws with the seed, the model never rolls); the blocker detection is a fact (§3, services and facts)

**Helpers of the gamemaker.** The city already has voices that run today (README, "The voices behind
the curtain"); they are the gamemaker's team and need no new inventions:

| Role | Does | Triggered today by |
|---|---|---|
| Confessor (classifier) | reads every word and thought, labels promise, threat, lie and so on, tells only the gamemaker | the engine, every round |
| Judge | decides "the message never reached me" claims; a reason for the board and a word for the gamemaker; temperament fair, partial, capricious | the engine, on `blame` |
| Souffleur | repeats a scene in plainer words after a safeguard refusal | the engine, on a refusal |
| Weaver (opt-in) | patches a figure's character over a run | the engine, per minute |
| Chronicler, Novelist | find the plot and write the prose after the run | the CLI |
| Privacy guard, tool guards | block secrets in notes and posts | the pipeline (§3d) |

All become `defineRole` roles (§3e). Later the gamemaker may also **call** them on demand through
`delegate(role, task)`, for example to ask the judge to check a claim or the confessor about one
figure. Limits for that: a fixed roster declared by the story (the gamemaker invents no roles), depth 1
(helpers start no helpers), referee limits on calls per minute and USD per act, asynchronous answers
(the minute does not wait; the answer is in the next report or arrives with a timeout), every task and
answer a logged event, and the privacy check in front: a helper sees only what it is handed, and
residents' texts are data to it, never instructions. Start with one helper where the benefit is clear;
cost grows fast (a 12-figure run already cost 6 USD).

**Order.** Referee and script come first and change no behaviour (step 5). Gamemaker mode and
`delegate` are a story and mechanic decision with their own brainstorm afterwards.

## 6. Migration plan

Decision (Flo, 2026-10-30): no step-by-step migration. Everything is written in one pass once Flo
says go, ideally on one branch, with builder and challenger agents per area. The steps below are the
order of work inside that pass, not separate releases; the golden-run test (scripted run on the
cityofkeys story, events compared to a stored file) is the gate for the whole pass and proves
behaviour did not change.

Status (2026-10-31): steps 1 and 3 are built in a coarse form (wave 1). The import cycles inside `src/`
are gone (a `contracts` layer holds ids, tool names, the turn contract and the judge, guard and
souffleur interfaces), and the repo is a pnpm workspace with the packages `contracts`, `kernel`,
`prompts`, `engine`, `sdk`, `models`, `roles`, `chronicle`, `novelist` and `apps/cli` (`swt`), a
tsdown build, the `development` export condition, `pnpm check:packages` and knip. See
`docs/ARCHITECTURE.md` §2 for the map and for what still differs from §2 above (tools and game rules
live in `engine` until `World` is carved up; `roles` and `chronicle` read event types from `engine`).

Status (2026-10-31, wave 2a): the new core of step 4 is built as a tested skeleton next to the old
engine (`packages/kernel/src/host/`, `packages/contracts/src/core/`, `packages/testkit/`), proven by
an empty story and a `channels` + `ledger` story; nothing is carved out of `World` yet and the golden
runs are unchanged. Open issues for the carving are listed in
[`docs/design/mechanic-api.md`](../design/mechanic-api.md) §8.

Status (2026-10-31, wave 2b): the gaps that blocked carving are closed (turn policy with passes,
blocks and activation by news; names for ids; a `consult` stage for tools that wait for a model;
guard secrets; staged script calls; gamemaker tools by role; input kinds; `ContextOf`), a legacy
event adapter writes the golden logs byte for byte from envelopes, and old snapshots convert into
version-0 slices and back. What each mechanic takes from `world.ts`, and in which order, is
[`docs/design/carve-plan.md`](../design/carve-plan.md).

| Step | What | Risk |
|---|---|---|
| 0 | Whispers lands first (another thread is building it in `engine/`, `tools/`, `world.ts`) | none, waiting |
| 1 | Golden-run test + break the import cycles inside `src/` (contracts folder, interfaces instead of classes) | low |
| 2 | Prompts to files + loader + codegen + validate check | medium (long diff, no logic change) |
| 3 | Workspace skeleton, `git mv` folders into packages, `apps/cli` with `swt` (§3c), tsdown build and `development` export condition (§7a) | low, mechanical |
| 4 | Module host; carve `World` into modules (marks, receipts, seal, standoff, tribunal, ...) | high, builder + challenger per module |
| 5 | Director → referee + script module | medium |
| 6 | Story schema export, YAML loader, expression language | medium |
| 7 | Plugin sandbox spike, then sandboxed third-party modules | medium, new dependency |
| 8 | VS Code extension (language server over `pnpm validate`) | low, optional |
| 9 | First publish to npm (scope, licence, provenance, first release) | irreversible, needs Flo's go |

Snapshot compatibility: `examples/cityofkeys-act1-06a-04/snapshot-L7.json` must keep loading. Step 4
adds a snapshot version and a migration from today's flat shape.

## 7. Tooling

- pnpm workspaces, `tsc -b` with project references, one shared `tsconfig.base.json`
- ESLint flat config with an import-boundary rule (`eslint-plugin-boundaries` or
  dependency-cruiser) for the dependency rule in §2
- Vitest workspace, tests next to their package; `testkit` for shared fakes
- `pnpm check` keeps its meaning across the workspace
- `max-lines` 400 (blank lines and comments not counted) with a per-file ratchet list (§3f);
  `max-lines-per-function` 60 as warning; `sonarjs/cognitive-complexity` 15 as error
- **No native dependencies in published packages** (Flo, 2026-10-30): a script in `pnpm check` reads
  the `package.json` files and fails if a runtime dependency needs a native addon or a compiler. Then
  `npm install swarmtales` works on every platform without a toolchain, and only the Node version
  needs a test matrix. Dev tools such as esbuild and tsdown are exempt (they never ship).
- `knip` in `pnpm check`: unused files, exports and dependencies; catches leftovers of every move
- Build, versioning and release: see §7a
- Optional later: Turborepo only if `check` gets slow

## 7a. Publishing to npm

Decided by Flo 2026-10-30: the packages go to npm. That makes the build step real from the start.

- **Build with `tsdown`** per package: ESM output plus `.d.ts`, driven by one shared config. The
  `swt` CLI is bundled as a single executable entry (`bin`). Check the current tsdown release and its
  declaration output on our Typebox-heavy types in a spike before step 3.
- **Dev without building:** each package's `exports` has a `development` condition that points at
  `src/index.ts`, and the default condition points at `dist/`. tsx, Vitest and the editor resolve
  the sources; consumers get the build. `tsc --noEmit` still type-checks everything.
- **What is published:** `@swarmtales/{contracts,kernel,engine,sdk,prompts,models,roles,chronicle,
  novelist,testkit}`, first-party plugins as `@swarmtales/plugin-<name>`, and the CLI as
  `swarmtales` (bin `swarmtales` and `swt`). `library/` ships inside `@swarmtales/prompts` and the
  archetypes package so prompts and archetypes resolve from `node_modules`; stories and `examples/`
  are not published. A story is a user project that depends on the packages.
- **Versioning:** Changesets, one changelog per package; `0.x` while the module API settles, `1.0`
  once `contracts` and `sdk` are stable. Internal dependencies use `workspace:*`, rewritten on publish.
- **Release:** `pnpm release` runs `pnpm check`, builds, then publishes with npm provenance. GitHub
  Actions is disabled today, so the first releases are run locally by a person with the npm token;
  the token never goes into the repo or a chat.
- **Public API is a promise:** each package exports only from its `index.ts`; the size limit and the
  boundary rule (§2) keep the rest private. `knip` and an API report (api-extractor or a snapshot of
  the `.d.ts`) make accidental API changes visible in review.
- **Before the first publish (needs Flo, cannot be undone):** the npm scope `@swarmtales` and the
  name `swarmtales` must be free and owned, and the licence is settled (2026-11-01: Sustainable Use License plus additional terms; Apache 2.0 for contracts and sdk; BSL was
  discussed, no decision). A published version cannot be unpublished in practice.

## 8. Open questions for Flo

1. ~~Backend and UI?~~ Decided 2026-10-30: no web UI; CLI is the app. Story data format, YAML,
   expressions and the plugin sandbox stay in scope.
2. ~~Staging?~~ Decided 2026-10-30: referee, script and gamemaker mode as three layers (§5); script first, gamemaker mode and `delegate` later with their own brainstorm.
3. **"No prompts":** do tool descriptions, error replies to models and story prose count? I count all
   three.
4. ~~Publish to npm?~~ Decided 2026-10-30: yes (§7a). Open: is the scope `@swarmtales` free, (the licence is decided, see `LICENSE`).
5. ~~Story format?~~ Decided 2026-10-30: one schema, TS builder and YAML (§3a).
8. **Expression language:** CEL (typed, Google) or JSONLogic (plain JSON, simpler)?
6. **Timing:** start with steps 1-3 right after Whispers is merged, or wait until the first Whispers
   run is done?
7. **Names:** `kernel`, `roles`, `chronicle`, `referee` fine, or other names?
9. **Guards (§3d):** does a blocked post cost anything (a mark, or a strike)? Does the guard also
   block a seam or a chain written in words? Are the city's own notices exempt (yes, I assume)?
10. ~~Size limit?~~ Decided 2026-10-30: 400 lines per code file, tests excluded, ratchet for the 18 files over it (§3f).
11. **Run watch (§3g):** virtual minute by default, wall clock only for operations: right? May `--watch-autostop` stop a run on code-computed signals, or only ever recommend? Which sinks besides terminal and file?
