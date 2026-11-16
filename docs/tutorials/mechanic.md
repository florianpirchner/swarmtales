# Write a mechanic

A **mechanic** is one rule of a game, shipped as code: its state, its tools, its events, and the services it offers
to other mechanics. A game lists the mechanics it uses. This tutorial builds two: **`marks`**, in which every
resident marks a suspect, and **`tribunal`**, which listens to the marks and puts a sentence before the holders of
a decision. A game loads both and plays them offline.

Everything below is sample 5, [`samples/own-mechanic/`](../../samples/own-mechanic/README.md). Every code block is
an include of a file of the sample, and the sample's tests play it, so what you read here runs. Read the
[glossary](../GLOSSARY.md) for the words.

## 1. Head and body

A mechanic has two parts. The **head** is data: the id, the options, the state, the events, the services and the
tools, each with a Typebox schema. It can be read without running anything, so the README generator, the game
schema and the conformance checks read it. The **body** holds the handlers, keyed by the names the head declares.
`defineHead(head)` keeps the types of what it is given; `defineMechanic(head, body)` joins the two and gives the
function a game calls with the options (`marks({ immune: [...] })`).

## 2. The contract: an event and a service

What another mechanic may know of `marks` goes into a file of its own: the event `marked` and the service `marks`
with one query ([`src/contract.ts`](../../samples/own-mechanic/src/contract.ts)):

```ts
export const MarksEvents = defineEvents("marks", {
	marked: Type.Object(
		{ by: Type.String({ description: "The resident that marked." }), name: Type.String({ description: "The resident that was marked." }) },
		{ additionalProperties: false, description: "A resident marked another one as a suspect." },
	),
});

/**
 * The service of `marks`: how many marks stand against a resident.
 *
 * @public
 */
export const MarksService = defineService({
	name: "marks",
	summary: "Says how many marks stand against a resident.",
	methods: {
		against: {
			kind: "query",
			summary: "The number of marks against the resident.",
			input: Type.Object({ resident: Type.String({ description: "A resident id." }) }, { additionalProperties: false, description: "The resident that is asked about." }),
			output: Type.Integer({ minimum: 0, description: "The marks against it; 0 for an id that is no resident." }),
		},
	},
});
```

A listener names the event through `MarksEvents`, a caller names the service through `MarksService`; neither
imports the mechanic. In a package of `mechanics/`, this file is the `/contract` entry, and a mechanic imports
another one only through it.

## 3. The head of `marks`

One tool, one event, one option, one service ([`src/marks.ts`](../../samples/own-mechanic/src/marks.ts)):

```ts
export const marksHead = defineHead({
	id: "marks",
	package: "@swarmtales/sample-own-mechanic",
	summary: "Every resident marks one other resident as a suspect.",
	options: Type.Object(
		{ immune: Type.Array(Type.String(), { default: [], description: "The actor ids nobody may mark (`resident:A01`). An id that is no actor of the run is refused when the run is created." }) },
		{ description: "The options of marks." },
	),
	state: Type.Object({ marks: Type.Array(Mark, { description: "The marks, in the order they were made." }) }, { additionalProperties: false, description: "The state of marks." }),
	// Runs while the kernel is created, for a fresh run and a resumed one: an immune id that is no actor is SWT-G020.
	start: ({ options, actors }) => {
		const unknown = options.immune.find((id) => !actors.some((actor) => actor === id));
		if (unknown !== undefined) throw new SwtError(optionMismatch({ owner: "marks", package: "@swarmtales/sample-own-mechanic", path: "options.immune", message: `names "${unknown}", which is no actor of the run` }));
		return { marks: [] };
	},
	events: MarksEvents.events,
	provides: [MarksService],
	tools: {
		mark: {
			description: "Mark the resident you suspect. You mark once.",
			params: Type.Object({ name: Type.String({ description: "A resident id." }) }, { additionalProperties: false, description: "The arguments of mark." }),
			for: ["resident"],
		},
	},
});
```

- `options` is the schema of what a game passes; every property carries a `description`, and a default fills what
  the game leaves out.
- `state` is the schema of the state and of its snapshot slice. `start` builds the state of a fresh run. It gets
  the `Setup`: the options, the residents, and every **actor** of the run under its actor id (`resident:A01`,
  `director:steward`, `human`). `marks` checks its option against `Setup.actors` there: an immune id that is no
  actor stops the run before `run_started`, with `SWT-G020` and the path of the option.
- `tools` declares the tool `mark` with its parameters; `for: ["resident"]` puts it in the grant of every resident
  when a game lists no grants.

## 4. The body of `marks`

