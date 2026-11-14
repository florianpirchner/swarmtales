# 08 M1 specification: the skeleton

Status: **specification for milestone M1 ("Skeleton")**, written 2026-11-14. Builders code against this file.
Precedence: [`BRIEF.md`](BRIEF.md), then [`DECISIONS.md`](DECISIONS.md), then [`REWRITE.md`](REWRITE.md), then this
file, then papers 01 to 05. Where this file decides something the papers left open, the line is marked
**Decided here** with a one-line reason; section 11 lists them all. A change of an interface in sections 2 to 6
after its issue is merged needs an issue with the label `interface-change`.

How to read the references: an "old" path is a path at the tag `v0-final` (today's `main`). "Carried" means copied
with at most import changes; carried lines do not count against the 400-line issue rule. "Ported" means the same
design rewritten against the new contracts. A "code line" is a non-blank, non-comment line of a `.ts` file under
`src/`, tests excluded (D13).

M1 is done when: tic-tac-toe teams matches its seven oracle files at level 3 (sections 7 and 8.2); `swt log verify` passes on a run; the carried viewer opens
that run; the kernel has at most 1500 code lines (M1 gate: 1380, see 1.3) and the engine total at most 4100.

This file was challenged on 2026-11-14; the findings and what was changed are in the "Challenge log" at the end.
The oracle format and the layer table of the scaffold were aligned in a second pass the same day (challenge log,
rows 25 to 29). Marks that still wait for another paper are in section 12.

## 1. Packages, layers, budgets

### 1.1 Packages of M1

| Package | Path | Purpose | Status |
|---|---|---|---|
| `@swarmtales/contracts` | `packages/contracts` | types and Typebox schemas only: envelope, actors, tools, services, events, plugin shape, ports, `KernelDefinition`, `GameDefinition`, `RunManifest`, `SwtError` | new |
| `@swarmtales/chain` | `packages/chain` | pure verifier of the signed log; gains the genesis of version 2 | carried, 60 new lines |
| `@swarmtales/kernel` | `packages/kernel` | the single-writer state machine (section 3) | ported |
| `@swarmtales/sdk` | `packages/sdk` | authoring (`defineMechanic`, `defineGame`), game resolution, the `roster` plugin | ported and new |
| `@swarmtales/prompts` | `packages/prompts` | prompt file loader and lookup | carried |
| `@swarmtales/engine` | `packages/engine` | folder `turns/` (the turn scheduler) and folder `run/` (the manifest builder); the home of the folders for Directors, decisions and the Human Hand at M3 | ported and new |
| `@swarmtales/runlog` | `packages/runlog` | run folder, JSONL sink, chain writer, run verification | chain writer carried, rest new |
| `@swarmtales/testkit` | `packages/testkit` | scripted and fake drivers, `play`, fixture mechanic, conformance, oracle runner | ported and new |
| `@swarmtales/viewer-core`, `@swarmtales/viewer-ui` | `packages/viewer-*` | viewer libraries; one new reader for envelopes | carried |
| `swarmtales` | `packages/swarmtales` | umbrella: re-exports only (`.`, `./mechanic`, `./testing`), no logic | new, about 15 lines |
| `@swarmtales/mechanic-contracts` | `mechanics/contracts` | the two service contracts with two providers today: `consensus-source`, `brain-source` | carried |
| five mechanics | `mechanics/grid-game`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee` | tic-tac-toe teams as it is | carried with renames (section 8) |
| game | `games/tictactoe-teams`, `games/hello` | the ported game and sample 1 | ported, new |
| apps | `apps/cli`, `apps/viewer-web` | `swt`, the viewer page | new slice, carried |

**The count against E6 (corrected in the challenge).** A library package is a package under `packages/` that
holds code. M1 has ten: `contracts`, `chain`, `kernel`, `sdk`, `prompts`, `engine`, `runlog`, `testkit`,
`viewer-core`, `viewer-ui`. Not counted: the umbrella `swarmtales` (re-exports only, required from M1 by
DECISIONS 04 #1), the apps, and the plugin-side package `mechanics/contracts` (D8). M2 adds `models` and `lab`,
which makes twelve: the ceiling is reached at M2 with no slack, so **no M1 issue may add a package**, and a
thirteenth before three games run means merging one first (`engine` into `sdk` is the candidate: `turns` imports
contracts only). `turns` and `run` are folders of one package (01 #14). There is no `schedulers` package, no
`std-contracts` and no `capabilities` package.

**Decided here:** the registered game uses five mechanics, so "tic-tac-toe as it is" ports all five, not only
`grid-game`. Reason: the oracle is exported from the registered game `tictactoe-teams` (old `stories/tictactoe-teams/story.ts`),
and a port that drops four mechanics would change the game (D2).

**Decided here:** games live under `games/<id>/`, not `stories/`. Reason: the word is Game (REWRITE 3.1) and the
folder is new anyway.

### 1.2 Layer table (input of the layer check)

Each `package.json` declares `"swarmtales": { "layer": "L<n>" }`. A package may import only what its row allows;
the check runs on declared dependencies and on actual imports. **This table is final for M1.** The scaffold holds
it as `scripts/layers/table.ts` (`PACKAGE_RULES`, `FOLDER_RULES`); where the two differ, the list below the table
says which side changes.

| Layer | Package (folder) | May import: workspace | May import: third party and Node | Forbidden globals |
|---|---|---|---|---|
| L0 | `contracts` | none | `typebox` | `process`, `Buffer` |
| L0 | `chain` | none | `@noble/curves`, `@noble/hashes`, `typebox` | `process`, `Buffer` |
| L1 | `kernel` | `contracts` | `typebox` | `process`, `Date`, `Math.random`, `fetch`, `setTimeout`, `setImmediate` |
| L2 | `sdk` | `contracts`, `chain` (for `jsonHash`) | `typebox` | those of L1 |
| L2 | `prompts` | `contracts` | `node:fs`, `node:path`, `node:url` | |
| L3 | `mechanics/contracts` | `contracts`, `sdk` | `typebox` | those of L1 |
| L3 | every other `mechanics/*` | `contracts`, `sdk`, `mechanic-contracts`; another mechanic only through its `/contract` or `/rules` sub-path | `typebox` | those of L1 |
| L4 | `engine` | `sdk`, `contracts`, `chain`, `kernel` (not used at M1, used from M3) | `typebox` | those of L1 |
| L4 | `runlog` | `contracts`, `chain` | `node:fs`, `node:path`, `node:crypto` | |
| L4 | `testkit` | `engine`, `kernel`, `sdk`, `contracts`, `prompts` | `typebox`, `node:fs` (oracle files only) | |
| L5 | `viewer-core` | `contracts`, `chain` | `typebox` | |
| L5 | `viewer-ui` | `contracts`, `chain`, `viewer-core` | `typebox` | |
| L6 | `packages/swarmtales` (umbrella), `apps/*`, `games/*`, `samples/*` (empty until M6) | anything | anything | none; the only places where mechanics are named |

Rules beside the table:

- Everything not listed in a row is forbidden for it. Test files may import `@swarmtales/testkit` in addition
  and any `node:` module.
- A `/contract` file imports only `typebox`, `contracts` and the sdk's definers (`defineService`, `defineEvents`,
  `defineTool`); a `/rules` file imports only `typebox` and other `/rules` files of its own package.
- No dependency cycle between workspace packages, **without an exemption**.
- The names `std-contracts`, `capabilities`, `schedulers` and `mechanic-shared` may not exist.
- New third-party dependencies: none. `typebox`, `@noble/curves`, `@noble/hashes` and `yaml` (ISC, CLI only) are
  in the old lockfile; they pass the licence gate of M0 before the scaffold issue adds them. A package not named
  here needs the issue of DECISIONS 5.3.
- The manifest field `"swarmtales": { "kind": "mechanic", "class": "base" | "game" }` marks `team-channel` and
  `consensus` as `base`. A base mechanic may not import a game mechanic. The scaffold checks this already, and the
  five mechanics pass it (see below), so it holds from M1 and not only from M3.

**Decided here (challenge), point by point against the scaffold** (branch `rewrite/root`, read at commit `50e9c9a`):

| Point | Needed? | Why | Who changes |
|---|---|---|---|
| One row per package in L4, not one row for the layer | yes | `runlog` must not import `kernel` or `sdk`, `engine` must not import `runlog`, `testkit` must not import `runlog`; one shared row would allow all three | nobody: the scaffold has the rows |
| A `node:` allowlist per package | yes | `kernel`, `sdk`, `engine`, mechanics and the viewer must stay free of Node (browser, determinism); only `prompts`, `runlog` and `testkit` read files | nobody: the scaffold has it |
| The `apps/` folder (`apps/cli`, `apps/viewer-web`) | yes | an app is not a library package and must not count against E6 | nobody |
| `mechanics/contracts` | yes | D8 allows a shared contracts package only for a contract with two providers. Checked in the old code: `consensus-source` is provided by `grid-game` and `morris`, `brain-source` by twelve mechanics. Both qualify; no third contract moves in at M1 | nobody |
| The `endsTurn` entry in the allow list of the kernel word test | yes | `endsTurn` is a field of a tool result that the ported mechanics return and that the log carries (D2, runtime revision 2). It is the single allowed identifier | nobody: `scripts/gates/kernel-words.test.ts` has it |
| A cycle exemption for `grid-game` and `consensus` | **no** | there is no import cycle. `grid-game` imports `consensus/contract`; `consensus` imports only `mechanic-contracts`. The cycle exists only between the services they `use`, and the layer check does not look at services | this file: the exemption of the draft is removed (3.4, section 12) |
| `sdk` may import `chain` | yes | `resolveGame` hashes the game with `jsonHash`; a second hash function would be worse | the scaffold: add `@swarmtales/chain` to the row of `packages/sdk` |
| `engine` may import `chain` | yes | the manifest builder hashes texts and the definition | the scaffold: add `@swarmtales/chain` to the row of `packages/engine` |
| The count of library packages | the umbrella is not counted (1.1) | DECISIONS asks for the umbrella from M1 and for at most twelve library packages; with the umbrella counted, M2 has thirteen | the scaffold: count the rows under `packages/` whose layer is not `L6` |
| `samples/` folder | harmless | empty until M6 | nobody |

### 1.3 Code-line budgets

Limits for every file: 300 code lines (warning at 250), 50 per function, complexity 10; test files 600.
The two hard tests: `packages/kernel/src` at most 1500; **engine total** = `packages/kernel/src` +
`packages/sdk/src` + `packages/engine/src` at most 4100. **Decided here:** the engine total counts all three
`src` trees whole. Reason: one counting function, and nothing can be moved next door inside them.

The plan below was recounted in the challenge against the old code it ports (code lines at `v0-final`, measured
with the counting rule of D13). The first draft planned the kernel at 1360 and left out about 200 lines the old
code needs for the same work (`probe.ts`, the port building in `loader.ts`, the play loop of `host.ts`). The plan
was changed, not the budget: `arguments.ts` moved to the sdk, payload checks moved to the sdk, and everything in
1.4 has no code at M1.

| Package | New file | Ports (old file, old code lines) | Planned |
|---|---|---|---|
| kernel | `log.ts` | `host/log.ts` 125, without the immediate mode | 120 |
| kernel | `slices.ts` | `host/snapshots.ts` 111, without decisions and orders | 80 |
| kernel | `actors.ts` | `host/residents.ts` 89, without the per-plugin bags | 70 |
| kernel | `dispatch.ts` | `host/gateway.ts` 244, without nested overseer calls, `display`, story rules, staging | 170 |
| kernel | `access.ts` | `host/access.ts` 81 and `host/probe.ts` 28 | 95 |
| kernel | `steps.ts` | the step counter of `host/referee.ts` (107) | 25 |
| kernel | `services.ts`, `plugin-port.ts`, `loader.ts` | `host/loader.ts` 220 without `loadOrder` (45, to the sdk) | 55, 60, 75 |
| kernel | `order.ts` | `host/phases.ts` 10, plus `after` | 40 |
| kernel | `clock.ts` | `host/scheduler.ts` 54, without `every` | 45 |
| kernel | `ports.ts` | the half of `host/turns.ts` (160) that is not policy | 120 |
| kernel | `kernel.ts`, `lifecycle.ts` | `host/host.ts` 639, of which about 300 are not overseers, decisions or the human | 165, 120 |
| kernel | `random.ts` (carried), `revision.ts`, `errors.ts`, `index.ts`, `parts.ts` | `random.ts` 56 | 56, 2, 30, 12, 10 |
| **kernel** | | | **1350** (cap 1500, M1 gate 1380) |
| sdk | `mechanic/`: `types.ts` 150, `context-types.ts` 120, `parts.ts` 15, `definers.ts` 40, `define-mechanic.ts` 150, `context.ts` 110, `kit.ts` 190, `hooks.ts` 60, `arguments.ts` 41 (carried) | `host/define.ts` 219, `host/kit.ts` 322, `core/mechanic.ts` 241, `core/context.ts` 128, `host/arguments.ts` 41 (951, of which about 120 are decisions, consults and roles) | 876 |
| sdk | `game/`: `types.ts` 70, `define-game.ts` 60, `validate.ts` 130, `grants.ts` 70, `tool-names.ts` 60, `load-order.ts` 70, `texts.ts` 60, `resolve.ts` 180 | `auto-grants.ts` 48, `name-checks.ts` 90, `names.ts` 55, `replies.ts` 29, `loadOrder` 45, `core/story.ts` 52 (319; the growth is the `SwtError` form of every check) | 700 |
| sdk | `roster/index.ts` 60, `errors.ts` 85, `index.ts` 20 | new | 165 |
| **sdk** | | | **1741** (planning cap 1800) |
| engine | `turns/turns.ts` 170, `turns/inputs.ts` 60, `turns/options.ts` 40 | the policy half of `host/turns.ts` (160) and `core/turns.ts` 21 | 270 |
| engine | `run/manifest.ts` 110, `index.ts` 10 | new | 120 |
| **engine** | | | **390** (planning cap 500) |
| **engine total** | kernel + sdk + engine | old `packages/kernel/src`: 4127 | **3481 of 4100** |
| contracts | `kernel/`: `actor.ts`, `envelope.ts`, `tool.ts`, `service.ts`, `event-def.ts`, `plugin.ts`, `ports.ts`, `kernel-def.ts`, `values.ts` (types, about 330); `schemas.ts` 75, `events.ts` 95, `state.ts` 45, `clock.ts` 15 | `core/*.ts` without overseers, decisions, consults, human: about 750 | 560 |
| contracts | `game/game.ts` 150, `game/prompts.ts` 10, `run/manifest.ts` 110, `error.ts` 80 | `core/story.ts` 52; the rest is new | 350 (review target for contracts: 1000) |
| runlog | `sink.ts` 70, `chain-writer.ts` 117 (carried), `folder.ts` 60, `verify.ts` 90 | `chronicle/src/log/chain.ts` 117 | 337 (review target 400) |
| testkit | `drivers.ts` 80, `play.ts` 90, `fixtures/guess-number.ts` 80, `conformance.ts` 100, `oracle/{read,timeline,run}.ts` 210; `oracle/format.ts` carried (about 130) | `agents.ts` 41, `conformance.ts` 88, `scripts/oracles/format.ts` | 560 new (review target 600) |
| apps/cli | `main.ts` 90, `run.ts` 110, `load-game.ts` 90, `log-verify.ts` 50, `installed.ts` 40 | new slice | 380 (review target 500) |

Three rules that keep the kernel budget honest:

1. **The M1 gate is 1380, not 1500.** The lines to the cap are booked: 1.4 lists what returns at M2 and M3 and
   what each costs in the kernel, 175 lines by today's estimate. Plan plus booking is 1525, which is 25 lines over
   the cap. So a return that does not fit brings its own saving in the same pull request, or it is built outside
   the kernel. This is the largest known risk of the plan; the milestone review of M1 reports the real number.
2. A pull request that raises a kernel file above its plan names the extension point that was missing (01, 2.2).
3. `parts.ts` holds the interfaces between the kernel's files while they are built in parallel (issue 06). The
   assembly issue (25) replaces each by a derived type (`export type Log = ReturnType<typeof createLog>`), so the
   finished kernel pays 10 lines for it, not 90.

The 619 lines between the planned engine total and 4100 are the reserve for M2 and M3 (params, the returns of
1.4, the folders for Directors, decisions and the Human Hand).

### 1.4 Reserved: shape known, no code at M1

Nothing in this table has a user among the five ported mechanics, their carried tests, the fixture mechanic or the
Hello Game (checked by search at `v0-final`), and DECISIONS does not ask for it at M1. It has **no type, no code
and no test** at M1. Each returns through an `interface-change` issue together with its first user.

| Reserved | Returns with | Kernel lines booked |
|---|---|---|
| Staged calls (`port.stage`, actor `script`, the `then` job, "run staged calls" after every step of 3.5) | the `script` mechanic, M3 | 65 |
| Per-plugin actor attributes (`attribute`, `setAttribute`) | the first mechanic that keeps one, M3 | 20 |
| Hook points `activationOpened`, `activationClosed`, `runEnded` | their first user, M3 | 25 |
| Stage handlers `afford`, `settle` (the stage names stay in `STAGES`) | the ledger, M3 | 10 |
| Stage handlers `guard`, `consult` (awaited, the lane held; DECISIONS 01 #4 and #6) | decisions and Directors, M3 | 15 |
| `schedule.every` and job intervals | its first user | 10 |
| `Kernel.stop`, `SchedulerPort.safePoint`, external input | the budget stop at M2, the Human Hand at M3 | 10 |
| `Activation.record`, driver events, `KernelDefinition.records` | the model driver, M2 | 15 |
| Tool limits (`limit` on a tool, limit windows, the game's `tools` policies, `TOOL_LIMIT`) | the first mechanic that declares one; built as sdk code over a stage handler and the plugin's slice | 0 |
| `params` with `{ "$param": name }` references, the game's `texts` overrides, `--set` | experiments, M2 | 0 |
| `ctx.log` for plugins, `kit.on` (listening to kernel events), `kit.kernel` | their first user | 5 |
| `defineDirector` and its types | M3; the shape is paper 04 section 2.3 | 0 |
| Replay (`replay.ts` in the testkit) | the City slice, M3; `tool_called.causedBy` already names the activation | 0 |
| A second way to add a sink (`kernel.subscribe`) | never, unless a user shows up; sinks are passed at creation | 0 |

## 2. Contracts

All of this is `@swarmtales/contracts`. Every exported schema and every property carries a `description` (the
descriptions are left out below where the comment says the same). Folder `src/kernel/` holds what the kernel sees
and is under the word-list test (3.7); folder `src/game/` holds the game format and the manifest and may use game
words. **Decided here:** the word-list test covers `packages/kernel/src` and `packages/contracts/src/kernel` only.
Reason: the game format must say `residents`, `teams` and `roles`. Folder `src/run/` holds the run manifest.

The contracts hold types, schemas and a few pure functions (`actorId`, `kindOf`, `nameOf`, `envelopeLogIssues`,
`formatIssue`, `closest`, the class `SwtError`). They hold no other logic.

### 2.1 Values and actors

Derives from old `packages/contracts/src/core/values.ts`. Changes: `Actor` becomes `ActorId` with an open kind;
`"host"` becomes `"kernel"`; `"gamemaker"` and `overseer:` are gone; `BUILT_IN_NAMES`, `GrantRole`, `PromptKeys`
and `PromptLookup` leave the kernel-facing part: `PromptKeys` moves to the sdk's types, `PromptLookup` to
`packages/contracts/src/game/prompts.ts` (unchanged: `render(owner, id, variables, declared)`), so that `sdk` and
`prompts` both name it without importing each other.

```ts
// values.ts
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type RandomLabel = string | number;
export interface RandomSource {
	next(): number;                          // uniform in [0, 1)
	int(min: number, max: number): number;   // both inclusive
	pick<T>(items: readonly T[]): T;         // throws on an empty list
	shuffle<T>(items: readonly T[]): T[];    // a shuffled copy
}

// actor.ts
/** `<kind>:<name>` with an open kind, or one of the three reserved ids. */
export type ActorId = `${string}:${string}` | "human" | "script" | "kernel";
export const ActorIdSchema = Type.String({ pattern: "^([a-z][a-z0-9-]*:[A-Za-z0-9_.-]+|human|script|kernel)$" });
export interface ActorSpec {
	readonly id: ActorId;
	readonly kind: string;                                       // the part before the colon; a reserved id is its own kind
	readonly grant: string;                                      // the grant name its tools come from; the sdk writes the kind
	readonly shared: Readonly<Record<string, JsonValue>>;        // attributes every plugin may read, written at genesis
}
export function actorId(kind: string, name: string): ActorId;
export function kindOf(id: ActorId): string;
export function nameOf(id: ActorId): string;                   // the part after the colon; the id itself when reserved
```

Kinds in M1: `resident` (written by the sdk only). `director` is reserved for M3. The kernel treats every kind alike.

### 2.2 The log envelope

Derives from old `packages/contracts/src/core/events.ts` (`EventEnvelope`, `EventEnvelopeSchema`). Changes:
`minute` becomes `tick`; `source` is canonical; `basis` and `tool` are new; `actor` is an `ActorId`.

```ts
// envelope.ts
export interface Envelope<T extends string = string, P = unknown> {
	readonly seq: number;                    // from 1, no gaps: the commit order
	readonly tick: number;                   // logical time, from 0
	readonly source: string;                 // "kernel", "driver", or the canonical plugin name "<package>/<id>"
	readonly type: T;                        // bare, unique within its source
	readonly actor: ActorId;                 // who caused the chain this event belongs to
	readonly causedBy?: number;              // the seq this event is a consequence of; always smaller than seq
	readonly basis?: number;                 // the highest seq the actor had seen when it decided; on `activation_opened` and `tool_called` only
	readonly tool?: string;                  // canonical tool name of the call this event was written in
	readonly audience?: readonly string[];   // grant names that may read it; absent: everyone
	readonly payload: P;
}
export const EnvelopeSchema: TObject;      // the fields above; additionalProperties false
/** A line of `events.jsonl`: the envelope plus the sink's wall-clock stamp. The stamp is hashed and never read by a plugin. */
export const StoredEnvelopeSchema: TObject; // EnvelopeSchema & { at: string (ISO 8601) }
/** Structural faults of a parsed log, empty when sound: seq equals the line number, tick never falls, causedBy and basis are smaller than seq. */
export function envelopeLogIssues(lines: readonly unknown[]): readonly { readonly line: number; readonly reason: string }[];
export const LOG_FORMAT = "swarmtales.events";
export const LOG_VERSION = 1;
```

`basis` on `activation_opened` is the log length when the activation's inputs were built. On a `tool_called` of
an activation it is that same number for the first call and, for a later call, the seq of the `tool_result` or
`tool_refused` the driver got for its call before. On a `tool_called` from `kernel.submit` it is what the
submission says, else the log length. `audience` is written only when the emitting plugin declares one for the
type (the old rule: `strategy-brain` and `optimal-referee` mark one event each for `human`).

`tool` is set on `tool_called`, `tool_refused`, `tool_result` and on every event a plugin emits while that call runs
(the frame carries it). **Decided here:** the canonical tool name is an envelope field, the model-facing name is in
the payload as `as`. Reason: a report can group every consequence of a call by one field, without walking `causedBy`.

### 2.3 Kernel events

Derives from `CORE_EVENTS` in the same old file. Source is `"kernel"`. Dropped: every decision, overseer, human,
guard and role event (they return with their plugins at M3). Renamed: `minute_*` to `tick_*`, `turn_started` to
`activation_opened`, `referee_intervened` to `limit_reached`, `resident_suspended` and `resident_resumed` to
`actor_*`, the field `api` to `service`. New: `activation_closed`, `tool_result`.

```ts
// events.ts
export const KERNEL_EVENTS = {
	run_started: Type.Object({ game: Type.String(), seed: Type.Number(), maxTicks: Type.Integer(), actors: Type.Array(Type.String()), plugins: Type.Array(Type.String()) }),
	tick_started: Type.Object({}),
	tick_ended: Type.Object({}),
	job_ran: Type.Object({ owner: Type.String(), job: Type.String() }),
	activation_opened: Type.Object({ actor: Type.String(), inputs: Type.Array(InputNoteSchema), detail: Type.Optional(Type.Record(Type.String(), Type.Unknown())) }),
	activation_closed: Type.Object({ actor: Type.String(), calls: Type.Integer(), outcome: Type.Union([Type.Literal("acted"), Type.Literal("no-call"), Type.Literal("error")]) }),
	tool_called: Type.Object({ as: Type.String(), params: Type.Unknown() }),
	tool_refused: Type.Object({ as: Type.String(), stage: Type.String(), code: Type.String(), detail: Type.Optional(Type.String()) }),
	tool_result: Type.Object({ as: Type.String(), reply: Type.String(), endsTurn: Type.Optional(Type.Boolean()) }),   // `endsTurn` is written only when true
	service_called: Type.Object({ service: Type.String(), method: Type.String(), caller: Type.String(), input: Type.Unknown() }),
	actor_suspended: Type.Object({ actor: Type.String(), by: Type.String(), reason: Type.String() }),
	actor_resumed: Type.Object({ actor: Type.String(), by: Type.String() }),
	tool_locked: Type.Object({ actor: Type.String(), tool: Type.String(), by: Type.String() }),
	tool_unlocked: Type.Object({ actor: Type.String(), tool: Type.String(), by: Type.String() }),
	limit_reached: Type.Object({ limit: Type.String(), reason: Type.String() }),
	run_ended: Type.Object({ reason: Type.String(), detail: Type.Optional(Type.String()) }),
} as const;
/** The schema of `InputNote` (2.7), in `schemas.ts`. */
export const InputNoteSchema = Type.Object({ source: Type.String(), kind: Type.Optional(Type.String()), text: Type.String() });
```

The events of `turns` (`pass_started`, `activation_skipped`) are declared by the scheduler (4.1), not here.

`input_received` (external input) and the driver events are reserved (1.4). Six of the eight telemetry events of
paper 02 section 6 are driver events and arrive with the model driver at M2; M1 covers `wake` (as
`activation_opened.detail.reason`), `tool_call` and `tool_result`, `turn_end` (as `activation_closed`) and
`clock_tick` (as `tick_started`). **Decided here:** `tool_result` is a kernel event. Reason: the reply is what the
model read; the oracle compares it, and the old log had it only from the runner.

### 2.4 Tools: definition, call, result, refusal

Derives from old `packages/contracts/src/core/tools.ts` and the erased `MechanicTool` and `PreparedCall` of
`core/mechanic.ts`. Changes: `Actor` to `ActorId`; `suggest` becomes `for`; `serves`, the consult and guard members
and the limit types are not carried at M1 (1.4); `sample` is new.

```ts
// tool.ts
/** Today's stage names, unchanged (DECISIONS 01 #4). M1 has handlers for `lock`, `rule` and `after` only (1.4). */
export const STAGES = ["lock", "parse", "limit", "afford", "rule", "guard", "consult", "execute", "settle", "after"] as const;
export type Stage = (typeof STAGES)[number];

/** `<package>/<plugin id>/<tool>`, for example `@swarmtales/mechanic-grid-game/grid-game/playMove`. */
export type CanonicalTool = string;
/** What a caller may be shown as a tool name (DECISIONS 01 #12); checked at load by the sdk. */
export const TOOL_NAME_PATTERN = "^[a-zA-Z0-9_-]{1,64}$";

export interface Refusal { readonly ok: false; readonly code: string; readonly detail?: string }
export interface ToolSuccess { readonly ok: true; readonly reply: string; readonly endsTurn?: boolean }
export type ToolOutcome = ToolSuccess | Refusal;

/** One call as stage handlers see it; `params` is raw at `lock` and checked from `rule` on. */
export interface ToolCall {
	readonly tool: CanonicalTool;
	readonly name: string;                   // the bare name as the plugin declared it: `playMove`
	readonly as: string;                     // the name the caller used
	readonly owner: string;                  // plugin id
	readonly actor: ActorId;
	readonly params: unknown;
	readonly seq: number;                    // the `tool_called` event
}
export interface ToolRef<N extends string = string, P extends TSchema = TSchema> { readonly name: N; readonly parameters: P }
export interface ToolSpec { readonly name: string; readonly description: string; readonly parameters: TSchema }

/** A tool bound to one checked call. */
export interface PreparedCall { readonly params: unknown; rule(): Refusal | undefined; execute(): ToolOutcome }
/** A tool with its types erased, as the kernel holds it. */
export interface KernelTool {
	readonly name: string;                   // bare, as declared: `playMove`
	readonly description: string;            // the rendered text
	readonly parameters: TSchema;
	readonly free: boolean;                  // a read-only look: no step counted, its answer wakes nobody
	/** Converts the raw arguments (the old `convertArguments`), checks them and binds the call; undefined: they do not match. */
	prepare(raw: unknown, actor: ActorId): PreparedCall | undefined;
	/** A legal call now, for the fake driver; undefined: none. Must not change state. */
	sample?(actor: ActorId, random: RandomSource): JsonValue | undefined;
}
/** Refusal codes of the kernel. The strings are read by callers and carried byte for byte. */
export const TOOL_UNKNOWN = "TOOL_UNKNOWN", TOOL_NOT_GRANTED = "TOOL_NOT_GRANTED", TOOL_LOCKED = "TOOL_LOCKED",
	INVALID_ARGUMENTS = "INVALID_ARGUMENTS", STEP_LIMIT = "STEP_LIMIT";
```

**Decided here:** `<package>` in a canonical name is the full npm name, with no shortening rule. Reason: no
derivation that can go wrong, and a third-party package needs no special case. The envelope `source` of a plugin
is `<package>/<plugin id>`.

**Decided here (challenge):** `ToolCall` carries the bare `name` beside the canonical `tool`. Reason: the ported
stage handlers compare the call with an option that holds a bare name (`consensus`: `call.tool !== ctx.options.tool`
with the default `"playMove"`; `strategy-brain`: `postTool`), and D2 forbids changing option values during the port.
The sdk shows its authors `call.tool` as the bare name (6.1).

### 2.5 Service contract and event definition

Derives from old `core/api.ts` and `EventsDefinition` in `core/events.ts`. Changes: the word (`Api*` becomes
`Service*`); nothing else. Service names in the log keep their strings (`grid-game`, `consensus-source`).

```ts
// service.ts
export interface ServiceMethod<I extends TSchema = TSchema, O extends TSchema = TSchema> {
	readonly kind: "command" | "query";      // a command writes `service_called`; a query leaves no trace
	readonly input: I; readonly output: O; readonly summary: string;
}
export type ServiceMethods = Readonly<Record<string, ServiceMethod>>;
export interface ServiceDefinition<N extends string = string, M extends ServiceMethods = ServiceMethods> { readonly name: N; readonly summary: string; readonly methods: M }
/** An implementation with its types erased; `call` checks the input against the method's schema first. */
export interface ProvidedService { readonly service: ServiceDefinition; call(method: string, input: unknown, caller: string): unknown }   // `caller` is a plugin id

// event-def.ts
export type EventSchemas = Readonly<Record<string, TSchema>>;
/** Events declared apart from the plugin that emits them, so a listener needs no value import of it. `id` is the plugin id. */
export interface EventsDefinition<Id extends string = string, E extends EventSchemas = EventSchemas> { readonly id: Id; readonly events: E }
```

### 2.6 Plugin shape, hooks, state slice, snapshot, clock and job

Derives from old `MechanicInstance`, `InstanceHooks`, `InstancePhases`, `EventListener`, `SnapshotSlice`, `RunLimit`,
`MechanicFact` (`core/mechanic.ts`), `MechanicPort` and its sub-ports (`core/context.ts`), `HostSnapshotSchema`
(`core/host.ts`). Changes: one erased shape for every plugin; `HookPhase.order`, `ListenOptions.order` and
`immediate` become `after`; `random()`, `render`, `decide`, `roles`, `resolve`, `display`, guard members and
`runResumed` are gone; `residents` becomes `actors`; the members of 1.4 are not there at M1.

```ts
// plugin.ts
/** A registration with its place: it runs after the registrations of the same point of the named plugin ids. */
export interface Ordered<F> { readonly run: F; readonly after?: readonly string[] }

export interface Listener extends Ordered<(event: Envelope) => void> {
	readonly source: string;                 // the plugin id that declares the event (not the envelope's `source`)
	readonly type: string;
	readonly schema: TSchema;                // must be the declaring plugin's schema object (checked at load)
}
export interface PluginHooks {
	readonly runStarted?: readonly Ordered<() => void>[];
	readonly tickStarted?: readonly Ordered<() => void>[];             // after the tick's due jobs
	readonly inputs?: readonly Ordered<(actor: ActorId) => readonly InputLine[]>[];
	readonly tickEnded?: readonly Ordered<() => void>[];
	news?(actor: ActorId): boolean;          // must not change state; any plugin saying yes counts
	toAct?(): readonly ActorId[];            // who is to act now; at most one loaded plugin has it (SWT-R013)
}
export interface StageHandlers {
	lock?(call: ToolCall): Refusal | undefined;
	rule?(call: ToolCall): Refusal | undefined;
	after?(call: ToolCall, outcome: ToolOutcome): void;                // also after a refused execute
}
export interface RunLimit { readonly id: string; readonly summary: string; check(): string | undefined }
export interface Fact { readonly output: TSchema; compute(): unknown }
export interface SnapshotSlice { readonly version: number; save(): unknown; load(data: unknown, version: number): void }

/** One plugin in one run. Mechanics at M1; Directors and the human hand hand the kernel the same shape at M3. */
export interface PluginInstance {
	readonly tools: readonly KernelTool[];
	readonly services: readonly ProvidedService[];
	readonly listeners: readonly Listener[];
	readonly hooks: PluginHooks;
	readonly stages: StageHandlers;
	readonly jobs: Readonly<Record<string, (data: JsonValue | undefined) => void>>;
	readonly limits: readonly RunLimit[];
	readonly facts: Readonly<Record<string, Fact>>;
	readonly slice: SnapshotSlice | undefined;                         // required when the plugin keeps state
}
/** A plugin as the kernel definition lists it: static data plus the factory. */
export interface ResolvedPlugin {
	readonly id: string;                     // unique in the game: `grid-game`
	readonly package: string;                // npm name
	readonly version: string;
	readonly requires: readonly string[];    // service names
	readonly provides: readonly string[];
	readonly events: EventSchemas;
	readonly audiences: Readonly<Record<string, readonly string[]>>;   // event type -> grant names; the default audience of that event
	readonly options: JsonValue;             // parsed, defaults filled
	create(port: PluginPort): PluginInstance;
}
/** The untyped primitives the kernel gives one plugin instance. Every value crossing it is JSON or a schema. */
export interface PluginPort {
	readonly id: string;
	readonly source: string;                 // `<package>/<id>`
	readonly seed: number;
	readonly maxTicks: number;
	tick(): number;
	emit(type: string, payload: unknown): void;                        // the type must be declared; the sdk has checked the payload
	call(service: string, method: string, input: unknown): unknown;    // throws when no loaded plugin provides it
	has(service: string): boolean;
	rng(...labels: readonly RandomLabel[]): RandomSource;              // section 3.6
	readonly actors: ActorsPort;
	readonly schedule: SchedulePort;
	readonly access: AccessPort;
}
export interface ActorsView {
	readonly ids: readonly ActorId[];        // every actor of the run, in the definition's order
	ofKind(kind: string): readonly ActorId[];
	has(id: string): boolean;
	mayAct(id: ActorId): boolean;            // false while any plugin holds a suspension
	shared(id: ActorId, key: string): JsonValue | undefined;           // the bag written at genesis (`ActorSpec.shared`)
}
export interface ActorsPort extends ActorsView {
	suspend(id: ActorId, reason: string): void;                        // writes `actor_suspended`; a second call of the same plugin does nothing
	resume(id: ActorId): void;                                         // lifts only the calling plugin's suspension
}
export interface SchedulePort {
	at(tick: number, job: string, data?: JsonValue): void;             // `tick` must not lie in the past; runs at the start of that tick
}
export interface AccessPort {
	lock(actor: ActorId, tool: CanonicalTool): void;                   // writes `tool_locked` when it changes something
	unlock(actor: ActorId, tool: CanonicalTool): void;
	isLocked(actor: ActorId, tool: CanonicalTool): boolean;
	isOpen(actor: ActorId, tool: CanonicalTool): boolean;              // granted, not locked, no lock handler refuses
	open(actor: ActorId): readonly CanonicalTool[];                    // in grant order
}
export interface LogView {
	readonly length: number;
	all(): readonly Envelope[];
	since(seq: number): readonly Envelope[];
	ofType(source: string, type: string): readonly Envelope[];        // `source` as in the envelope
}

// kernel-def.ts (the type); state.ts holds `KernelSnapshotSchema`, whose static type must equal it (type test)
export interface KernelSnapshot {
	readonly format: "swarmtales.kernel"; readonly version: 1;
	readonly game: string; readonly gameHash: string; readonly seed: number;
	readonly tick: number; readonly seq: number;
	readonly ended?: RunEnd;
	readonly suspensions: Readonly<Record<string, readonly string[]>>;   // actor id -> plugin ids
	readonly locks: Readonly<Record<string, readonly string[]>>;         // actor id -> canonical tools, sorted
	readonly jobs: readonly Job[];
	readonly plugins: Readonly<Record<string, SliceData>>;               // plugin id -> { version, data }
	readonly scheduler?: SliceData;
}
export interface SliceData { readonly version: number; readonly data: unknown }
export interface Job { readonly id: number; readonly owner: string; readonly job: string; readonly next: number; readonly data?: JsonValue }
```

A snapshot is taken only between ticks, so it holds no step counter and no open activation. M1 builds
`snapshot()` and resume in the kernel because the carried mechanic tests need them (each has a snapshot round
trip); the CLI flags for snapshots and resume are M3.

**Types first, schemas second (challenge).** Issue 01 declares every kernel-facing type as an interface. Issue 05
adds the schemas (`schemas.ts`: `ActorIdSchema`, `EnvelopeSchema`, `StoredEnvelopeSchema`, `InputNoteSchema`,
`RunEndSchema`, `envelopeLogIssues`; `events.ts`: `KERNEL_EVENTS`; `state.ts`: `KernelSnapshotSchema`;
`clock.ts`: `JobSchema`) and a type test that each schema's static type equals its interface. Where a code block
above shows a type as `Static<typeof XSchema>`, the interface of issue 01 is the source and the schema follows it.

### 2.7 Ports: scheduler, driver, sink

Derives from old `Turn`, `TurnTaker`, `RunEnd` (`core/host.ts`), `TurnPolicy` (`core/turns.ts`) and the sketch in
paper 01 section 3.1. Changes against the sketch: `advanceTick` is split into `beginTick` and `endTick`, the port
has `toAct`, and `safePoint` and `record` wait (1.4). **Decided here:** two calls. Reason: the old order runs the
turns between the tick-start hooks and the tick-end hooks, and the scheduler owns the turns.

```ts
// values.ts
export interface RunEnd { readonly reason: "ticks" | "limit" | "error"; readonly tick: number; readonly limit?: string }

// envelope.ts
/** One line of an activation's inputs as shown, tagged with the plugin id that gave it. */
export interface InputNote { readonly source: string; readonly kind?: string; readonly text: string }
/** What an `inputs` hook returns per line; within a kind, lines sort by `order` (0 when left out). */
export type InputLine = string | { readonly kind: string; readonly text: string; readonly order?: number };
/** A hook's line before it is arranged: the note plus its sort key. */
export interface OrderedNote extends InputNote { readonly order?: number }

// ports.ts
/** What a driver gets for one activation. */
export interface Activation {
	readonly actor: ActorId;
	readonly tick: number;
	readonly basis: number;                                  // the log length when its inputs were built
	readonly detail: Readonly<Record<string, JsonValue>>;    // the scheduler's own data; `turns` gives `pass`, `block`, `reason`
	readonly inputs: readonly InputNote[];
	readonly tools: readonly ToolSpec[];                     // every granted tool, locked or not, under the shown names, in grant order
	call(as: string, params: unknown): Promise<ToolOutcome>;
}
/** `pending`: the driver holds tool results its caller has not answered yet. */
export interface DriverResult { readonly pending: boolean }
/** An agent: a runner at M2, a script in tests. */
export type ActorDriver = (activation: Activation) => Promise<DriverResult | undefined | void>;
/** By actor id, else by kind. An activated actor without a driver ends the run with SWT-R011. */
export type DriverTable = Readonly<Record<string, ActorDriver>>;

/** What the scheduler holds: the activation plus its end. */
export interface OpenActivation extends Activation {
	close(failed: boolean): void;                            // writes `activation_closed` (the kernel counted the calls)
	readonly quietEnd: boolean;                              // its last call was a free look or a success that ended the turn (3.3)
}
export interface SchedulerPort {
	readonly seed: number;
	readonly tick: number;
	readonly actors: ActorsView;
	readonly halted: boolean;                                // a run limit is reached or the run failed; a breach, once seen, stays for the tick
	rng(...labels: readonly RandomLabel[]): RandomSource;
	emit(type: string, payload: unknown): Envelope;          // the scheduler's own declared events, source = its id
	beginTick(): Promise<void>;
	endTick(idle: boolean): Promise<RunEnd | undefined>;     // idle: nothing was played in this tick
	hasNews(actor: ActorId): boolean;
	toAct(): readonly ActorId[] | undefined;                 // undefined: no loaded plugin names one
	inputsFor(actor: ActorId): readonly OrderedNote[];       // every `inputs` hook, in hook order; remembers the log length as the basis
	open(actor: ActorId, inputs: readonly InputNote[], detail: Readonly<Record<string, JsonValue>>): OpenActivation;
}
/** An internal interface with one implementation (C1): no `define*` call, no manifest of its own. */
export interface SchedulerDefinition<O = unknown> {
	readonly id: string;                                     // "@swarmtales/engine/turns"
	readonly revision: number;
	readonly determinism: "seeded" | "recorded";
	readonly options: TSchema;
	readonly events: EventSchemas;
	create(options: O): SchedulerInstance;
}
export interface SchedulerInstance {
	/** Plays to the end, or `until.ticks` ticks; undefined when it stopped at `until` with the run still open. */
	run(port: SchedulerPort, drivers: DriverTable, until?: { readonly ticks: number }): Promise<RunEnd | undefined>;
	readonly slice?: SnapshotSlice;
}
/** Sees every event after the listeners, in log order. A sink that throws ends the run (SWT-R020). */
export interface EventSink { write(event: Envelope): void; close?(end: RunEnd): void }
```

`beginTick` and `endTick` return promises although nothing in them waits at M1: staged calls (1.4) will, and the
port must not change then.

### 2.8 `KernelDefinition` and `Kernel`

Derives from the sketch in paper 01 section 2.3 and from old `Host` and `HostOptions`. Old `Host` has 20 members;
`Kernel` has 12.

```ts
// kernel-def.ts
export interface KernelLimits { readonly maxTicks: number; readonly maxCallsPerTick?: number }
/** Everything a kernel is assembled from: plain data plus plugin factories. The sdk builds it; nobody writes it by hand. */
export interface KernelDefinition {
	readonly game: { readonly id: string; readonly hash: string };
	readonly seed: number;
	readonly actors: readonly ActorSpec[];
	readonly plugins: readonly ResolvedPlugin[];                               // in load order
	readonly scheduler: { readonly definition: SchedulerDefinition; readonly options: JsonValue };
	readonly grants: Readonly<Record<string, readonly CanonicalTool[]>>;      // grant name -> tools, in the order a caller sees them
	readonly names: Readonly<Record<CanonicalTool, string>>;                  // canonical -> shown name
	readonly startLocks: Readonly<Record<string, readonly CanonicalTool[]>>;  // grant name -> tools locked at the start for every actor of that grant
	readonly replies: Readonly<Record<string, string>>;                       // kernel refusal code -> the `detail` text
	readonly limits: KernelLimits;
}
export interface Submission { readonly actor: ActorId; readonly as: string; readonly params: unknown; readonly basis?: number; readonly causedBy?: number }
export interface KernelPorts { readonly sinks?: readonly EventSink[] }
/** A snapshot and the log up to it; both untrusted, parsed by the kernel (SWT-R002). */
export interface ResumeInput { readonly snapshot: unknown; readonly log: readonly unknown[] }
export interface Kernel {
	readonly log: LogView;
	readonly tick: number;
	readonly ended: RunEnd | undefined;
	readonly plugins: readonly string[];                                       // ids in load order
	start(): void;                                                             // `run_started` and the `runStarted` hooks; once; a resumed kernel is started already
	run(drivers: DriverTable, until?: { readonly ticks: number }): Promise<RunEnd | undefined>;   // starts when needed
	submit(call: Submission): Promise<ToolOutcome>;                            // a call outside an activation (old `host.call`); `basis` defaults to the log length
	toolSpecs(grant: string): readonly ToolSpec[];
	openTools(actor: ActorId): readonly string[];                              // shown names; empty while the actor may not act
	sample(actor: ActorId, as: string, random: RandomSource): JsonValue | undefined;   // the tool's `sample`, for the fake driver
	fact(key: string): unknown;                                                // `<plugin id>.<fact>`; an unknown key throws SWT-R015
	snapshot(): KernelSnapshot;                                                // only between ticks
}
```

`createKernel(definition, ports?, resume?)` is exported by `@swarmtales/kernel`, not by contracts.

### 2.9 `GameDefinition` version 1

Derives from old `CoreStory` and `CoreStoryData` (`packages/contracts/src/core/story.ts`). Changes: `minutes`
becomes `end.ticks`; `turns` becomes `scheduler`; `grants` defaults to automatic and merges `grantTweaks`; `teams`,
`roles`, `win`, `briefing` and `schema` are new; `overseers`, `decisions`, `audiences`, `human` and the tool
policies (`tools`) are not in version 1 at M1. They, and `params` and `texts` (1.4), come back as optional fields:
adding an optional field does not raise the schema version. There is no `kind` field.

```ts
// game/game.ts  (the data form: what a YAML or JSON file holds and what `game.hash` hashes)
const ResidentId = Type.String({ pattern: "^[A-Za-z0-9_.-]+$" });
const GrantTweak = Type.Object({ drop: Type.Optional(Type.Array(Type.String())), add: Type.Optional(Type.Array(Type.String())) });
export const GameDefinitionSchema = Type.Object({
	schema: Type.Literal(1),
	id: Type.String({ pattern: "^[a-z][a-z0-9-]*$" }),
	title: Type.Optional(Type.String()),
	seed: Type.Optional(Type.Integer({ minimum: 0 })),                        // default 1; `--seed` wins
	residents: Type.Union([Type.Integer({ minimum: 1 }), Type.Array(ResidentId, { minItems: 1 })]),   // a count gives A01, A02, ...
	teams: Type.Optional(Type.Record(Type.String(), Type.Array(ResidentId))),
	roles: Type.Optional(Type.Record(Type.String(), Type.Array(ResidentId))),
	mechanics: Type.Array(Type.Object({ use: Type.String(), options: Type.Optional(Type.Unknown()), as: Type.Optional(Type.Record(Type.String(), Type.String())) })),
	directors: Type.Optional(Type.Array(Type.Unknown(), { maxItems: 0 })),    // reserved for M3
	grants: Type.Optional(Type.Record(Type.String(), Type.Union([Type.Array(Type.String()), GrantTweak]))),
	locked: Type.Optional(Type.Array(Type.String())),                         // tools every resident starts with locked
	scheduler: Type.Optional(Type.Object({ id: Type.String(), options: Type.Optional(Type.Unknown()) })),   // default: turns
	limits: Type.Optional(Type.Object({ maxCallsPerTick: Type.Optional(Type.Integer({ minimum: 1 })) })),
	end: Type.Object({ ticks: Type.Integer({ minimum: 1 }) }),
	win: Type.Optional(Type.Object({ fact: Type.String() })),
	briefing: Type.Optional(Type.Union([Type.String(), Type.Record(ResidentId, Type.String())])),
	model: Type.Optional(Type.String()),                                      // recorded at M1, used from M2
}, { additionalProperties: false });
export type GameData = Static<typeof GameDefinitionSchema>;
```

Meaning of the fields that are new:

- **`teams`, `roles`.** Game-level data. The sdk checks every member against `residents` and writes `team` and
  `role` into `ActorSpec.shared`; the `roster` mechanic serves them (6.4). The five ported mechanics keep their own
  `teams` option at M1 (D2); reading the game's teams is the frame work of M4.
- **Variants.** A game is plain data. A TypeScript game may be built by a function of its own (as
  `tictactoeGame(options)` is, 8.2); what is hashed and recorded is the data it returns. Typed `params` with
  `{ "$param": name }` references, which let a YAML game and an experiment vary a value, are M2 work (1.4).
- **`end` and `win`.** `end.ticks` is the run's length (`KernelLimits.maxTicks`). `win.fact` names the fact
  (`<plugin id>.<fact>`) whose value is the run's result line. **Decided here:** `end` has only `ticks` and `win`
  only `fact` in version 1; `end.on` and a `score` mechanic are additive later. Reason: no M1 or M2 game needs more,
  and a run that ends on a game event already does so through a plugin's run limit. The kernel does not know
  `win`: the caller reads the fact (6.5).
- **`as`.** Per mechanic use: bare tool name to model-facing name, for a clash (03 D10).
- **`grants`.** Absent for a grant name: every tool whose `for` names it, in load order, and within a plugin in
  the order it lists its tools (old `grants: "auto"`). A list replaces it (and sets the order a model sees).
  `{ drop, add }` changes the derived list. The only grant name of M1 is `resident`.

### 2.10 `RunManifest`

Derives from the sketch in paper 02 section 2.1 and replaces old `000-run.json` and the genesis fields of
`ChainGenesisSchema`. Changes against the sketch (DECISIONS 02 D2, C7): no `contextPolicy`; the scheduler is an
open id plus options, not an enum; one kernel revision integer.

```ts
// run/manifest.ts
const Hash = Type.String({ pattern: "^[0-9a-f]{64}$" });
const Sampling = Type.Union([Type.Number(), Type.Literal("provider-default")]);
export const RunManifestSchema = Type.Object({
	format: Type.Literal("swarmtales-run"), version: Type.Literal(1),
	run: Type.Object({ id: Type.String(), startedAt: Type.String(), purpose: Type.Union([Type.Literal("smoke"), Type.Literal("pilot"), Type.Literal("exploratory"), Type.Literal("confirmatory")]) }),
	game: Type.Object({ id: Type.String(), title: Type.Optional(Type.String()), hash: Hash, params: Type.Record(Type.String(), Type.Unknown()) }),
	kernel: Type.Object({ revision: Type.Integer({ minimum: 3 }), version: Type.String(), commit: Type.Optional(Type.String()), dirty: Type.Optional(Type.Boolean()), node: Type.String() }),
	scheduler: Type.Object({ id: Type.String(), revision: Type.Integer(), determinism: Type.String(), options: Type.Unknown(), optionsHash: Hash }),
	plugins: Type.Array(Type.Object({ id: Type.String(), package: Type.String(), version: Type.String(), optionsHash: Hash })),
	actors: Type.Array(Type.Object({
		id: Type.String(), kind: Type.String(), grant: Type.String(),
		driver: Type.String(),                                                  // "fake/sample", "scripted", from M2 a model driver id
		model: Type.Optional(Type.Object({ provider: Type.String(), requestedId: Type.String(), resolvedId: Type.String(), params: Type.Object({ temperature: Sampling, topP: Sampling, maxOutputTokens: Sampling, thinking: Type.String() }) })),
		textHashes: Type.Record(Type.String(), Hash),                           // "briefing", "tools" (the tool list as shown)
	})),
	texts: Type.Record(Type.String(), Hash),                                    // every plugin text and kernel reply by key
	seed: Type.Integer({ minimum: 0 }), replicate: Type.Integer({ minimum: 0 }),
	limits: Type.Object({ maxTicks: Type.Integer(), maxCallsPerTick: Type.Optional(Type.Integer()), budgetUsd: Type.Optional(Type.Number()) }),   // `budgetUsd` is set from M2
	naming: Type.Literal(1),
	log: Type.Object({ format: Type.String(), version: Type.Integer() }),          // `LOG_FORMAT`, `LOG_VERSION`; the builder fills them
	resumedFrom: Type.Optional(Type.Object({ snapshotHash: Hash })),
	experiment: Type.Optional(Type.Object({ id: Type.String(), specHash: Hash, arm: Type.String() })),
}, { additionalProperties: false });
export type RunManifest = Static<typeof RunManifestSchema>;
```

`kernel.revision` is `RUNTIME_REVISION` of `packages/kernel/src/revision.ts` and starts at **3** (DECISIONS 01 #11).
`purpose` is `smoke` for every M1 run. `model` is absent for a fake or scripted driver. `game.params` is `{}` and
`replicate` is 0 at M1. The schema has no import of the kernel-facing contracts, so its issue runs beside theirs.

### 2.11 `SwtError`

New (paper 04 section 5, DECISIONS 04 #7). Load errors and run errors are `SwtError`; refusals are tool outcomes and
never errors. `throw new Error(` is forbidden by lint in every package but `chain`.

```ts
// error.ts
export const SWT_CODE = "^SWT-[GMDRXPLC][0-9]{3}$";   // G game, M mechanic, D Director, R run and kernel, X models, P texts, L log and chain, C command line
export const SwtIssueSchema = Type.Object({
	code: Type.String({ pattern: SWT_CODE }),
	summary: Type.String(),                              // what, one sentence
	where: Type.Optional(Type.Object({ file: Type.Optional(Type.String()), line: Type.Optional(Type.Integer()), path: Type.Optional(Type.String()), package: Type.Optional(Type.String()) })),
	why: Type.String(),                                  // the rule, one sentence
	fix: Type.String(),                                  // an action; "did you mean" where a name was mistyped
	details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
export type SwtIssue = Static<typeof SwtIssueSchema>;
/** One or several problems, reported together. `message` is the first issue in the five-line form. */
export class SwtError extends Error {
	readonly issues: readonly SwtIssue[];
	constructor(issues: SwtIssue | readonly SwtIssue[], options?: { readonly cause?: unknown });
	get code(): string;                                  // of the first issue
}
export function formatIssue(issue: SwtIssue): string;  // "error <code>: <summary>" / "  at <where>" / "  <why>" / "  fix: <fix>" / "  docs: docs/reference/errors.md#<code lower case>"
export function closest(name: string, known: readonly string[]): string | undefined;   // edit distance of at most 2
```

A code is never reused or renumbered. The codes of M1 (the catalogue lives in `packages/sdk/src/errors.ts` for G, M
and P, in `packages/kernel/src/errors.ts` for R, in `packages/runlog/src/verify.ts` for L, in `apps/cli` for C). A
package raises only codes of its own catalogue, with one exception: `engine/turns` builds `R010`, `R011` and
`R014` itself with `new SwtError(...)` (it may not import the kernel); they are listed here with the R codes
because they end a run.

| Code | Raised when |
|---|---|
| `SWT-G001`, `G002`, `G003` | the game does not match schema version 1; `schema` is not 1; `directors` is not empty before M3 |
| `SWT-G010`, `G011` | a resident id is doubled or malformed; a team or role names an id that is not a resident |
| `SWT-G012`, `G013`, `G014` | a tool is granted or locked but not defined; two tools share a model-facing name (fix: `as`); a model-facing name does not match `MODEL_TOOL_NAME` |
| `SWT-G020`, `G021`, `G022` | an option does not match the mechanic's schema (with the field path); a mechanic is listed twice; a data game names a mechanic that is not installed |
| `SWT-G030`, `G031`, `G032` | a required service has no provider; a service has two providers; `requires` form a cycle |
| `SWT-M010`, `M011` | an event type is reserved by the kernel or declared twice (found from the heads); the head's `package` is not the package's name (conformance) |
| `SWT-M021`, `M022` | an emitted payload does not match its schema; a service input or output does not match (both raised by the sdk's wrappers inside a run) |
| `SWT-P003` | a declared prompt has no text (found at resolution, not in a run) |
| `SWT-R001`, `R002`, `R003` | the kernel is used after it failed; a snapshot does not fit the definition; plugin code threw (the first failure leads, as `cause`) |
| `SWT-R010`, `R011`, `R020` | a scheduler order is no permutation; an activated actor has no driver; a sink threw |
| `SWT-R013`, `R014`, `R015`, `R016` | two plugins have a `toAct` hook; activation `toAct` without one (raised by `turns` at the first tick); `kernel.fact` of an unknown key (so a wrong `win.fact` fails before the run, 6.5); `after` relations form a cycle |
| `SWT-L001` to `L005` | the chain breaks at a line; a head signature fails; the manifest hash differs from the genesis; a line is no envelope; `seq`, `tick`, `causedBy` or `basis` out of order |
| `SWT-C001`, `C002`, `C003`, `C010`, `C020` | game file not found; unsupported file type; bad flag value; `--fake` meets a granted tool without `sample` (warning); a live run before M2 |

## 3. Kernel

`@swarmtales/kernel` exports `createKernel`, `RUNTIME_REVISION`, and from `random.ts` `createRng`, `seedFrom`,
`deriveSeed`, `rngFor`. Nothing else. It calls no model, reads no file, no environment variable and no wall clock.
Environment variables of the project are named `SWT_*` (E5); no M1 package reads one.

### 3.1 The seven parts as files

Each file exports one factory. The interfaces between the files are fixed first, in `parts.ts` (issue 06), so
that the files can be built in parallel and tested against hand-written fakes of their neighbours.

| Part | File | Ported from (old `packages/kernel/src/host/`) | Factory |
|---|---|---|---|
| 1 Log | `log.ts` | `log.ts` (`EventBus`) | `createLog(tick, audienceOf, prefix?): Log` |
| 2 State | `slices.ts` | `snapshots.ts` | `saveKernel(parts, tick, ended): KernelSnapshot`, `restoreKernel(parts, snapshot)` |
| 3 Actors | `actors.ts` | `residents.ts` | `createActors(specs, log): Actors` |
| 4 Dispatch | `dispatch.ts` | `gateway.ts` | `createDispatch(parts): Dispatch` |
| | `access.ts` | `access.ts`, `probe.ts` | `createAccess(definition, actors, log): Access` |
| | `steps.ts` | the step counter of `referee.ts` | `createSteps(max, counted): Steps` |
| 5 Services | `services.ts` | part of `loader.ts` | `createServices(log): Services` |
| | `plugin-port.ts` | `portFor` in `loader.ts` | `portFor(plugin, parts): PluginPort` |
| | `loader.ts` | `loader.ts` | `loadPlugins(definition, parts): Loaded` |
| | `order.ts` | `phases.ts` | `ordered(entries): entries` in load order plus `after`, stable |
| 6 Clock and jobs | `clock.ts` | `scheduler.ts` | `createClock(): Clock` |
| 7 Ports | `ports.ts` | `turns.ts` (the part that is not policy) | `createSchedulerPort(parts, life): SchedulerPort` |
| Assembly | `lifecycle.ts` | `Host#play`, `start`, `#finish`, `#fail` of `host.ts` | `createLifecycle(parts): Lifecycle` |
| | `kernel.ts` | the rest of `host.ts` | `createKernel(definition, ports?, resume?): Kernel` |

```ts
// parts.ts (type-only while the files are built; derived types after issue 25)
export interface Frame { readonly actor: ActorId; readonly causedBy?: number; readonly tool?: CanonicalTool }
export interface Log extends LogView {
	emit(source: string, type: string, payload: unknown, extra?: { readonly basis?: number; readonly audience?: readonly string[] }): Envelope;
	run<T>(frame: Frame, code: () => T): T;                  // the events are delivered when the outermost frame returns
	frame(): Frame;                                          // `{ actor: "kernel" }` outside any
	listen(source: string, type: string, run: (event: Envelope) => void): void;   // `source` as in the envelope; called in the final order
	addSink(sink: EventSink): void;
	fail(last: () => void): void;                            // listeners off, the queue goes to the sinks, `last` writes the closing event, then closed
}
export interface Actors extends ActorsView {
	spec(id: ActorId): ActorSpec | undefined;
	portFor(pluginId: string): ActorsPort;
	state(): Readonly<Record<string, readonly string[]>>;    // the suspensions
	restore(state: Readonly<Record<string, readonly string[]>>): void;
}
export interface Access {
	granted(grant: string, tool: CanonicalTool): boolean;
	grantsOf(grant: string): readonly CanonicalTool[];
	isLocked(actor: ActorId, tool: CanonicalTool): boolean;
	setProbe(probe: (actor: ActorId, tool: CanonicalTool) => boolean): void;   // "no lock handler refuses", given by dispatch
	portFor(pluginId: string): AccessPort;
	state(): Readonly<Record<string, readonly string[]>>;
	restore(state: Readonly<Record<string, readonly string[]>>): void;
}
export interface Steps { step(actor: ActorId): boolean; tickStarted(): void }   // false: over the limit
export interface Services { provide(pluginId: string, service: ProvidedService): void; has(service: string): boolean; call(caller: string, service: string, method: string, input: unknown): unknown }
export interface Clock { readonly tick: number; advance(): void; at(owner: string, tick: number, job: string, data?: JsonValue): void; take(tick: number): readonly Job[]; state(): readonly Job[]; restore(tick: number, jobs: readonly Job[]): void }
export interface LoadedTool { readonly canonical: CanonicalTool; readonly owner: string; readonly tool: KernelTool }
export interface Loaded {
	readonly order: readonly string[];                                          // plugin ids
	readonly instances: ReadonlyMap<string, PluginInstance>;
	readonly tools: ReadonlyMap<CanonicalTool, LoadedTool>;
	readonly byShownName: ReadonlyMap<string, readonly LoadedTool[]>;           // one shown name may stand for tools of different grants
	hooks<K extends "runStarted" | "tickStarted" | "inputs" | "tickEnded">(point: K): readonly { readonly plugin: string; readonly run: NonNullable<PluginHooks[K]>[number]["run"] }[];   // in the final order
	stages<K extends keyof StageHandlers>(stage: K): readonly NonNullable<StageHandlers[K]>[];   // in load order
	readonly limits: readonly { readonly id: string; readonly limit: RunLimit }[];   // id is `<plugin id>.<limit id>`
}
export interface Dispatch {
	submit(call: Submission): Promise<ToolOutcome>;
	quietEnd(actor: ActorId): boolean;
	readonly broken: boolean;
}
export interface Lifecycle {
	start(): void;
	beginTick(): Promise<void>;
	endTick(idle: boolean): Promise<RunEnd | undefined>;
	readonly halted: boolean;
	fail(error: unknown): void;
}
```

Frames: the log keeps a stack of frames. Every piece of plugin code runs inside `log.run(frame, code)`; an event
takes `actor`, `causedBy` and `tool` from the top frame. Outside any frame the actor is `kernel`. `basis` is not
a frame field: it is written on `activation_opened` and `tool_called` only.

### 3.2 Loading and registration

The sdk has done every check that can be done from the game's data and the mechanics' heads (section 6.5). The
kernel loads in the order of `definition.plugins` and checks what only a loaded body shows or what protects it:
every `requires` has a loaded provider; no service has two providers; no event type of a plugin or of the
scheduler is a kernel event type, and no two declare the same type; every granted, named or start-locked
canonical tool exists; a listener's schema is the declaring plugin's schema object; at most one plugin has a
`toAct` hook (`SWT-R013`); `after` relations have no cycle (`SWT-R016`). Every other violation is `SWT-R002`.
Never a silent skip.

- **Tools** register under their canonical name; `definition.names` gives the shown name; `submit` and
  `Activation.call` take the shown name and resolve it against the caller's grant.
- **Services.** `port.call(service, method, input)` finds the provider. For a `command` the kernel writes
  `service_called` in the caller's frame and runs the provider in a nested frame `{ actor: the caller's frame
  actor, causedBy: that event }`; a `query` writes nothing. The provider's wrapper (built by the sdk) checks input
  and output against the schemas (`SWT-M022`). `port.has(service)` is known from the start.
- **Events.** `port.emit(type, payload)` appends the event with the source `<package>/<id>` and the default
  audience `ResolvedPlugin.audiences[type]` (the field is written only when one is set). The sdk has checked the
  payload against the schema before it calls the port (`SWT-M021`); the kernel checks only that the type is declared.
- **Listener delivery (one mode).** An event is queued when it is appended and delivered when the **outermost**
  frame returns, or at once when no frame is open: in log order of the events, and per event in listener order
  (3.4), each listener in a frame `{ actor: event.actor, causedBy: event.seq }`. What a listener emits queues
  behind. A frame nested in another (a service command inside a tool's `execute`) delivers nothing when it
  returns. This is the old `EventBus` without its `immediate` mode (none of the five mechanics uses it). Sinks see
  an event after its listeners.
- **Every step is its own outermost frame.** The kernel calls each hook, each job, each stage handler, the
  tool's `prepare`, `rule` and `execute` in a separate `log.run`. So the listeners of what `execute` emitted have
  run before the first `after` handler is called, as in the old gateway. An issue that batches several steps
  into one frame changes the event order and fails the oracle.
- **Jobs** are named functions; an entry holds owner, name, tick and data, so the queue is in the snapshot.
  `schedule.at` refuses a job name the plugin does not have and a tick in the past.
- **Run limits** (`RunLimit`) are checked where 3.5 says, in load order; the first that answers a reason ends the
  run with `limit_reached { limit: "<plugin id>.<limit id>" }`.
- **Facts.** `kernel.fact("<plugin id>.<fact>")` calls `compute()`; the sdk's wrapper has checked the value
  against `output`.
- **A throw from plugin code** at load or in a run is `SWT-R003`. Its `summary` is `<plugin id>: <the thrown
  message>` and the thrown value is the `cause`, so a carried test that matches the old message still matches.

### 3.3 The dispatch pipeline

One lane: `submit` calls are serialised through one promise queue. A call that throws breaks the lane; the kernel
writes `run_ended { reason: "error" }` as the last event and every later use throws `SWT-R001` with the first
failure as cause. The stages in order, for a submission by `actor` of the shown name `as`:

| # | Stage reported | What runs | Refusal |
|---|---|---|---|
| 0 | | append `tool_called { as, params }` with `basis` and `causedBy`; every later event of the call is caused by it. Note for the actor: `looked` = the name resolves, for the caller's grant, to a `free` tool; `ended` = false | |
| 1 | `limit` | the step counter (`maxCallsPerTick`), unless the tool is `free`. It counts only actors listed in `definition.actors`; a reserved id is never counted | `STEP_LIMIT` |
| 2 | `lock` | no tool of any grant has the shown name: `TOOL_UNKNOWN`. The actor is not in the definition, or its grant does not hold a tool of that name: `TOOL_NOT_GRANTED`. The actor may not act, or the tool is locked for it: `TOOL_LOCKED`. Then every plugin's `lock` handler in load order | as listed, the handler's |
| 3 | `parse` | the tool's `prepare(raw, actor)`; undefined is refused with the bare code and no detail | `INVALID_ARGUMENTS` |
| 4 | `rule` | the tool's own `rule`, then every plugin's `rule` handler in load order, with the checked `params` | the tool's, the handler's |
| 5 | `execute` | `prepared.execute()`; a refusal here is reported at stage `execute` | the tool's |
| 6 | `after` | every `after` handler in load order, with the outcome; also after a refused `execute`, not after an earlier refusal | |
| 7 | | on success append `tool_result { as, reply, endsTurn? }`, and `ended` = true when the reply ends the turn; then resolve the caller's promise | |

A refusal at any stage is one `tool_refused { as, stage, code, detail? }` and ends the call. The `detail` of a
kernel refusal code comes from `definition.replies`. `quietEnd(actor)` is `looked || ended` of the actor's last
call: a refused free look still counts as a look, and any new call clears `ended`. This is the old
`lastCallNeedsNoAnswer` (runtime revision 2), unchanged. Step 1 before step 2 is the old order and is kept, so
the same calls are refused with the same codes. The stages `afford`, `guard`, `consult` and `settle` and the tool
limit keep their names and their place in `STAGES` and have no code at M1 (1.4).

### 3.4 Ordering without order numbers

Every place where several plugins register for the same point (a hook point, the listeners of one event, a stage
handler) runs in **load order**; within one plugin in the order it lists them. A registration of a hook or listener
may add `after: [plugin ids]`: it then runs after every registration of the same point by those plugins. An id that
is not loaded is ignored. The sort is stable (`order.ts`): repeatedly take the first entry in load order whose
`after` entries are all placed. A cycle is `SWT-R016` and names the plugins.

Load order is computed by the sdk (`load-order.ts`, a port of old `loadOrder` in `loader.ts`): a plugin comes after
the providers of what it `requires` and of the loaded services it `uses`; when only `uses` edges block, the first
blocked plugin in the game's order goes next; a cycle of `requires` is `SWT-G032`. **Decided here:** the old load
order algorithm is ported unchanged. Reason: load order decides the order of tools a model sees and of tied hooks,
and D2 forbids changing it during a port. The stricter rule "no cycle among `uses`" becomes a check at M3.

Stage handlers take no `after` at M1; they run in load order.

What this replaces for tic-tac-toe teams (old `mechanics/shared/src/order.ts`). The load order of the game,
computed in the challenge with the old `loadOrder` for the default, the no-brain and the solo variant, is
`team-channel`, `grid-game`, `consensus`, `strategy-brain`, `optimal-referee` (then `roster`):

| Point | Old numbers | New |
|---|---|---|
| `runStarted` | brain -100, grid 0 | `grid-game` declares `after: ["strategy-brain"]` |
| `tickStarted` | consensus 10, brain 20 | load order |
| `tickEnded` | consensus 100, brain 200 | load order |
| `turnInputs` | brain 300, grid 350, team-channel 400, consensus 500 | the hooks run in load order; the order **shown** is the scheduler option `inputs` (4.2) |
| listeners of `game_started` | no numbers: brain, referee | load order |

Why the run order of the four `turnInputs` hooks may change (checked in the old sources): each of them writes
only its own state (`told`, `reset`, `seen`), none emits an event, none calls a command, and `consensus` calls
only queries of `consensus-source`. So only the shown order is visible, and the scheduler option restores it.

### 3.5 Tick sequence

A port of old `Host#play`. `beginTick` and `endTick` are called by the scheduler.

1. `beginTick`: reset the step counters; append `tick_started`.
2. Due jobs (taken once, in the order they were scheduled): append `job_ran`, run the job in a frame caused by it.
3. `tickStarted` hooks. Then forget the breach of the last tick. The scheduler now plays (section 4); each time it
   reads `halted`, the run limits are checked, and the first breach seen stays for the rest of the tick.
4. `endTick(idle)`: if no breach is held, check the run limits once; then the `tickEnded` hooks.
5. Append `tick_ended`. If still no breach is held, check the run limits again.
6. The clock advances by one, unless `idle` is true and a breach is held (a breach seen at the tick's start, before
   anything was played, ends the run at that tick).
7. A breach: append `limit_reached`, then finish with `{ reason: "limit", limit }`. Else `tick >= maxTicks`:
   finish with `ticks`. Otherwise return undefined.

Finish: append `run_ended { reason }`, then the sinks' `close`. `start()` appends `run_started` and runs the
`runStarted` hooks. A job scheduled for the tick that is running is refused only when its tick lies in the past;
a job for the running tick whose jobs were already taken runs at the start of the next one.

### 3.6 Determinism rules

1. **The generator is carried bit for bit:** `packages/kernel/src/random.ts` is the old
   `packages/kernel/src/random.ts` (Mulberry32 in `createRng`, FNV-1a in `seedFrom`,
   `deriveSeed(seed, ...parts) = seedFrom([String(seed >>> 0), ...parts.map(String)].join(":"))`, `rngFor`). Only the
   interface name changes (`Rng` becomes `RandomSource` from contracts). A test pins these vectors, computed on the
   old code and computed again in the challenge by running the old `random.ts` (all five hold): `deriveSeed(11, "turns", 0) === 783580791`; `deriveSeed(11, "turns", 0, 2) === 1691496671`;
   `rngFor(11, "turns", 0).shuffle(["A01", "A02", "A03", "A04", "A05", "A06"])` gives `A06, A01, A03, A04, A05, A02`;
   `createRng(1).next() === 0.6270739405881613`; `rngFor(7, "deal", 3).int(1, 100) === 17`.
2. **Stream labels.** `port.rng(...labels)` is `createRng(deriveSeed(seed, ...labels))`. The labels are **not**
   prefixed with the plugin id: the label space is global, as in the old code, so old and new runs deal the same.
   A plugin's first label is its own id or a word it lists in its README (the labels are part of its contract, 02 D3).
   Reserved first labels: `turns` (the scheduler: `("turns", tick)` for pass 1, `("turns", tick, pass)` for later
   passes; `rngFor(11, "turns", 0, 2)` shuffles the six ids to `A06, A04, A05, A02, A01, A03`) and `fake` (the
   fake driver: `("fake", actor id, n)`, n counting that actor's activations from 1). The stream of a ported
   mechanic keeps its labels, for example `("consensus", "forfeit", team, tick, forfeits)`.
3. **No stream that depends on the log position.** The old `ctx.random()` and `setup.random()` are not carried.
4. A plugin's events are a function of its state, the committed input and `rng`. No wall clock, no `Math.random`,
   no timer, no I/O in layers 1 to 3 (lint).
5. Wall-clock stamps exist only in the sink (`at`). The kernel never reads them.
6. All state changes happen in the lane, or in the kernel's own synchronous steps of 3.5. Driver code runs
   outside and reaches the kernel only through `Activation.call`.

### 3.7 What the kernel must not know

The word-list test fails when one of these words appears as an identifier, as a part of an identifier (split at
case changes, `_` and `-`) or as a word of a string literal, in `packages/kernel/src` or
`packages/contracts/src/kernel`. Comments are not tested (**changed in the challenge**: the first draft tested
them, and its own contract comments said "model-facing"; the constant `MODEL_TOOL_NAME` became
`TOOL_NAME_PATTERN` for the same reason):

`resident`, `director`, `overseer`, `gamemaker`, `judge`, `referee`, `weaver`, `classifier`, `player`, `team`,
`captain`, `role`, `minute`, `round`, `turn`, `pass`, `level`, `point`, `score`, `vote`, `ballot`, `board`, `move`,
`match`, `card`, `deal`, `puzzle`, `exile`, `tribunal`, `whisper`, `marks`, `ledger`, `city`, `story`, `decision`,
`briefing`, `prompt`, `model`, `cost`, `usd`.

Allowed, because they are the kernel's own vocabulary: `actor`, `kind`, `grant`, `tool`, `service`, `event`, `tick`,
`job`, `plugin`, `activation`, `stage`, `limit`, `human` and `script` (reserved actor ids), `guard` and `consult`
(stage names until M5), `game` (only as `game.id` and `game.hash`). The single listed exception is the payload field
`endsTurn` of `ToolSuccess` and `tool_result`, kept because ported mechanics return it (D2); the test has an allow
entry for that identifier and for nothing else. Two consequences for builders: the scheduler tells the kernel
`endTick(idle)`, not a number of passes; and kernel code uses `RegExp.prototype.test` or `exec`, since `match`
and `round` are on the list.

## 4. Scheduler interface and `turns`

The interface is 2.7. `turns` lives in `packages/engine/src/turns/`, has the id `@swarmtales/engine/turns`,
revision 1, determinism `seeded`. It is a port of old `packages/kernel/src/host/turns.ts` (`TurnLoop`,
`arrangeInputs`, `mergePolicies`) and of `TurnPolicy` (`packages/contracts/src/core/turns.ts`).

### 4.1 Options

```ts
// turns/options.ts
export const TurnsOptions = Type.Object({
	passes: Type.Integer({ minimum: 1, default: 1, description: "Passes per tick; every actor gets at most one activation per pass." }),
	blockSize: Type.Integer({ minimum: 1, default: 1, description: "Actors per block (4.3)." }),
	activation: Type.Union([Type.Literal("always"), Type.Literal("onNews"), Type.Literal("toAct")], { default: "always", description: "Who is woken in a pass (4.2)." }),
	order: Type.Union([Type.Literal("seeded"), Type.Literal("roster")], { default: "seeded", description: "The order of a pass: a seeded shuffle, or the definition's order." }),
	kinds: Type.Array(Type.String(), { default: ["resident"], description: "The actor kinds this scheduler activates." }),
	inputs: Type.Array(Type.Union([Type.Object({ kind: Type.String(), join: Type.Optional(Type.String()) }), Type.Object({ source: Type.String() })]), { default: [], description: "The order in which an activation's input lines are shown." }),
});
```

Changes against `TurnPolicy`: `order` is data, not a function (old tests passed `(view) => view.residents`, which is
`"roster"`); a mechanic can no longer supply a policy (none of the five does); `toAct` and the `{ source }` entry of
`inputs` are new. Its events (`SchedulerDefinition.events`, source `@swarmtales/engine/turns`):
`pass_started { pass, order, blocks }` and `activation_skipped { actor, pass, block }`. `order` and `blocks` hold
actor ids. The export is `turns: SchedulerDefinition<Static<typeof TurnsOptions>>`.

### 4.2 Wake rule

For each member of a block, when its inputs are built:

| `activation` | The actor is woken when |
|---|---|
| `always` | it may act |
| `onNews` | it may act and (`port.hasNews(actor)` or it is pending) |
| `toAct` | it may act and `port.toAct()` contains it; news and pending do not count |

"Pending" is kept by `turns` per actor: the last activation's driver returned `{ pending: true }` and that
activation's `quietEnd` was false (3.3). This is the old `awaitsAnswer && !lastCallNeedsNoAnswer` of runtime
revision 2, unchanged. The pending map is the scheduler's snapshot slice. An actor that is not woken gets
`activation_skipped`; an actor that may not act gets nothing, as before. The reason (`always`, `news`, `answer`,
`toAct`) goes into `detail.reason` beside `pass` and `block`. With `toAct` and no plugin that has the hook
(`port.toAct()` is undefined), `turns` ends the run with `SWT-R014` at the first tick.

`hasNews` asks every plugin's `news` hook in load order and stops at the first yes; the hooks must not change
state, so the order is not visible.

Input order (`inputs.ts`, a port of `arrangeInputs`): the entries of `inputs` in list order. A `{ kind }` entry takes
the lines of that kind, sorted by their `order` (stable), joined into one line when `join` is set (its source is
the sources joined by `+`). A `{ source }` entry takes the lines of that plugin id that no `{ kind }` entry of the
list takes, in hook order. Lines matched by no entry follow in hook order. With `inputs: [{ kind:
"context-reset" }]` alone the result is byte for byte the old `arrangeInputs`; the `{ source }` entries only
replace the old order numbers of the hooks.

### 4.3 A tick, a pass, a block, a turn end

```
run(port, drivers, until):
  repeat
    await port.beginTick()
    started = 0
    for pass = 1 .. options.passes, while not port.halted
      started += 1
      may   = actors of options.kinds that may act, in definition order
      order = "roster": may;  "seeded": port.rng("turns", tick [, pass if pass > 1]).shuffle(may)
      port.emit("pass_started", { pass, order, blocks })           blocks = order cut into blockSize
      for each block, index from 1
        stop the pass when port.halted
        await playBlock(block)
    end = await port.endTick(started === 0)
  until end is defined or until.ticks ticks were played
```

`playBlock`, with **no await** while the members are prepared, so every member's inputs show the block's start:

1. For each member in order: skip it silently when it may not act; apply the wake rule (skip with
   `activation_skipped`); build its inputs (`port.inputsFor`, arranged by `inputs.ts`);
   `port.open(actor, inputs, detail)` writes `activation_opened`; start its driver at once with a **gated copy**
   of the activation.
2. The gate is in `turns`, as it was in the old `TurnLoop`: member k is **ready** when member k-1's activation is
   closed (member 1 at once), and the copy's `call` awaits ready before it calls the kernel's `call`. So the
   drivers of a block run concurrently (the model calls overlap), and their calls land in the block's order.
3. A turn **ends** when the member is ready and its driver's promise has settled. Then `close(failed)` writes
   `activation_closed { calls, outcome }`: `error` when the driver rejected, `acted` when the kernel counted at
   least one call, `no-call` otherwise. A tool reply with `endsTurn` does not close the activation by itself; it
   only marks `quietEnd`, and the driver is expected to return (the scripted and fake drivers do).
4. A failed member does not stop the next member; the first failure is thrown after the block and ends the run with
   reason `error`.
5. A driver is looked up by actor id, then by kind; none is `SWT-R011`. The order of a pass must be a
   permutation of `may` (`SWT-R010`; only reachable through a future order option, kept as an assertion).

Ticks: only `beginTick` and `endTick` move the clock; a tick holds `passes` passes; a game labels a tick as it
likes. Parallelism exists only inside a block, and only in driver code.

## 5. Chain over envelopes

`packages/chain` is carried from old `packages/chain` (583 lines, `Apache-2.0` already). New: the genesis of
version 2 and `verifyRunTexts`. The signer is carried from old `packages/chronicle/src/log/chain.ts` (`EventChain`)
into `packages/runlog/src/chain-writer.ts`, because it needs `node:crypto` and the chain package stays browser-safe.

- **What is hashed.** Each line of `events.jsonl` is one stored envelope (2.2), written as canonical JSON (RFC 8785,
  `canonicalJson`). Line n's hash is `sha256(hash(n-1) + line n)`, starting from the genesis entry's hash: the old
  rule, unchanged. Because the lines are envelopes, tool calls, refusals, results, service commands, jobs and tick
  events are inside the signed log; the old chain signed flattened legacy lines without them.
- **Genesis.** `CHAIN_VERSION` becomes 2. The version 2 genesis replaces `story`, `storyHash`, `seed`, `models`,
  `runtime` and `commit` by the manifest's hash; everything they said is in the manifest.

```ts
export const ChainGenesisV2Schema = Type.Object({
	format: Type.Literal(CHAIN_FORMAT), version: Type.Literal(2),
	algorithm: Type.Literal("ed25519"), digest: Type.Literal("sha256"), canonical: Type.Literal("RFC 8785"),
	publicKey: Type.String(),                               // base64 SPKI DER, the same key as `run.pub`
	manifest: Hash,                                          // sha256 of the canonical JSON of `manifest.json`
	log: Type.Object({ format: Type.String(), version: Type.Integer() }),
	resumedFrom: Type.Optional(ResumedFromSchema),
}, { additionalProperties: false });
export interface RunTexts extends ChainTexts { readonly manifest: string }
/** `verifyChainText` plus: the genesis is version 2 and its `manifest` equals `jsonHash(JSON.parse(texts.manifest))`. */
export function verifyRunTexts(texts: RunTexts): ChainVerdict;
```

- **Heads.** A signed head at the run's end (and with every snapshot once the CLI writes snapshots, M3). No
  interval heads (cut list).
- **Verify.** `verifyRun(dir)` in `runlog/src/verify.ts` reads the four files and returns issues: `verifyRunTexts`
  (L001 to L003), every line parses with `StoredEnvelopeSchema` (L004), `envelopeLogIssues` (L005), the manifest
  parses with `RunManifestSchema`, and the last line is `run_ended` (else the verdict says "unfinished", not broken).
  `verifyChainText` keeps accepting a version 1 genesis, so the viewer still verifies old runs.

## 6. sdk

`@swarmtales/sdk` imports `contracts`, and `chain` for `jsonHash`. Authors import it through `swarmtales` and
`swarmtales/mechanic`.

### 6.1 `defineMechanic`: head and body

A port of old `packages/kernel/src/host/define.ts` and `kit.ts` and of the author types in
`packages/contracts/src/core/mechanic.ts` and `context.ts`, which move into `packages/sdk/src/mechanic/`.

```ts
// mechanic/definers.ts
export function defineService<const N extends string, const M extends ServiceMethods>(service: ServiceDefinition<N, M>): ServiceDefinition<N, M>;   // old defineApi
export function defineEvents<const Id extends string, const E extends EventSchemas>(id: Id, events: E): EventsDefinition<Id, E>;
export function defineTool<const N extends string, P extends TSchema>(name: N, parameters: P): ToolRef<N, P>;
export function reply(text: string, options?: { readonly endsTurn?: boolean }): ToolSuccess;
export function refuse(code: string, detail?: string): Refusal;

// mechanic/define-mechanic.ts
export function defineHead<...>(head: MechanicHead<Id, O, S, E, P, R, Pv, U>): MechanicHead<Id, O, S, E, P, R, Pv, U>;
export function defineMechanic<...>(
	head: MechanicHead<Id, O, S, E, P, R, Pv, U>,
	build: (kit: MechanicKit<Shape<O, S, E, P, R, Pv, U>>) => MechanicBody<Shape<O, S, E, P, R, Pv, U>, T>,
): MechanicDefinition<Id, O, E, T[number]["name"]>;
```

| Type | Fields at M1 | Change against the old type |
|---|---|---|
| `MechanicHead` | `id`, `package`, `summary`, `requires?`, `provides?`, `uses?`, `options`, `state`, `events`, `audiences?`, `prompts?` | `package` is new (the npm name; conformance checks it against `package.json`); `decisions` waits for M3. `state(setup)` gets `{ options, residents, seed, rng }`; `setup.random()` is not carried (no user) |
| `MechanicBody` | `tools?`, `services?`, `listeners?`, `facts?`, `hooks?`, `pipeline?`, `limits?`, `jobs?`, `snapshot?` | `commits`, `turns`, `presentation`, `guard` are not carried |
| `MechanicHooks` | `runStarted`, `tickStarted`, `turnInputs`, `tickEnded` (each a `HookSlot`), `news`, `toAct` | `minute*` renamed; `runResumed` gone; `turnOpened`, `turnEnded`, `runEnded` wait (1.4); `toAct(ctx): readonly string[]` (resident ids) is new |
| `HookSlot<F>` | `F`, or `{ run: F; after?: readonly string[] }`, or a list of those | `order: number` becomes `after` |
| `ListenOptions` | `{ after?: readonly string[] }` | `immediate` and `order` are gone |
| `MechanicPipeline` | `lock`, `rule`, `after` | `afford`, `settle` wait (1.4). The handler's `call` is the author's view: `{ tool, canonical, owner, actor, resident, params, seq }` with `tool` the **bare** name, as the old handlers compare it |
| `MechanicKit` | `tool`, `provide`, `listen`, `fact`, `limit`, `snapshot` | `provideSome`, `on` and `core` are gone (no user at M1) |
| `ToolDefinition` | `name`, `description`, `parameters`, `for?`, `free?`, `rule?`, `sample?`, `execute` | `suggest` becomes `for`; `limit`, `serves`, `guardText`, `consult` wait; `sample(ctx, random)` is new and optional |
| `MechanicContext` | `mechanic`, `seed`, `options`, `state`, `tick`, `ticks`, `residents`, `schedule`, `access`, `emit`, `call`, `has`, `tryCall`, `prompt`, `rng` | `minute` and `minutes` become `tick` and `ticks`; `random`, `roles`, `decide`, `decisions`, `stage` and `log` are gone or wait (1.4) |
| `ToolContext` | the context plus `actor: ActorId` and `resident: string \| undefined` | unchanged in meaning |
| `MechanicDefinition` | callable: `gridGame(options?)` returns a `MechanicUse`; members `id`, `package`, `source`, `summary`, `requires`, `provides`, `uses`, `options`, `events`, `prompts`, `parseOptions`, `resolve(options, texts, version): ResolvedPlugin` | `.with()` becomes the call; `instantiate` becomes `resolve`, which binds options and texts and returns the kernel's `ResolvedPlugin` |

The files of `mechanic/` and the seams between them (fixed in issue 07, so that issues 16, 17 and 26 run in
parallel). They are the old cut of `define.ts` and `kit.ts`:

```ts
// mechanic/parts.ts (type-only)
/** One instance while it is bound: the old `InstanceParts`. */
export interface InstanceParts<M extends MechanicShape> { readonly port: PluginPort; readonly head: HeadOf<M>; readonly options: M["options"]; readonly state: { value: M["state"] }; readonly texts: PromptLookup }
// mechanic/context.ts
export function contextFor<M extends MechanicShape>(parts: InstanceParts<M>, actor?: ActorId): ToolContext<M>;   // old contextFor; without an actor: `kernel`, no resident
export function viewFor<M extends MechanicShape>(parts: InstanceParts<M>): FactView<M>;
// mechanic/hooks.ts
export function bindHooks<M extends MechanicShape>(parts: InstanceParts<M>, hooks: MechanicHooks<M> | undefined): PluginHooks;
export function bindStages<M extends MechanicShape>(parts: InstanceParts<M>, pipeline: MechanicPipeline<M> | undefined): StageHandlers;
// mechanic/kit.ts
export function createKit<M extends MechanicShape>(parts: InstanceParts<M>): MechanicKit<M>;   // its `tool` returns a `KernelTool`, `provide` a `ProvidedService`, `listen` a `Listener`
export function recordingKit<M extends MechanicShape>(): { readonly kit: MechanicKit<M>; tools(): readonly { readonly name: string; readonly for: readonly string[]; readonly description: string }[] };   // inert: for `MechanicDefinition.tools(options)` (6.5)
// mechanic/arguments.ts (carried from old `host/arguments.ts`)
export function convertArguments(schema: TSchema, raw: unknown): unknown;
// mechanic/define-mechanic.ts
// `resolve(...).create(port)`: parse nothing again; state = head.state(setup); body = build(createKit(parts)); return the `PluginInstance` from the body, `bindHooks` and `bindStages`.
```

Rules of the port between author words and kernel words, done once in `context.ts`, `hooks.ts` and `kit.ts`:

- The author sees resident ids (`A01`); the kernel sees actor ids (`resident:A01`). `ctx.residents` is the view of
  the actors of kind `resident` with bare ids; a hook that takes a resident is called only for that kind and
  answers with bare ids (`toAct`).
- `ctx.access.lock(resident, "playMove")` takes the mechanic's own bare tool name or a `ToolRef`; the sdk makes it
  canonical with the mechanic's own package and id. Locking another mechanic's tool needs its `ToolRef` from its
  `/contract`; no ported mechanic does it.
- `kit.tool(...)` builds `prepare(raw, actor)` as: `convertArguments`, then the schema check, then the bound
  `rule` and `execute`. This is the old order (convert, then prepare), moved from the gateway into the wrapper.
- `ctx.emit` checks the payload against the head's schema and throws `SWT-M021`; a provided service checks input
  and output (`SWT-M022`); a fact checks its value. The kernel does not repeat these checks.
- `description` is a prompt id when it equals a key of the head's `prompts`, else it is the text itself.
  **Decided here.** Reason: ported mechanics keep their prompt files untouched, a new mechanic needs no file.
- `ctx.prompt(id, variables)` renders through the `PromptLookup` that resolution was given; lookup order as today:
  the game's folder, the mechanic's `prompts/` folder, `library/prompts/`.
- A carried mechanic keeps its `throw new Error(...)` lines (D2: one variable). The lint rule against them
  applies to `packages/` and `apps/`; the kernel reports such a throw as `SWT-R003` with the old message (3.2).

**Where the one-object sugar plugs in (D1).** If the spike passes, `defineMechanic` gains one overload
`defineMechanic(spec)` in `mechanic/define-mechanic.ts` whose whole body is
`const [head, build] = splitSpec(spec); return defineMechanic(head, build);`, with `splitSpec` in the reserved file
`mechanic/sugar.ts`. Nothing else in the sdk, the kernel or the contracts knows the sugar. If the spike fails, the
file is never created. No M1 issue depends on the verdict; the fixture mechanic and the five ports use head and body.
The spike's paper (`07-mechanic-spike.md`) did not exist when this file was challenged, so this paragraph stays
"to be aligned" (section 12).

**One registration site.** A mechanic is registered by its package alone: `package.json` carries
`"swarmtales": { "kind": "mechanic", "class": "base" | "game", "layer": 3, "mechanics": ["gridGame"] }`, naming the
exports that are definitions. A TypeScript game imports the definition; a data game, the CLI and (from M2) the README
generator read that field. There is no list of mechanics in `apps`, `scripts` or the sdk. **Decided here.** Reason:
the old five sites become one, and no tool needs a hand-kept table.

### 6.2 `defineGame`

```ts
// game/define-game.ts
/** The builder form: `GameData` with the mechanics as typed uses instead of ids. `schema: 1` may be left out. */
export interface Game<Ms extends readonly MechanicUse[] = readonly MechanicUse[]> extends Omit<GameData, "schema" | "mechanics" | "grants" | "locked"> {
	readonly mechanics: Ms;
	readonly grants?: Partial<Readonly<Record<string, readonly ToolOf<Ms>[] | { readonly drop?: readonly ToolOf<Ms>[]; readonly add?: readonly ToolOf<Ms>[] }>>>;
	readonly locked?: readonly ToolOf<Ms>[];
}
export function defineGame<const Ms extends readonly MechanicUse[]>(game: Game<Ms>): Game<Ms>;
/** The data form of a builder game, and the definitions it used, by id. */
export function gameData(game: Game): { readonly data: GameData; readonly mechanics: Readonly<Record<string, MechanicDefinition>> };
```

A port of old `defineCoreStory` and `storyData` (`packages/kernel/src/host/define.ts`). The tool-name inference
(`ToolOf<Ms>`) is kept, so a grant or a lock of a tool whose mechanic is not listed does not compile. Compile-time
checks of resident ids and of missing services are not built at M1 (DECISIONS 04 #10); they are load errors.
`MechanicUse`, `Game`, `ToolOf`, `ResolveInput` and `ResolvedGame` are declared in `game/types.ts` (issue 07).

### 6.3 `defineDirector`, reserved

No code and no type at M1 (1.4; changed in the challenge: the first draft exported a `declare function` with no
body, which fails at run time when imported). The name and the shape are fixed by paper 04 section 2.3 and C10:
`defineDirector(spec)` with `id`, `summary`, `dials?`, `on` (triggers), `system`, `input`, `output` (a schema),
`act(answer, ctx)`, `fallback()`, `sample?`, `limits?` and `tools?` as the declared exception. A game with a
non-empty `directors` is `SWT-G003` until M3.

### 6.4 The `roster` plugin

`packages/sdk/src/roster/index.ts`, id `roster`, package `@swarmtales/sdk`. It is a `ResolvedPlugin` written by
hand (`rosterPlugin(version): ResolvedPlugin`) plus its contract `RosterService` (`defineService`), not a
`defineMechanic` call: it has no options, no state, no tools and no events, and this way game resolution does not
wait for `defineMechanic` (**changed in the challenge**). It provides the service `roster` (all queries):
`ids(): string[]`, `teams(): Record<string, string[]>`, `teamOf({ resident }): string | null`,
`roles(): Record<string, string[]>`, `roleOf({ resident }): string | null`, `present({ resident }): boolean`
(may act). It reads `ActorsView.shared` (`team`, `role`) and `mayAct`. Game resolution appends it unless a listed
mechanic provides `roster`; it is then the last plugin in load order. No ported mechanic calls it at M1 (they keep
their `teams` option, D2); it is there because E1 and DECISIONS 04 #10 fix where teams and roles live, and its
test is the proof that `shared` is written.

### 6.5 Game resolution

```ts
// game/types.ts
export interface ResolveInput {
	readonly game: Game | GameData;
	readonly installed?: Readonly<Record<string, MechanicDefinition>>;   // for a data game: id -> definition
	readonly schedulers: Readonly<Record<string, SchedulerDefinition>>;  // "turns" -> the definition (the sdk may not import the engine)
	readonly prompts: PromptLookup;
	readonly seed?: number;
	readonly versions?: Readonly<Record<string, string>>;                // package name -> version, for the manifest; "0.0.0" when absent
}
export interface ResolvedGame {
	readonly definition: KernelDefinition;
	readonly data: GameData;                                             // defaults filled, `roster` listed; `definition.game.hash` is its `jsonHash`
	readonly texts: Readonly<Record<string, string>>;                    // every text a model may read, by key
	readonly briefings: Readonly<Record<string, string>>;                // actor id -> briefing
	readonly win: string | undefined;                                    // the fact key
}
// game/resolve.ts
export function resolveGame(input: ResolveInput): ResolvedGame;        // throws one SwtError with every issue found
```

Steps, in order; each collects issues and resolution throws once at the end, sorted by data path. Every step is a
function `(data, definitions) => readonly SwtIssue[]` (or a value plus issues) in the file named, so the steps are
built and tested apart:

1. Schema (`validate.ts`): the data form against `GameDefinitionSchema` (`G001`, `G002`, `G003`).
2. Residents (`validate.ts`): a count becomes `A01`.. (width 2, or the count's digits; old `residentIds`); ids
   unique (`G010`). Each becomes an actor `resident:<id>` of kind and grant `resident`.
3. Teams and roles (`validate.ts`): members are residents (`G011`); written into `shared`.
4. Mechanics (`validate.ts`): find each definition (`G022`), no id twice (`G021`), parse options with defaults
   (`G020`), event types against the kernel's and each other's (`M010`), append `roster` (6.4).
5. Services and load order (`load-order.ts`): `G030`, `G031`, `G032`.
6. Tool names (`tool-names.ts`): canonical names; shown names from `as` or the bare name; clashes within a grant
   (`G013`); the pattern (`G014`). The tool list of a mechanic is static: `MechanicDefinition` carries the tool
   names and their `for` lists (see below).
7. Grants and locks (`grants.ts`): derive from `for`, apply lists and tweaks; every named tool exists (`G012`,
   with `closest`). `locked` becomes `startLocks.resident`.
8. Texts (`texts.ts`): render every tool description and collect every prompt of every mechanic and the kernel
   replies (`library/prompts/replies/core/{unknown-tool,not-granted,locked,steps}`); a missing text is `P003`.
9. Scheduler (`resolve.ts`): default `{ id: "turns" }`; options against the definition's schema (`G020` with the
   path `scheduler.options`).
10. Build `KernelDefinition` (`end.ticks` becomes `limits.maxTicks`); hash the data form with `jsonHash`.

**What resolution cannot see, and who checks it (changed in the challenge).** The first draft instantiated every
plugin once against a stub port that throws, to learn what only a body shows. That breaks on any mechanic whose
`state` function draws from `rng` (the fixture does). Resolution now reads heads and data only:

| Check | Where |
|---|---|
| tool names and their `for` lists (steps 6 and 7) | static: `defineMechanic` cannot know them without a body, so the sdk builds the body **once per `resolve` call against an inert kit** that records `kit.tool` definitions and runs no state function. `MechanicDefinition.tools(options)` returns `{ name, for, description }[]` |
| two `toAct` hooks, `after` cycles | the kernel at load (`SWT-R013`, `SWT-R016`) |
| activation `toAct` without a hook | `turns` at the first tick (`SWT-R014`) |
| `win.fact` names no fact | the caller: `play` and the CLI call `kernel.fact(win)` once after `createKernel` and before `start()` (`SWT-R015`) |
| a mechanic's own option check in `state` (old: `grid-game: line 4 does not fit a board of 3`) | the kernel at load, as `SWT-R003` with the old message |
| state without a snapshot slice | conformance (`checkSnapshotRoundTrip`), no code |

## 7. Testkit

`@swarmtales/testkit`, reachable as `swarmtales/testing`. A port of old `packages/testkit/src/agents.ts` and
`conformance.ts`; `golden.ts`, `gates.ts`, `stand-ins.ts`, `overseers.ts` are not carried; `mutation.ts` is carried
with the mutation gate in its own issue after M1 (E7).

```ts
// drivers.ts
export interface PlannedCall { readonly tool: string; readonly params: unknown }
export type Plan = (activation: Activation) => readonly PlannedCall[] | Promise<readonly PlannedCall[]>;
export interface CallRecord { readonly tick: number; readonly actor: ActorId; readonly tool: string; readonly outcome: ToolOutcome }
/** Makes the planned calls one after the other; never pending. */
export function scriptedDriver(plan: Plan, record?: CallRecord[]): ActorDriver;
export const idleDriver: ActorDriver;
/** `--fake`: for the activated actor, calls the first open tool whose `sample` gives params; again until a reply ends the turn, no tool samples, or 8 calls. */
export function fakeDriver(kernel: Kernel, seed: number): ActorDriver;

// play.ts
export interface PlayOptions { readonly seed?: number; readonly drivers?: DriverTable | ((kernel: Kernel) => DriverTable); readonly script?: Readonly<Record<string, readonly (readonly [string, unknown])[]>>; readonly ticks?: number; readonly prompts?: PromptLookup; readonly resume?: ResumeInput; readonly sinks?: readonly EventSink[] }
export interface Played { readonly kernel: Kernel; readonly end: RunEnd | undefined; readonly events: readonly Envelope[] }
/** Resolves the game, creates a kernel, checks `win.fact`, and plays to the end or `ticks` ticks. */
export function play(game: Game | GameData, options?: PlayOptions): Promise<Played>;
/** A started kernel with the old host's test helpers, so ported tests change names only. */
export function host(game: Game | GameData, options?: PlayOptions): TestHost;
export interface TestHost { readonly kernel: Kernel; call(resident: string, tool: string, params: unknown): Promise<ToolOutcome>; openTools(resident: string): readonly string[]; fact(key: string): unknown; playTicks(driver: ActorDriver, ticks: number): Promise<RunEnd | undefined> }
```

An `ActorDriver` is a plain async function of the activation, so a test that decides each call from the reply
before it (the old tests' `turn.call` style) passes such a function; there is no wrapper for it. A carried
scripted player changes names only: `turn.resident` becomes `nameOf(activation.actor)`, `turn.minute` becomes
`activation.tick`, `turn.pass` becomes `activation.detail.pass`.

There is no run-assembly helper (**changed in the challenge**: `createRun` was five lines around `createKernel`).
`play` and the CLI both do the same four steps, and `play` is their shared test: `resolveGame`, `createKernel(
resolved.definition, { sinks }, resume)`, `kernel.fact(resolved.win)` when a win fact is named, `kernel.run(
drivers, until)`. Without `options.prompts`, `play` uses the lookup of `@swarmtales/prompts` over the repository's
folders; `drivers` defaults to `{ resident: idleDriver }`.

**Fixture mechanic.** `packages/testkit/src/fixtures/guess-number.ts`, id `guess-number`, in head-and-body form, at
most 80 code lines: option `max` (default 100), state `{ secret, winner? }` with `secret = rng("guess-number",
"secret").int(1, max)`, event `guessed { by, value, hint }`, one tool `guess { value }` for `resident` with an inline
description, a `sample`, `reply(..., { endsTurn: true })`, a run limit `solved`, a snapshot slice, a `toAct` hook
naming every resident while unsolved. It is the integration fixture of kernel, sdk, `turns` and testkit together
(the units before it are tested against fakes) and the body of sample 5 at M6. Its tests: found in two guesses;
determinism; snapshot round trip; a wrong payload is `SWT-M021`; a game with `activation: "toAct"` wakes only
whom the hook names.

**Conformance** (`conformance.ts`, each returns a list of problems): `checkDeterminism(game, driver)` (two runs,
equal envelopes), `checkSnapshotRoundTrip(game, driver, cut)` (cut at a tick, JSON round trip, resume, equal events
after the cut), `checkOptionsDocumented(definition)`, `checkPackage(definition, packageJson)` (`SWT-M011`, the
`swarmtales` field). Source rules (no kernel import, no `node:*`, no wall clock) are the layer check's and the
lint's job (M0), not a second check here.

**Oracle runner** (`oracle/`). The file format is version 1 of `swarmtales.oracle`. Its definition is
`oracles/README.md` and the Typebox schema `OracleSchema` in `scripts/oracles/format.ts` (branch `m0/oracles`). This
section does not repeat the format; it says what the runner does with it. Where the two disagree, the README and
the schema win, and this section is corrected by an `interface-change` issue.

How the schema reaches the testkit: `scripts/oracles/format.ts` imports only `typebox`. The oracle runner issue
moves it to `packages/testkit/src/oracle/format.ts` (carried, byte-identical below the licence header) and changes
the pointer in `oracles/README.md`. The export scripts stay on `v0-final`: they run the old platform and are not
part of the rewrite. There is one schema file in the repository, not a copy.

```ts
// oracle/format.ts (carried): ORACLE_FORMAT, ORACLE_VERSION, OracleSchema, OracleEntrySchema, Oracle, OracleEntry, OracleCall
// oracle/read.ts
/** Parses the file against `OracleSchema` and checks `counts` against the timeline; throws on either. */
export function readOracle(path: string): Oracle;
// oracle/timeline.ts
/** Folds the envelopes of a new run into oracle entries, with the mapping of the table below. */
export function timelineOf(events: readonly Envelope[]): readonly OracleEntry[];
// oracle/run.ts
export type OracleLevel = 1 | 2 | 3;                         // rules, texts, scheduling: the levels of the README
export interface OracleMismatch { readonly level: OracleLevel; readonly at: "setup" | "call" | "event" | "inputs" | "turn" | "end"; readonly index: number; readonly expected: unknown; readonly actual: unknown }   // index: position in the oracle's timeline, -1 for setup and end
/** Plays `game` from the oracle's inputs and compares up to `level` (default 3). An empty list is a match. */
export function runOracle(oracle: Oracle, game: Game | GameData, level?: OracleLevel): Promise<readonly OracleMismatch[]>;
```

**Replaying the inputs.** The README names the inputs: `setup`, the `minute` entries, the `turn` entries without
their `inputs`, and the `call` entries reduced to `actor`, `tool`, `params`. The runner does not force the old
schedule on the new scheduler. It plays the game with `turns` (through `play`) and one driver for `resident`: at
the n-th activation of resident R, the driver submits the calls that follow R's n-th `turn` entry in the timeline
(all `call` entries with `actor: "resident:R"` after that entry and before R's next `turn` entry), one after the
other, each awaited. It never looks at a reply. An activation for which the oracle has no `turn` entry gets no
call and is a level 3 mismatch. The seed is `oracle.seed`; the tick limit is `setup.minutes`.

**Before the run** the runner compares the resolved game with `setup` and reports each difference as `at:
"setup"`: `residents` (roster order), `residentTools` (the grant of `resident`, in order, shown names), `locked`,
`turns` (`passes`, `blockSize`, `activation`; `order: "seeded"`), `setup.minutes` against the game's `end.ticks`,
`limits.maxStepsPerMinute` against `limits.maxCallsPerTick`, and per mechanic id the effective options, deep
equal. The `mechanics` list is compared as a set of ids: the files list the mechanics in the order of the game,
not in load order (the load order is 3.4 and shows in the event order).

**After the run** it folds the new log with `timelineOf` and compares the two timelines entry by entry, filtered
to the level. It reports the first mismatch of each `at` kind and stops.

| Oracle entry | From the new log | Declared mapping |
|---|---|---|
| `minute` | `tick_started` | `minute` is the envelope's `tick` |
| `turn` | `activation_opened` | `resident` is the actor's name; `pass`, `block` are `detail.pass`, `detail.block`; `inputs` are the payload's `inputs` |
| `skip` | `activation_skipped` of `turns` | `resident` is the actor's name |
| `call` | `tool_called` and the `tool_result` or `tool_refused` it caused | `tool` is `as`; `stage` and `code` unchanged (the stage names are the old ones, 3.3) |
| `event` of a mechanic | every envelope whose `source` is `<package>/<id>` of a plugin named in `setup.mechanics` | `source` is `<id>`; `actor` `kernel` reads `host`; absent `audience` means everyone |
| `event` `core.tool_locked`, `core.tool_unlocked` | kernel `tool_locked`, `tool_unlocked` | payload `{ resident, tool, by }` from `{ actor, tool, by }`: the actor's name, the tool's bare name, the plugin's id |
| `event` `core.referee_intervened` | kernel `limit_reached` | payload `{ limit, reason }` unchanged; `limit` is `<plugin id>.<limit id>` in both |
| `end` | the `RunEnd` | `referee` is `limit`, `minutes` is `ticks`; `minute` is `tick`; `limit` unchanged |

Not folded, because the oracle dropped the same bookkeeping: `run_started`, `run_ended`, `tick_ended`, `job_ran`,
`service_called`, `activation_closed`, `pass_started`, and the events of `roster`. Entries before the first
`minute` entry are the consequences of the run-start hooks; they are compared like any other.

| Level | Compared | Claimed by the port of tic-tac-toe |
|---|---|---|
| 1, rules | per `call`: `ok`, `code`, `stage`; the mechanic events in order with `type`, `actor`, `audience`, `payload`; `end` | yes, required |
| 2, texts | in addition `reply`, `detail`, `endsTurn`, and the `inputs` of each `turn`, byte for byte | yes: D14 keeps prompts and tool names, D2 keeps reply strings |
| 3, scheduling | in addition the `minute`, `turn` and `skip` entries and the three `core` events above, in their place between the other entries | yes: `turns` is a port of the old turn loop with the same seeded order and the same wake rule (3.6, 4.2), and no decision changes it for this game |

Level 3 is the claim that proves the kernel is the only variable. If a later decision changes the scheduler for
a game, that game's oracle test drops to level 2 and says so in its README.

Not built at M1, each refused with a clear error by `runOracle` until its first game is ported: a `call` whose
actor is not a resident (`script`, `gamemaker`, `human`, `overseer:`), `resume` entries, `truncated` files,
`setup.definition`, `turns.order: "custom"`, and any other `core` event. None of the seven tic-tac-toe files has
one of them.

What the oracles do not prove: a scripted file never has a pending driver, so the "answer" wake reason of 4.2 is
covered only by the two live replays and by `turns.test.ts`; the briefing is not in a file (8.2 pins its hash).

**Replay** is not built at M1 (1.4). Determinism at M1 is proven by `checkDeterminism` (two runs, equal
envelopes) and by the oracle. The log already holds what replay needs: every `tool_called` of an activation is
caused by its `activation_opened`, with the shown name, the raw params and the basis.

## 8. The port of tic-tac-toe teams

Rule of the port (D2, D14): one variable, the kernel. Prompt files, tool names, refusal codes, reply strings, event
types and payloads, option names and defaults, random labels and the wake rule are byte-identical. The pull request
states "prompt texts and tool names byte-identical: yes" and proves it with a test that compares the sha256 of every
carried prompt file and of every tool name list with a list generated on `v0-final`.

### 8.1 Renames applied to every carried source file (mechanical, nothing else changes)

| Old | New |
|---|---|
| `import ... from "@swarmtales/kernel"` | `from "@swarmtales/sdk"` |
| `defineApi`, `XxxApi` | `defineService`, `XxxService` (the service **name strings** stay) |
| `mechanic.with(options)` | `mechanic(options)` |
| `suggest: ["resident"]` | `for: ["resident"]` |
| `ctx.minute`, `ctx.minutes`, `minuteStarted`, `minuteEnded` | `ctx.tick`, `ctx.ticks`, `tickStarted`, `tickEnded` |
| `order: HOOK_ORDER.x.y` | removed, or `after: [...]` where 3.4 says so; the import of `@swarmtales/mechanic-shared` goes |
| head | gains `package: "<npm name>"` |
| `Actor`, `"host"` | `ActorId`, `"kernel"` |
| `guardText: (params) => params.text` (`team-channel`, `postTeam`) | removed: no guard at M1 and the game sets no guard policy; it returns with the guard at M3 |
| `call.tool`, `call.owner`, `call.resident` in pipeline handlers | unchanged: the sdk's call view keeps the bare tool name (6.1) |
| `throw new Error(...)` | unchanged (6.1) |
| `ContextOf`, `ToolContextOf`, `ViewOf` from `@swarmtales/contracts` | the same names from `@swarmtales/sdk` |
| imports of another mechanic's root | its `/contract` (services, events) or `/rules` (pure functions) |

### 8.2 File by file

| Old path | New path | Action |
|---|---|---|
| `mechanics/consensus/src/source.ts` (`ConsensusSourceApi`) | `mechanics/contracts/src/consensus-source.ts` | carried; two providers today (`grid-game`, `morris`) |
| `mechanics/strategy-brain/src/source.ts`, the `BrainSourceApi` part | `mechanics/contracts/src/brain-source.ts` | carried; `StrategyBrainApi` stays in `strategy-brain/src/contract.ts` |
| `mechanics/grid-game/src/api.ts`, `events.ts` | `mechanics/grid-game/src/service.ts`, `events.ts`; new `contract.ts` re-exports both | carried |
| `mechanics/grid-game/src/model.ts` | same; new `rules.ts` re-exports `emptyBoard`, `freeCells`, `linesOf`, `other`, `winnerOf`, `Cell`, `Side` | carried, unchanged |
| `mechanics/grid-game/src/index.ts` | same | carried with 8.1; `runStarted` gets `after: ["strategy-brain"]`; the `turnInputs` order number goes |
| `mechanics/grid-game/prompts/grid-game/tools/{viewBoard,playMove}.md` | same | carried, byte-identical |
| `mechanics/grid-game/README.md` | same | carried; regenerated when the README generator is ported (M2) |
| `mechanics/consensus/src/index.ts`, 9 prompt files | same; `contract.ts` holds `ConsensusService` | carried with 8.1 |
| `mechanics/team-channel/src/index.ts`, 5 prompt files | same; `contract.ts` holds `TeamChannelService` | carried with 8.1 |
| `mechanics/strategy-brain/src/index.ts`, `text.ts`, 22 prompt files | same | carried with 8.1; imports `grid-game/contract`, `team-channel/contract` |
| `mechanics/optimal-referee/src/index.ts`, `minimax.ts` | same | carried with 8.1; imports `grid-game/contract` and `grid-game/rules` |
| `library/prompts/replies/core/{unknown-tool,not-granted,locked,steps}.md` | same | carried, byte-identical (`limit.md` returns with tool limits) |
| `packages/prompts/src/*` (256 code lines) | same | carried; it imports the `PromptLookup` type from contracts (`game/prompts.ts`) |
| `stories/tictactoe-teams/story.ts`, `tictactoeStory` | `games/tictactoe-teams/game.ts`, `tictactoeGame(options)` and the default export | ported: same options and defaults; returns `defineGame({...})` |
| the same file, `briefing(...)` | `games/tictactoe-teams/briefing.ts` | carried: the template strings byte-identical; called at build time with the resident count in place of `host.residents.length`, the result is the game's `briefing` record. No model reads it before M2; a test pins its sha256 against `v0-final` |
| the same file, `storyName`, `tictactoeEntry`; `stories/index.ts` | not carried | variants are options of the factory; the name grammar is dropped |
| `stories/tictactoe-teams/README.md` | `games/tictactoe-teams/README.md` | rewritten short; run links point at `v0-final` |
| each package's `package.json`, `tsconfig.json`, `tsdown.config.ts` | same | new: `Apache-2.0`, exports `.`, `./contract`, `./rules` (where present), the `swarmtales` field |

How the game changes shape (the only hand-written part of the game file):

```ts
return defineGame({
	id: "tictactoe-teams", title: "Tic-tac-toe teams", seed,
	residents: [...teams.X, ...teams.O],
	mechanics: [gridGame({ ...as before }), consensus({ ...as before }), teamChannel({ ...as before }), strategyBrain({ ...as before }), optimalReferee({ ...as before })],
	grants: { resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", ...(brain ? ["readBrain", "writeBrain"] as const : [])] },
	locked: brain ? ["playMove", "writeBrain"] : ["playMove"],
	scheduler: { id: "turns", options: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "grid-game" }, { source: "team-channel" }, { source: "consensus" }] } },
	limits: { maxCallsPerTick: 8 },
	end: { ticks: options.minutes ?? games * minutesPerGame(size) + 8 },
	win: { fact: "grid-game.tally" },
	briefing: briefings(...),
	model: "anthropic/claude-haiku-5-5",
});
```

The explicit `grants` list keeps the order of tools a model sees. The id is always `tictactoe-teams`; the variant is
in the options and so in `game.hash`. `inputs` is the old `[{ kind: "context-reset" }]` plus the four `{ source }`
entries that replace the old hook numbers 300, 350, 400, 500 (3.4). The game does not use `teams` of the game
format: the five mechanics keep their `teams` option (D2). The output cap of 16000 tokens and the neutral system prompt belong to the
model driver and are ported with it at M2.

**The oracle files and the variants the factory must reproduce.** The oracles of the game are the seven files of
`oracles/tictactoe/` (their list and what each covers: `oracles/tictactoe/README.md`). Each names an old registry
`variant`; the old name grammar is not carried, so the game's oracle test holds this table, and nothing else does:

| `variant` of the file | Seeds | Options of `tictactoeGame` | Source of the calls |
|---|---|---|---|
| `tictactoe-teams` | 7, 11 | none | scripted |
| `tictactoe-teams-nobrain` | 7 | `brain: false` | scripted |
| `tictactoe-teams-solo` | 7 | `teamSize: 1` | scripted |
| `tictactoe-teams-4x4` | 7 | `size: 4, line: 4` | scripted; has two `TOOL_LOCKED` refusals and one `STEP_LIMIT` |
| `tictactoe-teams-5x5-nobrain-solo` | 1, 3 | `size: 5, line: 4, brain: false, teamSize: 1` | replay of a recorded live run, exact; has `ILLEGAL_CELL` refusals |

The seed is the file's `seed`. All seven play with `order: "seeded"` (the game's default), five passes and block
size 1, and end by the run limit `grid-game.match`. `strategy-brain` is loaded in every variant; `brain: false`
sets its option `enabled: false` and takes `readBrain` and `writeBrain` out of the grant and `writeBrain` out of
`locked`. Only the two 5x5 files are what models really played; the other five are hand-written players, which is
enough for rules and texts but does not show what a model does with them.

What no oracle file covers, and what covers it instead: forfeits by the move timer and the invalid match after
four forfeits in a row (`consensus.test.ts`, `grid-game.test.ts`, carried); a team of three against one resident
(`tictactoe-teams-mixed.test.ts`, carried); a brain on one side only (`tictactoe-teams-brain-o.test.ts`,
carried); a fixed captain and a brain as a list of rules (`grid-game.test.ts`, `strategy-brain.test.ts`, carried).
If one of these carried tests does not exist under that name on `v0-final`, the port issue names the test that
covers the case in its pull request, or adds one.

### 8.3 Tests that come along (D7, E7: tests live in their package)

| Old test file | New place | Changes |
|---|---|---|
| `test/mechanics/grid-game/grid-game.test.ts`, `support.ts` | `mechanics/grid-game/test/` | `createHost` and `playStory` become the testkit's `host` and `play`; `order: (view) => view.residents` becomes `order: "roster"`; `host.facts()[k]` becomes `fact(k)` |
| `test/mechanics/consensus/consensus.test.ts`, `toy.ts`, `prompts/toy/*` | `mechanics/consensus/test/` | the same; `toy.ts` is a test mechanic and gets 8.1 |
| `test/mechanics/team-channel/team-channel.test.ts`, `prompts/rounds/*` | `mechanics/team-channel/test/` | the same |
| `test/mechanics/strategy-brain/strategy-brain.test.ts` | `mechanics/strategy-brain/test/` | the same |
| `test/mechanics/optimal-referee/optimal-referee.test.ts` | `mechanics/optimal-referee/test/` | the same |
| `test/stories/tictactoe-support.ts`, `tictactoe-teams.test.ts`, `-4x4`, `-brain-o`, `-mixed` | `games/tictactoe-teams/test/` | the same; assertions on `core` events (`turn_started`, `minute_started`) move to the kernel event names |
| new | `games/tictactoe-teams/test/oracle.test.ts` | for each of the seven files of `oracles/tictactoe/`: `runOracle(readOracle(file), tictactoeGame(options), 3)` returns no mismatch (the variant table of 8.2). The carried tests play in roster order, the oracles in seeded order, so both orders are proven |
| new | `mechanics/*/test/carried.test.ts` | the byte-identity list of 8 (prompts, tool names) |

A test that asserted old-engine bytes (a golden legacy line) is dropped and named in the pull request. No assertion
on a mechanic event, a reply or a refusal code is weakened; if one fails, the port is wrong, not the test.

## 9. CLI slice, run folder, viewer

### 9.1 Commands

| Command | Does | Exit |
|---|---|---|
| `swt run <game file> --fake [--seed n] [--out dir] [--json]` | loads the file, resolves it, plays it with the fake driver, writes a run folder, verifies it, prints the result line | 0 finished; 1 `SwtError` before the run (printed with `formatIssue`, or as JSON); 2 the run ended with reason `error` |
| `swt run <game file>` without `--fake` | `SWT-C020` at M1: live models arrive with M2 | 1 |
| `swt log verify <run dir> [--json]` | `verifyRun`: prints `ok, <n> lines, head <hash>` or the first issue with its line | 0 ok; 1 broken; 3 unfinished run |

`--seed` overrides the game's `seed`. The default `--out` is `runs/` under the current directory.

**Game files** (`apps/cli/src/load-game.ts`): `.ts`, `.mts`, `.js`, `.mjs` are imported and must default-export a
`Game` (`SWT-C002` otherwise); `.json`, `.yaml`, `.yml` are parsed (`yaml` package, YAML 1.2) as `GameData` whose
`mechanics[].use` ids are found in the installed table. The installed table (`installed.ts`) is built from the
`swarmtales` field of the CLI's dependencies (6.1), not written by hand.

**`--fake`** is the driver `fake/sample` (7): seeded legal calls from the tools' `sample` functions. **Decided
here (challenge):** at M1 the fake driver plays from `sample` only. DECISIONS 04 #5 lets it play "from the turn
source where one exists"; that needs the driver to know a mechanic-level contract, which the testkit may not
import, and `playMove.sample` gives the same legal random move. A granted tool
without `sample` gives the warning `SWT-C010` once; the run still plays. The terminal prints a banner
`fake models: no result`; the manifest records `driver: "fake/sample"` for every actor. Output of the Hello Game:

```
fake models: no result
hello-game seed 1: ended after 4 ticks (limit grid-game.match: the match is over)
result grid-game.tally: {"X":1,"O":0,"draw":0}
log verified: 61 lines, head 3f9c...
run: runs/hello-game-001
```

(The numbers are examples; the test pins the real ones.)

### 9.2 Run folder

`runs/<game id>-<NNN>/`, NNN the next free number with three digits:

| File | Content | Signed |
|---|---|---|
| `manifest.json` | the `RunManifest`, canonical JSON | its hash is in the genesis |
| `events.jsonl` | one stored envelope per line, canonical JSON | every line |
| `events.chain.jsonl` | the genesis (version 2), one hash entry per line, signed heads | |
| `run.pub` | the run's Ed25519 public key, PEM | |
| `game.json` | `ResolvedGame.data`: what `game.hash` hashes | by hash, through the manifest |
| `texts.json` | key to text: every plugin text, kernel reply and briefing | by hash, through the manifest (`texts`, `textHashes`) |

**Decided here:** texts are a file committed by hash, not `prompt_fixed` events, at M1. Reason: no model reads a
system prompt before M2; the events arrive with the model driver, and the manifest already fixes every text.
`000-run.json` and `usage.json` are not written (the manifest replaces the first; the second is M2).

The manifest builder (`engine/src/run/manifest.ts`):

```ts
export interface ManifestRun { readonly id: string; readonly startedAt: string; readonly drivers: Readonly<Record<string, string>>; readonly kernelRevision: number; readonly kernelVersion: string; readonly node: string; readonly commit?: string; readonly dirty?: boolean }
export function buildManifest(resolved: ResolvedGame, run: ManifestRun): RunManifest;
```

The CLI's `run.ts` does the four steps of section 7 with the sink of the run folder; the kernel revision is passed
in by the caller, so the engine needs no import of the kernel.

`runlog` gives `openRunFolder(dir, manifest, { now }): { sink: EventSink; close(): void }`, which writes the
manifest, the genesis and the key, and returns the sink that stamps `at` from `now()`, writes the line and chains it.
`now` is injected (the CLI passes the wall clock, tests a fixed clock), so a test run is byte-reproducible.

### 9.3 The viewer

Carried: old `packages/viewer-core`, `packages/viewer-ui`, `apps/viewer-web` (the VS Code extension follows after
M1). The viewer works on `RunEvent` records (`packages/viewer-core/src/events.ts`); only the reader changes.

| | Legacy reader (kept, read-only) | Envelope reader (new, `viewer-core/src/envelope.ts`) |
|---|---|---|
| Recognised by | no `manifest.json`; genesis version 1 | `manifest.json` with `log.format === "swarmtales.events"` |
| Line shape | flat: `type`, `seq`, `minute`, `at`, payload fields beside them | `StoredEnvelopeSchema`: payload nested |
| `RunEvent.minute` | the line's `minute` | the envelope's `tick` |
| `RunEvent.actor` | the first of `ACTOR_FIELDS`, or the type's `ActorRule` | `nameOf(envelope.actor)`; `kernel` and `script` as they are |
| `RunEvent.data` | the whole line | the payload's fields (when it is an object) plus `type`, `seq`, `minute`, `source`, `actor`, `causedBy`, `basis`, `tool` |
| Run header | `000-run.json` (`RunMetaSchema`), `usage.json` | `manifest.json`: run id, game id and title, seed, started, actors with driver and model |
| Chain verdict | `verifyChainText` | `verifyRunTexts` plus `envelopeLogIssues` |
| Needs from M1 | nothing new | `EnvelopeSchema`, `RunManifestSchema` (contracts), the version 2 genesis (chain) |

`loadRun` picks the reader by the first row. Views that key on City event types simply find none in an M1 run; the
timeline, the event list, the per-actor filter and the chain badge work. A board view for `grid-game` is not part
of M1. Old runs stay readable with `ref=legacy` (DECISIONS 8.2).

## 10. Issues of M1

### 10.1 The count

DECISIONS D4 budgets 18 issues for M1 and limits an issue to 400 hand-written lines. The two do not meet. The
volume of sections 1 to 9 is about 5200 new source lines plus about 4300 test lines. The first draft cut this into
26 issues, of which five were over the limit once their tests were counted (contracts D, the sdk game checks,
`turns`, the kernel assembly, the CLI). **Decided here:** the 400-line rule wins and M1 has **37 issues** (00 to
36). Reasons: the rule is what keeps a challenger review possible; and nine of the issues exist to fix interfaces
first, so that the rest runs in parallel (10.2). M0 to M2 then have 69 issues, between the budget of 50 and kill
criterion 1 (100); at 6 million tokens per issue M1 alone would take 222 million of the 300 million budget, so the
recalibration of D4 after the tenth merge is decisive, and small interface issues are expected to pull the median
down. The recalibration issue records this.

Every issue: pull request to `develop`, challenger on another model, `pnpm check` green, token and time record,
the template field "variable changed" (`kernel` for all but 31 to 33, 35 and 36, which say `none` beyond the
kernel). "Lines" is the estimate of hand-written code lines, source plus tests; carried and generated files do not
count.

### 10.2 Interfaces first, then width

The plan has three phases.

1. **Scaffold (issue 00).** Every package folder of 1.1 with its `package.json` (all dependencies, the
   `swarmtales` field, the layer), `tsconfig.json`, build configuration, an empty `src/index.ts`, and the lockfile.
   After it, no M1 issue touches the lockfile, the workspace file or another package's manifest.
2. **Interface freeze (issues 01 to 09, waves 1 and 2).** All contracts; the kernel's internal part interfaces
   (`parts.ts`); the sdk's author types, game types and seams; the error catalogue; the scheduler options. These
   are reviewed against this file line by line. After their merge they change only through an issue with the
   label `interface-change`.
3. **Width (issues 10 to 36).** Each issue implements one side of an interface and proves it against hand-written
   fakes of the other side; the assembly issues (25, 26, 27, 29) join the sides and run the integration tests.

Rules that make the width safe:

- **Allowed paths are disjoint** inside a wave, file by file. A test file is named after its source file.
- **Barrels.** The scaffold writes each package's root `src/index.ts` and one empty barrel per source folder.
  A builder edits only the barrel of a folder its issue owns alone; a root `index.ts` line is added by the
  integrator at merge, from a list in the pull request body.
- **Work ahead.** An issue may be **built** as soon as the interfaces it codes against are merged ("Start
  after"). Its pull request is opened when its runtime dependencies are merged and its proving test is green
  ("Merge after"). From the end of wave 2, every issue from 10 to 36 can be built at the same time.
- **E4 stands.** DECISIONS E4 allows three open pull requests. Its reason is conflicts in generated files, which
  the three rules above remove inside M1. This file does not change E4: until it is reopened by an issue that
  cites these rules, builders work in parallel on branches and the integrator opens at most three pull requests
  at a time, in the order of the wave table.

### 10.3 The issues

| # | Title | Done when | Allowed paths | Proving test | Start after | Merge after | Lines |
|---|---|---|---|---|---|---|---|
| 00 | Scaffold of every M1 package | every package of 1.1 exists and passes the check empty; layer fields and the `swarmtales` fields are set; the umbrella `swarmtales` re-exports `@swarmtales/sdk` (`.`, `./mechanic`) and `@swarmtales/testkit` (`./testing`); the lockfile holds `typebox`, `@noble/*`, `yaml` | every `package.json`, `tsconfig.json`, build file, `src/index.ts` and empty folder barrel; `packages/swarmtales/**`; workspace file, lockfile | the layer check and the licence gate run green over the empty packages | M0 scaffold | M0 scaffold | 60 |
| 01 | Contracts 1: kernel-facing types | every interface, type and constant of 2.1 to 2.8 exists, type-only except `actorId`, `kindOf`, `nameOf`; the word-list test is green over `src/kernel` | `packages/contracts/src/values.ts`, `src/kernel/{actor,envelope,tool,service,event-def,plugin,ports,kernel-def,index}.ts`, `test/kernel-types.*` | `kernel-types.test-d.ts`: a hand-written `PluginInstance`, `ResolvedPlugin`, `SchedulerDefinition` and `KernelDefinition` compile; three `@ts-expect-error` lines (a stage handler for a stage without one, a `stage` call on the port, a wrong `RunEnd` reason) fail when the types loosen; `actor.test.ts`; the word-list test | 00 | 00 | 370 |
| 02 | Contracts 2: game definition, prompt lookup, `SwtError` | 2.9 and 2.11 exist; the Hello Game and the tic-tac-toe data forms validate; `formatIssue` prints the five lines | `packages/contracts/src/game/{game,prompts,index}.ts`, `src/error.ts`, `test/{game-schema,error}.test.ts` | `game-schema.test.ts` (both games pass; an unknown field, `schema: 2` and a non-empty `directors` fail), `error.test.ts` (format, `closest`) | 00 | 00 | 340 |
| 03 | Contracts 3: run manifest | 2.10 exists | `packages/contracts/src/run/{manifest,index}.ts`, `test/manifest.test.ts` | `manifest.test.ts`: a sample manifest validates; revision 2, a missing hash and an unknown field fail | 00 | 00 | 170 |
| 04 | Carry: chain with genesis version 2, prompts, core replies | `packages/chain` and `packages/prompts` are on `develop` with their tests; `verifyRunTexts` accepts a version 2 run and names a changed manifest; the four reply files are byte-identical | `packages/chain/**`, `packages/prompts/**`, `library/prompts/replies/core/` | the carried tamper tests; `genesis-v2.test.ts`; a sha256 list of the carried prompt package and reply files against `v0-final` | 00 | 00 (the `PromptLookup` import: 02) | 110 |
| 05 | Contracts 4: schemas, kernel events, log checks | the schemas of 2.2, 2.3 and 2.6 exist with descriptions; each schema's static type equals its interface of 01; `envelopeLogIssues` finds a gap, a falling tick and a forward `causedBy` | `packages/contracts/src/kernel/{schemas,events,state,clock}.ts`, `test/{schemas,envelope-log,snapshot-schema}.*` | `schemas.test-d.ts` (type equality), `envelope-log.test.ts`, `snapshot-schema.test.ts` (round trip of a sample), the description test over every exported schema | 01 | 01 | 360 |
| 06 | Kernel base: part interfaces, random, revision, errors | `parts.ts` as in 3.1; `random.ts` carried and pinned; `RUNTIME_REVISION = 3`; the R catalogue | `packages/kernel/src/{parts,random,revision,errors,index}.ts`, `test/{random,errors}.test.ts` | `random.test.ts`: the five vectors of 3.6 and the second-pass shuffle; `errors.test.ts`: every R code of 2.11 formats | 01, 02 | 01, 02 | 230 |
| 07 | sdk types: mechanic types, context types, seams, game types | the types of 6.1, `mechanic/parts.ts`, `game/types.ts` (6.2, 6.5) exist; a head-and-body mechanic type-checks against them without a cast | `packages/sdk/src/mechanic/{types,context-types,parts}.ts`, `src/game/types.ts`, `test/types.test-d.ts` | `types.test-d.ts`: `emit` of an undeclared event, a wrong service method, a wrong option and a grant of a tool whose mechanic is not listed fail to compile | 01, 02 | 01, 02 | 395 |
| 08 | sdk base: definers, error catalogue, load order | `definers.ts`; `errors.ts` with every G, M and P code of 2.11 as a function that returns an `SwtIssue`; `loadOrder` over `{ id, requires, provides, uses }` | `packages/sdk/src/mechanic/definers.ts`, `src/errors.ts`, `src/game/load-order.ts`, `test/{definers,errors,load-order}.test.ts` | `load-order.test.ts`: the five heads of tic-tac-toe give the order of 3.4 in three variants; `G030`, `G031`, `G032` each raised; `errors.test.ts`: every code has summary, why and fix | 01, 02 | 01, 02 | 345 |
| 09 | engine: `turns` options and input arrangement | `TurnsOptions` (4.1) and `arrange(notes, entries)` (4.2) | `packages/engine/src/turns/{options,inputs}.ts`, `test/inputs.test.ts` | `inputs.test.ts`: the `arrangeInputs` cases carried from the old test plus the `{ source }` entry; with `[{ kind: "context-reset" }]` alone the output equals the old function's | 01 | 01 | 190 |
| 10 | Kernel: log, clock | `createLog` (frames, outermost-frame delivery, audiences, sinks after listeners, `fail`), `createClock` | `packages/kernel/src/{log,clock}.ts`, `test/{log,clock}.test.ts` | `log.test.ts`: a nested frame delivers nothing until the outer one returns; listener order; an event emitted by a listener queues behind; `fail`. `clock.test.ts`: order of due jobs, a past tick refused | 05, 06 | 05, 06 | 345 |
| 11 | Kernel: actors, access, steps | `createActors`, `createAccess` (grants, start locks, the probe), `createSteps` | `packages/kernel/src/{actors,access,steps}.ts`, `test/{actors,access,steps}.test.ts` | `access.test.ts`: lock and unlock write one event each and none when nothing changes; `isOpen` asks the probe; `steps.test.ts`: the limit, the reset, a reserved id is not counted | 05, 06 | 05, 06 | 380 |
| 12 | Kernel: dispatch | the pipeline of 3.3: every row, the lane, `quietEnd`, the failure path | `packages/kernel/src/dispatch.ts`, `test/dispatch.test.ts` | one test per row of 3.3 against fakes of `parts.ts`; step before lock; listeners of `execute` events run before `after` handlers; a refused free look is a quiet end; a throw breaks the lane | 05, 06 | 05, 06 | 380 |
| 13 | Kernel: services, plugin port, loader, order | `createServices` (`service_called` for commands only, nested frame), `portFor`, `loadPlugins` with the checks of 3.2, `ordered` | `packages/kernel/src/{services,plugin-port,loader,order}.ts`, `test/{services,loader,order}.test.ts` | `order.test.ts`: the table of 3.4, a cycle is `SWT-R016`; `loader.test.ts`: each check of 3.2 raised by a hand-written plugin; `services.test.ts` | 05, 06 | 05, 06 | 400 |
| 14 | Kernel: slices, scheduler port | `saveKernel`, `restoreKernel`; `createSchedulerPort` with `open`, `inputsFor`, `hasNews`, `toAct`, basis and call counting | `packages/kernel/src/{slices,ports}.ts`, `test/{slices,ports}.test.ts` | `slices.test.ts`: round trip through JSON, a snapshot of another game is `SWT-R002`; `ports.test.ts`: `basis` of the first and of a later call as in 2.2, `activation_closed` outcomes, two `toAct` hooks | 05, 06 | 05, 06 | 380 |
| 15 | Kernel: lifecycle | `createLifecycle`: `start`, the tick sequence of 3.5, finish, `fail` | `packages/kernel/src/lifecycle.ts`, `test/lifecycle.test.ts` | 3.5 step by step against fakes: the event order of one tick with a job and two hooks; a breach seen in the tick stays; an idle tick with a breach does not advance the clock; `maxTicks` | 05, 06 | 05, 06 | 270 |
| 16 | sdk: contexts, hooks, stage handlers, arguments | `contextFor`, `viewFor`, `bindHooks`, `bindStages`; `arguments.ts` carried | `packages/sdk/src/mechanic/{context,hooks,arguments}.ts`, `test/{context,hooks,arguments}.test.ts` | against a stub `PluginPort`: resident and actor ids translate both ways; `ctx.emit` of a wrong payload is `SWT-M021`; a handler sees `call.tool` as the bare name; `HookSlot` forms and `after`; the carried argument tests | 07, 08 | 07, 08 | 340 |
| 17 | sdk: kit | `createKit` (`tool`, `provide`, `listen`, `fact`, `limit`, `snapshot`) and `recordingKit` | `packages/sdk/src/mechanic/kit.ts`, `test/kit.test.ts` | `prepare` converts then checks then binds; a wrong service output is `SWT-M022`; `recordingKit` lists tools without running a state function | 07, 08 | 07, 08 | 380 |
| 18 | sdk: `defineGame`, grants, tool names | 6.2; steps 6 and 7 of 6.5 as functions that return issues | `packages/sdk/src/game/{define-game,grants,tool-names}.ts`, `test/{define-game,grants,tool-names}.*` | `define-game.test-d.ts` (`ToolOf`); `G012` with `closest`, `G013`, `G014` each raised; automatic grants in load order; `drop` and `add` | 07, 08 | 07, 08 | 370 |
| 19 | sdk: game validation, `roster` | steps 1 to 4 of 6.5; 6.4 | `packages/sdk/src/game/validate.ts`, `src/roster/`, `test/{validate,roster}.test.ts` | one case per code (`G001` to `G003`, `G010`, `G011`, `G020` to `G022`, `M010`); `roster.test.ts` against a stub port with `shared` set | 07, 08 | 07, 08 | 380 |
| 20 | engine: `turns` | 4.2 and 4.3: the three activation values, pending, blocks, the gate, `until` | `packages/engine/src/turns/turns.ts`, `src/index.ts`, `test/turns.test.ts` | against a stub `SchedulerPort`: the order vectors of 3.6; calls of a block land in order with drivers of different delay; each wake rule; pending with and without a quiet end; `SWT-R011`, `SWT-R014`; a failed member does not stop the next | 01, 09 | 09 | 380 |
| 21 | engine: manifest builder | `buildManifest` (9.2) | `packages/engine/src/run/manifest.ts`, `test/manifest.test.ts` | a hand-made `ResolvedGame` gives a manifest that validates; changing one text changes exactly one hash | 03, 04, 07 | 03, 04, 07 | 220 |
| 22 | runlog: sink, chain writer, folder, verify | the files of 9.2 are written; `verifyRun` gives each L code for its tampering | `packages/runlog/**` | `runlog.test.ts`: write hand-made envelopes with a fixed clock, verify; change a line, the manifest, the head; cut the tail | 03, 04, 05 | 03, 04, 05 | 380 |
| 23 | Port 1: contract and rules files | `mechanics/contracts` (two files) and each mechanic's `service.ts`, `events.ts`, `contract.ts`, `rules.ts`, `model.ts` are carried with `defineService`; nothing imports another mechanic's root | `mechanics/contracts/**`, `mechanics/{grid-game,consensus,team-channel,strategy-brain}/src/{service,events,contract,rules,model,source}.ts` | type-check; the layer check over the five packages; `rules.test.ts` (the carried `model` tests) | 08 | 08 | 90 (the diff) |
| 24 | CLI 1: game files and the installed table | `load-game.ts`, `installed.ts` (9.1) | `apps/cli/src/{load-game,installed}.ts`, `apps/cli/test/load-game.test.ts` | a `.ts`, a `.json` and a `.yaml` file load to the same data; a wrong extension is `SWT-C002`, a missing file `SWT-C001`; the table is built from a fixture `package.json` | 02, 07 | 02, 07 | 240 |
| 25 | Kernel: assembly and budgets | `createKernel` with resume; `parts.ts` collapsed to derived types; kernel at most 1380 code lines | `packages/kernel/src/{kernel,parts,index}.ts`, `test/{kernel,budget}.test.ts` | `kernel.test.ts` with a hand-written plugin and a three-line scheduler: a run to its limit, the error end, resume from a snapshot gives the same later events, `fact` of an unknown key; the budget test; the word-list test | 06 | 10 to 15 | 380 |
| 26 | sdk: `defineMechanic` | `defineHead`, `defineMechanic(head, build)`: callable, `resolve`, `tools(options)` | `packages/sdk/src/mechanic/define-mechanic.ts`, `test/define-mechanic.test.ts` | a small mechanic resolves to a `ResolvedPlugin` whose instance, against a stub port, answers a tool call, a service call and a listener; options are parsed once; the head's `package` reaches the canonical names | 07, 08 | 16, 17 | 340 |
| 27 | sdk: `resolveGame`, texts | steps 8 to 10 of 6.5 and the whole of `resolveGame` | `packages/sdk/src/game/{resolve,texts}.ts`, `test/{resolve,texts}.test.ts` | with stand-in definitions: one error with every issue, sorted; `roster` appended and last; the hash changes with one option; `P003`; the sdk imports neither kernel nor engine (layer check); the engine total budget test | 07, 08 | 04, 18, 19 | 390 |
| 28 | Viewer: carry, envelope reader | `viewer-core`, `viewer-ui`, `apps/viewer-web` build; `loadRun` opens an M1 run and an old run | `packages/viewer-core/**`, `packages/viewer-ui/**`, `apps/viewer-web/**`, `.github/workflows/pages.yml` | `envelope.test.ts`: a run folder written by `runlog` loads with events, actors, header and an `ok` verdict; a carried legacy fixture still loads | 03, 05 | 04, 22 | 250 |
| 29 | testkit: drivers, `play`, `host` | `scriptedDriver`, `idleDriver`, `fakeDriver`, `play`, `host` (7) | `packages/testkit/src/{drivers,play,index}.ts`, `test/{drivers,play}.test.ts` | a ten-line mechanic defined in the test plays to its limit through `resolveGame`, `createKernel` and `turns`; a wrong `win.fact` fails before the run; the fake driver plays it with the same events for the same seed | 01, 07 | 20, 25, 26, 27 | 340 |
| 30 | testkit: fixture mechanic, conformance | `guess-number`; `checkDeterminism`, `checkSnapshotRoundTrip`, `checkOptionsDocumented`, `checkPackage` | `packages/testkit/src/fixtures/`, `src/conformance.ts`, `test/{guess-number,conformance}.test.ts` | `guess-number.test.ts` (the five cases of 7); each conformance check finds a planted fault | 07 | 29 | 360 |
| 31 | testkit: oracle runner | `readOracle`, `timelineOf`, `runOracle` with the three levels and the mapping table of 7; `format.ts` moved from `scripts/oracles/` | `packages/testkit/src/oracle/{format,read,timeline,run}.ts`, `test/oracle.test.ts`, `oracles/README.md` (the pointer to the schema only) | a hand-made oracle of a mechanic defined in the test matches at level 3; one planted fault per mismatch kind (setup, call, event, inputs, turn, end) is found at its level and not below it; a file with a `resume` entry or a `script` call is refused with a clear error; every file under `oracles/tictactoe/` parses and its `counts` hold | 07, 09, M0 oracles | 29, M0 oracles | 370 (`format.ts` carried) |
| 32 | Port 2: `team-channel`, `consensus` | both mechanics and their carried tests are green on the new kernel; byte-identity test green | `mechanics/{team-channel,consensus}/**` except the files of 23 | the carried test files of 8.3; `carried.test.ts` | 07, 23 | 26, 30 | 200 (the diff) |
| 33 | Port 3: `grid-game`, `optimal-referee`, `strategy-brain` | the three mechanics and their carried tests are green; byte-identity test green | `mechanics/{grid-game,optimal-referee,strategy-brain}/**` except the files of 23 | the carried test files of 8.3; `carried.test.ts` | 07, 23 | 26, 30 | 300 (the diff) |
| 34 | CLI 2: `swt run --fake`, `--seed`, `swt log verify` | 9.1; exit codes as listed | `apps/cli/src/{main,run,log-verify}.ts`, `apps/cli/test/cli.test.ts` | run `guess-number` from a `.ts` and a `.yaml` file into a temporary folder, then `swt log verify` on it; a tampered line exits 1; a run without `--fake` is `SWT-C020` | 07, 24 | 21, 22, 24, 27, 30 | 390 |
| 35 | Port 4: the game and its oracles | `games/tictactoe-teams` plays; its four carried game tests are green; **`runOracle` returns no mismatch at level 3 for all seven files of `oracles/tictactoe/`** | `games/tictactoe-teams/**` | `oracle.test.ts` of the game: the variant table of 8.2, one case per file, level 3; the carried game tests; the briefing hash | 07, 23 | 31, 32, 33 | 300 (the diff) |
| 36 | Hello Game: `toAct`, `sample`, sample 1 | `games/hello/game.ts` (11 lines) plays to the end with `swt run --fake`; the README block is an include of it | `games/hello/**`, `mechanics/grid-game/src/index.ts` (the `toAct` hook and `playMove.sample` only), `README.md` (section 2) | `hello.test.ts`: the match ends, the log verifies, between 5 and 9 activations are opened for one game, the seven oracle cases of 35 are still green | 33 | 34, 35 | 200 |

If the diff of 33 passes 400 lines, `strategy-brain` becomes its own issue in the same wave. Issue 36 adds to
`grid-game` after its oracle matches, so the addition cannot hide a port error; `tictactoe-teams` uses `onNews`
and no fake driver, so nothing it plays changes.

The M1 exit check (not an issue, done by the milestone review): the "done when" lines at the top of this file,
on `develop`, the real kernel line count against the booking of 1.4, then the tag.

### 10.4 Hidden dependencies that were checked

| Looked like parallel, is not | Resolution |
|---|---|
| every contracts issue edits `src/index.ts` | barrels per folder, root barrel by the scaffold (10.2) |
| the manifest schema needs `LOG_FORMAT` of the envelope | the schema takes a string; the builder fills the constant (2.10) |
| kernel snapshot schema needs `RunEnd`; `Kernel` needs the snapshot type | types first in 01, schemas in 05 with a type-equality test (2.6) |
| every kernel file needs its neighbours' types | `parts.ts` in 06, collapsed in 25 |
| `validate`, `grants` and `resolve` all add error codes | the whole catalogue is written in 08 |
| `resolveGame` needs `roster`, `roster` needed `defineMechanic` | `roster` is a hand-written `ResolvedPlugin` (6.4) |
| `resolveGame` needs tool lists, which only a body has | `recordingKit` (6.5), in 17 |
| `turns` and the manifest builder need the kernel's revision and errors | passed in, or built in place (2.11, 9.2); the engine does not import the kernel at M1 |
| the three port issues import each other's contracts | contract and rules files first, in 23 |
| `optimal-referee` and `strategy-brain` tests need a running `grid-game` | the three are one issue (33) |
| CLI tests need a mechanic that is installed | the fixture mechanic of 30 |
| every mechanic's tests need `checkDeterminism` | 32 and 33 merge after 30 |

Longest chain of merges: 00, 01, 06, one of 10 to 15, 25, 29, 30, 33, 35, 36 (ten issues, ten waves).

### 10.5 Wave plan

A wave is the set of issues whose "Merge after" is satisfied by the waves before it. "Width" is the true maximum
of builders that can work at once in that wave on disjoint paths. Open pull requests follow E4 (10.2).

| Wave | Issues | Width | Opens when |
|---|---|---|---|
| 0 | 00 | 1 | M0 scaffold merged |
| 1 | 01, 02, 03, 04 | 4 | 00 |
| 2 | 05, 06, 07, 08, 09 | 5 | 01, 02 |
| 3 | 10, 11, 12, 13, 14, 15 (kernel); 16, 17, 18, 19 (sdk); 20, 21 (engine); 22; 23; 24 | 15 | 05 to 09 (21, 22 also 03, 04) |
| 4 | 25, 26, 27, 28 | 4 | 10 to 15; 16, 17; 18, 19; 22 |
| 5 | 29 | 1 | 20, 25, 26, 27 |
| 6 | 30, 31 | 2 | 29 |
| 7 | 32, 33, 34 | 3 | 30 (34 also 21, 22, 24, 27) |
| 8 | 35 | 1 | 31, 32, 33 |
| 9 | 36 | 1 | 34, 35 |

With work ahead (10.2), the building of all 27 issues from 10 to 36 can start when wave 2 is merged: that is the
real width of the plan, 27 builders, with the integrator merging in wave order. Without work ahead the widths are
those of the table, and waves 5, 8 and 9 are the narrow places: the first full run (29), the oracle (35) and the
sample (36). At three merged issues per working day the plan needs about thirteen working days; with the width
used and one integrator it is bounded by the ten merge steps of the longest chain.

## 11. Decisions made in this file

| # | Decision | Reason |
|---|---|---|
| 1 | M1 ports all five mechanics of tic-tac-toe teams | the oracle is the registered game; dropping four mechanics changes the game |
| 2 | Games live under `games/<id>/` | the word is Game; the folder is new anyway |
| 3 | The engine total counts `kernel`, `sdk` and `engine` whole | one counting function; nothing can be moved next door |
| 4 | The word-list test covers the kernel and `contracts/src/kernel` only, identifiers and string literals, not comments | the game format must name residents, teams and roles; a comment may say what the kernel is not |
| 5 | Canonical tool name is an envelope field (`tool`); the shown name is `as` in the payload | group a call's consequences by one field |
| 6 | `tool_result` is a kernel event | the reply is what the model read; the oracle compares it |
| 7 | `<package>` in canonical names is the full npm name | no shortening rule that can go wrong |
| 8 | Lifecycle reactions are a fixed list of hook points, not listeners on kernel events | two of them return values, and tick-start hooks must run after the due jobs |
| 9 | One listener delivery mode: when the outermost frame returns; `immediate` is gone | it is the old default mode exactly; no ported mechanic uses the other |
| 10 | `after` names plugin ids and is ignored for a plugin that is not loaded | same softness as `listen`; a mechanic stays loadable alone |
| 11 | The old load order algorithm is ported unchanged; "no `uses` cycle" waits for M3 | load order decides what a model sees; D2 |
| 12 | The shown order of input lines is the scheduler option `inputs`, with a new `{ source }` entry | the order is the game's knowledge, not a shared table's; the four hooks touch only their own state (3.4) |
| 13 | `beginTick` and `endTick(idle)` instead of one `advanceTick` | the turns sit between the tick-start and tick-end hooks; the kernel is told "idle", not a number of passes |
| 14 | `toAct` is a hook of at most one plugin; the scheduler never names a service | the scheduler and the kernel stay free of game words |
| 15 | `turns` takes `order: "seeded" \| "roster"`; a mechanic cannot supply a policy | a game is plain data; no ported mechanic supplies one |
| 16 | `params` and `$param` references are M2 work; at M1 a TypeScript game may be built by its own function | no M1 user; the tic-tac-toe variants change the grants and the locked list, which a reference cannot |
| 17 | `end` has `ticks`, `win` has `fact`, nothing more in version 1; the caller checks the fact, not the kernel | no M1 or M2 game needs more; the kernel does not know winning |
| 18 | A description that equals a declared prompt id is that prompt, else inline text | ported prompt files stay untouched; new mechanics need no file |
| 19 | The `swarmtales` field of `package.json` is the one registration site | no hand-kept table in apps or scripts |
| 20 | `roster` lives in the sdk package as a hand-written `ResolvedPlugin` | the sdk adds it and may not import a mechanic package; resolution does not wait for `defineMechanic` |
| 21 | Drivers (scripted, fake) live in the testkit; the CLI depends on it | the testkit is public API (`swarmtales/testing`) |
| 22 | Texts are `texts.json` committed by hash at M1; `prompt_fixed` events arrive at M2 | no model reads a prompt before M2 |
| 23 | Chain genesis version 2 holds the manifest hash; the signer moves to `runlog` | the manifest says everything the old genesis said; `chain` stays browser-safe |
| 24 | Envelope checks (`envelopeLogIssues`) live in contracts | the CLI and the browser need the same verdict, and `chain` may import nothing |
| 25 | No `000-run.json`; the viewer reads the manifest | one header document |
| 26 | Error docs link is `docs/reference/errors.md#<code>` | no docs site before 1.0 |
| 27 | M1 has 37 issues, not 18 | the 400-line rule; interfaces first for parallel work |
| 28 | The Hello Game issue changes `grid-game` only after its oracle matches | an addition must not hide a port error |
| 29 | Everything in 1.4 has no code at M1 | no user in M1; each returns with its first user |
| 30 | `ToolCall` has the bare `name`; the sdk shows it to handlers as `call.tool` | ported handlers compare it with option values (D2) |
| 31 | `convertArguments`, payload checks and fact checks are sdk code inside the wrappers | same behaviour, about 60 kernel lines less; M codes are raised where their catalogue is |
| 32 | The readiness gate of a block lives in `turns`, not in the kernel | it did in the old `TurnLoop`; blocks are the scheduler's idea |
| 33 | A library package is a package under `packages/` with code; the umbrella is not counted | DECISIONS requires both the ceiling and the umbrella |
| 34 | The fake driver plays from `sample` only at M1 | the testkit may not import a mechanic's contract |
| 35 | Carried mechanics keep `throw new Error`; the kernel reports it as `SWT-R003` with the old message | D2; carried tests match on the message |
| 36 | `PromptLookup` is declared in contracts (`game/prompts.ts`) | `sdk` and `prompts` both need it and may not import each other |
| 37 | The M1 gate for the kernel is 1380 code lines | the lines to 1500 are booked for the returns of 1.4 |
| 38 | The port of tic-tac-toe claims oracle level 3 (scheduling) on all seven files | `turns` is a port of the old loop; level 3 is what proves that the kernel is the only variable |
| 39 | The oracle schema file moves into the testkit; the runner folds the new log into oracle entries and compares two timelines | one schema file, read with Typebox; one mapping table instead of four comparison loops |
| 40 | The oracle runner drives by "the n-th activation of a resident gets the calls of its n-th `turn` entry" and does not force the old schedule | the new scheduler is under test too; a forced schedule would hide its errors |
| 41 | No cycle exemption in the layer check; the base-over-game rule holds from M1 | the five mechanics have no import cycle and no base mechanic imports a game mechanic (checked in the old imports) |

## 12. To align

| Point | With | What may change here |
|---|---|---|
| Oracle files: `setup.mechanics` | `oracles/README.md` says "in load order"; the seven tic-tac-toe files list the game's order (`grid-game` first, the load order starts with `team-channel`) | the README or the exporter on `m0/oracles`; the runner compares the ids as a set either way (7) |
| Oracle format, later versions | `oracles/README.md` and `OracleSchema` (branch `m0/oracles`, still being improved) | the mapping table of 7 and `oracle/timeline.ts`; a new entry kind is refused by `readOracle` until the table has a row for it |
| Spike verdict (D1) | `07-mechanic-spike.md` (not there yet on 2026-11-14) | one overload and the file `mechanic/sugar.ts` (6.1); nothing else |
| Service cycle between `grid-game` and `consensus` (each `uses` a service of the other) | the frame work of M4; "no cycle among `uses`" is a check from M3 (3.4) | nothing in the layer check: there is no import cycle (1.2) |
| Layer table of the scaffold | `scripts/layers/table.ts` on `rewrite/root` | three lines there: `chain` for `sdk` and for `engine`, and the count without the umbrella (1.2) |
| README generator | M2 | the five carried READMEs are regenerated; the `swarmtales` field is its input |
| Mutation gate for kernel and sdk (E7) | an issue after M1 | none |
| E4 (three open pull requests) against the width of wave 3 | an issue that reopens E4 with the rules of 10.2 as evidence | the pull request queue of 10.5 only |
| D4 (50 issues for M0 to M2) against 69 | the recalibration issue after the tenth merge | none; the count is reported there |
| The kernel booking of 1.4 (25 lines over the cap by estimate) | the milestone review of M1 | which return is built outside the kernel |
| How `PromptLookup` finds the `prompts/` folder of a mechanic that is installed from npm | M6 (publishing) | the constructor of the lookup in `prompts`, not its interface |

## Challenge log

Challenged on 2026-11-14 against DECISIONS, REWRITE, paper 05 and the old code (read, measured with the D13
counting rule, and partly run: `random.ts`, `loadOrder` on the tic-tac-toe story). Severity: **A** would have made
the port fail its oracle or a build fail; **B** an interface that does not fit together or a broken rule of
DECISIONS; **C** a budget or plan that was not honest; **D** something specified without a user.

| # | Sev | What was wrong | What was changed |
|---|---|---|---|
| 1 | A | Listener delivery was specified as "when the frame that was open at the emit returns". The old bus delivers when the **outermost** frame returns, and the old gateway runs every stage in its own outermost frame. With the draft's rule, events of a service command inside `execute` would be delivered earlier, and nothing said that `execute` listeners run before `after` handlers. Event order would differ from the oracle | 3.2: "outermost frame", "every step is its own outermost frame"; 3.1 `Log.run`; tests in issues 10 and 12 |
| 2 | A | `ToolCall.tool` was the canonical name only. The ported handlers compare `call.tool` with option values that hold bare names (`consensus.tool = "playMove"`, `strategy-brain.postTool`) and read `call.resident`. Every gated `playMove` would have passed the consensus gate unchecked | 2.4 `ToolCall.name`; 6.1 the author's call view; 8.1 |
| 3 | A | The quiet-end rule was set "on success" at the end of the call. The old code marks a free look at the start, also when the call is refused, and clears "ended" at every new call. The wake rule `onNews` with a pending driver would differ | 3.3 row 0 and row 7 and the paragraph below the table |
| 4 | A | The word-list test covered comments, and the draft's own contracts said "model-facing" in comments and had the constant `MODEL_TOOL_NAME`; `endTick({ passes })` carried a game word by the back door | 3.7 (identifiers and string literals only), `TOOL_NAME_PATTERN`, `endTick(idle)` |
| 5 | A | Resolution instantiated every plugin against a stub port that throws, to read tool lists, `toAct`, facts and slices. Any `state` function that draws from `rng` throws there (the fixture mechanic does) | 6.5: heads and data only; `recordingKit` for tool lists; the body checks moved to the kernel (`R013`, `R016`), to `turns` (`R014`) and to the caller (`R015`) |
| 6 | A | `defineDirector` was exported as `declare function` without a body: an import fails at run time | 6.3: no code at M1 |
| 7 | A | `team-channel` sets `guardText` on `postTeam`, which the draft's `ToolDefinition` did not have; the carried mechanics `throw new Error`, which the draft's lint forbids; a mechanic's option check in `state` had no place to be reported | 8.1 two rows; 6.1 last bullet; 3.2 `SWT-R003` with the old message |
| 8 | B | `inputsFor` returned `InputNote`, which has no `order`; the arrangement needs it | 2.7 `OrderedNote` |
| 9 | B | The fake driver takes a `Kernel`, but `Kernel` had no way to reach a tool's `sample`, and `sample` had no random source | 2.4 `sample(actor, random)`; 2.8 `Kernel.sample`; 3.6 the `fake` label |
| 10 | B | The kernel raised M codes (`M021`, `M022`, `M023`) whose catalogue is in the sdk, which it may not import; `turns` raised R codes of the kernel's catalogue | 2.11: the sdk's wrappers raise M codes; `turns` builds its three codes itself |
| 11 | B | The sdk "imports contracts only" but hashes the game (`jsonHash` is in `chain`) and names `PromptLookup`, which the draft moved into `prompts` (a package the sdk may not import) | 1.2: the sdk may import `chain`; `PromptLookup` in `contracts/src/game/prompts.ts` |
| 12 | B | The `Activation` had no pass and block; carried test scripts key on `turn.pass`. `close(outcome)` asked the scheduler for a call count only the kernel has. The step counter had no rule for non-resident actors without naming residents. `basis` was not defined for the second call of an activation. Default audiences (two ported events have one) had no owner | 2.7 `detail`, `close(failed)`; 3.3 row 1; 2.2; 3.2 |
| 13 | B | E6: "eleven library packages" left out `mechanics/contracts` and did not look at M2, where `models` and `lab` arrive | 1.1: the counting rule, ten at M1, twelve at M2, no slack, the merge candidate named |
| 14 | B | `yaml` was introduced without the dependency note DECISIONS 5.3 asks for; `chain-writer` was budgeted at 140 carried lines (it has 117); `prompts` was given as 341 lines (256 code lines) | 1.2 last row; 1.3; 8.2 |
| 15 | B | The scheduler contract was called `SchedulerPlugin`; C1 and the cut list say scheduler, driver and sink are internal interfaces, not plugin kinds | `SchedulerDefinition`, with the C1 note |
| 16 | C | Kernel budget: 1360 planned with "200 lines reserve". Measured against the old files, the draft left out `probe.ts` (28), the port building of `loader.ts` (about 60) and gave `host.ts` (639, about 300 of it kernel work) 190 lines in one file near the file limit. An honest count of the draft's scope is about 1550 to 1600 | 1.3 recounted file by file; `arguments.ts` and the payload checks moved to the sdk; `kernel.ts` split into `kernel.ts` and `lifecycle.ts`, `loader.ts` into `loader.ts` and `plugin-port.ts`; M1 gate 1380; the returns booked in 1.4 with the 25-line overrun stated |
| 17 | C | Issues over 400 lines once tests are counted: contracts D (360 source), sdk checks (430 source and "one test per code"), `turns` (270 source), kernel assembly, CLI (380 source) | split: 02 and 03; 08, 18, 19; 09 and 20; 15 and 25; 24 and 34 |
| 18 | C | The wave plan was twelve waves with a width of at most three and a single-file stretch of three waves; parallel issues of one package all edited `index.ts`; `errors.ts` was written by three issues; the two port issues imported each other's contracts | section 10 rewritten: scaffold, interface freeze in two waves, then a width of 15 in wave 3 (27 with work ahead), ten waves; barrels, catalogue and contract files first |
| 19 | C | `createRun` was 150 budgeted lines for five lines of work | removed; `play` and the CLI call `createKernel` (7, 9.2); the engine's `run/` holds the manifest builder only |
| 20 | D | No user in M1 (checked by search in the five mechanics, their tests and the game): staged calls, per-plugin attributes, `schedule.every`, the hooks `activationOpened`, `activationClosed`, `runEnded`, the stage handlers `afford`, `settle`, `guard`, `consult`, tool limits and policies with their windows, `Activation.record`, `safePoint`, `Kernel.stop`, `kernel.subscribe`, `ctx.log`, `kit.on`, `kit.kernel`, `params` and `$param`, the game's `texts` overrides, `interactiveDriver`, `checkSourceRules`, replay | 1.4 lists each with its return and its booked kernel lines; removed from every type, pipeline row and issue |
| 21 | D | Snapshot held step counters although a snapshot is taken only between ticks, where they are empty | removed from `KernelSnapshot` |
| 22 | B | The tick sequence said "check the run limits again" where the old code keeps the first breach of the tick; it also described the idle rule with a pass count | 3.5 steps 3 to 6 |
| 23 | B | `TOOL_UNKNOWN` against `TOOL_NOT_GRANTED` was not defined for shown names that exist only in another grant | 3.3 row 2 |
| 24 | none | Checked and found right: the five determinism vectors (run on the old `random.ts`); the load order of the game (run on the old `loadOrder`, three variants); no ported mechanic uses `immediate`, `display`, `resolve`, `random()` or a turn policy; the four `turnInputs` hooks are independent of each other, so the shown order by scheduler option is safe; revision 3; `tick`; no `std-contracts`, no `schedulers` package, no export cap; tests inside packages; `SWT_*` | 3.4 and 3.6 say what was run |

| 25 | A | The oracle runner was specified against an invented file shape (`activations`, `calls`, `events` as three lists with an activation number per call). The real format (`oracles/README.md`, `OracleSchema`) is one timeline with `minute`, `turn`, `skip`, `call`, `event` and `resume` entries, has no activation numbers, holds `stage` in refusals and holds platform events with `source: "core"`. A runner built on the draft could not have read a file | 7: the runner reads the real schema (moved into the testkit, not copied), folds the new log into the same entries with one declared mapping table, and compares at the three levels of the README; issue 31 |
| 26 | B | "Matches its oracle" named one oracle and no level. There are seven files in five variants, played in seeded order, and only the two 5x5 solo files are replays of live runs; forfeits, the invalid match, mixed teams, a fixed captain and a rules brain are in no file | 8.2: the variant table and the list of what the carried tests must cover instead; 8.3; issue 35 claims level 3 on all seven |
| 27 | B | The draft kept "the layer check's cycle rule stays off for `grid-game` and `consensus`". There is no import cycle between the two packages (checked in the old imports), only a cycle between the services they use, which the layer check does not see. An exemption would have been a hole with no user | 1.2 and section 12: no exemption; the base-over-game rule holds from M1 |
| 28 | B | The layer table gave one row per layer where the packages of a layer differ (`viewer-ui` imports `viewer-core`, `mechanic-contracts` had no row), and it did not match the scaffold in three places: `sdk` and `engine` need `chain`, and the scaffold counts the umbrella as a library package, which makes thirteen at M2 | 1.2: one row per package, the decision per point, and the three lines the scaffold changes |
| 29 | none | Checked and found right against the oracle files: the stage names of refusals (`lock`, `limit`, `rule`), `STEP_LIMIT` before `TOOL_LOCKED`, the limit id `grid-game.match`, the input lines as `{ source, kind?, text }`, the lock events with their three fields, pass and block in the activation's `detail` | the mapping table of 7 |

Not aligned, because the paper does not exist yet: the spike verdict (section 12).
