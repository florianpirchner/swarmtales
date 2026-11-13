# 01 Architecture: the recut of Swarm Tales

Role: software architect. Phase 1 paper (analysis and definition), see [`BRIEF.md`](BRIEF.md). Nothing here is built.
Line counts were measured on 2026-11-13 with `wc -l` over `src/**/*.ts` (raw lines) unless "code lines" is stated
(blank and comment lines removed, the way ESLint `max-lines` counts).

The one-paragraph verdict: the **mechanic API of the current core is good and should be ported, not reinvented** (head
and body, typed APIs between mechanics, the fixed tool pipeline, per-mechanic snapshot slices). What makes the code
base heavy is not that design but three things around it: (1) byte-compatibility with the deleted old engine, which is
baked into kernel, contracts, shared and chronicle; (2) two game formats and two event formats living side by side;
(3) Director, decision and human logic that was put into the kernel instead of beside it. A clean repository removes
all three at once, which an in-place refactor cannot do cheaply because 56,464 lines of tests and the golden logs pin
the old bytes. That is the case for the rewrite. The case against a *redesign* of what already works is made in
section 7.

## 1. Current state, measured

### 1.1 The kernel: 5180 lines against a 1500 target

`packages/kernel/src` has 5180 raw lines (4127 code lines) in 34 files; `host/host.ts` is 764 lines and is held by an
ESLint ratchet at 639 code lines (`eslint.config.js`, with `host/overseers.ts` at 476). What is in it, grouped by
concern:

| Concern | Files (`packages/kernel/src/host/`) | Lines | Belongs in a kernel? |
|---|---|---|---|
| Host assembly, lifecycle, minute loop | `host.ts` | 764 | partly; about a third is Director, decision and human wiring |
| Overseers: slots, triggers, batches, fallback, standing orders | `overseers.ts`, `define-overseer.ts`, `orders.ts` | 884 | no |
| Authoring API: `defineMechanic`, `defineHead`, the typed kit | `define.ts`, `kit.ts` | 612 | no (author-facing, generic-heavy; the host only needs the erased instance) |
| Decision gate and the core tool `amendDecision` | `decisions.ts` | 307 | no |
| Human Hand: `instruct`, `pause`, `resume`, `step`, inbox | `human.ts` | 279 | no (needs one small kernel primitive, see 2.3) |
| Tool gateway and pipeline | `gateway.ts`, `staging.ts`, `arguments.ts`, `catalog.ts`, `replies.ts` | 479 | yes |
| Loader: `requires`/`uses` order, checks | `loader.ts` | 253 | yes |
| Turn loop: passes, blocks, activation, input arranging | `turns.ts` | 208 | no (it is one scheduler among several) |
| Names and display, name checks, auto grants | `names.ts`, `name-checks.ts`, `auto-grants.ts` | 268 | no (game resolution, done before the host exists) |
| Event bus and log | `log.ts` | 168 | yes |
| Referee: step and cost limits, limit registry | `referee.ts` | 145 | half (counters yes, cost no) |
| Snapshot save and restore | `snapshots.ts` | 127 | yes |
| Guard and consult waits (model stages) | `waits.ts` | 119 | no (a model question is a plugin's business) |
| Residents, access locks, job queue, phases, probe | `residents.ts`, `access.ts`, `scheduler.ts`, `phases.ts`, `probe.ts` | 357 | mostly |
| Random, ids, result, templates, counts, redact, revision | top level | 210 | random and ids yes; `templates.ts`, `counts.ts`, `redact.ts` no |

Summed, about 2000 lines are honest kernel and about 3100 are something else that landed there because the kernel was
the only place every mechanic could reach. The "no game word" rule is nearly kept in the kernel itself, but the kernel
is full of *role* words, which are game words one level up. Word counts over `packages/kernel/src` (case-insensitive):
`order` 339, `overseer` 247, `decision` 238, `consult` 102, `human` 94, `guard` 65, `gamemaker` 25, `judge` 5. The
actor type itself names a role: `Actor = ResidentActor | OverseerActor | "gamemaker" | "script" | "human" | "host"`
(`packages/contracts/src/core/values.ts`), and `BUILT_IN_NAMES` contains `gamemaker`. The kernel also bakes in one
notion of time: "minute" appears 160 times in `host/*.ts`, and the envelope field is `minute`.

Two more facts explain the size:

- **Old-engine mimicry.** The contracts carry devices that exist only so the new host writes the old engine's bytes:
  `HookPhase.order` and `ListenOptions.order`, `ListenOptions.immediate` ("the old engine's synchronous callbacks"),
  `runResumed`, `provideSome`, `PassView.roster`. A grep for "old engine" or "old \`" over `mechanics`,
  `packages/kernel` and `packages/contracts`: 393 hits.
- **The host's public face is wide.** `Host` (`packages/contracts/src/core/host.ts`) has 20 members; `HostOptions`
  takes a guard model, role callers, a `between` callback, app events, a human channel and an overseer runtime, each a
  seam cut for one caller.

### 1.2 Game words in contracts and sdk: two game formats

`packages/contracts` (3860 lines) holds two unrelated worlds:

- `src/core/` (about 1850 lines): the mechanic API. Clean of game words except the roles above.
- `src/story.ts` (1437 lines), `src/story-schema.ts` (316), `src/tool-names.ts` (50), `src/roles.ts` (100): the **old
  `StoryDefinition`**, which is the City of Keys rule book as a type: `MarksRules`, `PuzzleSpec`, `TribunalSpec`,
  `SealSpec`, `WhispererSpec`, `HoldoutSpec`, `GamemakerSpec`, `FactionTexts`, a closed `TOOL_NAMES` list
  (`postBoard`, `payRansom`, ...). Word counts in `packages/contracts/src`: `level` 139, `tribunal` 73, `whisper` 55,
  `gamemaker` 53, `exile` 35.

`packages/sdk` (2294 lines) serves only that old format: `validate.ts` (1432 lines: `validateTribunal`,
`validateWhisperer`, `validateSeal`, `validateHoldout`, ...), `define.ts` (527, the old `defineStory`), `rules.ts`
("its own copy of the penalty ladder and the tribunal pacing", `docs/ARCHITECTURE.md` §2). The new format, `CoreStory`
(`packages/contracts/src/core/story.ts`, 94 lines: a list of mechanics with options, grants, locks, limits), is
defined with `defineCoreStory` from the **kernel**, not the sdk.

Usage: 2 of 15 games (`stories/cityofkeys`, `stories/whispers`) are `StoryDefinition`s and are translated at run time
by `apps/cli/src/host/story.ts` (278 lines, `hostStoryOf`); 13 are `CoreStory`s played by a second runner
(`apps/cli/src/host/core-run.ts`, `core-play.ts`). The YAML form and `story.schema.json` cover only the old format,
with the sections of nine mechanics left "open" (`docs/STORY-FORMAT.md`, "Limit"). So the documented "one schema" is
the schema of the format that 13 of 15 games do not use.

### 1.3 What roles, chronicle, legacy-log and mechanics/shared really are

- **`packages/roles` (4791 lines)** is three things: the resident's agent runner on pi-agent-core (`agents/`, 593
  lines, the piece every game needs); the four overseers as definitions plus model runtimes (`overseer/`, 2177 lines:
  gamemaker, classifier, judge, weaver); and the older role code the overseers still call (`interpret/` 1336,
  `gamemaker/` 660). It depends on `@swarmtales/mechanic-shared` for one table (`OVERSEER_ORDER`), so a `packages/*`
  library depends on the `mechanics/*` layer.
