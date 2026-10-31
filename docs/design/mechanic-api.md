# The mechanic API of the new core

Status: built in wave 2a (2026-10-31) as a tested skeleton next to the old engine; wave 2b closed
the gaps of §8 that blocked carving (turn policy, names, consult, guard secrets, staged script
calls, gamemaker tools, input kinds, `ContextOf`, the legacy event adapter and snapshot converter). Nothing in the
CLI uses it yet; the old `World` keeps running and the golden runs are unchanged. This is the
contract the carving teams of wave 3 build against. The plan behind it is
[`docs/ideas/monorepo.md`](../ideas/monorepo.md) §2a, §3, §3d and §5; what each mechanic takes out
of `world.ts`, and in which order, is [`carve-plan.md`](carve-plan.md).

Where the code is:

| Piece | Path |
|---|---|
| Types and schemas | `packages/contracts/src/core/` (`mechanic.ts`, `context.ts`, `api.ts`, `tools.ts`, `events.ts`, `story.ts`, `host.ts`, `consult.ts`, `turns.ts`) |
| The host | `packages/kernel/src/host/` (`define.ts`, `kit.ts`, `loader.ts`, `catalog.ts`, `gateway.ts`, `waits.ts`, `staging.ts`, `turns.ts`, `referee.ts`, `log.ts`, `residents.ts`, `scheduler.ts`, `access.ts`, `host.ts`) |
| Old shapes | `packages/chronicle/src/log/legacy-events.ts`, `legacy-owners.ts` (event adapter), `packages/chronicle/src/snapshot/legacy-snapshot.ts` (snapshot converter) |
| Prompt lookup | `packages/prompts/src/lookup.ts` (`createPromptLookup`), core replies in `library/prompts/replies/core/` |
| Testkit | `packages/testkit/` (scripted agents, `playStory`, conformance checks) |
| Proof mechanics and stories | `test/host/proof/` (`ledger.ts`, `channels.ts`, `story.ts`), tests in `test/host/`, `test/log/legacy-events.test.ts`, `test/snapshot/legacy-snapshot.test.ts` |

## 1. The core in one paragraph

The core knows residents (an id plus attribute bags that mechanics own, and suspensions), a
virtual minute and a scheduler of named jobs, an append-only event log with a synchronous bus,
a mechanic host, a tool gateway with a fixed pipeline, a referee, a turn loop and a prompt
lookup. It contains no game word; a test (`test/host/core-words.test.ts`) fails when one appears
in `packages/kernel` or `packages/contracts` outside the old engine's files listed there.
Everything with game meaning is a mechanic.

## 2. Writing a mechanic

```ts
export const ledger = defineMechanic(
  {                                     // the head: plain data, fixes the types
    id: "ledger",
    summary: "Points per resident and transfers between residents.",
    provides: [LedgerApi],              // APIs it implements
    requires: [],                       // APIs it calls; it loads after their providers
    uses: [],                           // APIs it calls when their provider is loaded (ctx.has, ctx.tryCall)
    options: Type.Object({ start: Type.Integer({ default: 10, description: "..." }) }),
    state: ({ options, residents }) => ({ balances: new Map(residents.map((id) => [id, options.start])) }),
    events: { points_transferred: Type.Object({ from: Type.String(), to: Type.String(), amount: Type.Integer() }) },
    prompts: { "ledger/tools/transferPoints": [], "ledger/transfer-ok": ["amount", "to", "balance"] },
  },
  (kit) => ({                           // the body: built once per run, typed by the head
    services: [kit.provide(LedgerApi, { balance: (input, ctx) => ..., transfer: (input, ctx) => ... })],
    tools: [kit.tool({ name: "transferPoints", description: "ledger/tools/transferPoints", parameters, limit, rule, execute })],
    facts: { balances: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => ...) },
    limits: [kit.limit("non-negative", "No balance below zero.", (view) => ...)],
    snapshot: kit.snapshot({ version: 2, schema, save, load, migrations: { 1: (old) => ... } }),
  }),
);
```

