// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The plugin `directors`: the queue of every Director of a game. Game resolution adds it, last in load order, to a
 * game that has a Director. It listens to the events the Directors' triggers name and queues a firing for each
 * Director that keeps the event, at the start of every n-th tick for a trigger `every`, and in its stage handler
 * `after` for a trigger on a resident's call of a tool; `news` says that a Director has something queued; with the
 * tool `take` a Director (its driver) takes its queue and is counted. A firing has a number of its own, from 1 per Director, and no place
 * on the log (decision A34); a firing that only `quiet` triggers kept is no news (A74). The fact `active` holds each
 * resident's tick of its last call that reached `execute`. Queue, counts and numbers are the plugin's slice, so a resumed run goes on with them. It is written by hand as a `ResolvedPlugin`, like `roster`: it asks no model and calls no body
 * function of a Director but `where`.
 */
import { SwtError, type Envelope, type KernelTool, type Listener, type PluginInstance, type PluginPort, type ResolvedPlugin, type ToolCall } from "@swarmtales/contracts";
import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";
import { sliceMismatch } from "../errors.ts";
import type { ResolvedDirector } from "../game/types.ts";
import { residentOf } from "../mechanic/context.ts";
import { inSchemaOrder } from "../mechanic/schema-order.ts";

const ID = "directors";
const PACKAGE = "@swarmtales/sdk";
const TAKE = "take";
const SKIPPED = "skipped";

/**
 * The refusal code of `take` for a caller that is no Director of the game.
 *
 * @public
 */
export const NOT_A_DIRECTOR = "NOT_A_DIRECTOR";

const FiringSchema = Type.Object(
	{
		n: Type.Integer({ minimum: 1, description: "The number of the firing among the firings of this Director, from 1, in log order" }),
		tick: Type.Integer({ description: "The tick of the event" }),
		event: Type.String({ description: "`<mechanic>.<event>`, as the trigger names it" }),
		payload: Type.Unknown({ description: "The payload of the event" }),
		quiet: Type.Optional(Type.Literal(true, { description: "Only triggers with `quiet` kept it: it is no news" })),
	},
	{ additionalProperties: false, description: "One event that fired a trigger of a Director" },
);
const count = Type.Integer({ minimum: 0, description: "How often the Director took a queue that was not empty" });

/**
 * The answer of the tool `take`, which its `reply` holds as JSON text: the firings the Director had queued, in log
 * order, and how often it has taken a queue that was not empty, this time included.
 *
 * @public
 */
export const TakeAnswerSchema = Type.Object({ firings: Type.Array(FiringSchema, { description: "The queued firings, in log order" }), calls: count }, { additionalProperties: false, description: "What a Director takes: its queued firings and its count of calls" });

/**
 * The answer of the tool `take`.
 *
 * @public
 */
export type TakeAnswer = Static<typeof TakeAnswerSchema>;

const SkippedSchema = Type.Object(
	{ director: Type.String({ description: "The name of the Director" }), reason: Type.Literal("maxCalls", { description: "The Director has been asked as often as its `maxCalls` allows" }) },
	{ additionalProperties: false, description: "A firing of a Director was dropped; written once per Director and reason" },
);
const ActiveSchema = Type.Record(Type.String({ description: "A resident id" }), Type.Integer({ description: "The tick" }), { description: "Each resident's tick of its last call that reached `execute`, by resident id in id order" });
const NoParams = Type.Object({}, { additionalProperties: false, description: "No arguments" });
const StateSchema = Type.Object(
	{
		queue: Type.Record(Type.String({ description: "The name of a Director" }), Type.Array(FiringSchema, { description: "Its queued firings, in log order" }), { description: "The queue of each Director" }),
		calls: Type.Record(Type.String({ description: "The name of a Director" }), count, { description: "The count of each Director" }),
		skipped: Type.Array(Type.String({ description: "The name of a Director" }), { description: "The Directors whose `skipped` event is written" }),
		fired: Type.Record(Type.String({ description: "The name of a Director" }), Type.Integer({ minimum: 0, description: "The number of its last firing" }), { description: "How many firings each Director has had" }),
		active: Type.Optional(ActiveSchema),
	},
	{ additionalProperties: false, description: "The slice of the plugin `directors`" },
);
type State = Static<typeof StateSchema>;

/**
 * Reads the `reply` of a successful `take`.
 *
 * @param reply - The reply text of the tool.
 * @returns The answer, or undefined when the text is no answer of `take` (the name stood for another tool).
 *
 * @public
 */
export function parseTake(reply: string): TakeAnswer | undefined {
	try {
		const value: unknown = JSON.parse(reply);
		return Value.Check(TakeAnswerSchema, value) ? value : undefined;
	} catch {
		return undefined;
	}
}