- **`packages/chronicle` (8235 lines)** is the largest package and four packages in one: run artifacts and sinks
  including the chain writer (`log/`), the snapshot file with the old `agent-arena-snapshot` converter (`snapshot/`,
  1316 lines of which `legacy-snapshot.ts` and the two schema files are about 730), the digest with City-of-Keys
  detectors (`digest/detectors/tribunal.ts`, `blame.ts`, `alliance.ts`, `free-ride.ts`), and the run reporter
  (`report/`). It depends on kernel, models **and roles**; testkit depends on chronicle, so the test helper of a
  mechanic author pulls the reporter.
- **`packages/legacy-log` (945 lines)** is the old engine's event union (`events.ts`, 862 lines). It is the format
  `events.jsonl` is still written in: the host's envelopes are flattened and renumbered by the legacy adapter
  (`packages/chronicle/src/log/legacy-events.ts`), core events such as `tool_called` and `service_called` are dropped,
  and **the chain signs the legacy lines, not the envelopes** (`docs/design/event-log-signing.md`, last line of
  "Checking"). Reporter, digest, novelist and viewer read the legacy lines. So the audit trail does not contain the
  tool calls and service calls the kernel recorded.
- **`mechanics/shared` (1085 lines)** is not a utility library. It is the frozen vocabulary of the City of Keys carve:
  21 API definitions (`SHARED_APIS`), the shared events, and three legacy tables (`HOOK_ORDER`, `LISTENER_ORDER`,
  `OVERSEER_ORDER`, `legacyTurns` in `order.ts`, 237 lines). 36 of 39 mechanic packages depend on it. The newer game
  mechanics need no City API; a check of eight of them (chess, holdem, liars-dice, morris, convoy, salt-market,
  clue-grid, econ-games) shows a single import, `HOOK_ORDER`: a new game such as chess takes its hook order from the
  frozen table that mimics the old engine (`mechanics/chess/src/index.ts`, `HOOK_ORDER.runStarted.chess`).

### 1.4 The dependency graph and its smells

Declared workspace dependencies (from every `package.json`):

```
contracts <- kernel <- sdk, models, mechanic-shared, every mechanic (38 import defineMechanic)
contracts <- legacy-log <- roles, chronicle, cli
kernel, models, prompts, legacy-log, mechanic-shared <- roles <- chronicle <- novelist, testkit
chain <- viewer-core <- viewer-ui <- viewer-web, vscode
apps/cli -> 19 named City mechanics + everything else
```

Smells, each with its evidence:

1. **Authors depend on the kernel implementation.** `defineMechanic`, `defineHead`, `reply`, `refuse`, `defineApi`
   come from `@swarmtales/kernel` (38, 38, 35, 38, 12 importing mechanics). The testkit has to police this with a text
   rule ("what a mechanic may take from `@swarmtales/kernel`: the authoring calls, never the host",
   `packages/testkit/src/conformance.ts`).
2. **A hub contract package.** `mechanic-shared` couples every mechanic to every API. The owner's example is real and
   worse than it looks: `mechanics/exile/src/head.ts` has `requires: [ProgressionApi, ChannelsApi, LedgerApi,
   StandoffApi, PuzzlesApi]`, and `gone.ts` calls `PuzzlesApi.heldPieces`, `burn` and `contract`. Exile orchestrates
   what puzzles must do when a resident leaves; the dependency points the wrong way (puzzles should react to an exile
   event).
3. **Base mechanics know the rules above them.** `channels` (the board, DMs, groups) has `uses: [ReceiptsApi, CastApi,
   StandoffApi, StandoffTribunalApi, ExileApi, PuzzlesApi, ProgressionApi, MotivesApi, GoalsApi, WhispersApi]`;
   `ledger` uses `ExileApi`, `ChannelsApi`, `ReceiptsApi`; `names` uses `PuzzlesApi`. `requires` cycles are forbidden
   but `uses` cycles are allowed and resolved by story order (`MechanicHead.uses`), so the City cluster is one
   strongly connected component held together by optional edges.
4. **Value imports of another mechanic's internals.** `morris-referee` imports `applyStep`, `classify`, `scoreTurn`
   from `mechanic-morris`; `optimal-referee` imports `winnerOf`, `linesOf` from `grid-game`; three packages import
   card helpers from `card-table`. Legitimate reuse of pure rule code, but through the package root, with no line
   between "contract" and "implementation".
5. **A generic helper that knows one game.** `strategy-brain` depends on `grid-game` and `team-channel` (it listens to
   `GridGameEvents`), although 12 mechanics plug into it through its own `BrainSourceApi`.
6. **Upward and sideways edges among libraries.** roles -> mechanic-shared; chronicle -> roles; testkit -> chronicle;
   models -> kernel (for `redactSecrets` and a `CompetitorId` type).
7. **The composition root is hard-wired.** `apps/cli/package.json` lists 19 City mechanics; there are two runners;
   `main.ts` is 628 lines and `host/run.ts` 551.
8. **The package rule is a hand-kept allow list.** `scripts/check-packages.ts` has one `ALLOWED` entry per mechanic
   and 15 commented exceptions.
9. **Tests live outside the packages.** `test/` has 311 test files and 56,464 lines; the packages have none. No
   package can be checked alone.

## 2. The new kernel

### 2.1 The irreducible minimum

The kernel is a **deterministic, single-writer state machine over an append-only log**, plus the ports through which
everything non-deterministic enters. Seven parts, nothing else:

1. **Log.** Append, sequence, envelope, schema check of every payload against the declaring plugin's schema, causation
   (`causedBy`), read views, subscription for sinks.
2. **State.** One slice per plugin instance, owned by that plugin; snapshot and restore with a version per slice.
3. **Actors.** A registry of actors (id, kind, attribute bag per plugin, suspensions). "Resident" and "Director" are
   *kinds* that plugins and the game give meaning to; the kernel knows only `kind: string`.
4. **Dispatch.** One entry, `submit(actor, tool, params)`, that runs the fixed stage list and commits. The stages keep
   their names and order (they are a proven design, P46 and the "cheap stages first" rule depend on them), but the
   kernel implements only the loop; grants, locks and counters are handlers registered like any other.
