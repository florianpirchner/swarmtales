# Write a scheduler

A **scheduler** decides who acts when in a tick. The kernel writes the log and runs the tools; the scheduler wakes
actors, opens their activations, hands each one to its driver and closes it. Every game of the platform plays under
`turns`, which plays residents one after another. This tutorial builds a second scheduler, **`parallel`**, in which
every woken resident acts on its own and its calls are committed in the order in which they arrive. It is written
outside the engine, against the public contract only: no line of kernel, sdk or engine knows it.

Everything below is the scheduler sample, [`samples/own-scheduler/`](../../samples/own-scheduler/README.md). Every
code block is an include of a file of the sample, and the sample's tests play it, so what you read here runs. What
each scheduler promises, and what is not supported under `parallel`, is in [SCHEDULERS.md](../SCHEDULERS.md). Read
the [glossary](../GLOSSARY.md) for the words.

`parallel` is a sample, not a scheduler of the platform: `swt run` cannot name it, an experiment cannot name it, and
no game of the platform is played under it. The kernel stays a single writer; what is parallel is the time a model
thinks.

## 1. The contract

A scheduler is a `SchedulerDefinition` of `@swarmtales/contracts` (`packages/contracts/src/kernel/ports.ts`): an id,
a revision, its determinism, an options schema, the events it may write, and `create`, which gives the instance
that runs ticks and keeps a snapshot slice ([`src/parallel.ts`](../../samples/own-scheduler/src/parallel.ts)):

```ts
export const parallel: SchedulerDefinition<ParallelOptions> = {
	id: "@swarmtales/sample-own-scheduler/parallel",
	revision: 1,
	determinism: "recorded",
	options: ParallelOptionsSchema,
	events: {},
	create(options) {
		const pending = new Set<string>();
		const slice: SnapshotSlice = {
			version: 1,
			save: () => ({ pending: [...pending].sort() }),
			load: (data) => {
				pending.clear();
				for (const id of Parse(PendingSlice, data).pending) pending.add(id);
			},
		};
		const race = (port: SchedulerPort, drivers: DriverTable): Race => ({ port, drivers, options, pending, open: new Set(), counts: new Map(), failures: new Map(), opened: 0, done: () => undefined });
		return { run: (port, drivers, until) => play(race(port, drivers), until), slice };
	},
};
```

- `determinism: "recorded"` says that the same seed and the same drivers do not promise the same log: the log is
  the schedule, and a replay reads it (section 5).
- `events: {}`: `parallel` writes no event of its own. The kernel's `activation_opened` and `activation_closed`
  say everything.
- The slice holds the actors whose driver awaits an answer, as under `turns`. The count of activations per tick
  is not in it: it is zero at every boundary.

The options are a Typebox schema with a default for every field
([`src/options.ts`](../../samples/own-scheduler/src/options.ts)):

```ts
export const ParallelOptions = Type.Object(
	{
		activations: Type.Integer({ minimum: 1, default: 1, description: "Activations an actor gets in one tick at most" }),
		activation: Type.Union([Type.Literal("onNews"), Type.Literal("always"), Type.Literal("toAct")], { default: "onNews", description: "Who of the residents is woken" }),
		kinds: Type.Array(Type.String({ description: "An actor kind." }), { default: ["resident"], description: "The actor kinds this scheduler activates; a kind other than resident is woken by news only" }),
		inputs: Type.Array(InputEntrySchema, { default: [], description: "The order of an activation's input lines, as in turns" }),
	},
	{ description: "The options of the scheduler sample parallel." },
);
```

A game names the scheduler with `scheduler: { id: "parallel", options }`. The test helpers `play` and `replay` of
the testkit take a table of schedulers, `{ turns, parallel }`; a game without `scheduler.id` resolves to `turns`.

## 2. Who is woken

The wake rule is the one of `turns`, per actor ([`src/parallel.ts`](../../samples/own-scheduler/src/parallel.ts)):

```ts
// The wake rule of `turns`, per actor; a kind other than resident is woken by news only.
function wakeReason(race: Race, id: ActorId): string | undefined {
	const { port, options } = race;
	if (kindOf(id) !== RESIDENT_KIND) return port.hasNews(id) ? "news" : undefined;
	if (options.activation === "always") return "always";
	if (options.activation === "toAct") return port.toAct()?.includes(id) === true ? "toAct" : undefined;
	if (port.hasNews(id)) return "news";
	return race.pending.has(id) ? "answer" : undefined;
}

// Whether the actor can be opened now: a kind of the options, may act, not open, under the cap of the tick.
function openable(race: Race, id: ActorId): boolean {
	const { port, options } = race;
	return options.kinds.includes(kindOf(id)) && port.actors.mayAct(id) && !race.open.has(id) && (race.counts.get(id) ?? 0) < options.activations;
}
```

