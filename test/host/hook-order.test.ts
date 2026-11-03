/**
 * Wave 3.5 (docs/design/carve-decisions.md, D-1): the order of hooks and listeners across
 * mechanics is explicit. Each hook phase and listener may carry an `order`; the host runs the
 * phases of one hook, and the bus the listeners of one event, sorted by it, ties in load order.
 * The load order follows `requires` and cannot say "the tribunal ticks before the standoff" when
 * the tribunal requires what the standoff provides; the order can.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineApi, defineCoreStory, defineEvents, defineMechanic, defineTool, reply } from "@swarmtales/kernel";
import type { MechanicContext, MechanicShape, MechanicUse } from "@swarmtales/contracts";
import { idleAgent, playStory } from "@swarmtales/testkit";

const BaseApi = defineApi({ name: "base", summary: "Something the others require.", methods: { ping: { kind: "query", summary: "Ping.", input: Type.Object({}), output: Type.Null() } } });
const Said = Type.Object({ who: Type.String(), hook: Type.String() });
const Shared = defineEvents("base", { said: Said });
const Poke = defineTool("poke", Type.Object({}));

/** `base` emits `said` for whoever calls it; the others speak through it, so the log shows the order. */
const base = defineMechanic(
	{
		id: "base",
		summary: "Provides base and writes what was said.",
		options: Type.Object({}),
		state: () => undefined,
		events: Shared.events,
		provides: [BaseApi],
		prompts: { "base/poke": [] },
	},
	(kit) => ({
		services: [kit.provide(BaseApi, { ping: () => null })],
		tools: [kit.tool({ ...Poke, description: "base/poke", serves: ["script"], execute: (_params, ctx) => (ctx.emit("said", { who: "script", hook: "staged" }), reply("ok")) })],
		hooks: { runStarted: (ctx) => {
			ctx.emit("said", { who: "base", hook: "runStarted" });
		} },
	}),
);

/** A mechanic that requires base (so it loads after it) and says in each hook phase it is given. */
function phased(id: string, phases: { readonly runStarted?: readonly number[]; readonly minuteStarted?: readonly number[]; readonly runEnded?: readonly number[] }, stageAtEnd = false) {
	const Emits = defineEvents(id, { [`spoke_${id}`]: Said });
	return defineMechanic(
		{ id, summary: `Speaks as ${id}.`, options: Type.Object({}), state: () => undefined, events: Emits.events, requires: [BaseApi] },
		() => {
			const at = (hook: string, orders: readonly number[] | undefined) =>
				(orders ?? []).map((order, index) => ({
					order,
					run: (ctx: MechanicContext<MechanicShape>) => {
						ctx.emit(`spoke_${id}`, { who: `${id}#${String(index + 1)}`, hook: `${hook}@${String(order)}` });
						if (stageAtEnd && hook === "runEnded") ctx.stage(Poke, {});
					},
				}));
			return {
				hooks: {
					runStarted: at("runStarted", phases.runStarted),
					minuteStarted: at("minuteStarted", phases.minuteStarted),
					runEnded: at("runEnded", phases.runEnded).map((phase) => ({ order: phase.order, run: (_reason: string, ctx: MechanicContext<MechanicShape>) => { phase.run(ctx); } })),
				},
			};
		},
	);
}

function spokenIn(events: readonly { readonly type: string; readonly payload: unknown }[]): readonly string[] {
	return events.flatMap((event) => {
		if (!event.type.startsWith("spoke") && event.type !== "said") return [];
		const value = event.payload;
		if (typeof value !== "object" || value === null || !("who" in value) || !("hook" in value)) return [];
		return [`${String(value.who)} ${String(value.hook)}`];
	});
}

function story(mechanics: readonly MechanicUse[], minutes = 2) {
	return defineCoreStory({ id: "order", seed: 1, minutes, residents: 2, mechanics, grants: { script: ["poke"] } });
}