5. **Capabilities.** The registry behind `requires`/`provides`: typed calls between plugins (today's `ApiDefinition`),
   load order, missing-provider errors.
6. **Time and jobs.** A logical clock (`tick`) that only the scheduler advances, and the job queue (named jobs, part
   of the snapshot).
7. **Ports.** `Scheduler`, `ActorDriver`, `EventSink`, seeded `Random`, and `ExternalInput` (2.3). The kernel calls no
   model, reads no file, no environment variable and no wall clock.

Out of the kernel, with the place each goes:

| Today in `packages/kernel` | Goes to |
|---|---|
| `define.ts`, `kit.ts`, `define-overseer.ts`, `templates.ts`, `counts.ts` | `@swarmtales/sdk` (authoring API) |
| `turns.ts`, input arranging, `awaitsAnswer`, `endsTurn` handling | `@swarmtales/schedulers` (turn scheduler) |
| `overseers.ts`, `orders.ts` | `@swarmtales/director-host` (a plugin that drives Directors) |
| `decisions.ts` | mechanic `decisions` (a standard plugin; `amendDecision` is its tool) |
| `human.ts` | `@swarmtales/human-hand` (plugin over `ExternalInput` and safe points) |
| `waits.ts` (guard, consult) | stage handlers of the `guard` plugin and of the director host |
| `names.ts`, `name-checks.ts`, `auto-grants.ts` | `@swarmtales/sdk` game resolution (runs before the host exists) |
| cost part of `referee.ts` | `budget` plugin (listens to usage events, asks the kernel to stop) |
| `redact.ts` | `@swarmtales/runlog` (the sink boundary) |
| `revision.ts` | stays, plus a revision per scheduler and driver (3.6) |

### 2.2 The budget

Proposal: **`packages/kernel/src` at most 1500 code lines** (blank and comment lines not counted), no file over 300
raw lines, checked by a test (`kernel-budget.test.ts`) that fails the build. Raw lines are the wrong measure once
every export carries TSDoc with `@param`, `@returns`, `@throws` and `@example` (a fixed decision): documentation would
eat a third of the budget and punish good comments. A second number guards the other side: the kernel's exported API
at most **40 symbols** (api-extractor report committed; the test counts it).

A sanity estimate, from the sizes of today's honest parts:

| Kernel part | Today (raw) | Target (code lines) |
|---|---|---|
| log, bus, causation, views | 168 | 180 |
| state slices, snapshot, restore | 127 | 130 |
| actors, attributes, suspensions | 113 | 100 |
| dispatch (stage loop, commit lane, staged calls) | 479 | 280 |
| capabilities, loader, load order | 253 | 220 |
| clock, jobs | 71 | 90 |
| random, ids | 91 | 90 |
| external input, safe points | new | 80 |
| assembly (`createHost`), lifecycle, failure handling | 764 | 250 |
| **Sum** | | **1420** |

It fits with 80 lines of slack, and not at all if grants-auto, name resolution or a Director trigger comes back
"because it is small". Rule for reviewers: **a pull request that raises the kernel's line count needs an issue that
names the extension point that was missing.**

### 2.3 A definable kernel

"Definable" means: the host is assembled from a plain value, the `KernelDefinition`. No flag in the kernel says
"turn-based"; the definition names a scheduler plugin. The game file never reaches the kernel: `@swarmtales/sdk`
resolves a `GameDefinition` plus the installed plugins into a `KernelDefinition` (defaults filled, grants derived,
names made canonical, all checks done), and that resolved value is what the genesis hashes.

```ts
// @swarmtales/contracts (sketch)

/** `resident:A03`, `director:judge`, `human`, `script`, `kernel`. The kind is open. */
export type ActorId = `${string}:${string}` | "human" | "script" | "kernel";

export interface Envelope<T extends string = string, P = unknown> {
	readonly seq: number;            // from 1, no gaps: the commit order
	readonly tick: number;           // logical time; a game shows it as a minute, a round, a move
	readonly source: string;         // plugin id, or "kernel"
	readonly type: T;
	readonly actor: ActorId;
	readonly causedBy?: number;
	readonly basis?: number;         // highest seq the actor had seen when it decided (3.3)
	readonly audience?: readonly string[];
	readonly payload: P;
}

/** Everything a host is assembled from. Plain data plus plugin instances; hashed into the genesis. */
export interface KernelDefinition {
	readonly game: { readonly id: string; readonly hash: string };
	readonly seed: number;
	readonly actors: readonly ActorSpec[];                  // id, kind, grant names
	readonly plugins: readonly ResolvedPlugin[];            // in load order, options parsed
	readonly scheduler: SchedulerUse;                       // { plugin, options }
	readonly grants: Readonly<Record<string, readonly CanonicalTool[]>>;
	readonly limits: KernelLimits;                          // maxTicks, maxCommits; cost is a plugin's
}

export interface Kernel {
	readonly log: LogView;
	readonly ended: RunEnd | undefined;
	run(drivers: DriverTable): Promise<RunEnd>;             // runs the scheduler to the end
	submit(call: Submission): Promise<ToolOutcome>;         // resolves when committed or refused
	snapshot(): KernelSnapshot;                             // only at a safe point
	subscribe(sink: EventSink): void;
	stop(reason: string): void;
}

export function createKernel(definition: KernelDefinition, ports: KernelPorts, resume?: ResumeInput): Kernel;

/** `external`: every input that is not a function of (definition, log so far); logged before use. */
export interface KernelPorts { readonly sinks: readonly EventSink[]; readonly external?: ExternalInput }

/** `params` is untrusted and parsed at stage `parse`. */
export interface Submission { readonly actor: ActorId; readonly tool: CanonicalTool; readonly params: unknown; readonly basis: number; readonly causedBy?: number }
```

The plugin seam is one erased shape. Mechanics, Directors and the scheduler all hand the kernel the same kind of
thing: tools, stage handlers, listeners, capabilities, jobs, a snapshot slice.

```ts
/** What the kernel holds per plugin instance; the typed authoring forms compile to this. */
export interface PluginInstance {
	readonly id: string;
	readonly tools: readonly KernelTool[];
	readonly stages: Partial<Readonly<Record<Stage, StageHandler>>>;
	readonly listeners: readonly Listener[];
	readonly provides: readonly ProvidedCapability[];
	readonly jobs: Readonly<Record<string, (data: JsonValue | undefined) => void>>;
	readonly slice?: SnapshotSlice;
}

export const STAGES = ["authorize", "lock", "parse", "limit", "afford", "rule", "review", "execute", "settle", "after"] as const;

/** `review` is the only stage that may wait (a guard model, a judge); all others are synchronous. */
export type StageHandler = (call: ToolCall, port: PluginPort) => Refusal | undefined | Promise<Refusal | Reviewed | undefined>;
```

Two notes. First, today's `guard` and `consult` stages collapse into one asynchronous `review` stage: both are "ask
someone outside and maybe refuse or attach an answer". Second, the hook families of today (`MechanicHooks`,
`PipelineHandlers`, listeners) stay in the sdk as authoring sugar; lifecycle hooks become listeners on kernel events
(`tick_started`, `activation_opened`, `run_ended`), so the kernel has one mechanism for reactions. The ordering
devices (`HookPhase.order`, `immediate`) are dropped: order is load order, and a plugin that must run after another
says `after: [capability]`.

`ExternalInput` is the one new primitive. It replaces three special cases (the human inbox, the ordering of overseer
answers, the arrival order of parallel agents):

```ts
/** Facts from outside the deterministic core; the kernel logs each as `input_received` before any plugin sees it. */
export interface ExternalInput { take(at: SafePoint): Promise<readonly InputRecord[]> }
export interface InputRecord { readonly channel: string; readonly actor: ActorId; readonly data: JsonValue }
```

A replay feeds the recorded `input_received` events back through the same port. That is how the Human Hand is
replayable today (`HumanChannel.next`); the new kernel makes it the general rule.

## 3. The pluggable scheduler

### 3.1 The contract

```ts
/** `run` drives the whole run: advances ticks, opens activations, returns when the run is over. */
export interface SchedulerPlugin<O = unknown> {
	readonly id: string;                                    // "@swarmtales/schedulers/turns"
	readonly revision: number;                              // part of the runtime revision (3.6)
	readonly determinism: "seeded" | "recorded";
	readonly options: TSchema;
	create(options: O): { run(port: SchedulerPort, drivers: DriverTable): Promise<RunEnd>; readonly slice?: SnapshotSlice };
}

export interface SchedulerPort {
	readonly seed: number;
	readonly actors: ActorsView;
	readonly log: LogView;
	rng(...labels: readonly RandomLabel[]): RandomSource;
	advanceTick(): Promise<void>;                           // runs due jobs, writes tick events
	inputsFor(actor: ActorId): readonly InputLine[];        // what the plugins show next (today's `turnInputs`)
	hasNews(actor: ActorId): boolean;
	open(actor: ActorId, inputs: readonly InputLine[]): Activation;  // writes `activation_opened`
	safePoint(at: SafePoint): Promise<void>;                // human hand, snapshots, external input
	readonly halted: boolean;
}

export interface Activation {
	readonly actor: ActorId;
	readonly basis: number;
	readonly inputs: readonly InputLine[];
	readonly tools: readonly ToolSpec[];
	call(tool: string, params: unknown): Promise<ToolOutcome>;   // model-facing alias in, canonical logged
	record(type: string, payload: unknown): void;                // driver events (model text, usage)
	close(): void;
}

/** An agent: the pi runner in a live run, a script in tests. One per actor kind or per actor. */
export type ActorDriver = (activation: Activation) => Promise<void>;
```

