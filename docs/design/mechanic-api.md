# The mechanic API of the new core

Status: built in wave 2a (2026-10-31) as a tested skeleton next to the old engine. Nothing in the
CLI uses it yet; the old `World` keeps running and the golden runs are unchanged. This is the
contract the carving teams of wave 3 build against. The plan behind it is
[`docs/ideas/monorepo.md`](../ideas/monorepo.md) §2a, §3, §3d and §5.

Where the code is:

| Piece | Path |
|---|---|
| Types and schemas | `packages/contracts/src/core/` (`mechanic.ts`, `context.ts`, `api.ts`, `tools.ts`, `events.ts`, `story.ts`, `host.ts`) |
| The host | `packages/kernel/src/host/` (`define.ts`, `kit.ts`, `loader.ts`, `gateway.ts`, `referee.ts`, `log.ts`, `residents.ts`, `scheduler.ts`, `access.ts`, `host.ts`) |
| Prompt lookup | `packages/prompts/src/lookup.ts` (`createPromptLookup`), core replies in `library/prompts/replies/core/` |
| Testkit | `packages/testkit/` (scripted agents, `playStory`, conformance checks) |
| Proof mechanics and stories | `test/host/proof/` (`ledger.ts`, `channels.ts`, `story.ts`), tests in `test/host/` |

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
  output is checked against the method's schema.
- `ctx.prompt(id, variables)` accepts only declared prompts with exactly their variables.
- A tool's `description` must be a declared prompt without variables.
- `ctx.random()` is the only randomness (derived from the seed, the mechanic and the log position);
  `ctx.minute` the only time. `ctx.residents`, `ctx.schedule`, `ctx.access`, `ctx.log` are ports.

`test/host/mechanic-types.check.ts` holds one `@ts-expect-error` per misuse, so the typing is
itself tested. The head needs `options`, `state` and `events` even when empty (`Type.Object({})`,
`() => undefined`, `{}`): optional generic values would need casts, which the rules forbid.

## 3. Extension points

| Point | Declared as | Called |
|---|---|---|
| Tool | `kit.tool({ name, description, parameters, limit?, suggest?, rule?, guardText?, execute })` | through the pipeline (§4) |
| Service | an `ApiDefinition` (`defineApi`) in a shared place; `provides` + `kit.provide(Api, impl)`; `requires` + `ctx.call` | synchronously; a `command` writes `service_called` and causes the provider's events, a `query` leaves no trace |
| Event listener | `kit.on(type, fn)` (own events), `kit.listen(otherMechanic, type, fn)` (silent when that mechanic is not loaded), `kit.core(type, fn)` (core events) | after the emitting code returned (§5) |
| Fact | `kit.fact(outputSchema, (view) => value)`: pure, over read-only state and the log | `host.facts()` for the gamemaker report and the watch role; checked against its schema |
| Hook | `hooks: { runStarted, minuteStarted, turnInputs, turnEnded, minuteEnded, runEnded }` | in load order |
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
| `guard` | story + guard model | the story's soft rule on the tool's `guardText`; `block` only; fails open |
| `execute` | tool | synchronous; a refusal here is reported at stage `execute` |
| `settle` | referee, mechanics | only after a successful execute: the limits count the call, cost modules charge |
| `after` | mechanics | after every executed call, ok or not |

Grants are the story's: `grants: { resident: [...], gamemaker: [...], script: [...] }`. A tool
only *suggests* roles (`suggest`). `locked` closes tools per resident at the start; mechanics
lock and unlock with `ctx.access` (both are events). Calls are serialised, so a guard's wait never
lets another call in. Limit windows are `"minute"`, `"run"` or `{ resetOn: "<event type>" }`,
which gives "8 DMs between two door openings" without the core knowing doors.

## 5. Events, bus and log

An event is an envelope: `seq` (from 1, no gaps), `minute`, `type`, `source` (`core` or the
mechanic id), `actor` (`resident:A03`, `gamemaker`, `script`, `host`), `causedBy` and `payload`.
Event names are unique across the loaded mechanics and may not take a core name; the load fails
otherwise. Dispatch is synchronous with a fixed order: events in log order; per event, the
listeners of the mechanics in load order, then the sinks (log writers, the referee's window
resets). An event emitted while code runs is queued and dispatched once that code returned, so a
tool's events all land before anyone reacts, and the log order is the dispatch order.

## 6. Stories, the host and the turn loop

