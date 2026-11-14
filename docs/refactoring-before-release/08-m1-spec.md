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

M1 is done when: tic-tac-toe teams matches its oracle; `swt log verify` passes on a run; the carried viewer opens
that run; the kernel has at most 1500 code lines and the engine total at most 4100.

## 1. Packages, layers, budgets

### 1.1 Packages of M1

| Package | Path | Purpose | Status |
|---|---|---|---|
| `@swarmtales/contracts` | `packages/contracts` | types and Typebox schemas only: envelope, actors, tools, services, events, plugin shape, ports, `KernelDefinition`, `GameDefinition`, `RunManifest`, `SwtError` | new |
| `@swarmtales/chain` | `packages/chain` | pure verifier of the signed log; gains the genesis of version 2 | carried, 60 new lines |
| `@swarmtales/kernel` | `packages/kernel` | the single-writer state machine (section 3) | ported |
| `@swarmtales/sdk` | `packages/sdk` | authoring (`defineMechanic`, `defineGame`), game resolution, the `roster` mechanic | ported and new |
| `@swarmtales/prompts` | `packages/prompts` | prompt file loader and lookup | carried |
| `@swarmtales/engine` | `packages/engine` | folder `turns/` (the turn scheduler) and folder `run/` (run assembly, manifest) | ported and new |
| `@swarmtales/runlog` | `packages/runlog` | run folder, JSONL sink, chain writer, run verification | chain writer carried, rest new |
| `@swarmtales/testkit` | `packages/testkit` | scripted and fake drivers, `play`, fixture mechanic, conformance, oracle runner, replay | ported and new |
| `@swarmtales/viewer-core`, `@swarmtales/viewer-ui` | `packages/viewer-*` | viewer libraries; one new reader for envelopes | carried |
| `swarmtales` | `packages/swarmtales` | umbrella: re-exports only (`.`, `./mechanic`, `./testing`), no logic | new, about 15 lines |
| `@swarmtales/mechanic-contracts` | `mechanics/contracts` | the two service contracts with two providers today: `consensus-source`, `brain-source` | carried |
| five mechanics | `mechanics/grid-game`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee` | tic-tac-toe teams as it is | carried with renames (section 8) |
| game | `games/tictactoe-teams`, `games/hello` | the ported game and sample 1 | ported, new |
| apps | `apps/cli`, `apps/viewer-web` | `swt`, the viewer page | new slice, carried |

Eleven library packages, inside the limit of twelve (E6). `turns` and `run` are folders of one package (01 #14).

**Decided here:** the registered game uses five mechanics, so "tic-tac-toe as it is" ports all five, not only
`grid-game`. Reason: the oracle is exported from the registered game `tictactoe-teams` (old `stories/tictactoe-teams/story.ts`),
and a port that drops four mechanics would change the game (D2).

**Decided here:** games live under `games/<id>/`, not `stories/`. Reason: the word is Game (REWRITE 3.1) and the
folder is new anyway.

### 1.2 Layer table (input of the layer check)

Each `package.json` declares `"swarmtales": { "layer": n }`. A package may import only what its row allows; the
check runs on declared dependencies and on actual imports.

| Layer | Packages | May import | Forbidden |
|---|---|---|---|
| 0 | `contracts`, `chain` | `typebox` (`contracts`), `@noble/curves`, `@noble/hashes`, `typebox` (`chain`) | every workspace package, `node:*`, `process`, `Buffer` |
| 1 | `kernel` | `contracts`, `typebox` | everything else, `node:*`, `process`, `Date`, `Math.random`, `fetch`, `setTimeout`, `setImmediate` |
| 2 | `sdk`, `prompts` | `contracts`, `typebox`; `prompts` also `node:fs`, `node:path`, `node:url` | `kernel`, `engine`; for `sdk` also `node:*` and the globals of layer 1 |
| 3 | `mechanics/*` | `sdk`, `contracts`, `mechanic-contracts`, `typebox`, and another mechanic only through its `/contract` or `/rules` sub-path | `kernel`, `engine`, `runlog`, `testkit` (tests may), `node:*`, the globals of layer 1 |
| 4 | `engine` | `kernel`, `sdk`, `contracts`, `typebox` | `node:*`, mechanics, `runlog` |
| 4 | `runlog` | `contracts`, `chain`, `node:fs`, `node:path`, `node:crypto` | `kernel`, `sdk`, mechanics |
| 4 | `testkit` | `engine`, `kernel`, `sdk`, `contracts`, `prompts`, `node:fs` (oracle files only) | `runlog`, mechanics (the fixture mechanic is its own source) |
| 5 | `viewer-core`, `viewer-ui` | `contracts`, `chain`, `typebox` | `kernel`, `sdk`, `engine`, mechanics, `node:*` |
| 6 | `apps/*`, `games/*`, `swarmtales` | anything | nothing; the only place where mechanics are named |

Rules beside the table: a `/contract` file imports only `typebox`, `contracts` and the sdk's definers
(`defineService`, `defineEvents`, `defineTool`); a `/rules` file imports only `typebox` and files of its own package
that import nothing else. The manifest field `"swarmtales": { "kind": "mechanic", "class": "base" | "game" }` marks
`team-channel` and `consensus` as `base`; the base-over-game rule is checked from M3, at M1 the field is only recorded.

### 1.3 Code-line budgets

Limits for every file: 300 code lines (warning at 250), 50 per function, complexity 10; test files 600.
The two hard tests: `packages/kernel/src` at most 1500; **engine total** = `packages/kernel/src` +
`packages/sdk/src` + `packages/engine/src` at most 4100. **Decided here:** the engine total counts all three
`src` trees whole. Reason: one counting function, and nothing can be moved next door inside them.

| Package | File group | Files (budget in code lines) | Group | Cap |
|---|---|---|---|---|
| kernel | 1 log | `log.ts` 125 | 125 | |
| kernel | 2 state | `slices.ts` 95 | 95 | |
| kernel | 3 actors | `actors.ts` 80 | 80 | |
| kernel | 4 dispatch | `dispatch.ts` 190, `staging.ts` 40, `arguments.ts` 40 (carried), `access.ts` 75, `counters.ts` 75 | 420 | |
| kernel | 5 services | `services.ts` 55, `loader.ts` 100, `order.ts` 40 | 195 | |
| kernel | 6 clock and jobs | `clock.ts` 60 | 60 | |
| kernel | 7 ports and assembly | `ports.ts` 110, `kernel.ts` 190 | 300 | |
| kernel | shared | `random.ts` 55 (carried), `revision.ts` 2, `errors.ts` 16, `index.ts` 12 | 85 | |
| **kernel** | | | **1360** | **1500** |
| sdk | mechanic authoring | `mechanic/types.ts` 150, `context-types.ts` 130, `definers.ts` 40, `define-mechanic.ts` 150, `context.ts` 110, `kit.ts` 200, `hooks.ts` 70 | 850 | |
| sdk | game | `game/define-game.ts` 60, `params.ts` 45, `validate.ts` 150, `grants.ts` 70, `tool-names.ts` 60, `load-order.ts` 70, `texts.ts` 50, `resolve.ts` 180 | 685 | |
| sdk | rest | `roster/index.ts` 60, `director/types.ts` 25, `errors.ts` 80, `index.ts` 20 | 185 | |
| **sdk** | | | **1720** | **1800** |
| engine | turn scheduler | `turns/turns.ts` 170, `turns/inputs.ts` 60, `turns/options.ts` 40 | 270 | |
| engine | run assembly | `run/run.ts` 150, `run/manifest.ts` 110, `index.ts` 10 | 270 | |
| **engine** | | | **540** | **600** |
| **engine total** | | kernel + sdk + engine | **3620** | **3900 of 4100** |
| contracts | kernel-facing | `values.ts` 40, `actor.ts` 45, `envelope.ts` 90, `events.ts` 110, `tool.ts` 120, `service.ts` 45, `event-def.ts` 30, `plugin.ts` 170, `state.ts` 70, `clock.ts` 25, `ports.ts` 110, `kernel-def.ts` 80 | 935 | |
| contracts | game-facing | `game/game.ts` 170, `game/manifest.ts` 110, `error.ts` 80, `index.ts` 20 | 380 | review target 1300 |
| runlog | | `sink.ts` 70, `chain-writer.ts` 140 (carried), `folder.ts` 60, `verify.ts` 90 | 360 | review target 400 |
| testkit | | `drivers.ts` 110, `play.ts` 90, `fixtures/guess-number.ts` 80, `conformance.ts` 130, `oracle.ts` 150, `replay.ts` 70 | 630 | review target 750 |
| apps/cli | | `main.ts` 90, `run.ts` 110, `load-game.ts` 90, `log-verify.ts` 50, `installed.ts` 40 | 380 | review target 500 |

A pull request that raises a kernel file above its budget names the extension point that was missing (01, 2.2).
The 200 lines between the caps and 4100 are the reserve for M2 and M3.

## 2. Contracts

All of this is `@swarmtales/contracts`. Every exported schema and every property carries a `description` (the
descriptions are left out below where the comment says the same). Folder `src/kernel/` holds what the kernel sees
and is under the word-list test (3.7); folder `src/game/` holds the game format and the manifest and may use game
words. **Decided here:** the word-list test covers `packages/kernel/src` and `packages/contracts/src/kernel` only.
Reason: the game format must say `residents`, `teams` and `roles`.

### 2.1 Values and actors

Derives from old `packages/contracts/src/core/values.ts`. Changes: `Actor` becomes `ActorId` with an open kind;
`"host"` becomes `"kernel"`; `"gamemaker"` and `overseer:` are gone; `BUILT_IN_NAMES`, `GrantRole`, `PromptKeys`
and `PromptLookup` leave the kernel-facing part (the last two move to the sdk's types).

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
	readonly grant: string;                                      // the grant name its tools come from; default: the kind
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
	readonly basis?: number;                 // the highest seq the actor had seen when it decided; on activation and tool events
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
	tool_result: Type.Object({ as: Type.String(), reply: Type.String(), endsTurn: Type.Optional(Type.Boolean()) }),
	service_called: Type.Object({ service: Type.String(), method: Type.String(), caller: Type.String(), input: Type.Unknown() }),
	actor_suspended: Type.Object({ actor: Type.String(), by: Type.String(), reason: Type.String() }),
	actor_resumed: Type.Object({ actor: Type.String(), by: Type.String() }),
	tool_locked: Type.Object({ actor: Type.String(), tool: Type.String(), by: Type.String() }),
	tool_unlocked: Type.Object({ actor: Type.String(), tool: Type.String(), by: Type.String() }),
	limit_reached: Type.Object({ limit: Type.String(), reason: Type.String() }),
	run_ended: Type.Object({ reason: Type.String(), detail: Type.Optional(Type.String()) }),
} as const;
/** One line of an activation's inputs as shown, tagged with the plugin id that gave it. */
export const InputNoteSchema = Type.Object({ source: Type.String(), kind: Type.Optional(Type.String()), text: Type.String() });
export type InputNote = Static<typeof InputNoteSchema>;
/** What an `inputs` hook returns per line; within a kind, lines sort by `order` (0 when left out). */
export type InputLine = string | { readonly kind: string; readonly text: string; readonly order?: number };
```

`input_received` (external input) is reserved for M3 and not declared at M1. Six of the eight telemetry events of
paper 02 section 6 are driver events and arrive with the model driver at M2; M1 covers `wake` (as
`activation_opened.detail.reason`), `tool_call` and `tool_result`, `turn_end` (as `activation_closed`) and
`clock_tick` (as `tick_started`). **Decided here:** `tool_result` is a kernel event. Reason: the reply is what the
model read; the oracle and replay compare it, and the old log had it only from the runner.

### 2.4 Tools: definition, call, result, refusal

Derives from old `packages/contracts/src/core/tools.ts` and the erased `MechanicTool` and `PreparedCall` of
`core/mechanic.ts`. Changes: `Actor` to `ActorId`; `suggest` becomes `for`; `serves` and the consult and guard
members are not carried at M1; limit windows say `tick`; `sample` is new.

```ts
// tool.ts
/** Today's stages, unchanged (DECISIONS 01 #4). Only `guard` and `consult` may wait; no M1 plugin registers them. */
export const STAGES = ["lock", "parse", "limit", "afford", "rule", "guard", "consult", "execute", "settle", "after"] as const;
export type Stage = (typeof STAGES)[number];

