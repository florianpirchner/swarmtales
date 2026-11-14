// SPDX-License-Identifier: Apache-2.0
/**
 * The plugin `directors`: the queue of every Director of a game. Game resolution adds it, last in load order, to a
 * game that has a Director. It listens to the events the Directors' triggers name and queues a firing for each
 * Director that keeps the event; `news` says that a Director has something queued; with the tool `take` a Director
 * (its driver) takes its queue and is counted. Queue and counts are the plugin's slice, so a resumed run goes on
 * with them. It is written by hand as a `ResolvedPlugin`, like `roster`: it asks no model and calls no body
 * function of a Director but `where`.
 */
import { SwtError, type Envelope, type KernelTool, type Listener, type PluginInstance, type PluginPort, type ResolvedPlugin } from "@swarmtales/contracts";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { sliceMismatch } from "../errors.ts";
import type { ResolvedDirector } from "../game/types.ts";

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
		seq: Type.Integer({ description: "The place of the event on the log" }),
		tick: Type.Integer({ description: "The tick of the event" }),
		event: Type.String({ description: "`<mechanic>.<event>`, as the trigger names it" }),
		payload: Type.Unknown({ description: "The payload of the event" }),
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
const NoParams = Type.Object({}, { additionalProperties: false, description: "No arguments" });
const StateSchema = Type.Object(
	{
		queue: Type.Record(Type.String({ description: "The name of a Director" }), Type.Array(FiringSchema, { description: "Its queued firings, in log order" }), { description: "The queue of each Director" }),
		calls: Type.Record(Type.String({ description: "The name of a Director" }), count, { description: "The count of each Director" }),
		skipped: Type.Array(Type.String({ description: "The name of a Director" }), { description: "The Directors whose `skipped` event is written" }),
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
const emptyState = (directors: readonly ResolvedDirector[]): State => ({ queue: Object.fromEntries(directors.map((director) => [director.name, []])), calls: Object.fromEntries(directors.map((director) => [director.name, 0])), skipped: [] });

// The saved state as the slice of a run with these Directors; a slice of another form is `SWT-M024`.
function loaded(data: unknown, directors: readonly ResolvedDirector[]): State {
	if (!Value.Check(StateSchema, data)) {
		const wrong = Value.Errors(StateSchema, data)[0];
		throw new SwtError(sliceMismatch({ mechanic: ID, package: PACKAGE, problem: "loaded", path: wrong?.instancePath ?? "", message: wrong?.message ?? "does not match its schema" }));
	}
	const fresh = emptyState(directors);
	const own = <T>(record: Readonly<Record<string, T>>, name: string): T | undefined => (Object.hasOwn(record, name) ? record[name] : undefined);
	return {
		queue: Object.fromEntries(directors.map((director) => [director.name, [...(own(data.queue, director.name) ?? [])]])),
		calls: Object.fromEntries(directors.map((director) => [director.name, own(data.calls, director.name) ?? 0])),
		skipped: data.skipped.filter((name) => Object.hasOwn(fresh.queue, name)),
	};
}

// One run of the plugin: its state and what reads and changes it.
function createRun(port: PluginPort, directors: readonly ResolvedDirector[]) {
	let state = emptyState(directors);
	const byActor = new Map<string, string>(directors.map((director) => [director.actor, director.name]));
	const queueOf = (name: string) => state.queue[name] ?? [];
	const callsOf = (name: string): number => state.calls[name] ?? 0;
	const fire = (director: ResolvedDirector, event: string, envelope: Envelope): void => {
		const { name, limits } = director;
		if (!director.definition.on.some((trigger) => trigger.event === event && (trigger.where?.(envelope.payload) ?? true))) return;
		if (limits.maxCalls !== undefined && callsOf(name) >= limits.maxCalls) {
			if (state.skipped.includes(name)) return;
			state.skipped.push(name);
			port.emit(SKIPPED, { director: name, reason: "maxCalls" });
			return;
		}
		state.queue[name] = [...queueOf(name), { seq: envelope.seq, tick: envelope.tick, event, payload: envelope.payload }];
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
		waiting: (actor: string): boolean => queueOf(byActor.get(actor) ?? "").length > 0,
		save: (): State => Value.Clone(state),
		load: (data: unknown): void => {
			state = loaded(data, directors);
		},
	};
}

type Run = ReturnType<typeof createRun>;

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
	const named = new Set(directors.flatMap((director) => director.definition.on.map((trigger) => trigger.event)));
	return plugins.flatMap((plugin) =>
		Object.entries(plugin.events).flatMap(([type, schema]): Listener[] => {
			const event = `${plugin.id}.${type}`;
			if (!named.has(event)) return [];
			const fireAll = (envelope: Envelope): void => {
				for (const director of directors) run.fire(director, event, envelope);
			};
			return [{ source: plugin.id, type, schema, run: fireAll }];
		}),
	);
}

function instanceOf(port: PluginPort, directors: readonly ResolvedDirector[], plugins: readonly ResolvedPlugin[]): PluginInstance {
	const run = createRun(port, directors);
	return {
		tools: [takeTool(run)],
		services: [],
		listeners: listenersOf(run, directors, plugins),
		hooks: { news: (actor) => run.waiting(actor) },
		stages: {},
		jobs: {},
		limits: [],
		facts: {},
		slice: { version: 1, save: run.save, load: run.load },
	};
}

/**
 * The plugin `directors` of a game.
 *
 * @param directors - The Directors of the game, from `resolveDirectors`; at least one.
 * @param plugins - The other plugins of the game: an event a trigger names is found here, by `<plugin id>.<event type>`.
 * @param version - The version of the sdk package, for the manifest.
 * @returns The plugin: the tool `take`, the event `skipped`, a listener per trigger event, the hook `news` and a slice.
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