`defineMechanic(head, build)` infers the options type from the Typebox schema (`Static<O>`), the
state from `state`'s return, the events and prompts from their declarations, and the tool names
from the tools the body returns. Inside the body:

- `ctx.options` is `Static<O>`; a missing option is a compile error.
- `ctx.state` is the state type; it is the instance's own and nobody else's.
- `ctx.emit(type, payload)` accepts only declared events with the payload of their schema; the host
  checks the payload again at run time.
- `ctx.call(Api, method, input)` accepts only APIs in `requires`, typed input and output; the
  output is checked against the method's schema. An API in `uses` is optional: `ctx.has(Api)`
  says whether a loaded mechanic provides it, `ctx.tryCall(Api, method, input)` returns
  `{ ok: true, value }` or `{ ok: false }` when none does.
- `ctx.prompt(id, variables)` accepts only declared prompts with exactly their variables.
- A tool's `description` must be a declared prompt without variables.
- `ctx.random()` is randomness derived from the seed, the mechanic and the log position;
  `ctx.rng(...labels)` is a labelled stream that equals the old engine's `rngFor(seed, ...labels)`
  (a fresh generator per call, so `ctx.rng("puzzle", level)` deals the same as before). `state`
  gets `seed` and `rng` too. `ctx.minute` is the only time. `ctx.residents`, `ctx.schedule`,
  `ctx.access`, `ctx.log` are ports; `residents.attribute(id, key)` reads only the calling
  mechanic's own attributes (another mechanic's go through its API).

`test/host/mechanic-types.check.ts` holds one `@ts-expect-error` per misuse, so the typing is
itself tested.

A helper outside the body types its context from the head. Declare the head apart with
`defineHead` (an identity that keeps the literal types) and use the helper types:

```ts
const head = defineHead({ id: "ledger", options, state, events, prompts, provides: [LedgerApi] });
type Ctx = ContextOf<typeof head>;      // MechanicContext of this mechanic
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;        // FactView
function pay(ctx: Ctx, to: string, amount: number): void { ... }
export const ledger = defineMechanic(head, (kit) => ({ ... }));
```

`ShapeOf<H>` gives the bundled shape when another generic needs it. The head needs `options`, `state` and `events` even when empty (`Type.Object({})`,
`() => undefined`, `{}`): optional generic values would need casts, which the rules forbid.

## 3. Extension points

