/**
 * Overseer scheduling (docs/design/overseer-api.md §1.3). The runner holds one instance per story
 * name and fires them:
 *
 * - **hook, schedule and fact** triggers in their slot (`minuteStarted`, `between`, `runEnded`; a
 *   schedule and a fact are checked in `between`), sorted by `order`, ties in the story's order of
 *   overseers and then of triggers; each firing runs to its end before the next;
 * - **event** triggers queue the overseer when the event is written (and visible to it); the queue
 *   runs right after the code or call that wrote the event, its staged calls drained, before the
 *   next call or turn begins. What one round queued is one batch;
 * - **consult** triggers inside the tool's consult stage (`role_asked`/`role_answered`).
 *
 * A firing gives zero or more calls (`calls`). Over `maxCalls` or `maxCostUsd` a call is not made
 * (`overseer_skipped`). Every call of a batch writes `overseer_called` (after `orders_applied`
 * when it carries standing orders) and starts its model request at once; a call's world tools wait
 * until the calls before it are answered, and the answers are applied in the same fixed order
 * (`overseer_answered`, then `settle`), so the log does not depend on the models' speed. A failing
 * model, a throwing runtime or an answer off its schema tries the fallback slot, then the body's
 * `fallback`: an overseer never refuses and never ends the run; only its own code throwing does.
 */
import { Type, type TSchema } from "typebox";
import { Check, Errors } from "typebox/value";
import {
	CORE_EVENTS,
	DEFAULT_ORDER,
	type Actor,
	type CoreStory,
	type DecisionsView,
	type EventEnvelope,
	type EventsDefinition,
	type Fired,
	type OverseerDefinition,
	type OverseerInstance,
	type OverseerRuntime,
	type PromptLookup,
	type RoleQuestion,
	type RoleReply,
	type StandingOrder,
	type ToolOutcome,
	type ToolSpec,
} from "@swarmtales/contracts";
import { createRng, deriveSeed } from "../random.ts";
import type { EventBus, Frame } from "./log.ts";
import { actorOf } from "./names.ts";
import { AudienceLog, OrdersAnswer, renderOrders, visibleTo, type OrderBook } from "./orders.ts";
import type { Referee } from "./referee.ts";
import type { ResidentRegistry } from "./residents.ts";

/** A round of event firings that keeps queueing new ones longer than this is a trigger loop. */
const MAX_ROUNDS = 1000;

export type OverseerSlot = "minuteStarted" | "between" | "runEnded";

export interface RunnerParts {
	readonly story: CoreStory;
	readonly bus: EventBus;
	readonly runtime: OverseerRuntime | undefined;
	readonly prompts: PromptLookup | undefined;
	readonly referee: Referee;
	readonly orders: OrderBook;
	readonly minute: () => number;
	readonly residents: ResidentRegistry;
	readonly decisions: DecisionsView;
	readonly facts: () => Readonly<Record<string, unknown>>;
	/** Whether a loaded mechanic declares the fact (`<mechanic>.<fact>`). */
	readonly hasFact: (key: string) => boolean;
	/** Whether a loaded mechanic (or overseer definition, or `core`) declares the event. */
	readonly declares: (source: string, type: string) => boolean;
	readonly display: (text: string) => string;
	readonly tools: (name: string) => readonly ToolSpec[];
	/** A world-tool call of an overseer (the gateway lets it in while the overseer runs). */
	readonly call: (actor: Actor, tool: string, params: unknown, cause: number) => Promise<ToolOutcome>;
	/** Runs code while the gateway takes nested calls of these actors. */
	readonly admit: <T>(actors: readonly Actor[], code: () => Promise<T>) => Promise<T>;
	/** Runs the calls mechanics staged meanwhile (the caller holds the gateway). */
	readonly drain: () => Promise<void>;
	/** True once the run failed. */
	readonly failed: () => boolean;
}

interface Usage {
	calls: number;
	costUsd: number;
}

interface Placed {
	readonly name: string;
	readonly actor: Actor;
	readonly definition: OverseerDefinition;
	readonly instance: OverseerInstance;
	readonly maxCalls: number | undefined;
	readonly maxCostUsd: number | undefined;
	readonly usage: Usage;
	/** The system prompt, rendered (or composed by the body) at the first call and sent unchanged with every call. */
	system?: string;
}

