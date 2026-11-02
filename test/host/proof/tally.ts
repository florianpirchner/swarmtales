/**
 * Proof pieces of the overseer scheduling (docs/design/overseer-api.md §1.3, step 18 step 5):
 * `tally`, a mechanic with world tools for overseers and residents (`mark`, `poke`, a consulting
 * `accuse`), a fact and an event per hook; and `watcher`, an overseer definition made to order
 * (triggers, limits, model slots, calls, fallback, state) that notes every answer it settles.
 */
import { Type, type Static } from "typebox";
import { defineEvents, defineMechanic, defineOverseer, refuse, reply } from "@swarmtales/kernel";
import type { Fired, OverseerDefinition, OverseerLimits, OverseerTrigger } from "@swarmtales/contracts";

export const TallyEvents = defineEvents("tally", {
	marked: Type.Object({ note: Type.String(), count: Type.Integer() }),
	poked: Type.Object({ resident: Type.String() }),
	judged: Type.Object({ verdict: Type.String() }),
	started: Type.Object({}),
	ended: Type.Object({}),
	closing: Type.Object({}),
});

export const Verdict = Type.Object({ upheld: Type.Boolean() });

export const tally = defineMechanic(
	{
		id: "tally",
		summary: "Counts marks and pokes, and asks a judge.",
		options: Type.Object({}),
		state: (): { count: number } => ({ count: 0 }),
		events: TallyEvents.events,
		prompts: { "tally/tools/mark": [], "tally/tools/poke": [], "tally/tools/accuse": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "mark",
				description: "tally/tools/mark",
				parameters: Type.Object({ note: Type.String() }),
				execute: ({ note }, ctx) => {
					ctx.state.count += 1;
					ctx.emit("marked", { note, count: ctx.state.count });
					return reply(`marked ${String(ctx.state.count)}`);
				},
			}),
			kit.tool({
				name: "poke",
				description: "tally/tools/poke",
				parameters: Type.Object({}),
				execute: (_params, ctx) => {
					ctx.emit("poked", { resident: ctx.resident ?? ctx.actor });
					return reply("poked");
				},
			}),
			kit.tool({
				name: "accuse",
				description: "tally/tools/accuse",
				parameters: Type.Object({ claim: Type.Integer() }),
				consult: { role: "judge", question: Type.Object({ claim: Type.Integer() }), answer: Verdict, ask: (params) => ({ claim: params.claim }) },
				execute: (_params, ctx, consulted) => {
					const verdict = consulted.ok ? (consulted.answer.upheld ? "upheld" : "dismissed") : `${consulted.reason}: ${consulted.error}`;
					ctx.emit("judged", { verdict });
					return consulted.ok ? reply(verdict) : refuse("NO_JUDGE", verdict);
				},
			}),
		],
		hooks: {
			minuteStarted: (ctx) => {
				ctx.emit("started", {});
			},
			minuteEnded: (ctx) => {
				ctx.emit("ended", {});
			},
			runEnded: (_reason, ctx) => {
				ctx.emit("closing", {});
			},
		},
		facts: { count: kit.fact(Type.Integer(), (view) => view.state.count) },
		snapshot: kit.snapshot({ version: 1, schema: Type.Object({ count: Type.Integer() }), save: (state) => ({ count: state.count }), load: (data) => ({ count: data.count }) }),
	}),
);

export const Note = Type.Object({ note: Type.String() });

export const WatchEvents = { noted: Type.Object({ note: Type.String(), index: Type.Integer(), fired: Type.String(), seen: Type.Integer() }) };

export interface WatcherSpec {
	readonly id?: string;
	readonly triggers: readonly OverseerTrigger[];
	readonly lifetime?: "long" | "short";
	readonly limits?: OverseerLimits;
	readonly model?: { readonly slot: string; readonly fallback?: string };
	/** How many calls a firing makes (default one); each gets the minute and its index. */
	readonly calls?: (fired: Fired, minute: number) => number;
	/** The fail-open answer; undefined: do nothing. */
	readonly fallback?: Static<typeof Note>;
	/** Throws in `calls` from this minute on. */
	readonly throwsAt?: number;
	readonly needs?: readonly string[];
	readonly audiences?: Partial<Readonly<Record<"noted", readonly string[]>>>;
}

/** An overseer that notes each settled answer (`noted`, with how many it has seen: its state). */
export function watcher(spec: WatcherSpec) {
	return defineOverseer(
		{
			id: spec.id ?? "watch",
			summary: "Notes what it is told.",
			options: Type.Object({ tag: Type.String({ default: "", description: "Put before every note" }) }),
			state: (): { seen: number } => ({ seen: 0 }),
			events: WatchEvents,
			...(spec.audiences === undefined ? {} : { audiences: spec.audiences }),
			prompts: { "watch/system": [], "watch/input": ["minute", "index", "standingOrders"], "watch/tools/answer": [] },
			system: "watch/system",
			input: "watch/input",
			output: Note,
			answer: { tool: "answer", description: "watch/tools/answer" },
			model: spec.model ?? { slot: "watcher" },
			lifetime: spec.lifetime ?? "short",
			triggers: spec.triggers,
			...(spec.needs === undefined ? {} : { needs: spec.needs }),
			...(spec.limits === undefined ? {} : { limits: spec.limits }),
		},
		(kit) => ({
			calls: (fired, ctx) => {
				if (spec.throwsAt !== undefined && ctx.minute >= spec.throwsAt) throw new Error("watch: broken");
				const count = spec.calls?.(fired, ctx.minute) ?? 1;
				return Array.from({ length: count }, (_, index) => ({ minute: ctx.minute, index }));
			},
			settle: (output, call, ctx) => {
				ctx.state.seen += 1;
				ctx.emit("noted", { note: `${ctx.options.tag}${output.note}`, index: call.index, fired: call.fired.kind, seen: ctx.state.seen });
			},
			fallback: () => spec.fallback,
			snapshot: kit.snapshot({ version: 1, schema: Type.Object({ seen: Type.Integer() }), save: (state) => ({ seen: state.seen }), load: (data) => ({ seen: data.seen }) }),
		}),
	);
}

/** A watcher without events and state, for stories with several definitions (event types are unique in a story). */
export function quietWatcher(spec: WatcherSpec & { readonly id: string }): OverseerDefinition {
	return defineOverseer(
		{
			id: spec.id,
			summary: "Answers and keeps quiet.",
			options: Type.Object({}),
			state: () => undefined,
			events: {},
			prompts: { "watch/system": [], "watch/input": ["minute", "index", "standingOrders"], "watch/tools/answer": [] },
			system: "watch/system",
			input: "watch/input",
			output: Note,
			answer: { tool: "answer", description: "watch/tools/answer" },
			model: spec.model ?? { slot: "watcher" },
			lifetime: spec.lifetime ?? "short",
			triggers: spec.triggers,
			...(spec.limits === undefined ? {} : { limits: spec.limits }),
		},
		() => ({
			calls: (fired, ctx) => Array.from({ length: spec.calls?.(fired, ctx.minute) ?? 1 }, (_, index) => ({ minute: ctx.minute, index })),
			fallback: () => spec.fallback,
		}),
	);
}
