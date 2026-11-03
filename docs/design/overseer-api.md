# The overseer API, the decision gate and the human hand

Status: design for step 18 (2026-10-31), **built at step 18** (packages/kernel/src/host/: `overseers.ts`,
`decisions.ts`, `human.ts`, `orders.ts`, `define-overseer.ts`, `auto-grants.ts`). Where the build differs from the
text below, `step18-decisions.md` (O1, O2, G1, F2) records it; the main deviations: the story's `maxInterventions`
counts under the key `overseer:<name>/story`; a decision still open at the run's end settles with its original
proposal (§3.2 rule 5); `HostOptions.human` is `boolean | HumanChannel`; `HostOptions.between` and `roles` stay
(F2 m2; §6 row 9 is not done); a cost-capped overseer's calls run one after the other (§1.3). It turns the idea paper
[`../ideas/overseers-and-plugins.md`](../ideas/overseers-and-plugins.md) (names decided by Flo: Mechanic,
Overseer, Plugin) into signatures that builder teams can implement. It extends the core described in
[`mechanic-api.md`](mechanic-api.md) and follows [`../ideas/monorepo.md`](../ideas/monorepo.md) §2a (slim core),
§3e #1 (one abstraction for model roles) and §3g (run watch). Section 8 lists the questions for Flo.

Ground rules that hold everywhere below:

- **Nothing changes for a story that uses none of it.** No overseer, no holder of a decision, no human, no
  audience: the host writes exactly the events it writes today, and the golden logs, the 12 run logs and the
  legacy snapshots stay byte-equal.
- **Every new core event is invisible in the old shape.** The legacy adapter drops core events without a
  translator (`mechanic-api.md` §5), so the events below never reach a golden file. They do move
  `bus.lastSeq`, which `ctx.random()` reads; no carved mechanic calls `ctx.random()` today (only `ctx.rng`),
  and step 18 adds a conformance check that keeps it so for the goldens' mechanics (§7, risk 1).
- **Overseers change the world only through tools** that mechanics provide (or the one core tool
  `amendDecision`), through the same pipeline, with the same refusals.
- **The kernel never calls a model.** It schedules overseers, checks their answers and writes the events; the
  app hands it a runtime that calls models (`packages/roles`), and the testkit hands it a scripted one.

## 1. `defineOverseer`

An overseer is a definition (head and body, like a mechanic) plus a **use** in a story under a **name**
(`terminator.as("terminator-1")`). Several names may use one definition.

### 1.1 Head

```ts
// packages/contracts/src/core/overseer.ts
export interface OverseerHead<
	Id extends string, O extends TSchema, S, E extends EventSchemas, P extends PromptKeys, Out extends TSchema,
> {
	readonly id: Id;                         // namespaced for third parties: "acme/terminator"
	readonly summary: string;
	readonly options: O;                     // Typebox, every property with a description (conformance)
	readonly state: (setup: StateSetup<O>) => S;   // `() => undefined` for none; a state needs a snapshot slice
	readonly events: E;                      // what `settle` may emit; source = the definition id
	readonly prompts: P;                     // prompt id -> variables, files in the plugin's prompts/ folder
	readonly system: PlainPromptId<P>;       // the system prompt (no variables, so the cache prefix is fixed)
	readonly input: keyof P & string;        // the per-call prompt; must end with {{standingOrders}} (§4.2)
	readonly output: Out;                    // the answer; parsed with Typebox, never trusted
	/** The model-side tool the answer is given through (e.g. the judge's `verdict`); no world effect. */
	readonly answer: { readonly tool: string; readonly description: PlainPromptId<P> };
	/** `slot` names the model in swt.config (models per role); `fallback` the slot tried when it fails. */
	readonly model: { readonly slot: string; readonly fallback?: string };
	/**
	 * `long`: remembers across calls (its state, or a conversation the runtime keeps); one-off instructions
	 * arrive in its next call. `short`: called fresh, prompt built from the template and the inputs every
	 * time; instructions are standing orders with a lifetime (§4.2).
	 */
	readonly lifetime: "long" | "short";
	readonly triggers: readonly OverseerTrigger[];
	/** World tools its prompt expects; the loader refuses a story that does not grant them to the name. */
	readonly needs?: readonly string[];
	readonly limits?: OverseerLimits;
}

export type OverseerTrigger =
	/** After the mechanics' phases of that hook and the calls they staged. */
	| { readonly hook: "minuteStarted" | "between" | "runEnded"; readonly order?: number }
	/** In the `between` slot of minutes start, start + every, ... (virtual minutes). */
	| { readonly schedule: { readonly every: number; readonly start?: number }; readonly order?: number }
	/** An event of a mechanic (its `defineEvents`) or of the core; `self` is the overseer's story name. */
	| { readonly event: EventsDefinition | "core"; readonly type: string; when?(payload: unknown, self: string): boolean }
	/** A fact (`<mechanic>.<fact>`), checked in the `between` slot. */
	| { readonly fact: string; when(value: unknown): boolean; readonly order?: number }
	/** Asked by a tool's `consult` whose `role` is the overseer's story name (stage `consult`). */
	| { readonly consult: true };

export interface OverseerLimits {
	readonly maxCalls?: number;              // model calls per run
	readonly maxCostUsd?: number;            // per run; the story's run cap still applies on top
	readonly maxInterventions?: ToolLimit;   // successful world-tool calls, counted under key `overseer:<name>`
}
```