Mechanics never see the scheduler. They keep saying two things only: whether an actor has news and what its next
activation shows. That is already the rule today (`turns.ts`, file comment of `packages/contracts/src/core/turns.ts`)
and it is what makes the scheduler swappable.

### 3.2 The concurrency model: one commit lane

The kernel stays **single-writer**. Every state change happens inside the commit lane, one submission after the other,
exactly as the gateway's `#serial` queue works today (`packages/kernel/src/host/gateway.ts`). Parallelism exists only
where the time is spent: in model calls, which happen outside the lane. This is the actor model with the log as the
mailbox order. Consequences:

- Mechanic code stays synchronous, lock-free and unaware of concurrency. No mechanic is rewritten for the async mode.
  This is the main reason not to make mechanics async.
- The `review` stage is the only place the lane waits for a model. Today the whole line is held during a guard or
  judge call ("calls are serialised, so a model's wait never lets another call in"). In the async mode that would
  stall every agent behind one judge. The new rule: a call in `review` **leaves the lane** and re-enters at `execute`
  with a fresh `rule` check (stages `lock` to `rule` run twice, they are cheap and synchronous). The turn scheduler
  may keep holding the lane; it is a scheduler option, default hold for `seeded`, release for `recorded`.

### 3.3 The two schedulers, and a third