```ts
const minimal = defineCoreStory({
  id: "minimal", seed: 7, minutes: 6, residents: 4,
  mechanics: [channels.with({ dmCost: 1 }), ledger.with({ start: 3 })],
  grants: { resident: ["postBoard", "readBoard", "sendDM", "transferPoints"], gamemaker: ["postBoard"] },
  locked: ["sendDM"],
  tools: { postBoard: { rules: [{ kind: "maxLength", param: "text", max: 40 }] }, sendDM: { limit: { max: 1, per: "minute" } } },
  limits: { maxStepsPerMinute: 4 },
});
const host = createHost({ story: minimal, prompts: createPromptLookup({ mechanics: { ... } }), guard });
host.start();
await host.run(agent);            // agent: (turn) => Promise<void>, turn.call(tool, params)
```

Granting, locking or configuring a tool whose mechanic is not loaded does not compile. Load order
follows `requires` (a mechanic after the providers of its APIs), ties keep the story's order. Per
minute: `minute_started`, due jobs (`job_ran` causes their events), `minuteStarted`, then every
resident who may act in a seeded order: `turnInputs` of all mechanics, `turn_started` with those
inputs, one agent turn, `turnEnded`; then `minuteEnded`, `minute_ended` and the referee. The
referee always wins: it checks the cost cap and the mechanics' limits before every turn and after
the minute, and a breach writes `referee_intervened` and `run_ended`. `host.call(actor, ...)` is
how the gamemaker and the script use tools; `host.toolSpecs(role)` lists every granted tool with
its rendered description (P46: locked tools are listed too).

`host.snapshot()` (between minutes) holds the residents, locks, schedule, referee counts and one
versioned slice per stateful mechanic. `createHost({ story, resume: { snapshot, events } })`
parses both (untrusted input), restores, migrates old slices step by step and writes no event, so
a resumed run logs exactly the events the uninterrupted run logs after the cut.

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

1. **Turn loop.** The old Arena has passes per minute, blocks whose model calls run concurrently
   but land in seeded order, and `activation: "onNovelty"`. The host plays one sequential turn per
   resident and minute. Needed: a turn policy (passes, blocks, who is activated) as an extension
   point, without letting mechanics see the agent.
2. **Names for ids.** Old tools accept a resident's name wherever an id goes (`withResidents`) and
   replies show names (`world.display`). Needed: a parameter resolver and a reply formatter that a
   `names` mechanic contributes.
3. **Tools that wait for a model.** `blame` waits for the judge inside the tool; `execute` is
   synchronous here. Proposal: an async `consult` step owned by roles before `execute`, or the
   judge as a role whose verdict arrives as an event.
4. **Guard secrets.** The guard question carries the author's secrets (fragments); the guard stage
   passes none. Needed: mechanics contribute secrets per resident (a fact or a hook).
5. **The script and the gamemaker as callers.** They use `host.call` from outside. A script
   mechanic whose jobs stage things through the pipeline would need an async path from a job.
6. **The old event shape.** The golden files hold today's flat events (`{ type, ...fields }`). The
   envelope nests the payload and adds `source`, `actor`, `causedBy`. Wave 3 has to choose: an
   adapter that writes the old shape byte for byte, or one deliberate golden update with reasons.
7. **Old snapshots.** `examples/cityofkeys-act1-06a-04/snapshot-L7.json` has the flat shape; it
   needs a converter into per-mechanic slices (version 0 of each slice).
8. **Story rules.** `maxLength` and `forbid` stand in for the expression language (§3a), which is
   not chosen yet (CEL or JSONLogic).
9. **Options at compile time.** `with()` takes every option as optional, because Typebox types do
   not say which options have defaults; a required option without default fails at load, not at
   compile time.
10. **Naming the context for helpers.** A helper outside the body has to spell
    `MechanicContext<Shape<typeof options, State, typeof events, typeof prompts, Requires, Provides>>`
    (see `test/host/proof/ledger.ts`). A `ContextOf` helper type needs a head declared apart.
11. **Turn input kinds.** Old turn inputs have kinds (character, status, task, dm, notice, digest)
    that the runner orders by; a `TurnNote` has only its source mechanic.
12. **Wall clock.** The watch role's wall clock (§3g) is not in the host; the app owns it.
13. **Names.** `defineCoreStory`/`CoreStory` and `TurnNote` avoid clashes with the old
    `StoryDefinition` and `TurnInput`; rename once the old engine is gone.