### 1.2 Body

```ts
export interface OverseerBody<H extends OverseerShape> {
	/** The calls one firing makes: zero (skip), one, or several (one per batch, one per resident). */
	calls(fired: Fired, ctx: OverseerContext<H>): readonly PromptVariables<H["inputVariables"]>[];
	/** After a parsed answer (or the fallback answer): emit declared events, update state. Synchronous. */
	settle?(output: Static<H["output"]>, call: { readonly index: number; readonly fired: Fired }, ctx: OverseerContext<H>): void;
	/** The fail-open answer when the model and the fallback model failed; `undefined`: do nothing. */
	fallback(fired: Fired, ctx: OverseerContext<H>): Static<H["output"]> | undefined;
	readonly snapshot?: SnapshotSlice;       // required when the state is not undefined (as for mechanics)
}

/** What fired: the trigger and its data (the event, the fact value, the consult question). */
export type Fired =
	| { readonly kind: "hook"; readonly hook: string; readonly minute: number }
	| { readonly kind: "schedule"; readonly minute: number }
	| { readonly kind: "event"; readonly event: EventEnvelope }
	| { readonly kind: "fact"; readonly value: unknown }
	| { readonly kind: "consult"; readonly question: unknown; readonly tool: string; readonly actor: Actor };

/** What an overseer's code sees: no host, no other state; the log filtered by audience (§4.1). */
export interface OverseerContext<H extends OverseerShape> {
	readonly self: string;                  // the story name, e.g. "terminator-2"
	readonly options: Static<H["options"]>;
	readonly state: H["state"];
	readonly minute: number;
	readonly residents: ResidentsView;
	readonly log: EventLogView;             // only events whose audience includes `self`
	facts(): Readonly<Record<string, unknown>>;
	decisions: DecisionsView;               // open decisions it may amend (§3)
	display(text: string): string;          // names for ids, as residents read them
	emit<K extends keyof H["events"] & string>(type: K, payload: Static<H["events"][K]>): void;
	prompt<K extends keyof H["prompts"] & string>(id: K, variables: PromptVariables<H["prompts"][K]>): string;
	rng(...labels: readonly RandomLabel[]): RandomSource;
}

export function defineOverseer<const H extends OverseerHead</* inferred */>>(
	head: H, build: (kit: OverseerKit<ShapeOf<H>>) => OverseerBody<ShapeOf<H>>,
): OverseerDefinition<H["id"], H["options"], H["events"]>;

// in a story
export interface OverseerDefinition<Id, O, E> {
	as<const N extends string>(name: N, options?: OptionsInput<O> & { readonly limits?: OverseerLimits }): OverseerUse<N, this>;
}
```

`defineOverseer` lives in `packages/kernel/src/host/define-overseer.ts` beside `defineMechanic`, with the same
typing tricks (`defineHead`, `ShapeOf`, one `@ts-expect-error` per misuse in a new
`test/host/overseer-types.check.ts`). A story's `limits` tighten the head's, never lift them.

### 1.3 How a call runs

1. A trigger fires. **Hook, schedule and fact** triggers run in the slot named, sorted by `order` (a shared
   table in `mechanics/shared/src/order.ts`, beside `HOOK_ORDER`), ties in the story's order of overseers.
   **Event** triggers queue the overseer; it runs right after the code or call that wrote the event (after the
   staged calls drain), before the next call or turn begins. **Consult** runs inside the consult stage, as today.
2. Over a limit (`maxCalls`, `maxCostUsd`)? The host writes `overseer_skipped { overseer, reason }` and goes on.
   `maxCalls` cuts a firing's calls exactly. A cost is known only when its answer is in, so once an overseer in the
   batch has `maxCostUsd`, the host runs that batch's calls one after the other and checks the cap before each call
   (built at step 18, F2 M1); the last call can still overshoot by its own cost.
3. `calls(fired, ctx)` gives the variables; the runtime fills `standingOrders` (§4.2) and writes
   `orders_applied` when it holds any.