`activations` bounds a tick without a clock: every actor has at most that many activations in it, so a timer of a
mechanic that counts ticks keeps its meaning.

## 3. One tick

A **scan** goes through the actors in the definition's order and opens every one that may be opened and has a wake
reason. It has no `await`: all inputs are built first, so every actor of one scan sees the same state, and then
every activation is opened. No seeded shuffle, no random stream:

```ts
// One scan, with no await: every actor it wakes gets its inputs, then every one is opened. A halted run or a failed
// tick opens nothing; an actor without a driver fails the tick (`SWT-R011`) and nothing of the scan is opened.
function scan(race: Race): void {
	const { port, drivers, options } = race;
	if (race.failures.size > 0 || port.halted) return;
	const woken: Woken[] = [];
	for (const id of port.actors.ids) {
		const reason = openable(race, id) ? wakeReason(race, id) : undefined;
		if (reason === undefined) continue;
		const driver = drivers[id] ?? drivers[kindOf(id)];
		if (driver === undefined) {
			race.failures.set(race.opened, issue("SWT-R011", `the actor ${id} is activated but has no driver`, "Every activated actor needs a driver, by its id or by its kind.", `Add a driver for "${id}" or for the kind "${kindOf(id)}" to the driver table.`));
			return;
		}
		woken.push({ id, driver, reason });
	}
	const inputs = woken.map((entry) => arrange(port.inputsFor(entry.id), options.inputs));
	for (const [at, entry] of woken.entries()) start(race, entry, inputs[at] ?? []);
}
```

`start` opens one activation and runs its driver. The driver's calls go to the kernel as they arrive; nobody waits
for another actor:

```ts
// Opens one woken actor and starts its driver; its calls go to the kernel as they arrive.
function start(race: Race, woken: Woken, inputs: readonly InputNote[]): void {
	const index = race.opened++;
	const n = (race.counts.get(woken.id) ?? 0) + 1;
	const open = race.port.open(woken.id, inputs, { reason: woken.reason, n });
	race.open.add(woken.id);
	race.counts.set(woken.id, n);
	// The executor runs now, so a throw of the driver becomes a rejection.
	const step = new Promise<Awaited<ReturnType<ActorDriver>>>((resolve) => {
		resolve(woken.driver(viewOf(open)));
	});
	const failed = (error: unknown): undefined => (race.failures.set(index, error), undefined);
	void step.then((said) => said ?? undefined, failed).then((said) => {
		finish(race, open, index, said);
	});
}
```

When an activation closes, the next scan runs in the same synchronous step, so the line `activation_closed` is
followed at once by the `activation_opened` lines of that scan:

```ts
// The end of one activation: the pending mark, `activation_closed`, then at once the next scan.
function finish(race: Race, open: OpenActivation, index: number, said: DriverResult | undefined): void {
	const failed = race.failures.has(index);
	if (!failed && said?.pending === true && !open.quietEnd) race.pending.add(open.actor);
	else race.pending.delete(open.actor);
	guarded(race, index, () => {
		open.close(failed);
	});
	race.open.delete(open.actor);
	guarded(race, race.opened, scan, race);
	if (race.open.size === 0) race.done();
}
```

The tick ends when no activation is open and a scan opens none. A halted run opens nothing more; the open
activations end first. A failed driver closes its activation as failed, the others end, and then the first failure,
in the order of opening, is thrown, as in `turns`:

```ts
// One tick between `beginTick` and `endTick`; it returns whether the first scan ran (not halted before it). A failed
// tick throws its first failure in the order of opening once every open activation has ended.
async function playTick(race: Race): Promise<boolean> {
	race.counts.clear();
	race.failures.clear();
	race.opened = 0;
	const started = !race.port.halted;
	await new Promise<void>((resolve) => {
		race.done = resolve;
		guarded(race, 0, scan, race);
		if (race.open.size === 0) resolve();
	});
	const first = Math.min(...race.failures.keys());
	if (race.failures.size > 0) throw race.failures.get(first);
	return started;
}
```

`endTick(idle)` follows the rule of `turns`: `idle` is true only when the tick was halted before its first scan. A
tick in which nobody was woken is not idle.

## 4. When a waiting actor is woken

A scan runs at the start of a tick and at every close, and nowhere else. An actor that gets news while others are
open is therefore not woken at once: it waits until some activation closes. While no activation is open the tick has
ended, and the actor is woken by the first scan of the next tick. So "acts on its own" means: an open actor never
waits for another actor; a closed actor waits for the next close.

## 5. Replay: the log is the schedule