| Point | Declared as | Called |
|---|---|---|
| Tool | `kit.tool({ name, description, parameters, limit?, suggest?, rule?, guardText?, execute })`; `description` is a plain prompt id or `{ prompt, variables(options) }`, where a variable may be `{ prompt }` (another plain prompt, rendered first) | through the pipeline (§4) |
| Service | an `ApiDefinition` (`defineApi`) in a shared place; `provides` + `kit.provide(Api, impl)` (every method; `kit.provideSome` for stand-ins and unfinished carves, a missing method throws `<api>.<method> is not implemented`); `requires` + `ctx.call` | synchronously; a `command` writes `service_called` and causes the provider's events, a `query` leaves no trace |
| Event listener | `kit.on(type, fn, options?)` (own events), `kit.listen(events, type, fn, options?)` (another mechanic's events, declared with `defineEvents(id, schemas)` in a shared module so no value import of the emitter is needed; silent when that mechanic is not loaded; the loader refuses it when the loaded emitter declares another schema object), `kit.core(type, fn, options?)` (core events); `{ immediate: true }` runs the listener inside `emit`; `{ order }` places it among the listeners of the same event (default 0, ties in load order) | after the emitting code returned, or at once when immediate (§5) |
| Fact | `kit.fact(outputSchema, (view) => value)`: pure, over read-only state and the log | `host.facts()` for the gamemaker report and the watch role; checked against its schema |
| Hook | `hooks: { runStarted, minuteStarted, news, turnInputs, turnOpened, turnEnded, minuteEnded, runEnded }`; each but `news` is a function, a phase `{ order, run }` or a list of phases | phases of one hook across all mechanics by `order` (a plain function is 0), ties in load order; the mechanics give their phases the numbers of `HOOK_ORDER` (`mechanics/shared/src/order.ts`); calls staged in `runEnded` run before `run_ended`; `news(resident)` says whether a resident has something new (activation `onNews`); `turnInputs` returns lines (`string` or `{ kind, text, order? }`; within a joined kind the parts sort by `order`, default 0, then load order); `turnOpened` runs when the resident's turn begins, after the block's inputs were built (mark things as seen here) |
| Turn policy | `turns: { passes?, blockSize?, activation?, order?(view), inputs? }` in a body or the story | by the turn loop (§6) |
| Presentation | `presentation: { resolve?(call), display?(text) }` | `resolve` rewrites raw arguments before `parse`; `display` formats every text a caller reads (replies, refusal details, turn inputs); in load order. Events keep ids |
| Guard secrets | `guard: { secrets(resident, minRun), leaks?(text, secrets, minRun) }`; the guard model is a `GuardModel` (`core/consult.ts`) | at the `guard` stage of a resident's call (§4) |
| Consult | a tool's `consult: { role, question, answer, ask(params, ctx) }`; `ask` may return `skipConsult(reason)` | at the `consult` stage; `execute` gets the parsed answer as its third argument, or `{ ok: false, reason: "skipped" }` without asking |
| Role variant | a tool's `serves: ["gamemaker"]` | the gateway picks the variant that serves the caller's role; two tools of one name may coexist when their `serves` do not overlap |
| Pipeline handler | `pipeline: { lock, afford, rule, settle, after }`, for every tool call | at that stage, in load order |
| Referee limit | `kit.limit(id, summary, (view) => reason \| undefined)` | after every turn and minute; a breach ends the run |
| Job | `jobs: { name: (ctx, data) => void }`, scheduled with `ctx.schedule.at/every` | at the start of the minute |
| Snapshot slice | `kit.snapshot({ version, schema, save, load, migrations })`, required when the state is not `undefined` | `host.snapshot()` and resume |
| Prompts | `prompts: { id: [variables] }`, files in the mechanic's folder | story folder, then the mechanic's, then `library/prompts/` |

Rule of thumb from the paper holds: services for commands and questions, events for news.
`channels` asks the ledger whether a DM is affordable (`balance`, a query) and charges it after
sending (`charge`, a command); it learns of transfers by listening to `points_transferred`.

## 4. The tool pipeline

Every call, from a resident, the gamemaker or the script, runs through the same chain in
`packages/kernel/src/host/gateway.ts`. The call opens with `tool_called`; every event of the call
has it as `causedBy`; a refusal is exactly one `tool_refused` (`tool`, `stage`, `code`, `detail`).

| Stage | Who | What |
|---|---|---|
| `lock` | core, then mechanics | the tool exists; the story grants it to the actor's role; the resident may act (no suspension); the tool is not locked for the resident; then every mechanic's `lock` handler |
| `parse` | core | the arguments against the tool's schema (`INVALID_ARGUMENTS`) |
| `limit` | referee | steps per resident per minute; every limit of the tool (its own and the story's add up: tighten, never lift) |
| `afford` | mechanics | can the caller pay; nothing is charged yet |
| `rule` | tool, story, mechanics | the tool's own `rule`, the story's rules (`maxLength`, `forbid`), the mechanics' `rule` handlers |
| `guard` | story + guard model | the story's soft rule on the tool's `guardText`; `block` only; fails open (below) |
| `consult` | tool + role | only for tools with `consult`: `ask` builds the question (or refuses at `consult`), the host asks the role (`role_asked`, `role_answered`, cost recorded) and parses the answer; a missing or failing role is not a refusal, `execute` gets `{ ok: false, reason: "absent" \| "failed" }` and decides |
| `execute` | tool | synchronous; a refusal here is reported at stage `execute` |
| `settle` | referee, mechanics | only after a successful execute: the limits count the call, cost modules charge |
| `after` | mechanics | after every executed call, ok or not |

Before `lock`, the core counts the call as a step of the minute (`STEP_LIMIT` at stage `limit`,
so a refused step still counts) and finds the tool's variant for the caller's role
(`TOOL_NOT_GRANTED` when none serves it). After the `lock` stage and before `parse` it runs the
`resolve` handlers on the raw arguments (names to ids). Replies and refusal details pass through
`display` before the caller reads them.

**Guard.** A story's guard policy (`tools.<name>.guard: { rule, on: "block", secrets?: { minRun } }`)
runs only for resident callers. With `secrets`, every mechanic's `guard.secrets` gives what the
caller legitimately knows; each `guard.leaks` check runs first and blocks without a model
(`guard_verdict` with `by: "check"`); then the guard model gets the text and the secrets
(`by: "model"`). No guard model gives `by: "none"` and lets the call through; an erring model
lets it through too (`error` set). The judge's usage is recorded as cost.

**Script calls.** `ctx.stage(tool, params, { then? })` from any mechanic code (a job, a hook, a
listener, a tool) queues a call with actor `script`. `tool` is a `ToolRef` (`defineTool(name,
parameters)`, declared beside the tool), so the parameters are type-checked; the loader checks
that the serving variant uses the same parameter schema. Staged calls run through the whole
pipeline right after the code that staged them, caused by the staging event, before the next call
or turn begins, one at a time and depth first: a call staged while a staged call runs goes before
the ones queued behind it. `then` names a job of the staging mechanic; it runs with the outcome
(`StagedOutcome`: `{ ok, reply }` or `{ ok: false, code, detail }`) as data, before the next
queued call, so chained actions keep their order. Calls staged in `minuteEnded` or `between` run
before `minute_ended`; `host.snapshot()` refuses while a staged call waits. Calls staged in
`runEnded` are dropped. The legacy adapter writes no line for a staged call's refusal (the old
director logged none); a script that needs it reads the outcome in `then`.

**Gamemaker tools.** The gamemaker is a role like the others: a mechanic defines tools (with
`serves: ["gamemaker"]` when a resident tool has the same name), the story grants them
(`grants.gamemaker`), the app calls `host.call("gamemaker", tool, params)`, and the events carry
actor `gamemaker`. `createHost({ between })` gives the app a slot after `minuteEnded` and before
`minute_ended`, where it can run the gamemaker's turn; it is skipped after a breach or a stop.

Grants are the story's: `grants: { resident: [...], gamemaker: [...], script: [...] }`. A tool
only *suggests* roles (`suggest`). `locked` closes tools per resident at the start; mechanics
lock and unlock with `ctx.access` (both are events). Calls are serialised, so a guard's wait never
lets another call in. Limit windows are `"minute"`, `"run"`, `{ minutes: N }` (aligned blocks of N
minutes from minute 0) or `{ resetOn: "<event type>" }`, which gives "8 DMs between two openings"
without the core knowing the game. A limit with `key` counts into a counter shared by every tool
with that key (and the same window). The story's tool policies are keyed by role:
`tools: { resident: { sendDM: { limit } }, gamemaker: { postBoard: { rules } } }`; a guard policy
is allowed for `resident` only.

**Errors.** A mechanic that throws ends the run: staged calls are dropped, `run_ended` is written
with reason `error` (the bus drains to the sinks, listeners no longer run), and every later call,
turn or snapshot is refused ("the run failed").

## 5. Events, bus and log

An event is an envelope: `seq` (from 1, no gaps), `minute`, `type`, `source` (`core` or the
mechanic id), `actor` (`resident:A03`, `gamemaker`, `script`, `host`), `causedBy` and `payload`.
Event names are unique across the loaded mechanics and may not take a core name; the load fails
otherwise. Dispatch is synchronous with a fixed order: events in log order; per event, the
listeners by their `order` (default 0), ties in load order, then the sinks (log writers, the referee's window
resets). An event emitted while code runs is queued and dispatched once that code returned, so a
tool's events all land before anyone reacts, and the log order is the dispatch order. An
immediate listener (`{ immediate: true }`) runs inside `emit`, before the emitting code goes on;
its own events land right after the event that caused them (the old engine's synchronous
callbacks, e.g. the director reacting to `level_up` before `submission` is written).

Core events beyond the envelope basics: `pass_started` (`pass`, `order`, `blocks`), `turn_started`
(with `pass`, `block` and the inputs with their kinds), `turn_skipped`, `role_asked`,
`role_answered`, `guard_verdict` (`by`, `error?`). App events (what the runner and the roles saw:
requests, thinking, usage) are declared by the app (`createHost({ app: { events } })`, names may
not clash with core events) and written with `host.record(actor, type, payload)`, source `app`,
checked against their schema. A runner records what a resident's model said with
`turn.record(type, payload)`, which waits for the turn's `ready` like `turn.call`, so the log does
not depend on how fast models answer.

**The old shape.** The golden files and every old run hold flat events (`{ "type": ..., fields...,
"seq": n, "minute": m }`). `LegacyEventAdapter` (chronicle, `legacySink(record)` as a bus sink)
writes that shape byte for byte from envelopes: a mechanic event becomes `{ type, ...payload }`
(payload fields named `type`, `seq` or `minute` are refused), core events go through
`LEGACY_CORE_TRANSLATORS` (`pass_started` becomes `round_start` on pass 1 plus `pass_start`;
`turn_skipped` and `guard_verdict` keep their old fields) or are dropped, and `seq` is renumbered
over what is written. `envelopeFromLegacy` reads an old line back; `LEGACY_EVENT_OWNERS` says
which mechanic (or `app`, `core`) owns each of the 118 old event types. The test reads every
golden log into envelopes and writes it back byte-equal; a host run writes the old shape.

## 6. Stories, the host and the turn loop

```ts
const minimal = defineCoreStory({
  id: "minimal", seed: 7, minutes: 6, residents: 4,
  mechanics: [channels.with({ dmCost: 1 }), ledger.with({ start: 3 })],
  grants: { resident: ["postBoard", "readBoard", "sendDM", "transferPoints"], gamemaker: ["postBoard"] },
  locked: ["sendDM"],
  tools: { resident: { postBoard: { rules: [{ kind: "maxLength", param: "text", max: 40 }] }, sendDM: { limit: { max: 1, per: "minute" } } } },
  limits: { maxStepsPerMinute: 4 },
});
const host = createHost({ story: minimal, prompts: createPromptLookup({ mechanics: { ... } }), guard });
host.start();
await host.run(agent);            // agent: (turn) => Promise<void>, turn.call(tool, params)
```

Granting, locking or configuring a tool whose mechanic is not loaded does not compile. Load order
follows `requires` (a mechanic after the providers of its APIs) and, where possible, `uses` (after
a loaded provider of an optional API), ties keep the story's order. A `requires` cycle fails the
load; a cycle through `uses` is broken by loading the first open mechanic in story order. Per
minute: `minute_started`, due jobs (`job_ran` causes their events), `minuteStarted`, then every
pass of the turn policy: `pass_started` with the order and the blocks, then per block the inputs of
every member (`turnInputs` of all mechanics, ordered by the policy's `inputs` kinds, joined where a
kind has `join`, formatted by `display`), then the members' turns (`turn_started`, `turnOpened`,
the agent, `turnEnded`). Members of a block run their agents at once, but member k's calls wait
for member k-1 (`turn.ready`), so the log is the same however fast the models answer. With
`activation: "onNews"` a resident without news (no mechanic's `news` hook says yes, and the app's
`awaitsAnswer` says no) gets `turn_skipped`. The default order is a seeded shuffle per minute and
pass; a policy's `order` must return a permutation. A mechanic or the story gives the policy; the
story's fields win. Then `minuteEnded`, the app's `between`, `minute_ended` and the referee. The
referee always wins: it checks the cost cap and the mechanics' limits before every turn and after
the minute, and a breach writes `referee_intervened` and `run_ended`. `host.call(actor, ...)` is
how the gamemaker and the script use tools; `host.toolSpecs(role)` lists every granted tool with
its rendered description (P46: locked tools are listed too).