describe("the order of hook phases", () => {
	it("runs a hook's phases by their order across mechanics, whatever the load order", async () => {
		// late loads before early (story order), both after base (requires); their orders invert that.
		const late = phased("late", { runStarted: [100] });
		const early = phased("early", { runStarted: [300] });
		const run = await playStory({ story: story([base.with(), late.with(), early.with()], 1) }, idleAgent);
		expect(spokenIn(run.events).slice(0, 3)).toEqual(["base runStarted", "late#1 runStarted@100", "early#1 runStarted@300"]);
		const flipped = phased("flipped", { runStarted: [50] });
		const again = await playStory({ story: story([base.with(), late.with(), flipped.with()], 1) }, idleAgent);
		// A plain function is order 0: base first, then 50, then 100.
		expect(spokenIn(again.events).slice(0, 3)).toEqual(["base runStarted", "flipped#1 runStarted@50", "late#1 runStarted@100"]);
	});

	it("lets one mechanic run twice in a hook, around another's phase (the door opens before and after the ticks)", async () => {
		const door = phased("door", { minuteStarted: [100, 1000] });
		const tick = phased("tick", { minuteStarted: [500] });
		const run = await playStory({ story: story([base.with(), tick.with(), door.with()], 1) }, idleAgent);
		expect(spokenIn(run.events).filter((line) => line.includes("minuteStarted"))).toEqual(["door#1 minuteStarted@100", "tick#1 minuteStarted@500", "door#2 minuteStarted@1000"]);
	});

	it("keeps load order on equal orders", async () => {
		const first = phased("first", { minuteStarted: [7] });
		const second = phased("second", { minuteStarted: [7] });
		const run = await playStory({ story: story([base.with(), first.with(), second.with()], 1) }, idleAgent);
		expect(spokenIn(run.events).filter((line) => line.includes("minuteStarted"))).toEqual(["first#1 minuteStarted@7", "second#1 minuteStarted@7"]);
	});

	it("runs the calls runEnded phases stage before run_ended (the director's last actions)", async () => {
		const closer = phased("closer", { runEnded: [10] }, true);
		const run = await playStory({ story: story([base.with(), closer.with()], 1) }, idleAgent);
		const tail = run.events.slice(-4).map((event) => event.type);
		expect(tail).toEqual(["spoke_closer", "tool_called", "said", "run_ended"]);
		// A stop between minutes runs the phases, but nothing they stage.
		const stopped = createHost({ story: story([base.with(), closer.with()], 3) });
		stopped.start();
		await stopped.playMinute(idleAgent);
		stopped.stop("operator");
		expect(stopped.log.all().slice(-2).map((event) => event.type)).toEqual(["spoke_closer", "run_ended"]);
	});
});