interface Firing {
	readonly placed: Placed;
	/** For `overseer_called`: `hook:between`, `schedule`, `event:core.decision_proposed`, `fact:<key>`. */
	readonly trigger: string;
	readonly fired: Fired;
	/** The event that fired it, as the cause of what it writes. */
	readonly cause: number | undefined;
}

interface Prepared {
	readonly placed: Placed;
	readonly firing: Firing;
	readonly index: number;
	readonly system: string;
	readonly input: string;
	readonly tools: readonly ToolSpec[];
	readonly answerSchema: TSchema;
	/** Whether an order of mode `order` obliges the answer to account for it. */
	readonly obliged: boolean;
	/** The `overseer_called` (or the consult's `tool_called`) its calls and answer are caused by. */
	readonly cause: number;
}

type Answer =
	| { readonly kind: "model"; readonly answer: unknown; readonly by: "model" | "fallback-model"; readonly costUsd: number }
	| { readonly kind: "failed"; readonly error: string; readonly costUsd: number }
	| { readonly kind: "none" };

/** What a consult overseer gives the consult stage: the reply, and its `settle` to run once `role_answered` is written. */
export interface ConsultAnswer {
	readonly reply: RoleReply;
	readonly settle: ((answered: number) => void) | undefined;
}

export interface Consultant {
	ask(question: RoleQuestion, chain: Frame): Promise<ConsultAnswer>;
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function sane(cost: number): number {
	return Number.isFinite(cost) && cost > 0 ? cost : 0;
}

function firstError(schema: TSchema, value: unknown): string | undefined {
	if (Check(schema, value)) return undefined;
	const [error] = Errors(schema, value);
	return error === undefined ? "the answer does not match its schema" : `the answer does not match its schema (${error.instancePath === "" ? "/" : error.instancePath} ${error.message})`;
}

/** The tighter of two limits. */
function tighter(a: number | undefined, b: number | undefined): number | undefined {
	if (a === undefined) return b;
	if (b === undefined) return a;
	return Math.min(a, b);
}

/** The answer schema while an order obliges an account: an object output gains `orders`. */
function obligedSchema(output: TSchema): TSchema {
	return Type.IsObject(output) ? Type.Object({ ...output.properties, orders: OrdersAnswer }) : output;
}

/** An obliged answer split into the output and the account of the orders. */
function splitOrders(answer: unknown): { readonly output: unknown; readonly orders: unknown } {
	if (typeof answer !== "object" || answer === null || !("orders" in answer)) return { output: answer, orders: undefined };
	const { orders, ...output } = answer;
	return { output, orders };
}

/** The source an event trigger listens to. */
function sourceOf(event: EventsDefinition | "core"): string {
	return event === "core" ? "core" : event.id;
}

export class OverseerRunner {
	readonly #parts: RunnerParts;
	readonly #placed: readonly Placed[];
	readonly #queue: Firing[] = [];
	#busy = false;

	constructor(parts: RunnerParts) {
		this.#parts = parts;
		this.#placed = (parts.story.overseers ?? []).map((use) => this.#place(use.name, use.overseer, use.options, use.limits?.maxCalls, use.limits?.maxCostUsd));
		this.#check();
		if (this.hasEvents()) {
			parts.bus.subscribe((event) => {
				this.#observe(event);
			});
		}
	}

	/** Whether any overseer has an event trigger, so the gateway needs to run the queue after its calls. */
	hasEvents(): boolean {
		return this.#placed.some((placed) => placed.definition.triggers.some((trigger) => "event" in trigger));
	}