// The state of the run: an own entry per Director, so a name like `constructor` reads no inherited value.
const emptyState = (directors: readonly ResolvedDirector[]): State => ({ queue: Object.fromEntries(directors.map((director) => [director.name, []])), calls: Object.fromEntries(directors.map((director) => [director.name, 0])), skipped: [], fired: Object.fromEntries(directors.map((director) => [director.name, 0])), active: {} });

// The saved state as the slice of a run with these Directors; a slice of another form is `SWT-M024`.
function loaded(data: unknown, directors: readonly ResolvedDirector[], events: ReadonlyMap<string, TSchema>): State {
	if (!Value.Check(StateSchema, data)) {
		const wrong = Value.Errors(StateSchema, data)[0];
		throw new SwtError(sliceMismatch({ mechanic: ID, package: PACKAGE, problem: "loaded", path: wrong?.instancePath ?? "", message: wrong?.message ?? "does not match its schema" }));
	}
	const fresh = emptyState(directors);
	const own = <T>(record: Readonly<Record<string, T>>, name: string): T | undefined => (Object.hasOwn(record, name) ? record[name] : undefined);
	return {
		// A firing in the key order of the straight run (A43): its keys as its schema has them, its payload as its event's
		// schema has them (the payloads of `every` and `tool_called` have sorted keys already).
		queue: Object.fromEntries(directors.map((director) => [director.name, (own(data.queue, director.name) ?? []).map((firing) => ({ ...inSchemaOrder(FiringSchema, firing), payload: inSchemaOrder(events.get(firing.event) ?? FiringSchema.properties.payload, firing.payload) }))])),
		calls: Object.fromEntries(directors.map((director) => [director.name, own(data.calls, director.name) ?? 0])),
		skipped: data.skipped.filter((name) => Object.hasOwn(fresh.queue, name)),
		fired: Object.fromEntries(directors.map((director) => [director.name, own(data.fired, director.name) ?? 0])),
		active: { ...data.active },
	};
}

// One run of the plugin: its state and what reads and changes it.
function createRun(port: PluginPort, directors: readonly ResolvedDirector[], plugins: readonly ResolvedPlugin[]) {
	let state = emptyState(directors);
	const events = new Map(plugins.flatMap((plugin) => Object.entries(plugin.events).map(([type, schema]) => [`${plugin.id}.${type}`, schema] as const)));
	const byActor = new Map<string, string>(directors.map((director) => [director.actor, director.name]));
	const queueOf = (name: string) => state.queue[name] ?? [];
	const callsOf = (name: string): number => state.calls[name] ?? 0;
	// `kept` are the triggers of the Director that keep the firing; it is quiet when each of them is.
	const fire = (director: ResolvedDirector, kept: ResolvedDirector["definition"]["on"], event: string, envelope: Pick<Envelope, "tick" | "payload">): void => {
		const { name, limits } = director;
		if (kept.length === 0) return;
		if (limits.maxCalls !== undefined && callsOf(name) >= limits.maxCalls) {
			if (state.skipped.includes(name)) return;
			state.skipped.push(name);
			port.emit(SKIPPED, { director: name, reason: "maxCalls" });
			return;
		}
		const n = (state.fired[name] ?? 0) + 1;
		state.fired[name] = n;
		state.queue[name] = [...queueOf(name), kept.every((trigger) => "event" in trigger && trigger.quiet === true) ? { n, tick: envelope.tick, event, payload: envelope.payload, quiet: true } : { n, tick: envelope.tick, event, payload: envelope.payload }];
	};
	const take = (name: string): TakeAnswer => {
		const firings = queueOf(name);
		if (firings.length > 0) {
			state.queue[name] = [];
			state.calls[name] = callsOf(name) + 1;
		}
		return { firings, calls: callsOf(name) };
	};
	return {
		byActor,
		fire,
		take,
		waiting: (actor: string): boolean => queueOf(byActor.get(actor) ?? "").some((firing) => firing.quiet !== true),
		// Kept in id order, as a snapshot file gives it back, so the fact reads the same after a resume.
		active: (resident: string, tick: number): void => void (state.active = Object.fromEntries(Object.entries({ ...state.active, [resident]: tick }).sort(([a], [b]) => (a < b ? -1 : 1)))),
		save: (): State => Value.Clone(state),
		load: (data: unknown): void => {
			state = loaded(data, directors, events);
		},
	};
}

type Run = ReturnType<typeof createRun>;