```ts
export const marks = defineMechanic(marksHead, {
	tools: {
		mark: {
			check: ({ name }, ctx) => {
				if (ctx.state.marks.some((one) => one.by === ctx.resident)) return refuse("ALREADY_MARKED", "You marked a resident already.");
				if (!ctx.residents.has(name) || name === ctx.resident) return refuse("NO_SUSPECT", `${name} is no other resident.`);
				return ctx.options.immune.includes(`resident:${name}`) ? refuse("IMMUNE", `${name} cannot be marked.`) : undefined;
			},
			// What the fake driver calls: one mark per resident, on another resident that is not immune.
			sample: (ctx, random) => {
				const others = ctx.residents.ids.filter((id) => id !== ctx.resident && !ctx.options.immune.includes(`resident:${id}`));
				return ctx.state.marks.some((one) => one.by === ctx.resident) || others.length === 0 ? undefined : { name: random.pick(others) };
			},
			run: ({ name }, ctx) => {
				const by = ctx.resident ?? ctx.actor;
				ctx.state.marks.push({ by, name });
				ctx.emit("marked", { by, name });
				return reply(`You marked ${name}.`, { endsTurn: true });
			},
		},
	},
	services: {
		marks: { against: ({ resident }, ctx) => ctx.state.marks.filter((one) => one.name === resident).length },
	},
});
```

- `check` is the rule. It answers a refusal (`refuse(code, detail)`) or nothing; a refused call writes
  `tool_refused` and changes nothing.
- `sample` is what the fake driver calls: `--fake` asks every open tool for legal params, from the seeded random
  stream it is given, and plays them. Answer `undefined` when the caller has nothing to do.
- `run` changes the state and writes the event; `emit` checks the payload against the head's schema. Its reply is
  what the caller reads, and `endsTurn` ends the caller's activation.
- `services` implements the service of the head. A query must not change the state.

## 5. A second mechanic that listens

`tribunal` has no tool. Its head says what it needs ([`src/tribunal.ts`](../../samples/own-mechanic/src/tribunal.ts)):

```ts
const tribunalHead = defineHead({
	id: "tribunal",
	package: "@swarmtales/sample-own-mechanic",
	summary: "Sentences a resident whose marks reach a threshold; the sentence is a decision with a window.",
	requires: [MarksService, DecisionsService],
	uses: [ExileService],
	options: Type.Object(
		{
			threshold: Type.Integer({ minimum: 1, default: 2, description: "The marks against a resident that bring it before the tribunal." }),
			window: Type.Integer({ minimum: 0, default: 1, description: "The ticks the holders have to amend a sentence." }),
		},
		{ description: "The options of tribunal." },
	),
	state: Type.Object({ sentenced: Type.Array(Type.String(), { description: "The sentenced residents, in order." }) }, { additionalProperties: false, description: "The state of tribunal." }),
	start: () => ({ sentenced: [] }),
	events: {
		sentenced: Type.Object(
			{
				resident: Type.String({ description: "The sentenced resident." }),
				changed: Type.Boolean({ description: "True when a holder put another resident in the place of the tribunal's choice." }),
				exiled: Type.Boolean({ description: "True when the service `exile` banished the resident." }),
			},
			{ additionalProperties: false, description: "A sentence stands and is carried out." },
		),
	},
});
```

- `requires` names the services it cannot run without: a game without `marks` or `decisions` does not load, and the
  tribunal loads after their providers. It reaches them with `ctx.call`.
- `uses` names the services it calls only when a loaded mechanic provides them. It reaches them with `ctx.tryCall`,
  which answers `undefined` when none does; `ctx.has(service)` asks first.

The body is two listeners:

```ts
export const tribunal = defineMechanic(tribunalHead, {
	listeners: (kit) => [
		kit.listen(
			MarksEvents,
			"marked",
			({ name }, ctx) => {
				if (ctx.call(MarksService, "against", { resident: name }) !== ctx.options.threshold) return;
				const answer = ctx.call(DecisionsService, "propose", { kind: SENTENCE, proposal: { resident: name }, window: ctx.options.window, schema: Sentence });
				if (answer.committed) sentence(ctx, name, false);
			},
			{ after: ["marks"] },
		),
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.kind !== SENTENCE || settled.owner !== ctx.mechanic || !Check(Sentence, settled.proposal)) return;
			sentence(ctx, settled.proposal.resident, settled.changed);
		}),
	],
});
```

The first listens to `marks.marked`. When the marks against the resident reach the threshold, the tribunal does not
sentence at once: it proposes the sentence through the service of [decisions](../../mechanics/decisions/README.md),
and so it is the **owner** of the decision `tribunal.sentence`. With a window of 0, or with no holder that can act,
the answer is `committed: true` and the tribunal commits in the same call. Otherwise its holders may amend the
proposal until the deadline, and the second listener commits the proposal that stands when `decision_settled`
comes. It checks `kind`, `owner` and the shape of the proposal first: a payload is checked, not trusted.

`after: ["marks"]` places the listener after every listener of `marks` to the same event, whatever the game's order
of mechanics; an id that is not loaded is ignored. Listeners of one event run in load order, and here the
`requires` edge already loads `marks` first, so `after` states that order where the listener reads the count. It
decides where no service edge does: in the City slice the `ledger` and the `puzzles` both listen to
`exile.exiled`, and `puzzles` declares `after: ["ledger"]`, so the points burn before the pieces. The same pattern
is in the README of [exile](../../mechanics/exile/README.md).