	#place(name: string, definition: OverseerDefinition, options: unknown, maxCalls: number | undefined, maxCostUsd: number | undefined): Placed {
		const { bus, story } = this.#parts;
		const residents = this.#parts.residents.portFor(`overseer:${name}`);
		const instance = definition.instantiate(
			{
				name,
				seed: story.seed,
				minute: this.#parts.minute,
				residents: { ids: residents.ids, has: (id) => residents.has(id), mayAct: (id) => residents.mayAct(id), attribute: (id, key) => residents.attribute(id, key) },
				log: new AudienceLog(bus, name),
				facts: () => this.#parts.facts(),
				decisions: this.#parts.decisions,
				display: (text) => this.#parts.display(text),
				emit(type, payload) {
					const schema = definition.events[type];
					if (schema === undefined) throw new Error(`${definition.id}: event "${type}" is not declared`);
					if (!Check(schema, payload)) throw new Error(`${definition.id}: the payload of "${type}" does not match its schema`);
					bus.emit(definition.id, type, payload);
				},
				render: (prompt, variables, declared) => {
					const prompts = this.#parts.prompts;
					if (prompts === undefined) throw new Error(`${definition.id}: renders "${prompt}" but the host has no prompt lookup`);
					return prompts.render(definition.id, prompt, variables, declared);
				},
				rng: (...labels) => createRng(deriveSeed(story.seed, ...labels)),
			},
			options,
		);
		return {
			name,
			actor: actorOf(name),
			definition,
			instance,
			maxCalls: tighter(definition.limits?.maxCalls, maxCalls),
			maxCostUsd: tighter(definition.limits?.maxCostUsd, maxCostUsd),
			usage: { calls: 0, costUsd: 0 },
		};
	}

	/** Triggers that cannot fire as written fail the load: an unknown event or fact, a bad schedule. */
	#check(): void {
		for (const placed of this.#placed) {
			const id = placed.definition.id;
			for (const trigger of placed.definition.triggers) {
				if ("event" in trigger) {
					const source = sourceOf(trigger.event);
					const known = source === "core" ? Object.hasOwn(CORE_EVENTS, trigger.type) : this.#parts.declares(source, trigger.type);
					if (!known) throw new Error(`${id}: triggers on ${source}.${trigger.type}, which no loaded mechanic or overseer declares`);
				} else if ("fact" in trigger) {
					if (!this.#parts.hasFact(trigger.fact)) throw new Error(`${id}: triggers on the fact ${trigger.fact}, which no loaded mechanic computes`);
				} else if ("schedule" in trigger) {
					const { every, start } = trigger.schedule;
					if (!Number.isInteger(every) || every < 1 || (start !== undefined && (!Number.isInteger(start) || start < 0))) {
						throw new Error(`${id}: invalid schedule every ${String(every)} from ${String(start)}`);
					}
				}
			}
		}
	}

	/** Whether a slot has any trigger, so a story without overseers never touches the gateway for it. */
	has(slot: OverseerSlot): boolean {
		return this.#placed.some((placed) => placed.definition.triggers.some((trigger) => ("hook" in trigger && trigger.hook === slot) || (slot === "between" && ("schedule" in trigger || "fact" in trigger))));
	}

	/** The names with a consult trigger: roles the consult stage finds here. */
	consultRoles(): readonly string[] {
		return this.#placed.filter((placed) => placed.definition.triggers.some((trigger) => "consult" in trigger)).map((placed) => placed.name);
	}