`host.snapshot()` (between minutes) holds the residents, locks, schedule, referee counts and one
versioned slice per stateful mechanic. `createHost({ story, resume: { snapshot, events } })`
parses both (untrusted input), restores, migrates old slices step by step and writes no event, so
a resumed run logs exactly the events the uninterrupted run logs after the cut.

**Old snapshots.** `convertLegacySnapshot(raw, { locks? })` (chronicle) turns an old run snapshot
(`examples/cityofkeys-act1-06a-04/snapshot-L7.json`) into a host snapshot with one version-0 slice
per mechanic (`LEGACY_WORLD_OWNERS` maps every old world field to its owner; competitors split
into `progression` and the `channels` inboxes, tribunal gates into `exile`; the arena and the
director become `arena` and `script`), the old events, and a layout that `toLegacySnapshot` uses to
write the old file back byte for byte. Each carved mechanic declares a migration from 0 to its
first version. Locks are not derived from the old state: without `locks` the converted snapshot
has none and the story's start locks hold on resume; pass `locks` to set them. A competitor field
without an owner fails the conversion. The testkit's `standInsFor(snapshot, loaded)` fills every
slice whose mechanic is not carved yet, so a team resumes `snapshot-L7` with a partial carve.
Live run logs carry the sink's wall clock `at` after `minute`; `legacyStamp(raw)` keeps it beside
the envelope and `legacyLine(event, stamp)` writes it back (all 12 run logs round-trip).