describe("the order of turn input phases", () => {
	const InboxApi = defineApi({ name: "inbox", summary: "Unread mail.", methods: { unread: { kind: "query", summary: "Unread.", input: Type.Object({ resident: Type.String() }), output: Type.Integer() } } });
	/** Empties the inbox while it builds its lines and counts what it delivered (old `drainMailbox` issues receipts). */
	const mail = (order: number | undefined) =>
		defineMechanic(
			{ id: "mail", summary: "An inbox that is emptied when shown.", options: Type.Object({}), state: (): { delivered: number } => ({ delivered: 0 }), events: { delivered: Type.Object({ to: Type.String() }) }, provides: [InboxApi] },
			(kit) => {
				const drain = (resident: string, ctx: MechanicContext<MechanicShape & { state: { delivered: number } }>) => {
					ctx.state.delivered += 1;
					ctx.emit("delivered", { to: resident });
					return [{ kind: "dm", text: "a letter" }];
				};
				return {
					services: [kit.provide(InboxApi, { unread: (_input, ctx) => ctx.state.delivered })],
					hooks: { turnInputs: order === undefined ? drain : { order, run: drain } },
					snapshot: kit.snapshot({ version: 1, schema: Type.Object({ delivered: Type.Integer() }), save: (state) => ({ delivered: state.delivered }), load: (data) => ({ delivered: data.delivered }) }),
				};
			},
		);
	/** A status part that counts what was delivered so far (old: the receipts count of the status line). */
	const counter = defineMechanic(
		{ id: "counter", summary: "Counts deliveries in the status line.", options: Type.Object({}), state: () => undefined, events: {}, requires: [InboxApi] },
		() => ({ hooks: { turnInputs: { order: 100, run: (resident: string, ctx: MechanicContext<MechanicShape>) => [{ kind: "status", text: `${String(ctx.call(InboxApi, "unread", { resident }))} delivered` }] } } }),
	);

	it("builds the status line before a later phase empties the inbox", async () => {
		const shown: string[] = [];
		const agent = (turn: { readonly inputs: readonly { readonly text: string }[] }) => {
			shown.push(turn.inputs.map((input) => input.text).join(" | "));
			return Promise.resolve();
		};
		const ordered = defineCoreStory({ id: "inputs", seed: 1, minutes: 1, residents: 1, mechanics: [mail(900).with(), counter.with()], grants: {}, turns: { inputs: [{ kind: "status", join: " · " }, { kind: "dm" }] } });
		await playStory({ story: ordered }, agent);
		expect(shown).toEqual(["0 delivered | a letter"]);
		// Without an order the inbox (loaded first, since the counter requires it) empties first.
		shown.length = 0;
		const unordered = defineCoreStory({ ...ordered, mechanics: [mail(undefined).with(), counter.with()] });
		await playStory({ story: unordered }, agent);
		expect(shown).toEqual(["1 delivered | a letter"]);
	});
});

describe("the order of listeners", () => {
	const Bell = defineEvents("bell", { rang: Type.Object({}) });
	const bell = defineMechanic(
		{ id: "bell", summary: "Rings once at the start.", options: Type.Object({}), state: () => undefined, events: Bell.events },
		() => ({ hooks: { runStarted: (ctx) => {
			ctx.emit("rang", {});
		} } }),
	);
	const hearer = (id: string, order: number | undefined, immediate: boolean) =>
		defineMechanic(
			{ id, summary: `Hears the bell as ${id}.`, options: Type.Object({}), state: () => undefined, events: { [`heard_${id}`]: Type.Object({ by: Type.String() }) } },
			(kit) => ({
				listeners: [
					kit.listen(
						Bell,
						"rang",
						(_payload, ctx) => {
							ctx.emit(`heard_${id}`, { by: id });
						},
						{ immediate, ...(order === undefined ? {} : { order }) },
					),
				],
			}),
		);
	const heardBy = (events: readonly { readonly type: string; readonly payload: unknown }[]): readonly string[] =>
		events.flatMap((event) => (event.type.startsWith("heard") && typeof event.payload === "object" && event.payload !== null && "by" in event.payload ? [String(event.payload.by)] : []));

	it.each([false, true])("dispatches one event to its listeners by order, ties in load order (immediate: %s)", async (immediate) => {
		const run = await playStory(
			{ story: defineCoreStory({ id: "bells", seed: 1, minutes: 1, residents: 1, mechanics: [bell.with(), hearer("goals", 200, immediate).with(), hearer("seal", 100, immediate).with(), hearer("cast", undefined, immediate).with(), hearer("script", 200, immediate).with()], grants: {} }) },
			idleAgent,
		);
		expect(heardBy(run.events)).toEqual(["cast", "seal", "goals", "script"]);
	});

	it("refuses an order that is not a finite number", () => {
		const bad = hearer("bad", Number.NaN, false);
		expect(() => createHost({ story: defineCoreStory({ id: "bad", seed: 1, minutes: 1, residents: 1, mechanics: [bell.with(), bad.with()], grants: {} }) })).toThrow(/invalid order/);
	});
});