	/** The firings of a slot in minute `minute`, sorted by `order`. */
	#firings(slot: OverseerSlot, minute: number): readonly Firing[] {
		const found: { readonly firing: Firing; readonly order: number }[] = [];
		for (const placed of this.#placed) {
			for (const trigger of placed.definition.triggers) {
				if ("hook" in trigger) {
					if (trigger.hook === slot) found.push({ firing: { placed, trigger: `hook:${slot}`, fired: { kind: "hook", hook: slot, minute }, cause: undefined }, order: trigger.order ?? DEFAULT_ORDER });
				} else if ("schedule" in trigger) {
					const { every, start = 0 } = trigger.schedule;
					if (slot === "between" && minute >= start && (minute - start) % every === 0) {
						found.push({ firing: { placed, trigger: "schedule", fired: { kind: "schedule", minute }, cause: undefined }, order: trigger.order ?? DEFAULT_ORDER });
					}
				} else if ("fact" in trigger && slot === "between") {
					const value = this.#parts.facts()[trigger.fact];
					if (trigger.when(value)) found.push({ firing: { placed, trigger: `fact:${trigger.fact}`, fired: { kind: "fact", value }, cause: undefined }, order: trigger.order ?? DEFAULT_ORDER });
				}
			}
		}
		// A stable sort: ties keep the story's order of overseers, then their triggers' order.
		return found.sort((a, b) => a.order - b.order).map((entry) => entry.firing);
	}

	/** The slot's firings, each to its end (and the event firings it caused) before the next. The caller holds the gateway. */
	async slot(slot: OverseerSlot, minute: number): Promise<void> {
		await this.#exclusive(async () => {
			for (const firing of this.#firings(slot, minute)) {
				if (this.#parts.failed()) return;
				await this.#batch([firing]);
				await this.#parts.drain();
				await this.#rounds();
			}
		});
	}

	/** Runs the queued event firings (the gateway calls it after every call and drain). */
	async flush(): Promise<void> {
		if (this.#busy || this.#queue.length === 0) return;
		await this.#exclusive(() => this.#rounds());
	}

	async #exclusive(code: () => Promise<void>): Promise<void> {
		this.#busy = true;
		try {
			await code();
		} finally {
			this.#busy = false;
		}
	}

	async #rounds(): Promise<void> {
		for (let round = 1; this.#queue.length > 0 && !this.#parts.failed(); round++) {
			if (round > MAX_ROUNDS) throw new Error(`overseers: more than ${String(MAX_ROUNDS)} rounds of event triggers in a row; the triggers form a loop`);
			await this.#batch(this.#queue.splice(0));
			await this.#parts.drain();
		}
	}

	#observe(event: EventEnvelope): void {
		if (this.#parts.failed()) return;
		for (const placed of this.#placed) {
			if (!visibleTo(event, placed.name)) continue;
			for (const trigger of placed.definition.triggers) {
				if (!("event" in trigger) || trigger.type !== event.type || sourceOf(trigger.event) !== event.source) continue;
				if (trigger.when !== undefined && !trigger.when(event.payload, placed.name)) continue;
				this.#queue.push({ placed, trigger: `event:${event.source}.${event.type}`, fired: { kind: "event", event }, cause: event.seq });
			}
		}
	}

	#over(placed: Placed): string | undefined {
		if (placed.maxCalls !== undefined && placed.usage.calls >= placed.maxCalls) return "maxCalls";
		if (placed.maxCostUsd !== undefined && placed.usage.costUsd >= placed.maxCostUsd) return "maxCostUsd";
		return undefined;
	}

	#frame(placed: Placed, cause: number | undefined): Frame {
		return cause === undefined ? { actor: placed.actor } : { actor: placed.actor, cause };
	}

	#skip(placed: Placed, reason: string, cause: number | undefined): void {
		const { bus } = this.#parts;
		bus.run(this.#frame(placed, cause), () => bus.emit("core", "overseer_skipped", { overseer: placed.name, reason }));
	}

	/** The variables of a firing's calls, cut at the limits (the cut writes `overseer_skipped`). */
	#callsOf(firing: Firing): readonly Readonly<Record<string, string | number>>[] {
		const { placed } = firing;
		const over = this.#over(placed);
		if (over !== undefined) {
			this.#skip(placed, over, firing.cause);
			return [];
		}
		const all = this.#parts.bus.run(this.#frame(placed, firing.cause), () => placed.instance.calls(firing.fired));
		const room = placed.maxCalls === undefined ? all.length : Math.max(0, placed.maxCalls - placed.usage.calls);
		if (room < all.length) this.#skip(placed, "maxCalls", firing.cause);
		return all.slice(0, room);
	}

	/**
	 * One call's prompts: the standing orders it carries (`orders_applied` first, `used` counted),
	 * the input rendered with them, the answer schema; `opened` writes the event that opens it.
	 */
	#prepare(firing: Firing, index: number, variables: Readonly<Record<string, string | number>>, opened: () => number): Prepared {
		const { placed } = firing;
		const { bus, prompts } = this.#parts;
		const definition = placed.definition;
		placed.usage.calls += 1;
		const carried: readonly StandingOrder[] = this.#parts.orders.carry(placed.name, this.#parts.minute());
		if (carried.length > 0) bus.run(this.#frame(placed, firing.cause), () => bus.emit("core", "orders_applied", { overseer: placed.name, orders: carried.map((order) => order.id) }));
		const all = { ...variables, standingOrders: renderOrders(prompts, carried) };
		const declared = definition.prompts[definition.input] ?? [];
		const input = prompts === undefined ? `${definition.input} ${JSON.stringify(all)}` : prompts.render(definition.id, definition.input, all, declared);
		placed.system ??= placed.instance.system?.() ?? (prompts === undefined ? definition.system : prompts.render(definition.id, definition.system, {}, []));
		const system = placed.system;
		const obliged = carried.some((order) => order.mode === "order");
		return {
			placed,
			firing,
			index,
			system,
			input,
			tools: this.#parts.tools(placed.name),
			answerSchema: obliged ? obligedSchema(definition.output) : definition.output,
			obliged,
			cause: opened(),
		};
	}

	/** One batch: every call opened in order, all requests at once, answers applied in order. */
	async #batch(firings: readonly Firing[]): Promise<void> {
		const { bus } = this.#parts;
		const calls: Prepared[] = [];
		for (const firing of firings) {
			for (const [index, variables] of this.#callsOf(firing).entries()) {
				const { placed } = firing;
				const opened = (): number => bus.run(this.#frame(placed, firing.cause), () => bus.emit("core", "overseer_called", { overseer: placed.name, trigger: firing.trigger, index })).seq;
				calls.push(this.#prepare(firing, index, variables, opened));
			}
		}
		if (calls.length === 0) return;
		const actors = [...new Set(calls.map((call) => call.placed.actor))];
		await this.#parts.admit(actors, async () => {
			const failures: unknown[] = [];
			let previous: Promise<void> = Promise.resolve();
			const runs = calls.map((call) => {
				const ready = previous;
				const reply = this.#request(call, ready);
				const finished = (async () => {
					const answer = await reply;
					await ready;
					if (failures.length === 0 && !this.#parts.failed()) this.#apply(call, answer);
				})().catch((error: unknown) => {
					failures.push(error);
				});
				previous = finished;
				return finished;
			});
			await Promise.all(runs);
			const [failure] = failures;
			if (failures.length > 0) throw failure instanceof Error ? failure : new Error(message(failure));
		});
	}

	/** The model request of one call: the head's slot, then its fallback slot. Never rejects. */
	async #request(call: Prepared, ready: Promise<void>): Promise<Answer> {
		const runtime = this.#parts.runtime;
		if (runtime === undefined) return { kind: "none" };
		const { placed } = call;
		const model = placed.definition.model;
		const slots = model.fallback === undefined ? [model.slot] : [model.slot, model.fallback];
		const tool = async (name: string, params: unknown): Promise<ToolOutcome> => {
			await ready;
			return this.#parts.call(placed.actor, name, params, call.cause);
		};
		let costUsd = 0;
		let error = "no answer";
		for (const [attempt, slot] of slots.entries()) {
			let reply;
			try {
				reply = await runtime.ask({ definition: placed.definition.id, name: placed.name, slot, system: call.system, input: call.input, tools: call.tools, answerSchema: call.answerSchema, call: tool });
			} catch (thrown) {
				reply = { ok: false, error: message(thrown), costUsd: 0 } as const;
			}
			costUsd += sane(reply.costUsd);
			if (!reply.ok) {
				error = reply.error;
				continue;
			}
			const invalid = firstError(call.answerSchema, reply.answer);
			if (invalid !== undefined) {
				error = invalid;
				continue;
			}
			return { kind: "model", answer: reply.answer, by: attempt === 0 ? reply.by : "fallback-model", costUsd };
		}
		return { kind: "failed", error, costUsd };
	}

	/** What an answer comes to: the output to settle with (the model's or the body's fallback) and the `overseer_answered` fields. */
	#resolve(call: Prepared, answer: Answer): { readonly output: unknown; readonly fields: Record<string, unknown> } {
		const { placed } = call;
		const costUsd = answer.kind === "none" ? 0 : answer.costUsd;
		if (answer.kind === "model") {
			const { output, orders } = call.obliged ? splitOrders(answer.answer) : { output: answer.answer, orders: undefined };
			return { output, fields: { ok: true, by: answer.by, output, costUsd, ...(orders === undefined ? {} : { orders }) } };
		}
		const fallback = this.#parts.bus.run(this.#frame(placed, call.cause), () => placed.instance.fallback(call.firing.fired));
		const by = answer.kind === "none" ? "none" : "fallback";
		const error = answer.kind === "failed" ? { error: answer.error } : {};
		return { output: fallback?.output, fields: { ok: false, by, ...(fallback === undefined ? {} : { output: fallback.output }), ...error, costUsd } };
	}

	#apply(call: Prepared, answer: Answer): void {
		const { placed } = call;
		const { bus, referee } = this.#parts;
		const { output, fields } = this.#resolve(call, answer);
		const costUsd = answer.kind === "none" ? 0 : answer.costUsd;
		referee.recordCost(costUsd);
		placed.usage.costUsd += costUsd;
		const answered = bus.run({ actor: placed.actor, cause: call.cause }, () => bus.emit("core", "overseer_answered", { overseer: placed.name, ...fields }));
		if (output === undefined) return;
		bus.run({ actor: placed.actor, cause: answered.seq }, () => {
			placed.instance.settle(output, { index: call.index, fired: call.firing.fired });
		});
	}

	/** The overseer that answers a consult role, if one of the story's has a consult trigger and that name. */
	consultant(role: string): Consultant | undefined {
		const placed = this.#placed.find((entry) => entry.name === role && entry.definition.triggers.some((trigger) => "consult" in trigger));
		if (placed === undefined) return undefined;
		return { ask: (question, chain) => this.#consult(placed, question, chain) };
	}

	async #consult(placed: Placed, question: RoleQuestion, chain: Frame): Promise<ConsultAnswer> {
		const fired: Fired = { kind: "consult", question: question.question, tool: question.tool, actor: question.actor };
		const firing: Firing = { placed, trigger: "consult", fired, cause: chain.cause };
		const variables = this.#callsOf(firing);
		if (variables.length > 1) throw new Error(`${placed.definition.id}: calls() gave ${String(variables.length)} calls for a consult, which takes one`);
		const [first] = variables;
		if (first === undefined) {
			const reason = this.#over(placed) ?? "the overseer made no call";
			return { reply: { ok: false, error: reason, costUsd: 0 }, settle: undefined };
		}
		const call = this.#prepare(firing, 0, first, () => chain.cause ?? this.#parts.bus.lastSeq);
		const answer = await this.#parts.admit([placed.actor], () => this.#request(call, Promise.resolve()));
		const { output } = this.#resolve(call, answer);
		const costUsd = answer.kind === "none" ? 0 : answer.costUsd;
		// The consult stage records the cost with the referee; the overseer's own budget counts it here.
		placed.usage.costUsd += costUsd;
		const settle = (answered: number): void => {
			this.#parts.bus.run({ actor: placed.actor, cause: answered }, () => {
				placed.instance.settle(output, { index: 0, fired });
			});
		};
		if (output !== undefined) return { reply: { ok: true, answer: output, costUsd }, settle };
		return { reply: { ok: false, error: answer.kind === "failed" ? answer.error : "no model and no fallback answer", costUsd }, settle: undefined };
	}

	/** The state's slice of one overseer as a snapshot would hold it; `undefined` for an unknown name or one without state. */
	slice(name: string): { readonly version: number; readonly data: unknown } | undefined {
		const snapshot = this.#placed.find((candidate) => candidate.name === name)?.instance.snapshot;
		return snapshot === undefined ? undefined : { version: snapshot.version, data: structuredClone(snapshot.save()) };
	}

	/** Per name, the limits used and the state's slice; only names that were called or keep state. */
	save(): Readonly<Record<string, { readonly calls: number; readonly costUsd: number; readonly slice?: { readonly version: number; readonly data: unknown } }>> {
		const saved: Record<string, { calls: number; costUsd: number; slice?: { version: number; data: unknown } }> = {};
		for (const placed of this.#placed) {
			const slice = placed.instance.snapshot;
			const { calls, costUsd } = placed.usage;
			if (calls === 0 && costUsd === 0 && slice === undefined) continue;
			saved[placed.name] = slice === undefined ? { calls, costUsd } : { calls, costUsd, slice: { version: slice.version, data: slice.save() } };
		}
		return saved;
	}

	load(saved: Readonly<Record<string, { readonly calls: number; readonly costUsd: number; readonly slice?: { readonly version: number; readonly data: unknown } }>>): void {
		for (const [name, entry] of Object.entries(saved)) {
			const placed = this.#placed.find((candidate) => candidate.name === name);
			if (placed === undefined) throw new Error(`snapshot: overseer "${name}", which the story does not declare`);
			placed.usage.calls = entry.calls;
			placed.usage.costUsd = entry.costUsd;
			const slice = placed.instance.snapshot;
			if (entry.slice !== undefined) {
				if (slice === undefined) throw new Error(`snapshot: a slice of overseer "${name}", which keeps no state`);
				slice.load(entry.slice.data, entry.slice.version);
			}
		}
	}
}