## 7. Proof

- **Empty story** (`test/host/empty-story.test.ts`): no mechanics; residents, the clock, the log,
  seeded turn order, determinism, snapshot round trip, refusal of unknown tools.
- **Minimal story** (`test/host/minimal-story.test.ts`): `channels` + `ledger`; a refusal at every
  stage, the service call chain (`tool_called` → `dm_sent`, `service_called` → `points_charged`),
  facts, listeners across mechanics, unlocks, grants per role, a schedule, determinism, snapshot
  round trips at four cuts, a migration from slice version 1.
- **Pipeline** (`test/host/pipeline.test.ts`): windows that end with an event, settle only after a
  successful execute, the guard (block, fail open), serialised calls, suspensions, referee limits,
  the cost cap, stop, bus order and causes, every load-time error.
- **Conformance** (`packages/testkit`, used in `test/host/conformance.test.ts`): same seed same
  events, snapshot round trip (events, re-snapshot, facts), every option documented, no forbidden
  imports or globals in a mechanic's sources.

## 8. Open issues

Solved in wave 2b: the turn loop (§6), names for ids (presentation), tools that wait for a model
(`consult`), guard secrets, the script and the gamemaker as callers (`stage`, `serves`, `between`),
the old event shape (the adapter, §5), old snapshots (the converter, §6), `ContextOf` (§2) and
turn input kinds (§6). Still open:

1. **Story rules.** `maxLength` and `forbid` stand in for the expression language (§3a), which is
   not chosen yet (CEL or JSONLogic).
2. **Options at compile time.** `with()` takes every option as optional, because Typebox types do
   not say which options have defaults; a required option without default fails at load, not at
   compile time.
3. **Wall clock.** The watch role's wall clock (§3g) is not in the host; the app owns it.
4. **Names.** `defineCoreStory`/`CoreStory` and `TurnNote` avoid clashes with the old
   `StoryDefinition` and `TurnInput`; rename once the old engine is gone.
5. **Gamemaker text checks.** The old gamemaker tools check their texts (`#checked`) before
   acting; in the new core that is a `rule` of the gamemaker mechanic's tools, not yet written.
6. **One guard policy per tool**, and the guard covers resident callers only (as before).
7. **Runner wiring.** App events (`host.record`), `roles` and `between` exist in the host; the CLI
   runner does not use the new host yet.