Under `turns` the same seed and scripted drivers give the same log. Under `parallel` they do not: with drivers that
answer at once, the order is the one of the JavaScript job queue, which is stable in one Node version and nothing
more. What holds is **replay**: the recorded inputs, applied in log order, give every result again. The replay of
the testkit makes each call when the replayed log has reached the line before it, and it returns from an activation
only when the log has reached the line before its `activation_closed`. So each scan runs at the same line as in the
run. The sample's `test/replay.test.ts` replays sixty races to themselves, and resumes a kernel from every boundary
by replay.

## 6. A game whose score the order cannot move

When calls arrive in any order, a game is fair under `parallel` only when the order moves no score. The sample's
game has a **sealed guess** per round: each resident seals one guess of a hidden number, nobody sees a guess before
the round is opened, and the round is opened when its tick ends
([`src/sealed.ts`](../../samples/own-scheduler/src/sealed.ts)):

```ts
		tickEnded: (ctx) => {
			const { sealed: guesses, score } = ctx.state;
			const target = ctx.rng("sealed", "target", ctx.tick).int(1, ctx.options.max);
			// The residents in the game's order, never in the order of arrival.
			const guessed = ctx.residents.ids.filter((id) => guesses[id] !== undefined);
			const distance = (id: string): number => Math.abs((guesses[id] ?? 0) - target);
			const best = Math.min(...guessed.map(distance));
			const winners = guessed.filter((id) => distance(id) === best);
			for (const id of winners) score[id] = (score[id] ?? 0) + 1;
			ctx.emit("round_opened", { round: ctx.tick, target, guesses: Object.fromEntries(guessed.map((id) => [id, guesses[id] ?? 0])), winners, score: { ...score } });
			for (const id of guessed) Reflect.deleteProperty(guesses, id);
		},
```

The hidden number is a labelled random stream (`"sealed", "target", tick`), so the order of arrival moves nobody's
dice, and the opening lists the residents in the game's order, never in the order of arrival. The game plays it
under `parallel` ([`game.ts`](../../samples/own-scheduler/game.ts)):

```ts
export default defineGame({
	id: "sealed-guess",
	seed: 11,
	residents: 3,
	mechanics: [sealed({ max: 10 })],
	scheduler: { id: "parallel", options: { activation: "always" } },
	end: { ticks: 3 },
});
```

The sample's test plays it with scripted drivers under both schedulers. A01 thinks longest, so under `parallel` its
guess arrives last; the result lines are the same
([`test/game.test.ts`](../../samples/own-scheduler/test/game.test.ts)):

```ts
	it("ends with the same result lines under turns and under parallel, though the guesses arrive in another order", async () => {
		const straight = await play(underTurns, { schedulers, drivers: { resident: guesser } });
		const raced = await play(game, { schedulers, drivers: { resident: guesser } });
		expect(results(raced.events)).toEqual(results(straight.events));
		expect(raced.end).toEqual(straight.end);
		expect(results(raced.events)).toHaveLength(3);
		expect(results(raced.events).at(-1)).toMatchObject({ winners: ["A01", "A02"], score: { A01: 2, A02: 1, A03: 1 } });
		// Under `parallel` the guess that thinks least arrives first; under `turns` the order of the pass holds.
		expect(arrivals(raced.events).slice(0, 3)).toEqual(["A03", "A02", "A01"]);
		expect(arrivals(straight.events)).not.toEqual(arrivals(raced.events));
	});
```

## 7. What a mechanic must not assume

A mechanic never sees the scheduler. But a mechanic that keeps a mark from its `turnInputs` hook to the end of the
same activation, and assumes that no other activation is open meanwhile, goes wrong under `parallel`. The board of
`channels` is one: its "seen" mark is taken when a resident's inputs are built. In the sample's test A01 answers a
question while A02 is open; A02 reads the answer, and is still woken in the next tick for it
([`test/channels.test.ts`](../../samples/own-scheduler/test/channels.test.ts)):

```ts
	it("wakes A02 once more for a post it has read: the seen mark was taken while A01 was open", async () => {
		const straight = await played("turns");
		const raced = await played("parallel");
		// Both times A02 has read the answer in its activation of tick 0.
		expect([straight.read, raced.read]).toEqual([0, 1].map(() => ({ ok: true, reply: "#1 A03: question\n#2 A01: answer" })));
		expect(straight.opened).toEqual(["0 A01", "0 A02", "0 A03"]);
		// The wrong line is the last one: A02 has no news it has not read, but its mark is still at the question.
		expect(raced.opened).toEqual(["0 A01", "0 A02", "0 A03", "1 A02"]);
	});
```

[SCHEDULERS.md](../SCHEDULERS.md) lists this limit. The activation hooks are what lifts it.

## 8. Run it

`pnpm vitest run samples/own-scheduler` plays every test of the sample offline: the wake rule, `idle`, failures,
replay under sixty interleavings, resume from every boundary, a Director, the game in both modes, the limit of
`channels` and this tutorial's includes. Nothing calls a model.