4. The host writes `overseer_called { overseer, trigger, index }` and hands `{ definition, name, system, input,
   tools, answerSchema }` to the app's `OverseerRuntime`. Several calls of one firing, and several overseers
   fired by one event, start their model requests at once; their results are applied in the fixed order
   (the turn loop's block rule), so the log does not depend on model speed.
5. While the model works it may call its granted world tools: `host.call(actorOf(name), tool, params)`, a full
   pipeline run each. The gateway lets the running overseer's calls in (nested, like staged calls), nothing
   else runs meanwhile.
6. The answer is parsed against `output`. A missing model, an error or an answer off its schema: try
   `model.fallback`; then `body.fallback(fired)`. Never a refusal, never the end of the run (**fail open**, like
   the guard). Only a throwing body ends the run (`run_ended` reason `error`), as with mechanics.
7. The host writes `overseer_answered { overseer, ok, by: "model" | "fallback-model" | "fallback" | "none",
   output?, error?, costUsd }`, records the cost (referee), then runs `settle`. A consult trigger writes
   `role_asked`/`role_answered` instead of these two, exactly as today.

```ts
// packages/contracts/src/core/overseer.ts; implemented in packages/roles, scripted in packages/testkit
export interface OverseerRuntime {
	ask(call: OverseerCall): Promise<OverseerReply>;          // one model request incl. its tool loop
}
export type OverseerReply =
	| { readonly ok: true; readonly answer: unknown; readonly costUsd: number; readonly by: "model" | "fallback-model" }
	| { readonly ok: false; readonly error: string; readonly costUsd: number };
```

`HostOptions` gets `overseers?: OverseerRuntime`. Without one, every overseer answers through its body's
`fallback` (`by: "none"`), so tests and dry runs need no model.

### 1.4 Worked example: the judge

```ts
export const judge = defineOverseer(
	{
		id: "judge",
		summary: "Decides whether a resident's message denies receiving a DM (blame).",
		options: Type.Object({ temper: Type.Union([Type.Literal("fair"), Type.Literal("partial"), Type.Literal("capricious")], { default: "fair", description: "How it rules" }) }),
		state: () => undefined,
		events: {},
		prompts: { "judge/system": [], "judge/question": ["question", "standingOrders"], "judge/tools/verdict": [] },
		system: "judge/system",
		input: "judge/question",
		output: JudgeAnswer,                 // the very schema object the blame tool's consult declares
		answer: { tool: "verdict", description: "judge/tools/verdict" },
		model: { slot: "classifier" },       // as today: the story's classifier model, Haiku by default
		lifetime: "short",
		triggers: [{ consult: true }],
		limits: { maxCostUsd: 0.05 },
	},
	() => ({
		calls: (fired) => (fired.kind === "consult" ? [{ question: judgePrompt(fired.question) }] : []),
		fallback: () => undefined,           // the blame tool's execute gets { ok: false, reason: "failed" }
	}),
);
// story: overseers: [judge.as("judge", { temper: "partial" })]  -> receipts' consult { role: "judge" } finds it
```

### 1.5 The existing roles

| Role today (`packages/roles`) | As an overseer | Golden-relevant detail |
|---|---|---|
| **gamemaker** (`gamemaker.ts`, the CLI's `between`) | name `gamemaker`, `lifetime: "long"`, trigger `{ schedule: { every }, order: GM }` (the old `round % every` test; the builder pins `start` against the goldens), state = `GamemakerSnapshot` (tracks, notes, `recentFrom`) as its snapshot slice; world tools by `grants.gamemaker`, actor stays `gamemaker` | the runtime keeps writing the app events `gamemaker_turn`, `_text`, `_call`, `_result`, `_error` in today's order and text; `overseer_called/answered` are extra core events, dropped by the adapter |
| **classifier** (`interpreter.ts`, `classifier.ts`) | name `classifier`, `short`, trigger `{ hook: "between", order: CLASSIFIER }`; `calls` = one per batch of 60 statements; `settle` emits `interpretation`, `interpretation_round`, `interpretation_error` (declared by the definition; today they are app events) | the decider backend (one yes/no per label) is a second `OverseerRuntime` adapter for the same definition |
| **weaver** (`weaver.ts`) | name `weaver`, `short`, trigger `{ hook: "between", order: WEAVER }`; `calls` = one per touched resident (`FateTriggers`); state = caps and hard texts; `settle` emits `fate_shift`; the runner reads `fate_shift` to rebuild prompts, as today | order in the slot stays classifier, weaver, gamemaker |
| **judge** (`judge.ts`) | §1.4: trigger `{ consult: true }`; the consult stage is unchanged, it only finds an overseer instead of an app `RoleCaller` | `role_asked`/`role_answered` unchanged |
| **souffleur**, **guard** | stay where they are: the souffleur rewrites a resident's inputs inside the runner, the guard is the `GuardModel` of stage `guard`; neither acts in the world nor has triggers. Both reuse the roles package's shared model-call helper (prompt, Typebox parse, fallback), the `defineRole` core of monorepo §3e | none |

Names in the event `source`: an overseer's own events have the definition id as source (`classifier`), the
same flat line in the old shape. `LEGACY_EVENT_OWNERS` gets the new owners for `interpretation*` and
`fate_shift`; the old-log round trip keeps reading them as before (the owner only decides the envelope).

`HostOptions.between` stays until the CLI runs the overseers; it is deleted at the end of step 18 together with
the app `roles` map, and its tests move to `test/host/overseers.test.ts`.

## 2. Open grant names

Today `GrantRole = "resident" | "gamemaker" | "script"` (`core/values.ts`), and `access.roleOf`, the catalog,
the referee and `host.ts` loop over `GRANT_ROLES`. It becomes the set of names a story declares.

```ts
// core/values.ts
export const BUILT_IN_NAMES = ["resident", "gamemaker", "script", "human"] as const;
export type BuiltInName = (typeof BUILT_IN_NAMES)[number];
/** A name a story grants tools to: a built-in or the story name of an overseer. */
export type GrantName<N extends string = never> = BuiltInName | N;
export type OverseerActor = `overseer:${string}`;
export type Actor = ResidentActor | OverseerActor | "gamemaker" | "script" | "human" | "host";

// core/story.ts
export type Grants<T extends string, N extends string = never> = Partial<Readonly<Record<GrantName<N>, readonly T[]>>>;
export type ToolPolicies<T extends string, N extends string = never> = Partial<Readonly<Record<GrantName<N>, Partial<Readonly<Record<T, ToolPolicy>>>>>>;
export interface CoreStory<Ms extends readonly MechanicUse[] = readonly MechanicUse[], Os extends readonly OverseerUse[] = readonly []> {
	// ...as today, plus:
	readonly overseers?: Os;
	readonly grants: Grants<ToolOf<Ms> | CoreTool, NameOf<Os>>;
	readonly tools?: ToolPolicies<ToolOf<Ms> | CoreTool, NameOf<Os>>;
	readonly decisions?: DecisionPolicies<NameOf<Os>>;   // §3
	readonly audiences?: Readonly<Record<string, readonly string[]>>;   // §4.1
	readonly human?: HumanPolicy;                        // §5
}
```

- **Actors.** `resident:A03`, `gamemaker`, `script` and `host` stay exactly as they are; `human` is new; an
  overseer named `terminator-1` acts as `overseer:terminator-1`. A story may name an overseer `gamemaker`: it
  then acts as `gamemaker` (built-in names act under their bare name). `roleOf(actor)` returns the grant name.
  `EventEnvelopeSchema.actor` widens to the new union (old files still parse).
- **`grants: "auto"`** derives the lists from the tools' `suggest` (default role sets) with `grantTweaks` per name: `docs/design/grants-auto.md`.
- **`gamemaker` stays built in**, so every story and test that grants it without an overseer (the app drives
  it) loads unchanged; `--no-gamemaker` drops the overseer, not the grant.
- **`serves`** takes grant names. Because a mechanic cannot know a story's names, an entry also matches the
  **definition id** of the calling overseer (`serves: ["acme/terminator"]` serves `terminator-1..3`). Two
  variants overlap when their entries can match one caller; the loader refuses that as today.
- **`tools` policies** are keyed by grant name; a `guard` policy only under `resident` (as today).
  `maxInterventions` adds a limit with key `overseer:<name>` over every tool granted to the name.
- **Byte identity.** The host registers policies and limits for the built-ins first, in the old order
  (`resident`, `gamemaker`, `script`), then `human`, then declared names in story order, so the referee's
  counters and their snapshot keys (`<limit key>|<actor>`) are unchanged for today's stories.

**Load-time errors** (all in `loader.ts`, each with a test in `test/host/names.test.ts`):

| Error | Example |
|---|---|
| an overseer name is a built-in other than `gamemaker`, is `host`, or does not match `^[a-z][a-z0-9-]*$` | `as("script")`, `as("Terminator 1")` |
| two overseers share a name | two `as("judge")` |
| `grants`, `tools` or `decisions` name a name that is neither built in nor declared | `grants: { terminater: [...] }` |
| an overseer's `needs` are not all granted to its name | terminator without `rollDice` |
| `amendDecision` granted to `resident` | residents never hold a decision |
| an overseer's event clashes with a core, mechanic or other overseer event; two definitions with one id | `dice_rolled` twice |
| a consult role is served by both an overseer and an app `RoleCaller` | judge twice |
| a consult overseer whose `output` is another schema object than the tool's `answer` | judge with its own schema |
| an `input` prompt that does not end with `{{standingOrders}}` | §4.2 |

## 3. The decision gate

### 3.1 API

```ts
// core/mechanic.ts, the head
readonly decisions?: D;                      // kind -> proposal schema, e.g. { verdict: Type.Object({...}) }
// the body
readonly commits?: { readonly [K in keyof D]?: (proposal: Static<D[K]>, settled: Settlement, ctx: MechanicContext<M>) => void };

// core/context.ts, MechanicContext (and ToolContext)
decide<K extends keyof M["decisions"] & string>(
	kind: K,
	proposal: Static<M["decisions"][K]>,
	options: { readonly window: number; readonly schema?: TSchema },
	commit: keyof M["commits"] & string,     // a name, not a closure: an open decision survives a snapshot
): DecisionOutcome;
readonly decisions: DecisionsView;           // also on FactView: facts and limits may see what is pending

export type DecisionOutcome = { readonly committed: true } | { readonly open: number };   // number = the decision id
export interface Settlement { readonly decision?: number; readonly changed: boolean; readonly by?: string; readonly reason?: string }
export interface DecisionsView { pending(kind?: string): readonly OpenDecision[] }
export interface OpenDecision { readonly id: number; readonly kind: string; readonly owner: string; readonly proposal: unknown; readonly deadline: number; readonly holders: readonly string[] }
```

The full kind is `<mechanic>.<kind>` (`tribunal.verdict`). `schema` narrows the head's schema for this one
decision ("only these accused, at most N"); Typebox schemas are plain JSON, so it is stored as it is.

### 3.2 Rules

1. **Holders.** The names granted the core tool `amendDecision` hold every kind, unless
   `story.decisions["tribunal.verdict"] = { holders: [...] , window?: number }` narrows them (a holder there must
   be granted `amendDecision`). A holder counts only when the host can reach it: an overseer that is loaded, the
   `gamemaker` when the app drives one, `human` when a control channel is attached (§5).
2. **Nobody holds the right, or `window` is 0:** `commit` runs at once, inside `decide`, in the caller's frame.
   No event, no job. This is what every story without holders does, so the goldens stay byte-equal.
3. **Otherwise** the host writes `decision_proposed { decision, kind, owner, proposal, schema?, deadline,
   holders }` (the id is this event's `seq`), keeps the decision open and schedules a core job at
   `deadline = minute + window`. Event triggers on `decision_proposed` wake short holders; long holders (the
   gamemaker) find it in `ctx.decisions` on their next call; the human sees it in the TUI.
4. **`amendDecision({ decision, proposal, reason })`** is a core tool (owner `core`, prompts in
   `library/prompts/core/`), so it runs through the whole pipeline and every mechanic's `lock` handler sees it.
   Its `rule` refuses `DECISION_CLOSED` (not open), `DECISION_NOT_HELD` (the caller is no holder),
   `DECISION_HUMAN` (the human amended already; only the human may change it again) and `PROPOSAL_INVALID`
   (the proposal fails the head's or the decision's schema; detail: the first Typebox error). Its `execute`
   stores the amendment and answers with the proposal now standing. A holder may amend more than once.
5. **Priority of the human.** The proposal that commits is the human's last amendment if there is one, else the
   last amendment of any other holder, else the original.
   This holds at the deadline. A decision still open when the run ends (its deadline lies after the last
   minute, or the run stopped early) settles at `runEnded` with its **original** proposal, the amendments listed
   (step 18 decision O2-3). An amendment of a decision whose deadline lies after the run's last minute is kept,
   but its reply says that it cannot stand (`core/replies/decision-outlasts-run`; built at step 18, F2 m5).
6. **Deadline.** At the start of minute `deadline`, before the mechanics' due jobs, open decisions settle in the
   order they were opened: the host writes `decision_settled { decision, kind, changed, by?, reason?, proposal,
   amendments: [{ by, seq }] }` and runs `commit(proposal, settlement)` caused by it. `commit` runs against the
   world as it is then, so it re-checks what may have changed (a resident struck by the seal meanwhile).
7. **Snapshot and resume.** `HostSnapshotSchema` gets an optional `decisions` array (`id, kind, owner, commit,
   proposal, schema?, opened, deadline, holders, amendments`), written only when one is open, so today's
   snapshots stay byte-equal and old files parse. The deadline is an ordinary job in `jobs`. A resumed run
   settles the same decision at the same minute with the same proposal.
8. **Limits.** Overseer cost and the number of amendments are referee limits (`OverseerLimits`, tool limits
   on `amendDecision` per name).

### 3.3 The change to tribunal `closeSession`

`closeSession` (`mechanics/tribunal/src/court.ts`) keeps everything up to the ranking and asks for a decision
instead of exiling; the rest moves unchanged into the commit. New option `decisionWindow` (integer minutes,
default 0 = never open a window, so every story of today commits at once even with holders). Head: `decisions: { verdict: Verdict }` with
`Verdict = Type.Object({ tribunal: Type.Integer(), exiled: Type.Array(Type.String()) })`.

```ts
function closeSession(ctx: TribunalCtx, session: Session, minute: number): void {
	// unchanged: session.closed, lastResult, gone, non-voters (penalty + notice), votesFor, standing, order, ranked, count
	const exiled = ranked.slice(0, count);
	const schema = Type.Object({
		tribunal: Type.Literal(session.tribunal),
		exiled: Type.Array(Type.Union(standing.map((agent) => Type.Literal(agent))), { maxItems: count, uniqueItems: true }),
	});
	ctx.decide("verdict", { tribunal: session.tribunal, exiled: [...exiled] }, { window: ctx.options.decisionWindow, schema }, "verdict");
}

/** commits.verdict: the old tail of closeSession, with the proposal that stood at the deadline. */
export function commitVerdict(proposal: Static<typeof Verdict>, _settled: Settlement, ctx: TribunalCtx): void {
	const session = ctx.state.sessions.find((entry) => entry.tribunal === proposal.tribunal);
	if (session === undefined) throw new Error(`tribunal: no session ${String(proposal.tribunal)}`);
	const minute = ctx.minute;
	const gone = exiledList(ctx);
	// recompute nonVoters, votesFor, standing, ranked (for `counts`) exactly as above
	const exiled = proposal.exiled.filter((agent) => !gone.includes(agent)).slice(0, Math.max(0, missing(ctx)));
	// then, unchanged: until, price, countsText, post "result", emit tribunal_result { counts, exiled, nonVoters },
	// toGate per exiled, settleDraft
}
```

Plus one line in `busy`: `|| ctx.decisions.pending("tribunal.verdict").length > 0`, so `pace` plans nothing
and `end` does not fire while a verdict is open. On the immediate path `commit` runs synchronously in the same
minute and frame, so every event, text and `causedBy` is what the old code wrote; the tribunal differential
tests and the legacy L7 resumes must pass untouched, and that is the proof. No slice change: the pending
verdict is the host's.

### 3.4 Worked example: the contest

Story "Don't touch": the tribunal proposes its verdict, three terminators roll dice, the winner may change it.
(The `contest` plugin itself is built after step 18; step 18 proves the gate with a scripted copy in
`test/host/proof/contest.ts`.)

```ts
const ContestEvents = defineEvents("acme/contest", {
	dice_rolled: Type.Object({ decision: Type.Integer(), player: Type.String(), round: Type.Integer(), value: Type.Integer() }),
	contest_won: Type.Object({ decision: Type.Integer(), winner: Type.String() }),
});

export const contest = defineMechanic(
	{
		id: "acme/contest", summary: "A dice contest for the right to amend a decision.",
		options: Type.Object({
			kind: Type.String({ description: "The decision kind it opens on, e.g. tribunal.verdict" }),
			dice: Type.Integer({ default: 6, description: "Sides of the die" }),
			players: Type.Array(Type.String(), { description: "Grant names that play" }),
		}),
		state: () => ({ open: undefined as Round | undefined }),   // { decision, round, rolls: Record<string, number>, winner? }
		events: ContestEvents.events,
	},
	(kit) => ({
		tools: [kit.tool({
			name: "rollDice", description: "contest/tools/rollDice", parameters: Type.Object({}),
			execute: (_params, ctx) => {
				const round = ctx.state.open;
				const player = grantNameOf(ctx.actor);
				if (round === undefined || round.winner !== undefined) return refuse("NO_CONTEST");
				if (round.rolls[player] !== undefined) return refuse("ALREADY_ROLLED");
				const value = ctx.rng("contest", round.decision, player, round.round).int(1, ctx.options.dice);
				round.rolls[player] = value;
				ctx.emit("dice_rolled", { decision: round.decision, player, round: round.round, value });
				if (Object.keys(round.rolls).length === ctx.options.players.length) settleRound(ctx, round);  // tie: the tied reroll by ctx.rng, round + 1
				return { ok: true, reply: ctx.prompt("contest/rolled", { value }) };
			},
		})],
		listeners: [
			kit.core("decision_proposed", (p, ctx) => { if (p.kind === ctx.options.kind) ctx.state.open = { decision: p.decision, round: 1, rolls: {} }; }),
			kit.core("decision_settled", (p, ctx) => { if (p.decision === ctx.state.open?.decision) ctx.state.open = undefined; }),
		],
		pipeline: {
			// Only the winner may amend; the human is left through (the story's choice, see Q4).
			lock: (call, ctx) => {
				if (call.tool !== "amendDecision" || call.actor === "human" || ctx.state.open === undefined) return undefined;
				return ctx.state.open.winner === grantNameOf(call.actor) ? undefined : refuse("NOT_THE_WINNER", ctx.prompt("contest/not-winner", {}));
			},
		},
		snapshot: kit.snapshot({ version: 1, schema: ContestSlice, save: (s) => s, load: (d) => d }),
	}),
);

export const terminator = defineOverseer(
	{
		id: "acme/terminator", summary: "Plays the contest; as winner it may change the verdict.",
		options: Type.Object({}), state: () => undefined, events: {},
		prompts: { "terminator/system": [], "terminator/window": ["decision", "proposal", "deadline", "won", "standingOrders"], "terminator/tools/decide": [] },
		system: "terminator/system", input: "terminator/window",
		output: Type.Object({ reason: Type.String({ maxLength: 300 }) }),
		answer: { tool: "decide", description: "terminator/tools/decide" },
		model: { slot: "terminator", fallback: "default" },
		lifetime: "short",
		needs: ["rollDice", "amendDecision"],
		limits: { maxCalls: 20, maxCostUsd: 0.1, maxInterventions: { max: 3, per: "run" } },
		triggers: [
			{ event: "core", type: "decision_proposed", when: (p) => isKind(p, "tribunal.verdict") },   // call 1: roll
			{ event: ContestEvents, type: "contest_won", when: (p, self) => isWinner(p, self) },        // call 2: amend or not
		],
	},
	() => ({
		calls: (fired, ctx) => [windowVariables(fired, ctx)],   // decision, proposal (names), deadline, won
		fallback: () => ({ reason: "no model" }),                 // fail open: it rolls nothing, the verdict stands
	}),
);

// the story
mechanics: [/* ... */ tribunal.with({ decisionWindow: 1 }), contest.with({ kind: "tribunal.verdict", players: ["terminator-1", "terminator-2", "terminator-3"] })],
overseers: [terminator.as("terminator-1"), terminator.as("terminator-2"), terminator.as("terminator-3")],
grants: { /* resident: [...] */ "terminator-1": ["rollDice", "amendDecision"], "terminator-2": ["rollDice", "amendDecision"], "terminator-3": ["rollDice", "amendDecision"] },
```

Run: minute 9 opens with the tribunal's tick, `closeSession` calls `decide` → `decision_proposed` (#812). The
three terminators fire together; each calls `rollDice` (the contest's `dice_rolled` #815, #818, #821), the third
roll settles the round and writes `contest_won` (#822). The winner fires again and calls `amendDecision`; the
two others would get `NOT_THE_WINNER` at stage `lock`. Minute 10 opens with the deadline job:
`decision_settled { changed: true, by: "terminator-2" }`, then `commitVerdict` posts the result and sends the
amended exiles to the gate. Without the three overseers in the story the same tribunal commits at once.

## 4. Audiences and standing orders

### 4.1 Event audiences

```ts
// core/events.ts, the envelope
readonly audience?: readonly string[];       // grant names; absent: everyone (as today)
// a mechanic or overseer head, per event type (default)
readonly audiences?: Partial<Readonly<Record<keyof E & string, readonly string[]>>>;
// the story overrides by "<source>.<type>"
audiences: { "confessor.label": ["gamemaker"] }
```

- Mechanics see every event (they are the rules). Residents never read the log; what a turn shows is a
  mechanic's choice, as today.
- An overseer's `ctx.log` (and the facts and inputs the runtime builds for it) hold only the events whose
  audience is absent or names it. `human`, the reporter, the digest and `watch` (the operator) see everything.
- The audience is an envelope field: the legacy shape never writes it, and old envelopes without it parse.

### 4.2 Standing orders

An instruction (§5) to an overseer is stored as a **standing order**:

```ts
export interface StandingOrder {
	readonly id: number;                       // the seq of its `human_note`
	readonly target: string;                   // an overseer's grant name
	readonly text: string;
	readonly mode: "advice" | "order";
	readonly lifetime: { readonly untilMinute: number } | { readonly calls: number } | "untilRevoked";
	readonly issued: number;                   // minute
	readonly used: number;                     // calls that carried it
}
```

- **Rendering.** Every overseer input prompt ends with `{{standingOrders}}`. The runtime renders the active
  orders of the target with `library/prompts/core/standing-orders.md` (leading blank line included), or the
  empty string when there are none, so the prompt and its cache prefix are unchanged without orders.
- **From the next call on.** A running call is never interrupted. Before each call that carries orders the host
  writes `orders_applied { overseer, orders: [ids] }` and counts `used`.
- **Long vs short.** A long overseer's default lifetime is `{ calls: 1 }` (the instruction arrives once, in its
  next call); a short one's is what the instruction says (the TUI asks; default `untilRevoked`).
- **Orders oblige a justification.** While an order of mode `order` is active, the answer tool gets the extra
  field `orders: Array<{ order, followed, reason }>`; a deviation is legal, but stays in `overseer_answered`
  for the report. Advice needs no answer.
- **Snapshot.** Optional `orders` array in `HostSnapshotSchema`, written only when one is active.

## 5. The human hand

The human is an overseer without a model: actor `human`, grant key `grants.human`.

```ts
grants: { human: ["instruct", "amendDecision", "pause", "resume", "step"] },
human: {
	residents?: boolean;                        // instructions to residents; off by default (explicit switch)
	copyTo?: "never" | "gamemaker" | "choose";  // who also hears an instruction; "choose" = per call `copy`
	gamemakerKnows?: boolean;                   // whether the gamemaker may know a human is above it
},
```

| Core tool (actor `human`) | Parameters | Effect and events |
|---|---|---|
| `instruct` | `{ target, text, mode: "advice" \| "order", lifetime?, copy?: string[], revoke?: number }` | `human_note { order, target, text, mode, lifetime, copy }` with audience `[target, ...copy, "human"]`; a standing order (§4.2); to a resident only with `human.residents`, then a turn input of kind `human` in its next turn |
| `amendDecision` | as §3, with priority | also writes `human_amend { decision, proposal, reason }` |
| `pause` / `resume` / `step` | `{}` | the host halts at the next safe point; `step` plays one block and halts again; only `tool_called` is logged |

- **Safe points.** Human calls enter an inbox and run only at fixed points: before and after each block, in the
  `between` slot, and while paused; never inside a turn or an overseer call. The log therefore records exactly
  where they landed, and a replay feeds them back there (`scriptedHuman(events)` in the testkit).
- **Human-influenced.** The reporter marks a run "human-influenced" in the header when the log holds a
  `human_note` or `human_amend` (pause, resume and step do not count). Computed in code from the log, so a
  resumed run inherits it.
- **The control channel boundary.** The host stays in-process and opens no socket: `host.hand(): HumanHand |
  undefined` returns `{ instruct, amendDecision, pause, resume, step }` (each a `Promise<ToolOutcome>`), present
  when `HostOptions.human` is set. The CLI owns the transport (local event stream and control channel, the TUI,
  the assistant that turns wishes into `instruct` calls, `@gamemaker ...`). Keys, prompts and the TUI never
  pass through the host.
- **Who sees it.** By default only the target (audience). The gamemaker sees consequences in the public game,
  and an instruction only when `copyTo` or `copy` says so.

## 6. Migration inside step 18

Order of work; each step ends with `pnpm check` green. The golden runs, the 12 run logs, the legacy snapshots
and the tribunal differential tests are the gate after every step.

| # | Work | Where | Proof | Team |
|---|---|---|---|---|
| 1 | Types: names and actors, `Grants<T, N>`, `OverseerHead/Body/Use`, decisions, audiences, orders, snapshot fields, new core events | `contracts/src/core/{values,story,events,host,context,mechanic}.ts`, new `overseer.ts`, `decision.ts` | `overseer-types.check.ts`, `mechanic-types.check.ts` | Opus |
| 2 | Open names in the kernel: `roleOf`, `granted`, catalog `serves`, referee registration order, gateway `#lock`/`#policy`, loader errors | `kernel/src/host/{access,catalog,referee,gateway,loader,host}.ts` | `test/host/names.test.ts`; all existing host tests unchanged | Sonnet |
| 3 | Decision gate: `ctx.decide`, `amendDecision`, deadline job, priority, snapshot, resume | new `kernel/src/host/decisions.ts`, `snapshots.ts` | `test/host/decisions.test.ts`: no event when nobody holds; window path; every refusal code; human priority; a `lock` handler; snapshot cut with an open decision equals the uninterrupted run | Opus |
| 4 | Tribunal `closeSession` → `decide` + `commitVerdict`, `busy`, option `decisionWindow` | `mechanics/tribunal/src/{court,head,index}.ts` | tribunal differential and resume tests untouched; one new test with a scripted holder | Sonnet, Opus review |
| 5 | Overseer scheduling: triggers, slots, nested calls, parallel requests with ordered results, fail open, limits, events | new `kernel/src/host/{define-overseer,overseers}.ts` | `test/host/overseers.test.ts` with the testkit's `scriptedOverseer` | Opus |
| 6 | Audiences (filtered `ctx.log`), orders and `{{standingOrders}}`, human hand (inbox, safe points, tools) | new `kernel/src/host/{orders,human}.ts` | `test/host/human.test.ts`; replay of a log with human calls gives the same log | Opus design, Sonnet tools and tests |
| 7 | Roles as overseers: shared model-call helper; judge, classifier, weaver; then the gamemaker | new `roles/src/overseer/*`; old files shrink to prompt builders | differential tests per role (scripted model answers, same events as the old role); the goldens f4g4, f10g10, whispers for the gamemaker | Sonnet (judge, classifier, weaver), Opus (gamemaker) |
| 8 | Testkit: `scriptedOverseer`, `scriptedHuman`, conformance for overseers (same seed same events, snapshot round trip, options documented, no `ctx.random()` in golden mechanics) | `packages/testkit` | `test/host/conformance.test.ts` | Sonnet |
| 9 | CLI wiring: overseers instead of `between` and `roles`; delete both options | `apps/cli` | goldens; `swt validate` | Sonnet, Opus challenger |

A challenger (Opus) reviews steps 1, 3, 5 and 7 before the next one starts (CLAUDE.md: builder writes,
challenger reviews).

**Risks for the golden logs**

1. **Log position.** New core events (`overseer_called/answered`) move `bus.lastSeq`; `ctx.random()` would draw
   differently. No carved mechanic uses it (checked); the conformance check of step 8 keeps it so.
2. **Slot order.** Classifier, weaver, gamemaker must run in this order in `between`, each followed by the
   drain of staged calls, exactly as the old observers did.
3. **Gamemaker prompt bytes.** `gamemaker_turn.input` is pinned in the goldens, and `prompts.json` pins the
   prompts. `{{standingOrders}}` must render to the empty string with no extra newline; step 7 checks it first.
4. **Snapshot bytes.** `decisions` and `orders` are omitted when empty; `HostSnapshotSchema.version` stays 1.
5. **Referee keys.** Built-in names are registered first in the old order (§2).
6. **Immediate commit.** It must run inside `decide`, in the caller's bus frame, or `causedBy` and the order of
   `tribunal_result` against the penalty events change in the envelope tests.

## 7. What is not in step 18

The `contest` plugin and the terminator story (after step 18, idea paper Q1), the `advise` mechanic, the
optional `phase` fact, YAML stories, plugin discovery and manifests, the sandbox, the TUI and the MCP server
(wave 4). The API above leaves room for them and needs no change for any.

## 8. Open questions for Flo

1. **Scope of step 18.** Proposal: the gate, the tribunal change and a scripted contest proof in step 18; the
   real `contest` plugin and the terminator story right after. *Recommendation: yes.*
2. **Gamemaker: long or short?** Today it is called fresh per look and carries its notes in its state; the idea
   paper calls it long-lived. *Recommendation: `long` (an instruction reaches its next look once), prompts
   unchanged.*
3. **What a grant of `amendDecision` holds.** Every decision kind by default, narrowed by `story.decisions`, or
   nothing until the story lists kinds? *Recommendation: every kind by default; a mechanic opens a window only
   when its option asks for one (`decisionWindow`), so a grant to the human alone does not slow a run that
   does not want it.*
4. **Human above the rules.** May the human change other holders' decisions (priority), and do `lock` handlers
   bind the human? *Recommendation: priority yes; lock handlers bind everyone, and a mechanic like `contest`
   lets `human` through explicitly.*
5. **Default mode of `instruct`.** *Recommendation: advice; an order must be chosen.*
6. **How overseers appear as actors.** `overseer:terminator-1` (proposed, like `resident:A03`) or the bare name?
   *Recommendation: `overseer:<name>`; `gamemaker` stays bare for byte identity.*