The commit calls `exile` with `tryCall`. In a game without `exile` the sentence still stands, and `exiled` in the
event is false:

```ts
// Carries a sentence out: once per resident, the banishing when `exile` is loaded, then the event.
function sentence(ctx: CtxOf<typeof tribunalHead>, resident: string, changed: boolean): void {
	if (ctx.state.sentenced.includes(resident)) return;
	ctx.state.sentenced.push(resident);
	const banished = ctx.tryCall(ExileService, "banish", { resident });
	ctx.emit("sentenced", { resident, changed, exiled: banished?.ok === true });
}
```

## 6. The game

[`game.ts`](../../samples/own-mechanic/game.ts) loads both, with `decisions` and `exile`:

```ts
export default defineGame({
	id: "own-mechanic",
	seed: 3,
	residents: 4,
	mechanics: [tribunal({ threshold: 2, window: 1 }), marks({ immune: ["resident:A01"] }), decisions({ holders: ["human"] }), exile()],
	grants: { resident: ["mark"], human: ["amendDecision"] },
	end: { ticks: 4 },
	model: "anthropic/haiku",
});
```

The game lists the tribunal first; the load order puts `marks` and `decisions` before it, because it requires
them. The grant `human` makes the person at the run an actor and a holder of the decision. A01 is immune, so nobody
can mark it.

## 7. Run it

From the root of the repository ([`commands.sh`](../../samples/own-mechanic/commands.sh)):

```bash
node --conditions development apps/cli/src/bin.ts run samples/own-mechanic/game.ts --fake
node --conditions development apps/cli/src/bin.ts log verify runs/own-mechanic-001
node --conditions development apps/cli/src/bin.ts replay runs/own-mechanic-001 --game samples/own-mechanic/game.ts
```

The first command plays the game with the fake driver: seeded legal calls, no model, no cost. It begins with
([`output.txt`](../../samples/own-mechanic/output.txt)):

```text
fake models: no result
own-mechanic seed 3: ended after 4 ticks (tick limit)
```

At seed 3 the second mark against `A02` brings it before the tribunal at tick 0; nobody amends, and at tick 1 the
decision settles, `exile` banishes `A02` and the tribunal writes `sentenced`. `swt log verify` checks the signed,
hash-chained log, and `swt replay` plays it again and compares.

## 8. Test it offline

The testkit has the **conformance checks** of a mechanic. They return a list of problems, empty when the mechanic
conforms ([`test/play.test.ts`](../../samples/own-mechanic/test/play.test.ts)):

```ts
	it("passes the conformance checks", async () => {
		const manifest: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		for (const mechanic of [marks, tribunal]) {
			expect(checkPackage(mechanic, manifest)).toEqual([]);
			expect(checkOptionsDocumented(mechanic)).toEqual([]);
		}
		// Every resident marks A04 at tick 0, and A04 marks A02: a driver that decides from the activation alone.
		const driver = () => scriptedDriver((activation) => (activation.tick === 0 ? [{ tool: "mark", params: { name: activation.actor === "resident:A04" ? "A02" : "A04" } }] : []));
		expect(await checkDeterminism(game, driver, { seed: SEED })).toEqual([]);
		expect(await checkSnapshotRoundTrip(game, driver, 1, { seed: SEED })).toEqual([]);
	});
```

`checkPackage` compares the head's `package` with `package.json` and its `swarmtales` field (`kind`, `class`, the
list `mechanics`); `checkOptionsDocumented` finds an option without a description; `checkDeterminism` plays twice
with one seed and compares the logs; `checkSnapshotRoundTrip` cuts the run after a tick, resumes it from the
snapshot and compares. The standing checks hold for every game; `checkResumeEveryBoundary` samples despite its name:
it resumes from every boundary of a run of up to 12 ticks, as this one of 4, and from at most eight of a longer run
(`sampleBoundaries`), unless its option `boundaries` names them:

```ts
	it("the log replays equal, and resumed from each of its 4 boundaries it is the straight log", async () => {
		expect(await checkReplay(game, fake.drivers, { seed: SEED })).toEqual([]);
		expect(await checkResumeEveryBoundary(game, fake.drivers, { seed: SEED })).toEqual([]);
	});
```

The other cases of the file play the threshold, a game without `exile`, a holder's amendment, the refusal of an
immune id that is no actor, and the game with the mechanics in another order. A test never calls a live model.

## Where next

- The types of head and body are in `packages/sdk/src/mechanic/types.ts`, the contexts in `context-types.ts`.
- [docs/MECHANIC-README.md](../MECHANIC-README.md) says what the README of a mechanic of `mechanics/` holds;
  `pnpm docs:mechanics` writes its generated blocks from the head.
- A Director can hold the decision of the tribunal: [Write a Director](director.md).
