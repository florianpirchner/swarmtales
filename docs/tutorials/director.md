# Write a Director

A **Director** is a model actor that is not a resident. It does not take turns: an event of a mechanic wakes it, it
asks its model one question, and it acts on the answer only through the tools of its grant. This tutorial builds
one, the **steward**, and plays it offline with the Human Hand beside it.

Everything below is sample 6, [`samples/own-director/`](../../samples/own-director/README.md). Every code block is
an include of a file of the sample, and the sample's tests play it, so what you read here runs. Read the
[glossary](../GLOSSARY.md) for the words.

## 1. Something to decide

A Director needs an event to wake on. In the sample, three residents each name a captain with the tool `nominate`.
When the last one has named, the mechanic `crew` proposes the winner through the service `decisions`, with a
window of two ticks in which a holder may put another proposal in its place, and commits the proposal that stands
when `decision_settled` comes ([`src/crew.ts`](../../samples/own-director/src/crew.ts)):

```ts
				if (ctx.state.nominations.length === ctx.residents.ids.length) {
					const count = (id: string): number => ctx.state.nominations.filter((one) => one.name === id).length;
					const captain = ctx.residents.ids.reduce((best, id) => (count(id) > count(best) ? id : best));
					const answer = ctx.call(DecisionsService, "propose", { kind: CAPTAIN, proposal: { captain }, window: ctx.options.window, schema: Captain });
					if (answer.committed) ctx.emit("captain_named", { captain, changed: false });
				}
```

```ts
	listeners: (kit) => [
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.kind !== CAPTAIN || settled.owner !== ctx.mechanic || !Check(Captain, settled.proposal)) return;
			ctx.state.captain = settled.proposal.captain;
			ctx.emit("captain_named", { captain: settled.proposal.captain, changed: settled.changed });
		}),
	],
```

The mechanic [decisions](../../mechanics/decisions/README.md) writes `decision_proposed` with the id `D1`, the
proposal and the deadline. That event wakes the steward.

## 2. The head: what wakes it, what it answers

`defineDirector(head, body)` takes the data first ([`src/steward.ts`](../../samples/own-director/src/steward.ts)):

```ts
export const steward = defineDirector(
	{
		id: "steward",
		summary: "Reads the crew's choice of a captain and may put another resident in its place.",
		on: [{ event: "decisions.decision_proposed", where: (payload) => Check(Proposed, payload) && payload.kind === CAPTAIN }],
		output: Type.Object(
			{
				captain: Type.String({ minLength: 1, description: "The resident id the steward wants as captain." }),
				line: Type.String({ minLength: 1, maxLength: 200, description: "One line to the crew." }),
			},
			{ additionalProperties: false, description: "The steward's answer" },
		),
		limits: { maxCalls: 2 },
	},
```

- `on` lists the **triggers**: `<mechanic>.<event>`, and a pure `where` that keeps only the firings it wants. The
  plugin `directors` queues each firing with its number `n`, its tick and its payload.
- `output` is the **structured answer**: a Typebox schema. The driver checks the model's answer against it before
  `act` sees it, so `act` gets typed values or nothing.
- `limits` caps the Director: `maxCalls` questions in a run, `maxCostUsd` dollars of model calls.

A payload reaches the Director as `unknown`. The steward checks it against its own schema before it reads it:

```ts
// The latest proposal among the firings, or undefined.
function proposedOf(ctx: DirectorContext<unknown>): { readonly decision: string; readonly captain: string } | undefined {
	const payload = ctx.firings.at(-1)?.payload;
	return Check(Proposed, payload) ? { decision: payload.decision, captain: payload.proposal.captain } : undefined;
}
```

## 3. The body: the question, the act, the fallback

```ts
	{
		system: () => 'You are the steward of a ship. The crew has named a captain. Keep the choice or name another resident, and say one line to the crew. Answer with JSON: { "captain": string, "line": string }.',
		input: (ctx) => `Tick ${String(ctx.tick)}. The crew proposes ${proposedOf(ctx)?.captain ?? "nobody"} as captain.`,
		act: async (answer, ctx) => {
			const proposed = proposedOf(ctx);
			if (proposed !== undefined && answer.captain !== proposed.captain) {
				await ctx.call("amendDecision", { decision: proposed.decision, proposal: { captain: answer.captain }, reason: answer.line });
			}
			await ctx.call("remark", { line: answer.line });
		},
		fallback: (ctx) => {
			const proposed = proposedOf(ctx);
			return proposed === undefined ? undefined : { captain: proposed.captain, line: STEWARD_FALLBACK };
		},
	},
);
```

- `system` and `input` are the question. `ctx.firings` holds the firings since the Director was asked last.
- `act` runs on an answer that fits `output`. `ctx.call` is its only way to change the run, and a refused call is an
  outcome, not a throw. The steward amends the decision when it wants another captain, then says its line.
- `fallback` is the answer when the model gives none: a limit, an error, or an answer that does not fit. A fake run
  has no model, so the steward acts on its fallback there. Without a fallback the Director does nothing.