/** `<package>/<plugin id>/<tool>`, for example `@swarmtales/mechanic-grid-game/grid-game/playMove`. */
export type CanonicalTool = string;
/** What a model may be shown as a tool name; checked at load. */
export const MODEL_TOOL_NAME = "^[a-zA-Z0-9_-]{1,64}$";

export interface Refusal { readonly ok: false; readonly code: string; readonly detail?: string }
export interface ToolSuccess { readonly ok: true; readonly reply: string; readonly endsTurn?: boolean }
export type ToolOutcome = ToolSuccess | Refusal;

export type LimitWindow = "tick" | "run" | { readonly ticks: number } | { readonly resetOn: string };
export interface ToolLimit { readonly max: number; readonly per: LimitWindow; readonly key?: string }
export interface ToolPolicy { readonly limit?: ToolLimit }

/** One call as stage handlers see it; `params` is raw at `lock` and checked from `limit` on. */
export interface ToolCall {
	readonly tool: CanonicalTool;
	readonly as: string;
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
	readonly limit: ToolLimit | undefined;
	readonly for: readonly string[];         // grant names the plugin suggests; the game's grants decide
	readonly free: boolean;                  // a read-only look: no step counted, its answer wakes nobody
	prepare(raw: unknown, actor: ActorId): PreparedCall | undefined;   // undefined: the arguments do not match
	sample?(actor: ActorId): JsonValue | undefined;                    // a legal call now, for the fake driver; undefined: none
}
/** Refusal codes of the kernel. The strings are model-facing and carried byte for byte. */
export const TOOL_UNKNOWN = "TOOL_UNKNOWN", TOOL_NOT_GRANTED = "TOOL_NOT_GRANTED", TOOL_LOCKED = "TOOL_LOCKED",
	INVALID_ARGUMENTS = "INVALID_ARGUMENTS", STEP_LIMIT = "STEP_LIMIT", TOOL_LIMIT = "TOOL_LIMIT";
```

**Decided here:** `<package>` in a canonical name is the full npm name, with no shortening rule. Reason: no
derivation that can go wrong, and a third-party package needs no special case. The envelope `source` of a plugin
is `<package>/<plugin id>`.

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
export interface ProvidedService { readonly service: ServiceDefinition; call(method: string, input: unknown, caller: string): unknown }

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
`runResumed` are gone; `residents` becomes `actors`.

```ts
// plugin.ts
/** A registration with its place: it runs after the registrations of the same point of the named plugin ids. */
export interface Ordered<F> { readonly run: F; readonly after?: readonly string[] }

export interface Listener extends Ordered<(event: Envelope) => void> {
	readonly source: string;                 // plugin id, or "kernel"
	readonly type: string;
	readonly schema: TSchema;                // must equal the declaring plugin's schema
}
export interface PluginHooks {
	readonly runStarted?: readonly Ordered<() => void>[];
	readonly tickStarted?: readonly Ordered<() => void>[];             // after the tick's due jobs
	readonly inputs?: readonly Ordered<(actor: ActorId) => readonly InputLine[]>[];
	readonly activationOpened?: readonly Ordered<(actor: ActorId) => void>[];
	readonly activationClosed?: readonly Ordered<(actor: ActorId) => void>[];
	readonly tickEnded?: readonly Ordered<() => void>[];
	readonly runEnded?: readonly Ordered<(reason: string, detail?: string) => void>[];
	news?(actor: ActorId): boolean;          // must not change state; any plugin saying yes counts
	toAct?(): readonly ActorId[];            // who is to act now; at most one loaded plugin has it
}
export interface StageHandlers {
	lock?(call: ToolCall): Refusal | undefined;
	afford?(call: ToolCall): Refusal | undefined;
	rule?(call: ToolCall): Refusal | undefined;
	guard?(call: ToolCall): Promise<Refusal | undefined>;              // reserved, no M1 user
	consult?(call: ToolCall): Promise<Refusal | undefined>;            // reserved, no M1 user
	settle?(call: ToolCall, outcome: ToolSuccess): void;               // only after a successful execute
	after?(call: ToolCall, outcome: ToolOutcome): void;                // also after a refused execute
}
export interface RunLimit { readonly id: string; readonly summary: string; check(): string | undefined }
export interface Fact { readonly output: TSchema; compute(): unknown }

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
	readonly audiences: Readonly<Record<string, readonly string[]>>;
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
	emit(type: string, payload: unknown): void;                        // checked against the declared schema
	call(service: string, method: string, input: unknown): unknown;    // throws when no loaded plugin provides it
	has(service: string): boolean;
	rng(...labels: readonly RandomLabel[]): RandomSource;              // section 3.6
	stage(tool: CanonicalTool, params: unknown, options?: { readonly then?: string }): void;
	readonly actors: ActorsPort;
	readonly schedule: SchedulePort;
	readonly access: AccessPort;
	readonly log: LogView;
}
export interface ActorsView {
	readonly ids: readonly ActorId[];        // every actor of the run, in the definition's order
	ofKind(kind: string): readonly ActorId[];
	has(id: string): boolean;
	mayAct(id: ActorId): boolean;            // false while any plugin holds a suspension
	attribute(id: ActorId, key: string): JsonValue | undefined;        // the calling plugin's own bag
	shared(id: ActorId, key: string): JsonValue | undefined;           // the bag written at genesis (`ActorSpec.shared`)
}
export interface ActorsPort extends ActorsView {
	setAttribute(id: ActorId, key: string, value: JsonValue): void;
	suspend(id: ActorId, reason: string): void;                        // writes `actor_suspended`
	resume(id: ActorId): void;
}
export interface SchedulePort {
	at(tick: number, job: string, data?: JsonValue): void;             // runs at the start of `tick`
	every(interval: number, job: string, options?: { readonly start?: number; readonly data?: JsonValue }): void;
}
export interface AccessPort {
	lock(actor: ActorId, tool: CanonicalTool): void;
	unlock(actor: ActorId, tool: CanonicalTool): void;
	isLocked(actor: ActorId, tool: CanonicalTool): boolean;
	isOpen(actor: ActorId, tool: CanonicalTool): boolean;              // granted, not locked, no lock handler refuses
	open(actor: ActorId): readonly CanonicalTool[];                    // in grant order
}
export interface LogView {
	readonly length: number;
	all(): readonly Envelope[];
	since(seq: number): readonly Envelope[];
	ofType(source: string, type: string): readonly Envelope[];        // `source` is a plugin id or "kernel"
}

// state.ts
export interface SnapshotSlice { readonly version: number; save(): unknown; load(data: unknown, version: number): void }
export const KernelSnapshotSchema = Type.Object({
	format: Type.Literal("swarmtales.kernel"), version: Type.Literal(1),
	game: Type.String(), gameHash: Type.String(), seed: Type.Number(),
	tick: Type.Integer({ minimum: 0 }), seq: Type.Integer({ minimum: 0 }),
	ended: Type.Optional(RunEndSchema),
	actors: Type.Object({ attributes: /* plugin id -> actor id -> key -> value */ Type.Record(Type.String(), Type.Record(Type.String(), Type.Record(Type.String(), Type.Unknown()))), suspensions: Type.Record(Type.String(), Type.Array(Type.String())) }),
	locks: Type.Record(Type.String(), Type.Array(Type.String())),      // actor id -> canonical tools
	jobs: Type.Array(JobSchema),
	counters: Type.Record(Type.String(), Type.Integer({ minimum: 0 })), // `<limit key>|<actor>` -> count in the window
	plugins: Type.Record(Type.String(), SliceDataSchema),              // plugin id -> { version, data }
	scheduler: Type.Optional(SliceDataSchema),
});
// clock.ts
export const JobSchema = Type.Object({ id: Type.Integer(), owner: Type.String(), job: Type.String(), next: Type.Integer(), interval: Type.Optional(Type.Integer({ minimum: 1 })), data: Type.Optional(Type.Unknown()) });
```

A snapshot is taken only between ticks. M1 builds `snapshot()` and resume in the kernel and tests them through
the testkit's round trip; the CLI flags for snapshots and resume are M3.

### 2.7 Ports: scheduler, driver, sink

Derives from old `Turn`, `TurnTaker`, `RunEnd` (`core/host.ts`), `TurnPolicy` (`core/turns.ts`) and the sketch in
paper 01 section 3.1. Changes against the sketch: `advanceTick` is split into `beginTick` and `endTick`, and the
port has `toAct`. **Decided here:** two calls. Reason: the old order runs the turns between the tick-start hooks
and the tick-end hooks, and the scheduler owns the turns.

```ts
// ports.ts
export const RunEndSchema = Type.Object({ reason: Type.Union([Type.Literal("ticks"), Type.Literal("limit"), Type.Literal("stopped"), Type.Literal("error")]), tick: Type.Integer(), limit: Type.Optional(Type.String()) });
export type RunEnd = Static<typeof RunEndSchema>;

/** What a driver gets for one activation. `call` and `record` wait until the activation may act (4.3). */
export interface Activation {
	readonly actor: ActorId;
	readonly tick: number;
	readonly basis: number;                                  // the last seq before the inputs were built
	readonly inputs: readonly InputNote[];
	readonly tools: readonly ToolSpec[];                     // every granted tool, locked or not, model-facing names, grant order
	call(as: string, params: unknown): Promise<ToolOutcome>;
	record(type: string, payload: unknown): Promise<void>;   // a driver event, source "driver"; the type must be declared
}
/** `pending`: the driver holds tool results its model has not answered yet. */
export interface DriverResult { readonly pending: boolean }
/** An agent: a model runner at M2, a script in tests. */
export type ActorDriver = (activation: Activation) => Promise<DriverResult | undefined>;
/** By actor id, else by kind. An activated actor without a driver ends the run with SWT-R011. */
export type DriverTable = Readonly<Record<string, ActorDriver>>;