// Whether a trigger keeps a firing of `event`; `tools` are the bare and the canonical name of a call.
const keeps = (trigger: ResolvedDirector["definition"]["on"][number], event: string, payload: unknown, tools: readonly string[] = []): boolean => "event" in trigger && trigger.event === event && (!("tool" in trigger) || tools.includes(trigger.tool)) && (trigger.where?.(payload) ?? true);

// The hook `tickStarted`: a firing for each Director with a trigger `every` that divides the tick.
function ticked(run: Run, port: PluginPort, directors: readonly ResolvedDirector[]): void {
	for (const director of directors) {
		const every = director.definition.on.flatMap((trigger) => ("every" in trigger && port.tick() % trigger.every === 0 ? [trigger.every] : []))[0];
		run.fire(director, every === undefined ? [] : [{ every }], "every", { tick: port.tick(), payload: { every } });
	}
}

// The stage handler `after`: a firing of `tool_called` for each Director with a trigger on the tool of a resident's call.
function called(run: Run, port: PluginPort, directors: readonly ResolvedDirector[], call: ToolCall): void {
	const payload = { actor: call.actor, as: call.as, params: call.params };
	const resident = residentOf(call.actor);
	if (resident !== undefined) run.active(resident, port.tick());
	for (const director of directors) run.fire(director, resident === undefined ? [] : director.definition.on.filter((trigger) => keeps(trigger, "tool_called", payload, [call.name, call.tool])), "tool_called", { tick: port.tick(), payload });
}

const takeTool = (run: Run): KernelTool => ({
	name: TAKE,
	description: "Takes the events that fired your triggers since you took them last.",
	parameters: NoParams,
	free: false,
	prepare: (raw, actor) => {
		if (!Value.Check(NoParams, raw ?? {})) return undefined;
		const name = run.byActor.get(actor);
		return {
			params: {},
			rule: () => (name === undefined ? { ok: false, code: NOT_A_DIRECTOR, detail: "Only a Director of the game takes firings." } : undefined),
			execute: () => (name === undefined ? { ok: false, code: NOT_A_DIRECTOR } : { ok: true, reply: JSON.stringify(run.take(name)) }),
		};
	},
});

// One listener per distinct trigger event that a loaded plugin declares; the schema is the declaring plugin's own object.
function listenersOf(run: Run, directors: readonly ResolvedDirector[], plugins: readonly ResolvedPlugin[]): readonly Listener[] {
	const named = new Set(directors.flatMap((director) => director.definition.on.flatMap((trigger) => ("event" in trigger ? [trigger.event] : []))));
	return plugins.flatMap((plugin) =>
		Object.entries(plugin.events).flatMap(([type, schema]): Listener[] => {
			const event = `${plugin.id}.${type}`;
			if (!named.has(event)) return [];
			const fireAll = (envelope: Envelope): void => {
				for (const director of directors) run.fire(director, director.definition.on.filter((trigger) => keeps(trigger, event, envelope.payload)), event, envelope);
			};
			return [{ source: plugin.id, type, schema, run: fireAll }];
		}),
	);
}

function instanceOf(port: PluginPort, directors: readonly ResolvedDirector[], plugins: readonly ResolvedPlugin[]): PluginInstance {
	const run = createRun(port, directors, plugins);
	return {
		tools: [takeTool(run)],
		services: [],
		listeners: listenersOf(run, directors, plugins),
		hooks: { news: (actor) => run.waiting(actor), tickStarted: [{ run: () => { ticked(run, port, directors); } }] },
		stages: { after: (call) => { called(run, port, directors, call); } },
		jobs: {},
		limits: [],
		facts: { active: { output: ActiveSchema, compute: () => run.save().active } },
		slice: { version: 2, save: run.save, load: run.load },
	};
}

/**
 * The plugin `directors` of a game.
 *
 * @param directors - The Directors of the game, from `resolveDirectors`; at least one.
 * @param plugins - The other plugins of the game: an event a trigger names is found here, by `<plugin id>.<event type>`.
 * @param version - The version of the sdk package, for the manifest.
 * @returns The plugin: the tool `take`, the event `skipped`, a listener per trigger event, the hooks `news` and
 * `tickStarted`, the stage handler `after`, the fact `active` and a slice.
 * At load nothing is checked; in a run, `load` of its slice throws `SWT-M024` for saved state of another form.
 *
 * @public
 */
export function directorsPlugin(directors: readonly ResolvedDirector[], plugins: readonly ResolvedPlugin[], version: string): ResolvedPlugin {
	return {
		id: ID,
		package: PACKAGE,
		version,
		requires: [],
		provides: [],
		events: { [SKIPPED]: SkippedSchema },
		audiences: {},
		options: {},
		create: (port) => instanceOf(port, directors, plugins),
	};
}