## 4. The game: holders and grants

[`game.ts`](../../samples/own-director/game.ts) loads the mechanics and the Director:

```ts
export default defineGame({
	id: "own-director",
	seed: 5,
	residents: 3,
	mechanics: [decisions({ holders: ["human", "director:steward"] }), humanHand(), crew({ window: 2 })],
	directors: [{ use: steward }],
	grants: {
		resident: ["nominate"],
		steward: ["remark", "amendDecision"],
		human: ["pause", "resume", "amendDecision"],
	},
	scheduler: { id: "turns", options: { activation: "toAct", afterBlocks: ["director"] } },
	end: { ticks: 6 },
	model: "anthropic/haiku",
});
```

A Director's actor id is `director:<name>`, so the steward holds the decision through `holders`. It can amend only
with `amendDecision` in its grant. The grant `human` makes the actor `human`, the person at the run: `humanHand`
gives it `pause` and `resume`, and the person holds the decision too. Once the human has amended a decision, only the
human may amend it again. The scheduler wakes the Director after each block of residents (`afterBlocks`).

## 5. A hand file

The person's part is a hand file, one JSON line per step. At the boundary after tick 0, this one pauses, writes a
snapshot, resumes and amends the proposal to `A01` ([`hands/amend.jsonl`](../../samples/own-director/hands/amend.jsonl)):

```json
{"at":1,"tool":"pause","params":{"reason":"the crew has proposed a captain; look before it settles"}}
{"at":1,"command":"snapshot"}
{"at":1,"tool":"resume","params":{}}
{"at":1,"tool":"amendDecision","params":{"decision":"D1","proposal":{"captain":"A01"},"reason":"the person at the run prefers A01"}}
```

The fields are in [the reference of the command line](../reference/cli.md#the-hand-file).

## 6. Run, resume, replay

From the root of the repository ([`commands.sh`](../../samples/own-director/commands.sh)):

```bash
node --conditions development apps/cli/src/bin.ts run samples/own-director/game.ts --fake --hand samples/own-director/hands/amend.jsonl
node --conditions development apps/cli/src/bin.ts log verify runs/own-director-001
node --conditions development apps/cli/src/bin.ts resume runs/own-director-001 --game samples/own-director/game.ts --hand samples/own-director/hands/amend.jsonl
node --conditions development apps/cli/src/bin.ts log verify runs/own-director-002 --previous runs/own-director-001
node --conditions development apps/cli/src/bin.ts replay runs/own-director-002 --game samples/own-director/game.ts
```

The first command plays the game with the fake driver: seeded legal calls, no model, no cost. It begins with
([`output.txt`](../../samples/own-director/output.txt)):

```text
fake models: no result
own-director seed 5: ended after 2 ticks (limit crew.named: A01 is captain)
```

The residents propose `A03`, the steward keeps it on its fallback, and the person's amendment makes `A01` captain.
`swt resume` plays on from the snapshot `t1.json` into `runs/own-director-002`, with the same hand file: it drops the
lines the first run applied before the snapshot. `swt log verify --previous` checks that the new log continues the
old one, and `swt replay` replays it and prints `equal, 53 lines`.

## 7. Test it offline

A test gives the Director an asker of its own instead of a model
([`test/play.test.ts`](../../samples/own-director/test/play.test.ts)):

```ts
/** An asker that gives every question the same answer; it keeps nothing, so a resumed run asks as the straight one. */
const answering =
	(value: unknown): AskModel =>
	() =>
		Promise.resolve({ ok: true, value, costUsd: 0 });

/** The steward wants A02 and says why. */
const AMEND = answering({ captain: "A02", line: "A02 knows these waters." });
/** An answer that does not fit the output: the steward takes its fallback. */
const UNFIT = answering({ captain: "" });

/** The drivers of a run: the fake driver for the residents, the steward's driver with the given asker. */
const driversWith =
	(ask: AskModel) =>
	(kernel: Kernel): DriverTable => {
		const resolved = resolveGame({ game, seed: SEED, schedulers: { turns }, prompts: { render: (_owner, id) => id }, records: RECORDS });
		return { resident: fakeDriver(kernel, SEED), ...createDirectorDrivers({ game: resolved, ask }) };
	};
```

With `AMEND` the steward amends `D1` to `A02`; with `UNFIT` the answer does not fit `output` and the fallback acts.
The same drivers feed the standing checks of the testkit, `checkReplay` and `checkResumeEveryBoundary`. An asker
that keeps no count answers a resumed run as it answered the straight one. A test never calls a live model.

## Where next

- The Director's types are in `packages/sdk/src/director/define.ts`; its driver is in
  `packages/engine/src/directors/driver.ts`.
- The city slice, [`games/city-slice/`](../../games/city-slice/README.md), has the Director `warden` in a larger
  game.
- A live run gives the Director the model of the game (`model`) under a cost cap: `--budget`.