/** What the scheduler holds: the activation plus its life cycle. */
export interface OpenActivation extends Activation {
	begin(): void;                                           // runs the `activationOpened` hooks
	close(outcome: "acted" | "no-call" | "error"): Promise<void>;   // `activation_closed`, the `activationClosed` hooks, then the staged calls
	readonly quietEnd: boolean;                              // the last call was a free look or ended the turn
}
export interface SchedulerPort {
	readonly seed: number;
	readonly tick: number;
	readonly actors: ActorsView;
	readonly log: LogView;
	readonly halted: boolean;                                // a run limit is reached or a stop is requested; checks the limits
	rng(...labels: readonly RandomLabel[]): RandomSource;
	emit(type: string, payload: unknown): Envelope;          // the scheduler's own events, source = its id
	beginTick(): Promise<void>;
	endTick(played: { readonly passes: number }): Promise<RunEnd | undefined>;
	hasNews(actor: ActorId): boolean;
	toAct(): readonly ActorId[] | undefined;                 // undefined: no loaded plugin names one
	inputsFor(actor: ActorId): readonly InputNote[];         // every `inputs` hook, in hook order
	open(actor: ActorId, inputs: readonly InputNote[], detail: Readonly<Record<string, JsonValue>>): OpenActivation;
	safePoint(at: string): Promise<void>;                    // resolves at once at M1; external input lands here at M3
}
export interface SchedulerPlugin<O = unknown> {
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
	readonly scheduler: { readonly plugin: SchedulerPlugin; readonly options: JsonValue };
	readonly grants: Readonly<Record<string, readonly CanonicalTool[]>>;      // grant name -> tools, in the order a model sees them
	readonly names: Readonly<Record<CanonicalTool, string>>;                  // canonical -> model-facing
	readonly startLocks: Readonly<Record<string, readonly CanonicalTool[]>>;  // grant name -> tools locked at the start
	readonly policies: Readonly<Record<string, Readonly<Record<CanonicalTool, ToolPolicy>>>>;
	readonly replies: Readonly<Record<string, string>>;                       // kernel refusal code -> reply text
	readonly records: EventSchemas;                                           // the driver event types a driver may record
	readonly limits: KernelLimits;
}
export interface Submission { readonly actor: ActorId; readonly as: string; readonly params: unknown; readonly basis: number; readonly causedBy?: number }
export interface KernelPorts { readonly sinks?: readonly EventSink[] }
export interface ResumeInput { readonly snapshot: KernelSnapshot; readonly log: readonly Envelope[] }
export interface Kernel {
	readonly log: LogView;
	readonly tick: number;
	readonly ended: RunEnd | undefined;
	readonly plugins: readonly string[];                                       // ids in load order
	start(): void;                                                             // `run_started` and the `runStarted` hooks; once
	run(drivers: DriverTable, until?: { readonly ticks: number }): Promise<RunEnd | undefined>;   // starts when needed
	submit(call: Submission): Promise<ToolOutcome>;                            // resolves when committed or refused
	toolSpecs(grant: string): readonly ToolSpec[];
	openTools(actor: ActorId): readonly string[];                              // model-facing names
	fact(key: string): unknown;                                                // `<plugin id>.<fact>`
	snapshot(): KernelSnapshot;                                                // only between ticks
	subscribe(sink: EventSink): void;
	stop(reason: string): void;
}
```

`createKernel(definition, ports?, resume?)` is exported by `@swarmtales/kernel`, not by contracts.

### 2.9 `GameDefinition` version 1

Derives from old `CoreStory` and `CoreStoryData` (`packages/contracts/src/core/story.ts`). Changes: `minutes`
becomes `end.ticks`; `turns` becomes `scheduler`; `grants` defaults to automatic and merges `grantTweaks`; `teams`,
`roles`, `params`, `win`, `briefing`, `texts` and `schema` are new; `overseers`, `decisions`, `audiences` and `human`
are not in version 1 (they come back as additive fields at M3). There is no `kind` field.

```ts
// game/game.ts  (the data form: what a YAML or JSON file holds and what `game.hash` hashes)
const ResidentId = Type.String({ pattern: "^[A-Za-z0-9_.-]+$" });
const ParamRef = Type.Object({ $param: Type.String() });
const ParamSpec = Type.Object({ type: Type.Union([Type.Literal("integer"), Type.Literal("number"), Type.Literal("boolean"), Type.Literal("string")]), default: Type.Unknown(), description: Type.String(), minimum: Type.Optional(Type.Number()), maximum: Type.Optional(Type.Number()), enum: Type.Optional(Type.Array(Type.Unknown())) });
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
	params: Type.Optional(Type.Record(Type.String(), ParamSpec)),
	grants: Type.Optional(Type.Record(Type.String(), Type.Union([Type.Array(Type.String()), GrantTweak]))),
	locked: Type.Optional(Type.Array(Type.String())),                         // tools every resident starts with locked
	tools: Type.Optional(Type.Record(Type.String(), Type.Record(Type.String(), ToolPolicySchema))),   // grant name -> tool -> policy
	scheduler: Type.Optional(Type.Object({ id: Type.String(), options: Type.Optional(Type.Unknown()) })),   // default: turns
	limits: Type.Optional(Type.Object({ maxCallsPerTick: Type.Optional(Type.Integer({ minimum: 1 })) })),
	end: Type.Object({ ticks: Type.Union([Type.Integer({ minimum: 1 }), ParamRef]) }),
	win: Type.Optional(Type.Object({ fact: Type.String() })),
	briefing: Type.Optional(Type.Union([Type.String(), Type.Record(ResidentId, Type.String())])),
	texts: Type.Optional(Type.Record(Type.String(), Type.String())),          // overrides of plugin texts, by key
	model: Type.Optional(Type.String()),                                      // recorded at M1, used from M2
}, { additionalProperties: false });
export type GameData = Static<typeof GameDefinitionSchema>;
```

Meaning of the fields that are new:

- **`teams`, `roles`.** Game-level data. The sdk checks every member against `residents` and writes `team` and
  `role` into `ActorSpec.shared`; the `roster` mechanic serves them (6.4). The five ported mechanics keep their own
  `teams` option at M1 (D2); reading the game's teams is the frame work of M4.
- **`params` and `{ "$param": "name" }`.** A reference may stand wherever a JSON value stands inside
  `mechanics[].options`, `scheduler.options`, `limits` and `end`. Resolution replaces it by the value given for the
  run, else the default. **Decided here:** references instead of build functions. Reason: a game stays plain data
  (REWRITE 3.5), so YAML, JSON and the builder are equal. M1 resolves them; the flag `--set` is M2.
- **`end` and `win`.** `end.ticks` is the run's length (`KernelLimits.maxTicks`). `win.fact` names the fact
  (`<plugin id>.<fact>`) whose value is the run's result line. **Decided here:** `end` has only `ticks` and `win`
  only `fact` in version 1; `end.on` and a `score` mechanic are additive later. Reason: no M1 or M2 game needs more,
  and a run that ends on a game event already does so through a plugin's run limit.
- **`as`.** Per mechanic use: bare tool name to model-facing name, for a clash (03 D10).
- **`grants`.** Absent for a grant name: every tool whose `for` names it, in load order. A list replaces it (and
  sets the order a model sees). `{ drop, add }` changes the derived list.

### 2.10 `RunManifest`

Derives from the sketch in paper 02 section 2.1 and replaces old `000-run.json` and the genesis fields of
`ChainGenesisSchema`. Changes against the sketch (DECISIONS 02 D2, C7): no `contextPolicy`; the scheduler is an
open id plus options, not an enum; one kernel revision integer.

```ts
// game/manifest.ts
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
	limits: Type.Object({ maxTicks: Type.Integer(), maxCallsPerTick: Type.Optional(Type.Integer()), budgetUsd: Type.Optional(Type.Number()) }),
	naming: Type.Literal(1),
	log: Type.Object({ format: Type.Literal(LOG_FORMAT), version: Type.Literal(LOG_VERSION) }),
	resumedFrom: Type.Optional(Type.Object({ snapshotHash: Hash })),
	experiment: Type.Optional(Type.Object({ id: Type.String(), specHash: Hash, arm: Type.String() })),
}, { additionalProperties: false });
export type RunManifest = Static<typeof RunManifestSchema>;
```

`kernel.revision` is `RUNTIME_REVISION` of `packages/kernel/src/revision.ts` and starts at **3** (DECISIONS 01 #11).
`purpose` is `smoke` for every M1 run. `model` is absent for a fake or scripted driver.

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
and P, in `packages/kernel/src/errors.ts` for R, in `packages/runlog/src/verify.ts` for L, in `apps/cli` for C):

| Code | Raised when |
|---|---|
| `SWT-G001`, `G002`, `G003` | the game does not match schema version 1; `schema` is not 1; `directors` is not empty before M3 |
| `SWT-G010`, `G011` | a resident id is doubled or malformed; a team or role names an id that is not a resident |
| `SWT-G012`, `G013`, `G014` | a tool is granted, locked or configured but not defined; two tools share a model-facing name (fix: `as`); a model-facing name does not match `MODEL_TOOL_NAME` |
| `SWT-G020`, `G021`, `G022` | an option does not match the mechanic's schema (with the field path); a mechanic is listed twice; a data game names a mechanic that is not installed |
| `SWT-G030`, `G031`, `G032`, `G033` | a required service has no provider; a service has two providers; `requires` form a cycle; `after` relations form a cycle |
| `SWT-G034`, `G035` | two plugins have a `toAct` hook; activation `toAct` without one |
| `SWT-G040`, `G041`, `G050` | a param value does not fit its spec or is not declared; a `$param` names no declared param; `win.fact` names no fact |
| `SWT-M010`, `M011`, `M014` | an event type is reserved by the kernel or declared twice; the head's `package` is not the package's name (conformance); state without a snapshot slice |
| `SWT-M021`, `M022`, `M023` | an emitted payload does not match its schema; a service output does not match; a staged tool is unknown |
| `SWT-P003` | a declared prompt has no text (found at resolution, not in a run) |
| `SWT-R001`, `R002`, `R003` | the kernel is used after it failed; a snapshot does not fit the definition; plugin code threw (the first failure leads, as `cause`) |
| `SWT-R010`, `R011`, `R012`, `R020` | a scheduler order is no permutation; an activated actor has no driver; a driver records an undeclared type; a sink threw |
| `SWT-L001` to `L005` | the chain breaks at a line; a head signature fails; the manifest hash differs from the genesis; a line is no envelope; `seq`, `tick`, `causedBy` or `basis` out of order |
| `SWT-C001`, `C002`, `C003`, `C010`, `C020` | game file not found; unsupported file type; bad flag value; `--fake` meets a granted tool without `sample` (warning); a live run before M2 |

## 3. Kernel

`@swarmtales/kernel` exports `createKernel`, `RUNTIME_REVISION`, and from `random.ts` `createRng`, `seedFrom`,
`deriveSeed`, `rngFor`. Nothing else. It calls no model, reads no file, no environment variable and no wall clock.

### 3.1 The seven parts as files

Each file exports one factory; the object it returns is used only by `kernel.ts` and by the files named.

| Part | File | Ported from (old `packages/kernel/src/host/`) | Public functions |
|---|---|---|---|
| 1 Log | `log.ts` | `log.ts` (`EventBus`) | `createLog(tick, prefix?)`: `emit(source, type, payload, audience?)`, `run(frame, code)`, `frame()`, `listen(listeners)`, `subscribe(sink)`, `fail(last)`, and `LogView` |
| 2 State | `slices.ts` | `snapshots.ts` | `saveKernel(parts, tick, ended)`, `restoreKernel(parts, snapshot)` |
| 3 Actors | `actors.ts` | `residents.ts` | `createActors(specs, log)`: `ActorsView` plus `portFor(pluginId): ActorsPort`, `state()`, `restore(state)` |
| 4 Dispatch | `dispatch.ts` | `gateway.ts` | `createDispatch(parts)`: `submit(submission)`, `settle()`, `quietEnd(actor)` |
| | `staging.ts` | `staging.ts` | `createStaging()`: `add`, `take`, `takeAll`, `restore`, `clear`; `stagedData(outcome)` |
| | `arguments.ts` | `arguments.ts`, carried | `convertArguments(schema, raw)` |
| | `access.ts` | `access.ts` | `createAccess(grants, startLocks, log)`: `granted`, `lock`, `unlock`, `isLocked`, `isOpen`, `open`, `state`, `restore` |
| | `counters.ts` | `referee.ts` without cost | `createCounters(limits, policies)`: `step(actor)`, `admit(tool, actor)`, `count(tool, actor)`, `tickStarted(tick)`, `breach(limits)`, `state`, `restore` |
| 5 Services | `services.ts` | part of `loader.ts` | `createServices(log)`: `provide(pluginId, service)`, `call(caller, service, method, input)`, `has(service)` |
| | `loader.ts` | `loader.ts` | `loadPlugins(definition, parts)`: instantiates in the given order, registers tools, listeners, hooks, stages, jobs, limits, facts, slices; returns the tables |
| | `order.ts` | `phases.ts` | `ordered(entries)`: load order plus `after`, stable |
| 6 Clock and jobs | `clock.ts` | `scheduler.ts` | `createClock()`: `tick`, `advance()`, `at`, `every`, `take(tick)`, `state`, `restore` |
| 7 Ports | `ports.ts` | `turns.ts` (the part that is not policy) | `createSchedulerPort(parts)`, `openActivation(parts, actor, inputs, detail)` |
| Assembly | `kernel.ts` | `host.ts` | `createKernel(definition, ports?, resume?)`: life cycle, `beginTick`, `endTick`, `finish`, failure handling |

Frames: the log keeps a stack of `{ actor, causedBy?, basis?, tool? }`. Every piece of plugin code runs inside
`log.run(frame, code)`; an event takes actor, cause, basis and tool from the top frame.

### 3.2 Loading and registration

The sdk has done every check that can be done from the game (section 6.5). The kernel loads in the order of
`definition.plugins` and verifies only what protects it: every `requires` has a loaded provider, no event type of a
plugin is a kernel event type, no two plugins declare the same event type, every staged or granted canonical tool
exists. A violation is `SWT-R002` or `SWT-M010`, never a silent skip.

- **Tools** register under their canonical name; `definition.names` gives the model-facing name; `submit` and
  `Activation.call` take the model-facing name and resolve it against the caller's grant.
- **Services.** `port.call(service, method, input)` finds the provider. For a `command` the kernel writes
  `service_called` and runs the provider in a frame caused by it; a `query` writes nothing. The provider's wrapper
  (built by the sdk) checks input and output against the schemas. `port.has(service)` is known from the start.
- **Events.** `port.emit(type, payload)` checks the payload against `ResolvedPlugin.events[type]` (`SWT-M021` on a
  mismatch, which ends the run) and appends. Listeners are delivered when the frame that was open at the emit
  returns: in log order of the events, and per event in listener order (3.4), each in a frame
  `{ actor: event.actor, causedBy: event.seq }`. What a listener emits queues behind. There is one delivery mode;
  the old `immediate` mode is gone (none of the five mechanics uses it). Sinks see an event after its listeners.
- **Jobs** are named functions; an entry holds owner, name, next tick and data, so the queue is in the snapshot.
- **Run limits** (`RunLimit`) are checked where 3.5 says; the first that answers a reason ends the run with
  `limit_reached { limit: "<plugin id>.<limit id>" }`.

### 3.3 The dispatch pipeline

One lane: `submit` calls are serialised through one promise queue. A call that throws breaks the lane; the kernel
writes `run_ended { reason: "error" }` as the last event and every later use throws `SWT-R001` with the first
failure as cause. The stages in order, for a submission by `actor` of the model-facing name `as`:

| # | Stage reported | What runs | Refusal |
|---|---|---|---|
| 0 | | append `tool_called { as, params }` with `basis` and `causedBy`; every later event of the call is caused by it | |
| 1 | `limit` | the step counter (`maxCallsPerTick`), unless the tool is `free` | `STEP_LIMIT` |
| 2 | `lock` | the name resolves to a tool; the caller's grant holds it; the actor may act and the tool is not locked for it; then every plugin's `lock` handler in load order | `TOOL_UNKNOWN`, `TOOL_NOT_GRANTED`, `TOOL_LOCKED`, the handler's |
| 3 | `parse` | `convertArguments`, then the tool's `prepare` | `INVALID_ARGUMENTS` |
| 4 | `limit` | the tool's own limit and the game's policy limit | `TOOL_LIMIT` |
| 5 | `afford` | every plugin's `afford` handler in load order | the handler's |
| 6 | `rule` | the tool's own `rule`, then every plugin's `rule` handler in load order | the handler's |
| 7 | `guard`, `consult` | registered handlers, awaited; none at M1; the lane is held while they wait | the handler's |
| 8 | `execute` | `prepared.execute()`; a refusal here is reported at stage `execute` | the tool's |
| 9 | `settle` | on success: count the call against its limits, then every `settle` handler | |
| 10 | `after` | every `after` handler, also after a refused execute | |
| 11 | | on success append `tool_result { as, reply, endsTurn? }`; remember whether the call was a free look or ended the turn | |
| 12 | | run the staged calls (below), then resolve the caller's promise | |

A refusal at any stage is one `tool_refused { as, stage, code, detail? }` and ends the call; stages 9 to 11 are
skipped, stage 10 runs only when the refusal came from `execute`. The reply text of a kernel refusal code comes from
`definition.replies`. Step 1 before step 2 is the old order and is kept, so the same calls are refused with the same
codes.

**Staged calls.** `port.stage(tool, params, { then })` queues a call by actor `script`. The queue runs after the call
(or the hook, job or listener batch) that staged it, through the whole pipeline. Calls staged while a staged call
runs go first, depth first. `then` names a job of the staging plugin that gets the outcome as data.

### 3.4 Ordering without order numbers

Every place where several plugins register for the same point (a hook point, the listeners of one event, a stage
handler) runs in **load order**; within one plugin in the order it lists them. A registration of a hook or listener
may add `after: [plugin ids]`: it then runs after every registration of the same point by those plugins. An id that
is not loaded is ignored. The sort is stable (`order.ts`): repeatedly take the first entry in load order whose
`after` entries are all placed. A cycle is `SWT-G033` and names the plugins.

Load order is computed by the sdk (`load-order.ts`, a port of old `loadOrder` in `loader.ts`): a plugin comes after
the providers of what it `requires` and of the loaded services it `uses`; when only `uses` edges block, the first
blocked plugin in the game's order goes next; a cycle of `requires` is `SWT-G032`. **Decided here:** the old load
order algorithm is ported unchanged. Reason: load order decides the order of tools a model sees and of tied hooks,
and D2 forbids changing it during a port. The stricter rule "no cycle among `uses`" becomes a check at M3.

Stage handlers take no `after` at M1; they run in load order.

What this replaces for tic-tac-toe teams (old `mechanics/shared/src/order.ts`); the load order of the game is
`team-channel`, `grid-game`, `consensus`, `strategy-brain`, `optimal-referee`:

| Point | Old numbers | New |
|---|---|---|
| `runStarted` | brain -100, grid 0 | `grid-game` declares `after: ["strategy-brain"]` |
| `tickStarted` | consensus 10, brain 20 | load order |
| `tickEnded` | consensus 100, brain 200 | load order |
| `turnInputs` | brain 300, grid 350, team-channel 400, consensus 500 | the hooks run in load order (they touch only their own state); the order **shown** is the scheduler option `inputs` (4.2) |

### 3.5 Tick sequence

A port of old `Host#play`. `beginTick` and `endTick` are called by the scheduler.