**`turns` (seeded, today's behaviour).** Per tick: jobs, then passes; each pass a seeded shuffle cut into blocks; a
block's inputs are built before any member acts, the members' model calls run concurrently, and member k's calls wait
for member k-1, so calls land in the seeded order (`TurnLoop.#block`). Activation `always` or `onNews`, the `endsTurn`
rule of runtime revision 2. This is a port of `turns.ts` (208 lines) with the policy merge; nothing new to invent.

**`parallel` (recorded).** Every actor runs its own loop: wait until woken (news, an answer, a timer), take inputs,
call its model, submit calls. There is no global order to wait for.

- *Ordering.* Calls are committed in the order they reach the lane. The lane's queue is fair: one FIFO per actor,
  served round robin, so a fast model cannot starve a slow one and one actor's calls keep their own order.
- *Admission.* At most one open activation per actor; a global cap on concurrent model requests and a rate limiter in
  the model layer (one limiter for the process, as planned for parallel runs in `docs/ideas/overseers-and-plugins.md`
  §9); `maxCallsPerActivation` and a per-actor minimum gap between activations bound cost.
- *Time.* Ticks advance by a declared rule: every N seconds of wall clock, or every N commits. The advance is an
  event, so jobs and deadlines stay a function of the log. Recommendation: ticks by commits for experiments (no
  wall-clock dependence at all), by wall clock for live play with a human.
- *Conflicts.* An agent decides on what it saw at `basis`; by commit time the world has moved. The kernel does **not**
  roll anything back and does not need to: every call is validated against the current state at `rule`, exactly as a
  late move in a real-time game is. Staleness is made visible instead: `basis` is in the envelope, and a refused
  call's reply says what changed. A tool may opt in to strictness with `stale: "refuse"` plus the event sources it
  depends on; the kernel then refuses with `STALE` when one of those sources wrote after `basis` (an optimistic check,
  about 20 lines in dispatch). Default `accept`. A rule that needs exclusion over several calls (a trade) models it
  in state (an offer, an acceptance).
- *Wake-ups.* `hasNews` after each commit for the actors an event's audience names; no polling.

**`replay` (deterministic by construction).** Reads a recorded log and feeds its `tool_called` submissions, tick
advances and `input_received` records back in `seq` order with no drivers and no models, then compares every event the
plugins emit with the recorded one. It is about 200 lines and it is the piece that turns "auditable" from a claim into
a command (`swt log replay <run>`).

### 3.4 What determinism means in each mode

| Level | Meaning | `turns` | `parallel` |
|---|---|---|---|
| **Reproducible** | same definition, seed and scripted models give a byte-equal log | yes (the offline tests, new goldens) | only with the scripted driver and tick-by-commits, and then only if the scripted driver is itself ordered; not promised |
| **Replayable** | the recorded inputs, re-applied in log order, reproduce every plugin event | yes | yes: the log *is* the schedule |
| **Authentic** | the log was not changed after its key was fixed | chain | chain |

The promise that makes this work is one rule for plugin authors, enforced by the conformance test in the testkit: **a
plugin's events are a pure function of its state, the committed input and `rng(seed, labels)`**. Random streams are
derived from labels, never from a shared draw counter (already the design: `ctx.rng("deal", 3)`), so the interleaving
of actors cannot shift anyone's dice. Live model output is not reproducible in either mode; that is true today as well
and is why the log, not the seed, is the record of a run.

### 3.5 Keeping parallel runs auditable with the chain

`packages/chain` is carried over unchanged as a verifier. What changes is what it covers:

1. **The chain covers the kernel's envelopes.** There is one event format; the legacy adapter is gone. Tool calls,
   refusals, capability commands, external inputs and tick advances are in the signed log (today they are dropped
   before signing, 1.3).
2. **Activations are bracketed.** `activation_opened` (actor, `basis`, a hash of the inputs) and `activation_closed`
   say what each agent had seen when it acted. In a parallel run this is the only way to judge a decision afterwards.
3. **Model exchanges are committed by hash.** The driver records `model_exchange` with the sha256 of the request and
   of the response; the transcript files stay unsigned derived files, but each can now be checked against a signed
   line. Today transcripts are outside the chain entirely (`event-log-signing.md`, "Further limits").
4. **The genesis names what played.** Scheduler id, options hash and determinism level; the runtime revision tuple
   (3.6); every plugin as `name@version` with the integrity hash of its package; the resolved game's hash; the tool
   naming scheme version.
5. **Signed heads at intervals.** A head every N events or T seconds besides checkpoints and run end. A parallel run
   has no minute boundary to rely on, and a crash should leave a short unsigned tail.
6. **`at` is the sink's.** Wall-clock stamps are added by the log sink, are hashed, and are never read by a plugin.
   Replay ignores them.

With these, a parallel run supports three independent checks: `verify` (not edited), `replay` (the rules were applied
as written), and inspection of `basis` (nobody acted on information that was not yet committed).

### 3.6 Runtime revisions

`docs/RUNTIME-REVISIONS.md` defines a revision as a change in "how a run plays". With pluggable parts, that is no
longer one number. Proposal: the genesis carries

```json
"runtime": { "kernel": 1, "scheduler": "@swarmtales/schedulers/turns@1", "driver": "@swarmtales/driver-pi@1" }
```

and two runs are comparable when the tuple is equal. Each of the three carries its own `revision` constant, its own
rows in the revisions table, and the same rule as today (raise it in the PR that changes behaviour). The run folder
suffix becomes a short hash of the tuple only when it differs from the default tuple. The new repository starts at 1
for all three; old runs are "legacy r1/r2" and are baseline only (a fixed decision), so there is no mapping to
maintain. `endsTurn` (r2) becomes default behaviour of the turn scheduler at revision 1.

## 4. The plugin cut

### 4.1 Plugin kinds

| Kind | Defined with | Runs | Trust needed |
|---|---|---|---|
| Mechanic | `defineMechanic(head, build)` | in the commit lane, synchronous | may change state: high |
| Director | `defineDirector({ id, prompt, output, triggers, tools, fallback })` | outside the lane; acts only through tools | medium (it is an actor) |
| Scheduler | `defineScheduler` | owns the run loop | high |
| Actor driver | `defineDriver` | outside the lane; talks to a model port | medium |
| Model provider | `defineProvider` | in the model layer; holds one key | high (sees a secret) |
| Sink / reporter | `defineSink`, `defineReporter` | reads the log; writes files | low (read-only on the run) |

One package may ship several. Each package has a manifest in `package.json` (`"swarmtales": { "kind", "sdk", "needs"
}`, as proposed in `docs/ideas/plugin-market.md`) and exports a `definePlugin({ id, version, mechanics, directors, ...
})` value. First-party plugins are found by id; third-party ones must be listed in the game's `plugins` with a
version, and the lock file pins the integrity hash.

### 4.2 The contract between mechanics

Three ways for one mechanic to use another, in order of preference:

1. **Events (react).** The source declares its events apart from its code (`defineEvents`); the consumer listens
   without requiring the source to be loaded. Use it whenever A does something and B must follow. Exile emits
   `resident_exiled`; puzzles listens and burns the pieces it dealt; goals listens and marks goals missed. Exile no
   longer names puzzles at all.
2. **Capabilities (ask or command).** Today's `ApiDefinition` with `query` and `command` methods and Typebox schemas,
   renamed capability. `requires` (must be loaded) and `uses` (optional) stay. Use it when A needs an answer now or
   needs B to do something as part of A's own rule (tribunal charges a ransom through the accounts capability).
3. **Staged tool calls (act as the script).** `ctx.stage(toolRef, params)` runs another mechanic's tool through the
   whole pipeline as actor `script`. Use it when the effect must be subject to the same limits and rules as a
   resident's call.

Where the contracts live: (A) a sub-path export `/contract` of the provider; (B) one contract package per capability
(39 packages become about 60); (C) a shared hub as today (everyone coupled to everything, not enforceable). With A the
consumer depends on the provider's package but imports only types and schemas, and another package can provide the
same capability by re-exporting it.

Recommendation: **A**, plus one small package `@swarmtales/std-contracts` (target under 300 lines) for the few
capabilities that are generic and have several providers or none of ours as the obvious owner: `Accounts` (credit,
debit, balance), `Messaging` (notify an actor, post to a place), `Roster` (who is in, who is out, teams), `Notebook`
(the strategy brain's source API). A `/contract` entry may contain only `defineCapability`, `defineEvents`,
`defineTool` refs and Typebox schemas; a lint rule forbids every other import in it, so it stays free of runtime code.
A second sub-path, `/rules`, is the place for pure rule functions others may reuse (`applyStep`, `winnerOf`,
`deckOf`), which makes smell 4 a declared interface.

### 4.3 What replaces `mechanics/shared`

Nothing as a hub. Its content splits four ways: the 21 APIs go to their providers' `/contract` entries (or are deleted
where an event replaces a command); the small schemas (`ResidentId`, `OfResident`) go to contracts; `INPUT_KINDS` and
`STATUS_ORDER` become options of the turn scheduler in the City games; `HOOK_ORDER`, `LISTENER_ORDER`,
`OVERSEER_ORDER`, `legacyTurns` and `LEGACY_SILENT_EVENTS` are deleted with the old engine's byte order.

### 4.4 Layering rules a tool can enforce

Layers, lowest first. A package may depend only on layers below it, except where stated.

```
L0  contracts, chain                      no workspace dependency, browser-safe, no node:*
L1  kernel                                contracts only
L2  sdk, prompts                          contracts (sdk has NO dependency on kernel)
L3  plugins: mechanics/*, directors/*, schedulers, drivers, providers, sinks
                                          sdk, contracts, std-contracts, other plugins' /contract and /rules only
L4  runtime, runlog, models, testkit      kernel, sdk, contracts (testkit must not depend on reporters)
L5  reporters (report, digest, novelist), viewer-core, viewer-ui
                                          contracts, chain, runlog readers; never kernel, never a plugin
L6  apps (cli, viewer-web, vscode), games/*   anything; the only place plugins are named
```

The checks, all in one script that replaces the hand-kept `ALLOWED` table (`scripts/check-packages.ts`) by a rule per
layer, with the layer declared in each `package.json`:

1. Layer rule on declared dependencies and on actual imports.
2. Plugins never import `@swarmtales/kernel`. Authors import `@swarmtales/sdk` only; the erased `PluginInstance` shape
   lives in contracts, so the sdk can produce it without the kernel.
3. Cross-plugin imports only from `/contract` and `/rules`; `/contract` files import only typebox, contracts and the
   sdk's definers.
4. Mechanics are split into `base` and `game` in the manifest; a `base` mechanic may not require or use a capability
   provided by a `game` mechanic (this alone forbids today's `channels -> puzzles` and `ledger -> exile`).
5. No cycles among `requires` **and** `uses`. The escape hatch of today (cycles of `uses` broken by story order) goes;
   a cycle means an event is missing.
6. Forbidden globals in L1 and L3, by ESLint `no-restricted-globals` and `no-restricted-imports`: `process`,
   `Date.now`, `Math.random`, `fetch`, `node:*`, `setTimeout`.
7. No game word in kernel and contracts: a word-list test (resident, director, gamemaker, minute, level, point, vote,
   ...); "resident" and "director" exist only as *kind* strings in the sdk. Plus the kernel budget test (2.2) and the
   no-native-dependency check (carried over).

## 5. Contracts and schema

### 5.1 The Game definition

One format: today's `CoreStory`, renamed `GameDefinition`, extended by the scheduler and the plugin list. The old
`StoryDefinition`, `validate.ts`, `story-schema.ts`, `tool-names.ts` and `hostStoryOf` are not ported (about 3500
lines). What they knew moves to where the rule is played: each mechanic gets an optional `check(options, view):
readonly Issue[]` in its head for cross-field and cross-mechanic checks (what `validateTribunal` does centrally
today), so `swt game validate` is a loop over the loaded plugins and the sdk holds no copy of any rule.

```ts
/** Today's `CoreStory` fields (mechanics, grants, grantTweaks, locked, tools, limits, human) plus: */
export interface GameDefinition extends CoreStoryFields {
	readonly schema: 1;                                     // version of this format
	readonly plugins?: readonly string[];                   // third-party packages, "name@range"
	readonly actors: { readonly residents: number | readonly string[] };
	readonly scheduler?: SchedulerUse;                      // default: turns
	readonly directors?: readonly DirectorUse[];
	readonly aliases?: Readonly<Record<string, CanonicalTool>>;  // model-facing short names
	readonly extends?: string;                              // a preset to start from
}
```

- **TypeScript builder** (`defineGame` in the sdk): options, grants and locks are checked by the compiler against the
  mechanics in the list, as `defineCoreStory` does today. This inference is worth keeping; it is the best part of the
  current DX.
- **YAML and JSON**: the same data. The JSON Schema is **composed per workspace** from the Typebox option schemas of
  the installed plugins (`swt game schema`), so completion works inside every mechanic's section; the "open sections"
  limit of today disappears because there is no central schema to fall behind. The parser stays `yaml` (YAML 1.2,
  reasons in `docs/STORY-FORMAT.md`).
- **"Story".** Recommendation: `Game` is the only type in contracts. "Story" stays a product word for a game with acts
  and a narrative, shipped as presets (`extends: "tales/city"`), not as a second schema. Two formats is the mistake
  this rewrite removes; a `kind` field would invite it back.
- **Logic in games.** None. Conditions are CEL strings (decided 2026-11-01, `docs/ideas/overseers-and-plugins.md`
  §13); the evaluator is a plugin-side library, not kernel.

### 5.2 Versioning

| Thing | Version carrier | Rule |
|---|---|---|
| Game file | `schema: 1` | additive changes keep the number; a breaking change adds a migration function in the sdk and `swt game migrate` |
| Plugin options | the plugin's semver | options schemas are public API (api-extractor report) |
| Snapshot slice | per slice `version` plus `migrations` | carried over from `SnapshotDefinition` |
| Event log | genesis `format: "swarmtales.events"`, `version: 1` | envelope changes raise it; readers (viewer, reporters) declare the versions they read |
| Event payloads | the declaring plugin's semver | payload schemas are public API; removing or retyping a field is a major change |
| Chain | genesis `version` | carried over |
| Tool names | genesis `naming: 1` | see 5.3 |

### 5.3 Tool and event naming

Adopt option A of `docs/ideas/tool-naming.md` from the first commit; a clean repository has no goldens to regenerate
and no bare names to deprecate, which were the two costs of that paper.

- Canonical tool name `<package>/<mechanic>/<tool>` in grants, locks, limits, CEL, the log and the chain. Model-facing
  alias `^[a-zA-Z0-9_-]{1,64}$`, derived by one pure function or set in the game's `aliases`; both are written in
  every tool event (decided by Flo, 2026-11-03).
- In a game file a bare name resolves when it is unambiguous among the loaded tools, otherwise `swt game validate`
  lists the candidates.
- Events get the same treatment (open question 3 of that paper): the envelope already carries `source` and `type`;
  make `source` the canonical `<package>/<mechanic>` and keep `type` bare. No alias layer is needed for events, since
  models never name them.
- Actor ids are `<kind>:<name>` with the kind open; `gamemaker` stops being a built-in. Grant names are `resident`,
  `human`, `script` and the Directors' names in the game.

## 6. Security

### 6.1 Threat model, stated plainly

In-process JavaScript has no boundary. A plugin loaded with `import()` can read `process.env`, the file system and the
network whatever its typed context says. So the honest statement for the first release is: **first-party plugins are
trusted code; a third-party plugin is as trusted as any npm dependency**, and the product must say so where a game
lists one. Everything below is about making the later sandbox cheap and about keeping secrets and the log safe in the
meantime.

### 6.2 Sandbox for third-party plugins

Requirements differ by kind, because of where a plugin runs (4.1):

- **Mechanics** run synchronously inside the commit lane, so a sandbox must give synchronous calls both ways.
  Candidates: QuickJS in WASM (synchronous, deterministic, memory and time limits per call, no ambient I/O; slow,
  which is irrelevant next to model calls) or a worker thread with a blocking bridge (`Atomics.wait`; fast, weaker
  isolation). `isolated-vm` is a native addon and breaks the no-native rule; `node:vm` is not a boundary.
  Recommendation: QuickJS-WASM, decided by the spike already planned in `docs/ideas/monorepo.md` §3b.
- **Directors, drivers, sinks** are asynchronous and act only through ports: a child process with Node's permission
  flags (no file system, no network) and a message channel is enough.
- **Providers** need the network and one key. They stay first-party or explicitly trusted.

Build **the boundary now, the sandbox later**. The `PluginPort` is defined so that every value crossing it is JSON (no
closures, no class instances; today's `MechanicPort` of "untyped primitives" is close). A testkit mode, `boundary:
"serialized"`, runs every first-party mechanic with a structured clone at each crossing in CI. That is perhaps 150
lines and keeps the sandbox a later, local change. Building QuickJS hosting before one third-party plugin exists would
be the second-system effect in its purest form. Until then third-party plugins must be listed in `plugins`, are pinned
by integrity hash, appear with that hash in the genesis, and `swt run` names them "unsandboxed" unless `--trust` was
given once per package.

### 6.3 API keys

Rule: **a key exists in exactly one object, the key broker of the app, and leaves it only into a provider's request.**

- `KeyBroker` (in `@swarmtales/models`): reads keys from the environment (later the OS keychain), holds them in
  private fields, hands a provider a scoped `authorize(request)` function for its own provider id, never the string.
  Nothing else in the workspace reads `process.env`; an ESLint rule allows it only in `apps/cli` and `packages/models`
  (today eight files read it, among them `packages/testkit/src/mutation.ts`).
- Directors and drivers get a `ModelPort` (`complete(request): Promise<Response>`), never a provider object and never
  a key. They name a model by role (`resident`, `judge`), and the game or the CLI binds roles to models.
- Keys never reach the log: the genesis records provider and model ids only; `redactSecrets` moves to the sink
  boundary in `runlog` and is applied to every string of driver and provider events before signing (today it is
  applied by the callers that remember to).
- A **canary test** in CI: an offline run with a fake key value set in the environment and a scripted provider that
  echoes its configuration into an error; the test greps the whole run folder (events, chain, transcripts, report,
  snapshot) for the canary.
- Snapshots contain model contexts: the canary test covers them, and the docs say that a snapshot holds everything
  every agent was told.

### 6.4 The tamper-evident log

Carry over `packages/chain` and the design of `docs/design/event-log-signing.md`, with the changes of 3.5 (envelopes
covered, plugin integrity in the genesis, interval heads, model exchanges by hash). The stated limit stays true and
must stay in the docs: without an external anchor the chain proves "not edited since the key was fixed", not
authenticity and not the absence of selection. Two small additions: `swt log anchor` prints the head hash and key
fingerprint in one line for publishing (publishing itself stays a human step), and `swt log replay` (3.3) as the
second, independent check.

### 6.5 The Human Hand

Keep the semantics, they are right (`docs/design/overseer-api.md` §5): the human is an actor without a model, acts
only through tools, its calls wait in an inbox and land at safe stops, every one is logged, and a run with an
intervention is marked. Changes:

- It is a plugin (`@swarmtales/human-hand`) over two kernel primitives, `ExternalInput` and `safePoint` (279 lines
  leave the kernel).
- In the parallel scheduler a safe point is "the lane is idle"; `pause` stops new activations and lets open ones
  finish; `step` admits one.
- A local control channel (a TUI attached to a running process) needs a token from a 0600 file in the run folder;
  without it any local process could act as the human.
- The genesis records the game's `human` policy; the report says "human-influenced" from the log.

## 7. Carry over, port, drop

"Carry" means copy with at most import changes. "Port" means same design, rewritten against the new contracts. "Recut"
means new design. Judged against the second-system effect: **if the design is proven and the code is not entangled
with the old engine, do not redesign it.**

| Part | Lines | Verdict | Reason |
|---|---|---|---|
| `packages/chain` | 579 | carry | pure, browser-safe, tested against tampering cases |
| `packages/viewer-core`, `viewer-ui`, `apps/viewer-web`, `apps/vscode` | 3754 | carry, one new reader | depends only on chain and typebox; the reader of the legacy line format is replaced |
| `packages/prompts` | 812 | carry | loader and typed registry are independent of the engine |
| Mechanic README format and generator (`docs/MECHANIC-README.md`, `scripts/mechanic-docs.ts` 651) | 651 | port | reads heads; heads change shape slightly |
| `packages/models` | 551 | port | add the key broker and the model port; registry stays |
| Mechanic API (`contracts/core/mechanic.ts`, `context.ts`, `api.ts`, `tools.ts`; `kernel/define.ts`, `kit.ts`) | about 1500 | port | proven by 39 mechanics; remove the legacy ordering devices, rename, move to sdk |
| Tool pipeline (`gateway.ts`) | 312 | port | keep stages and the serial lane; handlers become registrations |
| Turn loop (`turns.ts`) | 208 | port | becomes the `turns` scheduler |
| Human Hand, decision gate, overseer runner | 1470 | port, out of kernel | semantics proven in step 18; only the home changes |
| Pure rule code of the newer games (chess, morris, cards, holdem, liars-dice, econ, auctions; 19 mechanics) | about 13,500 | port mechanically | written against the new core already, little old-engine residue; rename imports, canonical names, `/contract` entries |
| Testkit conformance and scripted agents | 742 | port | cut its dependency on chronicle |
| Agent runner on pi (`roles/src/agents`) | 593 | port | becomes `driver-pi`; drop the old event names and souffleur wiring |
| Run reporter (`chronicle/src/report`) | 1300 | port | reads the new envelope; generic part only |
| The City of Keys cluster (19 mechanics: channels, tribunal, puzzles, progression, ...) | about 15,900 | **recut** | carved from `World` to reproduce its bytes; the dependency knot of 1.4 lives here |
| Directors (gamemaker, classifier, judge, weaver) | 2177 + 1996 | recut on `defineDirector` | today they "replay the old roles line for line" over two layers |
| Digest and its detectors, novelist | about 6000 | port late | City-specific detectors move next to the City game |
| `packages/legacy-log`, legacy adapter, legacy snapshot converter, `mechanics/shared/order.ts` | about 2600 | drop | exist only for old bytes |
| `contracts/story.ts`, `story-schema.ts`, `tool-names.ts`, `sdk/validate.ts`, `sdk/define.ts`, `cli/host/story.ts` | about 4000 | drop | the old game format |
| `test/` goldens and old-engine fixtures | large | drop | new goldens per game from the new kernel |

Where a from-scratch rewrite is **not** worth it, said directly:

1. **The mechanic authoring model.** Head and body, the kit, `requires`/`provides`/`uses`, typed events and the stage
   pipeline are the result of three review rounds (`docs/design/carve-*`, `challenge-*`). A new concept here would
   cost the port of 39 mechanics twice.
2. **The 13 `CoreStory` games.** They already are "a list of mechanics with options". Port them file by file; do not
   redesign their rules. They are also the regression suite for the new kernel.
3. **Chain, viewer, prompts.** Independent already.
4. **The single-writer lane.** The async scheduler does not need async mechanics (3.2). Making mechanics async "for
   the future" would be the most expensive wrong turn available.

Where the rewrite earns its cost: the kernel (extraction), the contracts (one format), the City cluster (recut), and
the event log (one format, fully signed).

### 7.1 Target layout and budgets

Budgets are code lines of `src` without tests; the kernel's is a hard test, the others are review targets with the
300-line file limit doing the real work.

```
packages/
  contracts/        1500   envelope, actor, tool, capability, plugin shapes, game schema, ports
  kernel/           1500   hard limit (2.2)
  chain/             600   carried
  sdk/              1800   defineMechanic/Director/Game/Capability/Events/Tool, game resolution, grants auto, naming
  std-contracts/     300   Accounts, Messaging, Roster, Notebook
  schedulers/       1000   turns (450), parallel (350), replay (200); sub-path exports
  director-host/     900   triggers, calls, fallback, standing orders, cost limits
  human-hand/        400
  models/            700   provider registry, key broker, model port, scripted provider
  driver-pi/         700   the agent runner on pi-agent-core
  prompts/           800   carried
  runlog/           1000   run folder, jsonl sink, chain writer, redaction, snapshot file, readers
  runtime/           600   plugin discovery, KernelDefinition assembly, the one composition function
  testkit/           900   scripted drivers, conformance, serialized-boundary mode, golden helper
  report/           1300   run reporter
  digest/, novelist/        late milestones, budgets set then
  viewer-core/, viewer-ui/  carried
mechanics/
  base-*/                  accounts (ledger), messaging (channels), roster, team-channel, consensus,
                           card-table, notebook (strategy-brain), decisions, guard, budget
  <game mechanics>/        chess, morris, grid-game, holdem, liars-dice, ... then the City set
directors/
  gamemaker/ confessor/ judge/ weaver/   each a package with its prompts, 600 or less
games/                     one folder per game: game.ts or game.yaml, README.md, prompts/, runs/
apps/
  cli/              3000   no file over 300; one runner
  viewer-web/ vscode/      carried
docs/  scripts/  examples/
```

`schedulers` is one package on purpose: three packages of 200 to 450 lines each would add release overhead and no
isolation. The package count goes from 13 library packages to 19, which is the ceiling I would defend; every further
split needs a consumer that wants one half without the other.

### 7.2 Build and tooling

- **pnpm workspace, TypeScript project references, tsdown** with one base config (`tsdown.base.ts`) and the
  `development` export condition: carried over. **knip** too.
- **ESLint**: today's strict set (`strictTypeChecked`, no `any`, no assertions, exhaustive switches) plus the decided
  limits (`max-lines` 300 with a warning at 250, `max-lines-per-function` 50, `complexity` 10, higher limits for tests
  and generated files), `eslint-plugin-jsdoc`, and the restricted globals of 4.4. Today's lint needs a 12 GB heap in
  two passes (`package.json`, script `lint`); lint per package instead.
- **api-extractor** per published package with the report committed: a changed report fails the check, so every API
  change shows in review. **TypeDoc** from the same entry points.
- **Tests inside the packages**, run with Vitest per package; only whole-game runs live in `games/*/test`. A package
  must pass alone.
- **CI**: GitHub Actions is disabled in the current repository (`CLAUDE.md`, "Merging"), and the brief requires the
  limits "in check and CI". Without CI from the first commit the limits are local conventions.
- **Typebox**: a conformance test over every exported schema checks that the schema and each property carry a
  `description`.

## 8. Migration as milestones

Each milestone ends with something that runs. Order by risk: prove the kernel shape with the smallest thing, then
widen.

| # | Milestone | Scope | Done when |
|---|---|---|---|
| M0 | Scaffold | new repository, workspace, lint limits, layer check, kernel budget test (at 0 lines), api-extractor, CI | an empty package passes `pnpm check` in CI |
| M1 | **Walking skeleton** | contracts, kernel, sdk (`defineMechanic`, `defineGame`), `turns` scheduler, scripted driver, `runlog` with chain; one tiny game written new (a number-guessing or coin-pass mechanic under 150 lines, also step 1 of the sample ladder) | `swt run --game <tiny> --provider scripted` writes a signed log; `swt log verify` is ok; the carried viewer opens it; kernel under budget |
| M2 | Live model | models with key broker, `driver-pi`, budget plugin, canary test | the tiny game plays with a live Haiku model; no canary in any artifact |
| M3 | Mechanic contract complete | capabilities, events, staged calls, snapshot and resume, testkit conformance with serialized boundary, README generator; base mechanics (team-channel, consensus, card-table, notebook) and three games (liars-dice, tic-tac-toe teams, holdem) | the three games run offline and resume from a snapshot byte-equal |
| M4 | Second scheduler | `parallel` and `replay`; `basis`, activation brackets, interval heads | one game plays in both modes; `swt log replay` reproduces both logs; an audit note documents what each check proves |
| M5 | Directors and the human | `director-host`, `decisions`, `human-hand`, `guard`; judge and gamemaker on `defineDirector`; the optimal referees | a game with a judge and a scripted human replays exactly |
| M6 | The rest of the board, card and economy games; YAML/JSON, composed schema, `swt game validate` | mechanical porting | all 13 non-City games run; each has a new offline golden and one live baseline run recorded |
| M7 | City of Keys and Whispers, recut | the base/game split of the 19 mechanics, events instead of command chains, remaining Directors, reporter, digest, novelist | Act I and Act II play at 6 agents; comparison against the old baseline is written up |
| M8 | Release hardening | API freeze (api-extractor), TypeDoc, sandbox spike and decision, plugin manifest and trust flow, npm publishing | a third-party example plugin is installed and run by a game that lists it |

M1 to M4 are the architecture risk and should be done by the strongest model with a challenger (the brief's model
plan). M6 is the bulk and is mechanical. M7 is the only milestone with real design work on game rules, and it is
deliberately late: by then the contract has been exercised by 13 games, so the recut of the City cluster does not bend
the kernel to its needs again. That is how the current kernel got its role words.

## Open decisions

| # | Decision | Options | Recommendation and reason |
|---|---|---|---|
| 1 | How the kernel budget is counted | (a) 1500 raw lines; (b) 1500 code lines plus a cap of 40 exports | (b): with mandatory TSDoc, raw lines measure documentation |
| 2 | Name of logical time | (a) keep `minute`; (b) `tick` in kernel and envelope, games label it | (b): chess has moves, the parallel mode has no minutes; "minute" is a game word |
| 3 | Where capability contracts live | (a) `/contract` sub-path plus a small `std-contracts`; (b) a package per capability; (c) a shared hub | (a): enforceable, no new packages (4.2) |
| 4 | Pipeline shape | (a) fixed named stages with registered handlers; (b) free middleware | (a): the order carries lessons (cheap first, charge after execute) and gives README generator and viewer a vocabulary |
| 5 | Conflicts in the parallel mode | (a) accept, record `basis`, opt-in `stale: "refuse"`; (b) refuse every stale call; (c) transactions | (a): (b) starves slow models, (c) is a database in the kernel |
| 6 | Does `review` hold the lane | (a) always (today); (b) never; (c) scheduler option | (c): hold for `turns`, release for `parallel` |
| 7 | Tick advance in the parallel mode | (a) wall clock; (b) commit count; (c) option | (c), default commit count: no wall-clock dependence in experiments |
| 8 | Sandbox: when and what | (a) QuickJS hosting before release; (b) serializable boundary now, sandbox at M8 after a spike; (c) trust only | (b): cheap now, expensive to retrofit, no third-party plugin exists yet |
| 9 | The City cluster | (a) recut at M7; (b) port as is behind one preset, recut after release; (c) leave out of the release | (a), with (b) as the fallback: the release needs a kernel that does not know the City, not a clean City |
| 10 | "Story" | (a) only `Game` in contracts, story as presets; (b) `kind: "story"` in the schema | (a): two formats is the mistake being removed |
| 11 | Runtime revision format | (a) one integer; (b) tuple of kernel, scheduler, driver | (b): three parts can change how a run plays |
| 12 | Tool alias length | 64 or 128 | 64: the strictest known API (`docs/ideas/tool-naming.md` §2) |
| 13 | pi-agent-core under the driver | (a) keep; (b) own minimal loop on pi-ai | (a) for M2, revisit at M4: the parallel scheduler needs cancellation and one activation at a time, and I have not checked in code whether pi-agent-core gives that cleanly |
| 14 | `schedulers` as one package or three | one or three | one, with sub-path exports: no consumer wants one without the others yet |

## Risks

- **The budget is met by moving code, not removing it.** The 3100 lines that leave the kernel land in `director-host`,
  `human-hand`, `sdk` and `schedulers`. The gain is isolation, not fewer lines. Only the dropped legacy (about 6600
  lines) and the City recut shrink the platform.
- **Second-system effect at the plugin seam.** Six plugin kinds, capabilities, sub-path contracts, layers and a
  manifest are a lot of concept for a release with zero third-party plugins. Mitigation: M1 to M3 use only mechanics,
  one scheduler and one driver; every further kind arrives with its first real user.
- **The parallel mode changes what games are.** Rules written for ordered turns (deadlines in minutes, one action per
  pass) may be exploitable or meaningless when agents act freely. The architecture makes this auditable, not fair.
  Each game declares the schedulers it supports.
- **Loss of the old-engine differential.** Today's correctness argument is "byte-equal to the old engine". The new one
  is conformance tests, replay and new goldens. Until M6 there is no full regression; bugs in ported rules show in
  live runs, which cost money.
- **The City recut is the long pole.** 15,900 lines whose behaviour is documented mostly by logs and by comments about
  code that no longer exists. Without the old goldens the oracle is the lesson log and live baselines.
- **Replay depends on plugin discipline.** One mechanic that reads a clock or depends on arrival order breaks replay
  silently. The conformance test (run twice with shuffled arrival, compare) must exist from M3.
- **The `review` re-entry is new behaviour.** Releasing the lane during a judge call lets the world change under an
  approved call. Re-running `lock` to `rule` covers state, not an answer that refers to a state that is gone.
- **Unsandboxed third-party code until M8.** The trust prompt is a mitigation, not a boundary.
- **Tooling weight.** api-extractor, TypeDoc, jsdoc lint, knip, layer check, budget test and generated READMEs over
  about 60 packages can make `pnpm check` slow enough to be skipped. Per-package and affected-only checks belong to
  M0.

## Proposed first issues

1. **Scaffold the workspace with limits and CI**: pnpm, tsconfig references, tsdown base, ESLint limits (300/50/10),
   GitHub Actions running `pnpm check`.
2. **Layer check script**: layers declared in `package.json`, import and dependency rule, `/contract` and `/rules`
   rule, cycle check; replaces the allow list.
3. **Kernel budget and vocabulary tests**: fail over 1500 code lines, over 40 exports, or on a game word in kernel or
   contracts.
4. **Contracts v1: envelope, actor id, tool and stage types, `PluginInstance`, ports**: with Typebox schemas and
   descriptions; api-extractor report committed.
5. **Kernel: log and commit lane**: append, schema check, causation, serial submit, staged calls.
6. **Kernel: state slices, snapshot, restore, capabilities and loader**.
7. **Kernel: clock, jobs, external input and safe points**.
8. **sdk: `defineMechanic`, `defineCapability`, `defineEvents`, `defineTool`** producing `PluginInstance` without
   importing the kernel.
9. **sdk: `defineGame` and game resolution to `KernelDefinition`**: canonical tool names, aliases, grants auto.
10. **Scheduler `turns`**: port of the turn loop with `endsTurn` as revision 1.
11. **runlog: run folder, jsonl sink, chain writer over envelopes, redaction at the sink**.
12. **Walking skeleton game**: one new mechanic under 150 lines, `swt run`, `swt log verify`, viewer reader for
    envelope v1.
13. **Key broker, model port and the canary test**.
14. **`driver-pi`**: the resident runner as an actor driver, with `model_exchange` hashes.
15. **Testkit: scripted drivers, conformance, serialized-boundary mode**.
16. **Spike: scheduler `parallel` with fair lane and `basis`**, then `replay` and `swt log replay`.
17. **Decision record: `review` stage and lane release** (challenger review before building).
18. **Port plan for the 13 non-City games**: one issue per game with its mechanics, in dependency order.
19. **Design paper: the City of Keys recut** (base and game mechanics, events replacing command chains), before any
    City code is ported.
20. **Spike: QuickJS-WASM hosting of one mechanic** (decides open decision 8 at M8).