1. `beginTick`: reset the per-tick counters; append `tick_started`; run staged calls.
2. Due jobs in the order they were scheduled: append `job_ran`, run the job in a frame caused by it, run staged calls.
3. `tickStarted` hooks; run staged calls. The scheduler now plays its passes (section 4).
4. `endTick`: check the run limits once if no pass found a breach; `tickEnded` hooks; run staged calls.
5. Append `tick_ended`; run staged calls; check the run limits again.
6. The clock advances by one, unless no pass started and the run ends now (a stop or a breach seen at the tick's start).
7. A breach: append `limit_reached`, then finish with `{ reason: "limit", limit }`. A stop request: finish with
   `stopped`. `tick >= maxTicks`: finish with `ticks`. Otherwise return undefined.

Finish: each `runEnded` hook followed by its staged calls, then `run_ended { reason }`, then the sinks' `close`.
`start()` appends `run_started` and runs the `runStarted` hooks; what they stage runs in step 1 of the first tick.
A job scheduled for a tick that has started runs at the start of the next one.

### 3.6 Determinism rules

1. **The generator is carried bit for bit:** `packages/kernel/src/random.ts` is the old
   `packages/kernel/src/random.ts` (Mulberry32 in `createRng`, FNV-1a in `seedFrom`,
   `deriveSeed(seed, ...parts) = seedFrom([String(seed >>> 0), ...parts.map(String)].join(":"))`, `rngFor`). Only the
   interface name changes (`Rng` becomes `RandomSource` from contracts). A test pins these vectors, computed on the
   old code: `deriveSeed(11, "turns", 0) === 783580791`; `deriveSeed(11, "turns", 0, 2) === 1691496671`;
   `rngFor(11, "turns", 0).shuffle(["A01", "A02", "A03", "A04", "A05", "A06"])` gives `A06, A01, A03, A04, A05, A02`;
   `createRng(1).next() === 0.6270739405881613`; `rngFor(7, "deal", 3).int(1, 100) === 17`.
2. **Stream labels.** `port.rng(...labels)` is `createRng(deriveSeed(seed, ...labels))`. The labels are **not**
   prefixed with the plugin id: the label space is global, as in the old code, so old and new runs deal the same.
   A plugin's first label is its own id or a word it lists in its README (the labels are part of its contract, 02 D3).
   Reserved first labels: `turns` (the scheduler: `("turns", tick)` for pass 1, `("turns", tick, pass)` for later
   passes) and `fake` (the fake driver: `("fake", actor id, n)`).
3. **No stream that depends on the log position.** The old `ctx.random()` and `setup.random()` are not carried.
4. A plugin's events are a function of its state, the committed input and `rng`. No wall clock, no `Math.random`,
   no timer, no I/O in layers 1 to 3 (lint).
5. Wall-clock stamps exist only in the sink (`at`). The kernel never reads them; replay ignores them.
6. All state changes happen in the lane. Driver code runs outside it and reaches the kernel only through
   `Activation.call` and `Activation.record`.

### 3.7 What the kernel must not know

The word-list test fails when one of these words appears as a whole word or as a part of an identifier (split at
case changes, `_` and `-`), in code, comments or strings, in `packages/kernel/src` or `packages/contracts/src/kernel`:

`resident`, `director`, `overseer`, `gamemaker`, `judge`, `referee`, `weaver`, `classifier`, `player`, `team`,
`captain`, `role`, `minute`, `round`, `turn`, `pass`, `level`, `point`, `score`, `vote`, `ballot`, `board`, `move`,
`match`, `card`, `deal`, `puzzle`, `exile`, `tribunal`, `whisper`, `marks`, `ledger`, `city`, `story`, `decision`,
`briefing`, `prompt`, `model`, `cost`, `usd`.

Allowed, because they are the kernel's own vocabulary: `actor`, `kind`, `grant`, `tool`, `service`, `event`, `tick`,
`job`, `plugin`, `activation`, `stage`, `limit`, `human` and `script` (reserved actor ids), `guard` and `consult`
(stage names until M5), `game` (only as `game.id` and `game.hash`). The single listed exception is the payload field
`endsTurn` of `ToolSuccess` and `tool_result`, kept because ported mechanics return it (D2); the test has an allow
entry for that identifier and for nothing else.

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
`inputs` are new. Its events: `pass_started { pass, order, blocks }` and `activation_skipped { actor, pass, block }`.

### 4.2 Wake rule

For each member of a block, when its inputs are built:

| `activation` | The actor is woken when |
|---|---|
| `always` | it may act |
| `onNews` | it may act and (`port.hasNews(actor)` or it is pending) |
| `toAct` | it may act and `port.toAct()` contains it; news and pending do not count |

"Pending" is kept by `turns` per actor: the last activation's driver returned `{ pending: true }` and that
activation's `quietEnd` was false (its last call was neither a free look nor a success with `endsTurn`). This is the
old `awaitsAnswer && !lastCallNeedsNoAnswer` of runtime revision 2, unchanged. The pending map is the scheduler's
snapshot slice. An actor that is not woken gets `activation_skipped`. The reason (`always`, `news`, `answer`,
`toAct`) goes into `activation_opened.detail.reason` beside `pass` and `block`.

Input order (`inputs.ts`, a port of `arrangeInputs`): the entries of `inputs` in list order. A `{ kind }` entry takes
the lines of that kind, sorted by their `order`, joined into one line when `join` is set. A `{ source }` entry takes
the remaining lines of that plugin id in hook order. Lines matched by no entry follow in hook order.

### 4.3 A tick, a pass, a block, a turn end

```
run(port, drivers, until):
  repeat
    await port.beginTick()
    passes = 0
    for pass = 1 .. options.passes, while not port.halted
      passes += 1
      may   = actors of options.kinds that may act, in definition order
      order = "roster": may;  "seeded": port.rng("turns", tick [, pass if pass > 1]).shuffle(may)
      port.emit("pass_started", { pass, order, blocks })           blocks = order cut into blockSize
      for each block, index from 1
        await port.safePoint("beforeBlock");  stop the pass when port.halted
        await playBlock(block)
        await port.safePoint("afterBlock")
    end = await port.endTick({ passes })
  until end is defined or until.ticks ticks were played
```

`playBlock`, with **no await** while the members are prepared, so every member's inputs show the block's start:

1. For each member in order: skip it when it may not act; apply the wake rule (skip with `activation_skipped`);
   build its inputs (`port.inputsFor`, arranged); `port.open(actor, inputs, detail)` writes `activation_opened`;
   start its driver at once.
2. Member k becomes **ready** when member k-1's activation is closed (member 1 at once). At that moment
   `begin()` runs the `activationOpened` hooks. The `call` and `record` of member k wait for ready by themselves.
   So the drivers of a block run concurrently (the model calls overlap), and their calls land in the block's order.
3. A turn **ends** when the driver's promise settles. Then `close(outcome)` writes `activation_closed`, runs the
   `activationClosed` hooks and the staged calls. The outcome is `acted` when at least one call was submitted,
   `no-call` otherwise, `error` when the driver rejected. A tool reply with `endsTurn` does not close the activation
   by itself; it only marks `quietEnd`, and the driver is expected to return (the scripted and fake drivers do).
4. A failed member does not stop the next member; the first failure is thrown after the block and ends the run with
   reason `error`.

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

- **Heads.** A signed head at the run's end and with every snapshot, as today. No interval heads (cut list).
- **Verify.** `verifyRun(dir)` in `runlog/src/verify.ts` reads the four files and returns issues: `verifyRunTexts`
  (L001 to L003), every line parses with `StoredEnvelopeSchema` (L004), `envelopeLogIssues` (L005), the manifest
  parses with `RunManifestSchema`, and the last line is `run_ended` (else the verdict says "unfinished", not broken).
  `verifyChainText` keeps accepting a version 1 genesis, so the viewer still verifies old runs.

## 6. sdk

`@swarmtales/sdk` imports contracts only. Authors import it through `swarmtales` and `swarmtales/mechanic`.

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
| `MechanicHead` | `id`, `package`, `summary`, `requires?`, `provides?`, `uses?`, `options`, `state`, `events`, `audiences?`, `prompts?` | `package` is new (the npm name; conformance checks it against `package.json`); `decisions` waits for M3 |
| `MechanicBody` | `tools?`, `services?`, `listeners?`, `facts?`, `hooks?`, `pipeline?`, `limits?`, `jobs?`, `snapshot?` | `commits`, `turns`, `presentation`, `guard` are not carried |
| `MechanicHooks` | `runStarted`, `tickStarted`, `turnInputs`, `turnOpened`, `turnEnded`, `tickEnded`, `runEnded` (each a `HookSlot`), `news`, `toAct` | `minute*` renamed; `runResumed` gone; `toAct(ctx): readonly string[]` (resident ids) is new |
| `HookSlot<F>` | `F`, or `{ run: F; after?: readonly string[] }`, or a list of those | `order: number` becomes `after` |
| `ListenOptions` | `{ after?: readonly string[] }` | `immediate` and `order` are gone |
| `MechanicKit` | `tool`, `provide`, `on`, `listen`, `kernel` (old `core`), `fact`, `limit`, `snapshot` | `provideSome` is gone |
| `ToolDefinition` | `name`, `description`, `parameters`, `limit?`, `for?`, `free?`, `rule?`, `sample?`, `execute` | `suggest` becomes `for`; `serves`, `guardText`, `consult` wait; `sample(ctx)` is new and optional |
| `MechanicContext` | `mechanic`, `seed`, `options`, `state`, `tick`, `ticks`, `residents`, `schedule`, `access`, `log`, `emit`, `call`, `has`, `tryCall`, `prompt`, `rng`, `stage` | `minute` and `minutes` become `tick` and `ticks`; `random`, `roles`, `decide`, `decisions` are gone |
| `ToolContext` | the context plus `actor: ActorId` and `resident: string \| undefined` | unchanged in meaning |
| `MechanicDefinition` | callable: `gridGame(options?)` returns a `MechanicUse`; members `id`, `package`, `source`, `summary`, `requires`, `provides`, `uses`, `options`, `events`, `prompts`, `parseOptions`, `resolve(options, texts): ResolvedPlugin` | `.with()` becomes the call; `instantiate` becomes `resolve`, which binds options and texts and returns the kernel's `ResolvedPlugin` |

Rules of the port between author words and kernel words, done once in `context.ts` and `hooks.ts`:

- The author sees resident ids (`A01`); the kernel sees actor ids (`resident:A01`). `ctx.residents` is the view of
  the actors of kind `resident` with bare ids; hooks that take a resident are called only for that kind.
- `ctx.access.lock(resident, "playMove")` takes the mechanic's own bare tool name or a `ToolRef`; the sdk makes it
  canonical. `ctx.stage(ref, params)` likewise.
- `description` is a prompt id when it equals a key of the head's `prompts`, else it is the text itself.
  **Decided here.** Reason: ported mechanics keep their prompt files untouched, a new mechanic needs no file.
- `ctx.prompt(id, variables)` renders through the `PromptLookup` that resolution was given; lookup order as today:
  the game's `texts` override, the game's folder, the mechanic's `prompts/` folder, `library/prompts/`.

**Where the one-object sugar plugs in (D1).** If the spike passes, `defineMechanic` gains one overload
`defineMechanic(spec)` in `mechanic/define-mechanic.ts` whose whole body is
`const [head, build] = splitSpec(spec); return defineMechanic(head, build);`, with `splitSpec` in the reserved file
`mechanic/sugar.ts`. Nothing else in the sdk, the kernel or the contracts knows the sugar. If the spike fails, the
file is never created. No M1 issue depends on the verdict; the fixture mechanic and the five ports use head and body.

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
export function param(name: string): { readonly $param: string };
/** The data form of a builder game, and the definitions it used, by id. */
export function gameData(game: Game): { readonly data: GameData; readonly mechanics: Readonly<Record<string, MechanicDefinition>> };
```

A port of old `defineCoreStory` and `storyData` (`packages/kernel/src/host/define.ts`). The tool-name inference
(`ToolOf<Ms>`) is kept, so a grant or a lock of a tool whose mechanic is not listed does not compile. Compile-time
checks of resident ids and of missing services are not built at M1 (DECISIONS 04 #10); they are load errors.

### 6.3 `defineDirector`, reserved

M1 ships the types only, in `director/types.ts`, so the name and the shape are fixed (paper 04 section 2.3, C10):

```ts
export interface DirectorSpec<Out extends TSchema = TSchema> {
	readonly id: string; readonly summary: string;
	readonly dials?: Readonly<Record<string, DialSpec>>;
	readonly on: readonly TriggerRef[];
	system(context: DirectorPromptContext): string;
	input(context: DirectorFiredContext): string;
	readonly output: Out;
	act(answer: Static<Out>, ctx: DirectorActContext): void;
	fallback(): Static<Out>;
	sample?(ctx: DirectorActContext): Static<Out>;
	readonly limits?: { readonly maxCalls?: number; readonly maxCostUsd?: number };
	readonly tools?: readonly ToolRef[];                     // the declared exception: the model calls tools itself
}
export declare function defineDirector<Out extends TSchema>(spec: DirectorSpec<Out>): DirectorDefinition<Out>;   // implemented at M3
```

The helper types (`DialSpec`, `TriggerRef`, the three contexts) are declared as opaque interfaces at M1. A game with
a non-empty `directors` is `SWT-G003`.

### 6.4 The `roster` mechanic

`packages/sdk/src/roster/index.ts`, written with the sdk's own `defineMechanic`, id `roster`, package
`@swarmtales/sdk`. No state, no tools, no events. It provides the service `roster` (all queries):
`ids(): string[]`, `teams(): Record<string, string[]>`, `teamOf({ resident }): string | null`,
`roles(): Record<string, string[]>`, `roleOf({ resident }): string | null`, `present({ resident }): boolean`
(may act). It reads `ActorSpec.shared` and `mayAct`. Game resolution appends it unless a listed mechanic provides
`roster`. It is the last plugin in load order unless something requires it.

### 6.5 Game resolution

```ts
// game/resolve.ts
export interface ResolveInput {
	readonly game: Game | GameData;
	readonly installed?: Readonly<Record<string, MechanicDefinition>>;   // for a data game: id -> definition
	readonly schedulers: Readonly<Record<string, SchedulerPlugin>>;      // "turns" -> the plugin
	readonly prompts: PromptLookup;
	readonly params?: Readonly<Record<string, JsonValue>>;
	readonly seed?: number;
}
export interface ResolvedGame {
	readonly definition: KernelDefinition;
	readonly data: GameData;                                             // params replaced, defaults filled, `roster` listed; `definition.game.hash` is its `jsonHash`
	readonly texts: Readonly<Record<string, string>>;                    // every text a model may read, by key
	readonly briefings: Readonly<Record<string, string>>;                // actor id -> briefing
	readonly win: string | undefined;
}
export function resolveGame(input: ResolveInput): ResolvedGame;        // throws one SwtError with every issue found
```

Steps, in order; each collects issues and resolution throws once at the end, sorted by data path:

1. Schema: the data form against `GameDefinitionSchema` (`G001`, `G002`, `G003`).
2. Params: check the given values against the specs, replace every `$param` (`G040`, `G041`).
3. Residents: a count becomes `A01`.. (width 2, or the count's digits; old `competitorIds`); ids unique (`G010`).
   Each becomes an actor `resident:<id>` of kind and grant `resident`.
4. Teams and roles: members are residents (`G011`); written into `shared`.
5. Mechanics: find each definition (`G022`), no id twice (`G021`), parse options with defaults (`G020`), append
   `roster` (6.4).
6. Services and load order: `G030`, `G031`, `G032`; then `after` cycles (`G033`) and `toAct` (`G034`, `G035`).
7. Tool names: canonical names; model-facing names from `as` or the bare name; clashes within a grant (`G013`);
   the pattern (`G014`).
8. Grants, locks and policies: derive from `for`, apply lists and tweaks; every named tool exists (`G012`, with
   `closest`).
9. Texts: render every tool description and collect every prompt of every mechanic and the kernel replies
   (`library/prompts/replies/core/`); a missing text is `P003`.
10. Scheduler: default `{ id: "turns" }`; options against the plugin's schema (`G020` with the path
    `scheduler.options`).
11. `win.fact` names a fact of a listed mechanic (`G050`). `end.ticks` becomes `limits.maxTicks`.
12. Build `KernelDefinition`; hash the data form.

Step 6 uses each definition's static head only. Checks that need a body (`G034`, `G050`, `M014`) instantiate the
plugins once against a stub port that throws on every call; a mechanic's `state` function may therefore throw an
`SwtError` for its own option checks (old: `grid-game: line 4 does not fit a board of 3`), which resolution reports
under `G020`.

## 7. Testkit

`@swarmtales/testkit`, reachable as `swarmtales/testing`. A port of old `packages/testkit/src/agents.ts` and
`conformance.ts`; `golden.ts`, `gates.ts`, `stand-ins.ts`, `overseers.ts` are not carried; `mutation.ts` is carried
with the mutation gate in its own issue after M1.

```ts
// drivers.ts
export interface PlannedCall { readonly tool: string; readonly params: unknown }
export type Plan = (activation: Activation) => readonly PlannedCall[] | Promise<readonly PlannedCall[]>;
export interface CallRecord { readonly tick: number; readonly actor: ActorId; readonly tool: string; readonly outcome: ToolOutcome }
/** Makes the planned calls one after the other; never pending. */
export function scriptedDriver(plan: Plan, record?: CallRecord[]): ActorDriver;
/** A driver that sees each reply before it decides the next call (the old tests' `turn.call` style). */
export function interactiveDriver(step: (activation: Activation) => Promise<void>): ActorDriver;
export const idleDriver: ActorDriver;
/** `--fake`: for the activated actor, calls the first open tool whose `sample` gives params; again until a reply ends the turn, no tool samples, or 8 calls. */
export function fakeDriver(kernel: Kernel, seed: number): ActorDriver;

// play.ts
export interface PlayOptions { readonly seed?: number; readonly params?: Readonly<Record<string, JsonValue>>; readonly drivers?: DriverTable; readonly script?: Readonly<Record<string, readonly (readonly [string, unknown])[]>>; readonly ticks?: number; readonly prompts?: PromptLookup; readonly resume?: ResumeInput }
export interface Played { readonly kernel: Kernel; readonly end: RunEnd | undefined; readonly events: readonly Envelope[]; readonly calls: readonly CallRecord[] }
/** Resolves the game, creates a kernel and plays to the end or `ticks` ticks. */
export function play(game: Game | GameData, options?: PlayOptions): Promise<Played>;
/** A started kernel with the old host's test helpers, so ported tests change names only. */
export function host(game: Game | GameData, options?: PlayOptions): TestHost;
export interface TestHost { readonly kernel: Kernel; call(actor: ActorId, tool: string, params: unknown): Promise<ToolOutcome>; openTools(resident: string): readonly string[]; fact(key: string): unknown; playTicks(driver: ActorDriver, ticks: number): Promise<RunEnd | undefined> }
```

The run assembly of `engine` (`createRun`) is what `play` and the CLI both use, so tests and runs share one path.

**Fixture mechanic.** `packages/testkit/src/fixtures/guess-number.ts`, id `guess-number`, in head-and-body form, at
most 80 code lines: option `max` (default 100), state `{ secret, winner? }` with `secret = rng("guess-number",
"secret").int(1, max)`, event `guessed { by, value, hint }`, one tool `guess { value }` for `resident` with an inline
description, a `sample`, `reply(..., { endsTurn: true })`, a run limit `solved`, a snapshot slice, a `toAct` hook
naming every resident while unsolved. It is the kernel's and the sdk's integration fixture and the body of sample 5
at M6. Its tests: found in two guesses; determinism; snapshot round trip; a wrong payload is `SWT-M021`.

**Conformance** (`conformance.ts`, each returns a list of problems): `checkDeterminism(game, driver)` (two runs,
equal envelopes), `checkSnapshotRoundTrip(game, driver, cut)` (cut at a tick, JSON round trip, resume, equal events
after the cut), `checkOptionsDocumented(definition)`, `checkSourceRules(files)` (no `@swarmtales/kernel`, no
`node:*`, no wall clock, no `Math.random`), `checkPackage(definition, packageJson)` (`SWT-M011`, the `swarmtales`
field).

**Oracle runner** (`oracle.ts`). The file format is defined by `oracles/README.md` on the branch `m0/oracles`; that
file did not exist when this spec was written, so the shape below is **what the runner needs, to be aligned**. All
format knowledge sits in `readOracle`; the comparison does not change when the file layout does.

```ts
export interface Oracle {
	readonly game: string;                                   // old story name
	readonly options: JsonValue;                             // the variant, as the old factory took it
	readonly seed: number;
	readonly runtime: number;                                // old runtime revision (2)
	readonly activations: readonly { readonly n: number; readonly tick: number; readonly actor: string; readonly inputs: readonly string[] }[];   // every opened turn, in log order, with the texts shown
	readonly calls: readonly { readonly activation: number; readonly tool: string; readonly params: unknown; readonly outcome: ToolOutcome }[];
	readonly events: readonly { readonly source: string; readonly type: string; readonly tick: number; readonly actor: string; readonly payload: unknown }[];   // mechanic events only, in log order
	readonly end: { readonly reason: string; readonly tick: number };
}
export function readOracle(path: string): Oracle;
export interface OracleMismatch { readonly at: "activation" | "call" | "event" | "end"; readonly index: number; readonly expected: unknown; readonly actual: unknown }
export function runOracle(oracle: Oracle, game: Game): Promise<readonly OracleMismatch[]>;
```

The runner plays `game` with the oracle's seed and a driver that, at the n-th activation in log order, submits the
calls recorded for activation n. It compares, in order, and stops at the first mismatch of each kind:
the activation sequence (actor, tick, and the input texts byte for byte, since they are model-facing);
every call's outcome (`ok`, `reply`, `code`, `detail`, `endsTurn`, byte for byte);
every plugin event (`source` mapped from the old id to the plugin id, `type`, `tick` equal to the old `minute`,
`actor` with `host` mapped to `kernel`, payload deep-equal); the end (`minutes` maps to `ticks`, `referee` to
`limit`). Kernel events are not compared: their vocabulary is new. What the oracle must therefore contain, beyond
"seed, scripted calls, emitted events" of REWRITE: the activation each call belongs to and the input texts.

**Replay** (`replay.ts`), a test tool and not a scheduler: `replay(log, game, seed): Promise<readonly
OracleMismatch[]>` plays the game again with a driver that submits, per activation, the `tool_called` events the
log holds for it (grouped by `causedBy`), and compares every envelope (all fields, no `at`) with the log. For a
`turns` run with scripted drivers this is the "reproducible" level; it is the proof used for determinism in M1.

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
| `library/prompts/replies/core/{unknown-tool,not-granted,locked,limit,steps}.md` | same | carried, byte-identical |
| `packages/prompts/src/*` (341 lines) | same | carried; `PromptLookup` type moves from contracts to `prompts` and is re-exported by the sdk's types |
| `stories/tictactoe-teams/story.ts`, `tictactoeStory` | `games/tictactoe-teams/game.ts`, `tictactoeGame(options)` and the default export | ported: same options and defaults; returns `defineGame({...})` |
| the same file, `briefing(...)` | `games/tictactoe-teams/briefing.ts` | carried: the template strings byte-identical; called at build time, the result is the game's `briefing` record |
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
in the options and so in `game.hash`. The output cap of 16000 tokens and the neutral system prompt belong to the
model driver and are ported with it at M2.

### 8.3 Tests that come along (D7, E7: tests live in their package)

| Old test file | New place | Changes |
|---|---|---|
| `test/mechanics/grid-game/grid-game.test.ts`, `support.ts` | `mechanics/grid-game/test/` | `createHost` and `playStory` become the testkit's `host` and `play`; `order: (view) => view.residents` becomes `order: "roster"`; `host.facts()[k]` becomes `fact(k)` |
| `test/mechanics/consensus/consensus.test.ts`, `toy.ts`, `prompts/toy/*` | `mechanics/consensus/test/` | the same; `toy.ts` is a test mechanic and gets 8.1 |
| `test/mechanics/team-channel/team-channel.test.ts`, `prompts/rounds/*` | `mechanics/team-channel/test/` | the same |
| `test/mechanics/strategy-brain/strategy-brain.test.ts` | `mechanics/strategy-brain/test/` | the same |
| `test/mechanics/optimal-referee/optimal-referee.test.ts` | `mechanics/optimal-referee/test/` | the same |
| `test/stories/tictactoe-support.ts`, `tictactoe-teams.test.ts`, `-4x4`, `-brain-o`, `-mixed` | `games/tictactoe-teams/test/` | the same; assertions on `core` events (`turn_started`, `minute_started`) move to the kernel event names |
| new | `games/tictactoe-teams/test/oracle.test.ts` | `runOracle` returns no mismatch for every oracle file of the game |
| new | `mechanics/*/test/carried.test.ts` | the byte-identity list of 8 (prompts, tool names) |

A test that asserted old-engine bytes (a golden legacy line) is dropped and named in the pull request. No assertion
on a mechanic event, a reply or a refusal code is weakened; if one fails, the port is wrong, not the test.

## 9. CLI slice, run folder, viewer

### 9.1 Commands

| Command | Does | Exit |
|---|---|---|
| `swt run <game file> --fake [--seed n] [--out dir] [--json]` | loads the file, resolves it, plays it with the fake driver, writes a run folder, verifies it, prints the result line | 0 finished; 1 `SwtError` (printed with `formatIssue`, or as JSON); 2 the run ended with reason `error` |
| `swt run <game file>` without `--fake` | `SWT-C020` at M1: live models arrive with M2 | 1 |
| `swt log verify <run dir> [--json]` | `verifyRun`: prints `ok, <n> lines, head <hash>` or the first issue with its line | 0 ok; 1 broken; 3 unfinished run |

`--seed` overrides the game's `seed`. The default `--out` is `runs/` under the current directory.

**Game files** (`apps/cli/src/load-game.ts`): `.ts`, `.mts`, `.js`, `.mjs` are imported and must default-export a
`Game` (`SWT-C002` otherwise); `.json`, `.yaml`, `.yml` are parsed (`yaml` package, YAML 1.2) as `GameData` whose
`mechanics[].use` ids are found in the installed table. The installed table (`installed.ts`) is built from the
`swarmtales` field of the CLI's dependencies (6.1), not written by hand.

**`--fake`** is the driver `fake/sample` (7): seeded legal calls from the tools' `sample` functions. A granted tool
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

Run assembly (`engine/src/run/run.ts`), used by the CLI and by `play`:

```ts
export interface RunInput { readonly resolved: ResolvedGame; readonly drivers: DriverTable | ((kernel: Kernel) => DriverTable); readonly sinks?: readonly EventSink[]; readonly resume?: ResumeInput }
export interface Run { readonly kernel: Kernel; play(until?: { readonly ticks: number }): Promise<RunEnd | undefined> }
export function createRun(input: RunInput): Run;
export function buildManifest(resolved: ResolvedGame, run: { readonly id: string; readonly startedAt: string; readonly drivers: Readonly<Record<string, string>>; readonly kernelVersion: string; readonly node: string; readonly commit?: string; readonly dirty?: boolean }): RunManifest;
```

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

DECISIONS D4 budgets 18 issues for M1 and limits an issue to 400 hand-written lines. The two do not meet: the
volume of sections 1 to 9 is about 5300 new source lines plus about 3500 test lines, which is 22 issues at the
limit and 26 with sensible cuts. **Decided here:** the 400-line rule wins and M1 has **26 issues**. Reason: the rule
is what keeps a challenger review possible; the count is a budget, and 58 instead of 50 issues for M0 to M2 stays
far below kill criterion 1 (100). The recalibration issue of D4 records this.

Every issue: pull request to `develop`, challenger on another model, `pnpm check` green, token and time record,
the template field "variable changed" (`kernel` for all but 22, 23 and 26, which say `none` beyond the kernel).
"Lines" is the estimate of hand-written source plus tests.

### 10.2 Interface issues, merged first

Issues **01, 02, 03, 04** (contracts) and **11** (the sdk's mechanic types) define what parallel issues share. No
issue that depends on one of them starts before it is merged, and they are reviewed against this file line by line.
After the merge they change only through an `interface-change` issue.

### 10.3 The issues

| # | Title | Done when | Allowed paths | Proving test | Depends on | Lines |
|---|---|---|---|---|---|---|
| 01 | Contracts A: values, actors, envelope, kernel events | 2.1 to 2.3 exist with schemas and descriptions; `envelopeLogIssues` finds a gap, a falling tick and a forward `causedBy` | `packages/contracts/src/{values,index}.ts`, `src/kernel/{actor,envelope,events}.ts`, `test/` | `envelope.test.ts`; the description test over every exported schema | M0 scaffold | 345 |
| 02 | Contracts B: tools, services, event definitions, state, clock | 2.4, 2.5 and the `state.ts`, `clock.ts` part of 2.6 exist | `packages/contracts/src/kernel/{tool,service,event-def,state,clock}.ts`, `test/` | `snapshot-schema.test.ts` (a round trip of a sample snapshot); description test | 01 | 340 |
| 03 | Contracts C: plugin shape, ports, `KernelDefinition`, `Kernel` | the `plugin.ts` part of 2.6, 2.7 and 2.8 exist; the word-list test is green over `src/kernel` | `packages/contracts/src/kernel/{plugin,ports,kernel-def}.ts`, `test/` | word-list test; a type test that a hand-written `PluginInstance` and `SchedulerPlugin` compile | 02 | 390 |
| 04 | Contracts D: `GameDefinition` 1, `RunManifest`, `SwtError` | 2.9 to 2.11 exist; the Hello Game and tic-tac-toe data forms validate; `formatIssue` prints the five lines | `packages/contracts/src/game/*`, `src/error.ts`, `test/` | `game-schema.test.ts`, `manifest.test.ts`, `error.test.ts` | 01 | 400 |
| 05 | Chain: carry, genesis version 2 | `packages/chain` is on `develop` with its tests; `verifyRunTexts` accepts a version 2 run and names a changed manifest | `packages/chain/**` | the carried tamper tests; `genesis-v2.test.ts` | M0 scaffold | 150 |
| 06 | Kernel 1: random, revision, log, actors, clock | `random.ts` carried and pinned by the vectors of 3.6; `createLog`, `createActors`, `createClock` as in 3.1 | `packages/kernel/src/{random,revision,log,actors,clock}.ts`, `test/` | `random.test.ts` (vectors), `log.test.ts` (frames, delivery order, sinks after listeners), `clock.test.ts` | 01, 02 | 400 |
| 07 | Kernel 2: state slices, access, counters | snapshot and restore of actors, locks, jobs, counters and plugin slices; grants, locks and limit windows as in 2.4 | `packages/kernel/src/{slices,access,counters}.ts`, `test/` | `slices.test.ts` (round trip), `access.test.ts`, `counters.test.ts` (each window) | 06 | 395 |
| 08 | Kernel 3: dispatch, staging, arguments | the pipeline of 3.3 with every stage and refusal; staged calls depth first; a throw breaks the lane | `packages/kernel/src/{dispatch,staging,arguments}.ts`, `test/` | `dispatch.test.ts`: one test per row of 3.3, the step-before-lock order, `tool_result`, staged order | 06, 07 | 400 |
| 09 | Kernel 4: services, loader, ordering | services with `service_called` for commands only; `loadPlugins`; `ordered` with `after` and the cycle error | `packages/kernel/src/{services,loader,order}.ts`, `test/` | `services.test.ts`, `order.test.ts` (the table of 3.4), `loader.test.ts` (the checks of 3.2) | 06 | 375 |
| 10 | Kernel 5: ports, assembly, budgets | `createKernel` plays the tick sequence of 3.5 with a hand-written plugin and a three-line scheduler; failure handling; kernel at most 1500 code lines | `packages/kernel/src/{ports,kernel,errors,index}.ts`, `test/` | `kernel.test.ts` (3.5 step by step, finish, error end, resume), the budget test, the word-list test | 03, 07, 08, 09 | 400 |
| 11 | sdk 1: mechanic types and definers | the types of 6.1 and `definers.ts` exist; a head-and-body mechanic type-checks against them without a cast | `packages/sdk/src/mechanic/{types,context-types,definers}.ts`, `test/` | `types.test-d.ts`: `emit` of an undeclared event, a wrong service method and a wrong option fail to compile | 02 | 380 |
| 12 | sdk 2: `defineMechanic` and contexts | `defineMechanic(head, build)` returns a callable definition whose `resolve` gives a `ResolvedPlugin`; resident and actor ids translate | `packages/sdk/src/mechanic/{define-mechanic,context}.ts`, `test/` | `define-mechanic.test.ts` against a stub `PluginPort` | 11, 03 | 400 |
| 13 | sdk 3: kit and hooks | `kit.tool`, `provide`, `on`, `listen`, `kernel`, `fact`, `limit`, `snapshot`; hook slots with `after`; `toAct` and `news` | `packages/sdk/src/mechanic/{kit,hooks}.ts`, `test/` | `kit.test.ts`, `hooks.test.ts` against the stub port | 12 | 400 |
| 14 | sdk 4: `defineGame`, params, `roster`, Director types, umbrella | 6.2 to 6.4; `swarmtales` re-exports; `ToolOf` inference holds | `packages/sdk/src/game/{define-game,params}.ts`, `src/roster/`, `src/director/`, `packages/swarmtales/**`, `test/` | `define-game.test-d.ts`, `params.test.ts`, `roster.test.ts` | 04, 13 | 345 |
| 15 | sdk 5: game checks and the error catalogue | steps 1 to 8 of 6.5 as functions that return issues; `load-order.ts`; every G code of 2.11 has a test that triggers it | `packages/sdk/src/game/{validate,grants,tool-names,load-order}.ts`, `src/errors.ts`, `test/` | `validate.test.ts` (one case per code), `load-order.test.ts` (the order of 3.4) | 04, 11 | 400 |
| 16 | sdk 6: `resolveGame`, texts, carry `prompts` | `resolveGame` returns a `KernelDefinition` for the fixture game and throws one error with all issues; texts and hashes collected | `packages/sdk/src/game/{resolve,texts}.ts`, `src/index.ts`, `packages/prompts/**`, `library/prompts/replies/core/`, `test/` | `resolve.test.ts`; the sdk has no import of the kernel (layer check) | 14, 15, 03 | 330 |
| 17 | engine 1: `turns` | 4.1 to 4.3; the three activation values; pending; input arrangement | `packages/engine/src/turns/**`, `test/` | `turns.test.ts` against a stub `SchedulerPort`: order vectors of 3.6, block concurrency (calls land in order with drivers of different delay), each wake rule, `arrangeInputs` cases carried from the old test | 03 | 400 |
| 18 | engine 2: run assembly and manifest | `createRun` and `buildManifest`; the engine total test is green | `packages/engine/src/run/**`, `src/index.ts`, `test/` | `run.test.ts`: a hand-written one-tool mechanic plays to its limit; the manifest validates; the engine-total budget test | 10, 16, 17 | 330 |
| 19 | runlog: sink, chain writer, folder, verify | 9.2 files are written; `verifyRun` gives each L code for its tampering | `packages/runlog/**` | `runlog.test.ts`: write a run with a fixed clock, verify; change a line, the manifest, the head; cut the tail | 01, 04, 05 | 310 |
| 20 | testkit 1: drivers, `play`, fixture, conformance | `scriptedDriver`, `interactiveDriver`, `play`, `host`, `guess-number`, the conformance checks | `packages/testkit/src/{drivers,play,conformance,index}.ts`, `src/fixtures/`, `test/` | `guess-number.test.ts` (found in two guesses, determinism, snapshot round trip, `SWT-M021`) | 18 | 400 |
| 21 | testkit 2: oracle runner, replay, fake driver | `readOracle` and `runOracle` as in 7, aligned with `oracles/README.md`; `replay`; `fakeDriver` | `packages/testkit/src/{oracle,replay}.ts`, `drivers.ts` (the fake driver only), `test/` | `oracle.test.ts` (a hand-made oracle of `guess-number` matches; each mismatch kind is found), `replay.test.ts`, `fake.test.ts` | 20, M0 oracles | 380 |
| 22 | Port 1: `mechanic-contracts`, `team-channel`, `consensus`, `grid-game`, `optimal-referee` | the four mechanics and their carried tests are green on the new kernel; byte-identity test green | `mechanics/{contracts,team-channel,consensus,grid-game,optimal-referee}/**` | the carried test files of 8.3; `carried.test.ts` | 13, 20 | 380 (the diff; carried lines do not count) |
| 23 | Port 2: `strategy-brain`, the game, the oracle | `games/tictactoe-teams` plays; its four carried game tests are green; **`runOracle` returns no mismatch** | `mechanics/strategy-brain/**`, `games/tictactoe-teams/**` | `oracle.test.ts` of the game; the carried game tests | 21, 22 | 350 (the diff) |
| 24 | CLI: `swt run`, game files, `--fake`, `--seed`, `swt log verify` | 9.1; a `.ts`, a `.json` and a `.yaml` game load; exit codes as listed | `apps/cli/**` | `cli.test.ts`: run `guess-number` from each file type into a temporary folder, then `swt log verify` on it; a tampered line exits 1 | 18, 19, 21 | 400 |
| 25 | Viewer: carry, envelope reader | `viewer-core`, `viewer-ui`, `apps/viewer-web` build; `loadRun` opens an M1 run and an old run | `packages/viewer-core/**`, `packages/viewer-ui/**`, `apps/viewer-web/**` | `envelope.test.ts`: a run folder written by `runlog` loads with events, actors, header and an `ok` verdict; a carried legacy fixture still loads | 04, 05, 19 | 250 |
| 26 | Hello Game: `toAct`, `sample`, sample 1 | `games/hello/game.ts` (11 lines) plays to the end with `swt run --fake`; the README block is an include of it | `games/hello/**`, `mechanics/grid-game/src/index.ts` (the `toAct` hook and `playMove.sample` only), `README.md` (section 2) | `hello.test.ts`: the match ends, the log verifies, between 5 and 9 activations are opened for one game, the oracle test of 23 is still green | 23, 24 | 200 |

Issue 22 is the largest diff; if it passes 400 lines, `optimal-referee` moves to issue 23 before work starts.
Issue 26 adds to `grid-game` after its oracle matches, so the addition cannot hide a port error; `tictactoe-teams`
uses `onNews` and no fake driver, so nothing it plays changes.

The M1 exit check (not an issue, done by the milestone review): the four "done when" lines at the top of this file,
on `develop`, then the tag.

### 10.4 Dependency graph

```
01 ─┬─ 02 ─┬─ 03 ─┬──────────────── 17 ──────────────┐
    │      │      ├─ 12 ─ 13 ─┬─ 14 ─┐               │
    │      ├─ 11 ─┘           │      ├─ 16 ──────────┼─ 18 ─ 20 ─┬─ 21 ─┬─ 23 ─┐
    │      │      └─ 15 ──────┼──────┘               │           │      │      ├─ 26
    │      └─ 06 ─┬─ 07 ─ 08 ─┼──────── 10 ──────────┘           └─ 22 ─┘      │
    │             └─ 09 ──────┼────────┘                                       │
    ├─ 04 ─┬─ (14, 15)        │                                    24 ─────────┘
    │      └─ 19 ─┬─ 24       └─ (22)
05 ─┴─────────────┴─ 25
```

Longest chain: 01, 02, 03, 12, 13, 14, 16, 18, 20, 21, 23, 26 (twelve issues). The kernel chain (06 to 10) and the
sdk chain (11 to 16) share only the contracts, so they never touch the same file.

### 10.5 Wave plan

A wave is a set of issues whose dependencies are merged. At most three pull requests are open at a time (E4);
inside a wave the listed order is the start order.

| Wave | Issues | Parallel | Opens when |
|---|---|---|---|
| 1 | 01, 05 | 2 | M0 scaffold merged |
| 2 | 02, 04 | 2 | 01 merged |
| 3 | 03, 06, 11, then 19 | 3, then 1 | 02 merged (19: 04 and 05) |
| 4 | 07, 09, 12, then 15, 17, 25 | 3, then 3 | 03, 06, 11 merged (25: 19) |
| 5 | 08, 13 | 2 | 07; 12 |
| 6 | 10, 14 | 2 | 08, 09; 13 |
| 7 | 16 | 1 | 14, 15 |
| 8 | 18 | 1 | 10, 16, 17 |
| 9 | 20 | 1 | 18 |
| 10 | 21, 22 | 2 | 20 |
| 11 | 23, 24 | 2 | 21, 22; 19 |
| 12 | 26 | 1 | 23, 24 |

At three merged issues per working day the plan needs about nine working days; waves 7 to 9 are the single-file
stretch where nothing can run beside the critical issue except 25.

## 11. Decisions made in this file

| # | Decision | Reason |
|---|---|---|
| 1 | M1 ports all five mechanics of tic-tac-toe teams | the oracle is the registered game; dropping four mechanics changes the game |
| 2 | Games live under `games/<id>/` | the word is Game; the folder is new anyway |
| 3 | The engine total counts `kernel`, `sdk` and `engine` whole | one counting function; nothing can be moved next door |
| 4 | The word-list test covers the kernel and `contracts/src/kernel` only | the game format must name residents, teams and roles |
| 5 | Canonical tool name is an envelope field (`tool`); the model-facing name is `as` in the payload | group a call's consequences by one field |
| 6 | `tool_result` is a kernel event | the reply is what the model read; oracle and replay compare it |
| 7 | `<package>` in canonical names is the full npm name | no shortening rule that can go wrong |
| 8 | Lifecycle reactions are a fixed list of hook points, not listeners on kernel events | three of them return values, and tick-start hooks must run after the due jobs |
| 9 | One listener delivery mode (at the end of the frame); `immediate` is gone | no ported mechanic uses it; one mechanism |
| 10 | `after` names plugin ids and is ignored for a plugin that is not loaded | same softness as `listen`; a mechanic stays loadable alone |
| 11 | The old load order algorithm is ported unchanged; "no `uses` cycle" waits for M3 | load order decides what a model sees; D2 |
| 12 | The shown order of input lines is the scheduler option `inputs`, with a new `{ source }` entry | the order is the game's knowledge, not a shared table's and not a base mechanic's |
| 13 | `beginTick` and `endTick` instead of one `advanceTick` | the turns sit between the tick-start and tick-end hooks |
| 14 | `toAct` is a hook of at most one plugin; the scheduler never names a service | the scheduler and the kernel stay free of game words |
| 15 | `turns` takes `order: "seeded" \| "roster"`; a mechanic cannot supply a policy | a game is plain data; no ported mechanic supplies one |
| 16 | `$param` references instead of build functions; `--set` at M2 | YAML, JSON and the builder stay equal |
| 17 | `end` has `ticks`, `win` has `fact`, nothing more in version 1 | no M1 or M2 game needs more; both are additive later |
| 18 | A description that equals a declared prompt id is that prompt, else inline text | ported prompt files stay untouched; new mechanics need no file |
| 19 | The `swarmtales` field of `package.json` is the one registration site | no hand-kept table in apps or scripts |
| 20 | `roster` lives in the sdk package, written with `defineMechanic` | the sdk adds it and may not import a mechanic package |
| 21 | Drivers (scripted, fake) live in the testkit; the CLI depends on it | the testkit is public API (`swarmtales/testing`) |
| 22 | Texts are `texts.json` committed by hash at M1; `prompt_fixed` events arrive at M2 | no model reads a prompt before M2 |
| 23 | Chain genesis version 2 holds the manifest hash; the signer moves to `runlog` | the manifest says everything the old genesis said; `chain` stays browser-safe |
| 24 | Envelope checks (`envelopeLogIssues`) live in contracts | the CLI and the browser need the same verdict, and `chain` may import nothing |
| 25 | No `000-run.json`; the viewer reads the manifest | one header document |
| 26 | Error docs link is `docs/reference/errors.md#<code>` | no docs site before 1.0 |
| 27 | M1 has 26 issues, not 18 | the 400-line rule and the volume of D4 do not fit 18 |
| 28 | Issue 26 changes `grid-game` only after its oracle matches | an addition must not hide a port error |

## 12. To align

| Point | With | What may change here |
|---|---|---|
| Oracle file format | `oracles/README.md`, branch `m0/oracles` | `readOracle` only; the oracle must hold the activation of each call and the input texts (section 7), or the runner compares less |
| Spike verdict (D1) | issue 14 of M0 | one overload and the file `mechanic/sugar.ts` (6.1); nothing else |
| `uses` cycle `grid-game` and `consensus` | the frame work of M4 | the layer check's cycle rule stays off for these two until then |
| README generator | M2 | the five carried READMEs are regenerated; the `swarmtales` field is its input |
| Mutation gate for kernel and sdk (E7) | an issue after M1 | none |
