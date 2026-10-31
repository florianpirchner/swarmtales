/**
 * The new core's tool pipeline, referee and loader, each with a small inline mechanic: the guard
 * stage, suspensions, limit windows that end with an event, settle only after a successful execute,
 * referee run limits that always win, and the load-time checks.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineApi, defineCoreStory, defineMechanic, loadOrder, refuse, reply } from "@swarmtales/kernel";
import { playMinutes, playStory, scriptedAgent, type CallRecord } from "@swarmtales/testkit";
import type { CoreStory, GuardJudge, MechanicUse } from "@swarmtales/contracts";

/** A counter with a `bump` tool; its pipeline handlers record which stages ran. */
const counter = defineMechanic(
	{
		id: "counter",
		summary: "A test mechanic: one tool, every stage handler, a job that closes a window.",
		options: Type.Object({ failAt: Type.Integer({ default: -1, description: "The count at which bump fails in execute." }) }),
		state: (): { count: number; stages: string[] } => ({ count: 0, stages: [] }),
		events: { bumped: Type.Object({ count: Type.Integer() }), window_closed: Type.Object({}) },
		prompts: { "counter/bump": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "bump",
				description: "counter/bump",
				parameters: Type.Object({ text: Type.Optional(Type.String()) }),
				limit: { max: 1, per: { resetOn: "window_closed" } },
				guardText: (params) => params.text,
				execute: (_params, ctx) => {
					if (ctx.state.count === ctx.options.failAt) return refuse("JAMMED");
					ctx.state.count += 1;
					ctx.emit("bumped", { count: ctx.state.count });
					return reply(String(ctx.state.count));
				},
			}),
		],
		pipeline: {
			afford: (call, ctx) => {
				ctx.state.stages.push(`afford ${call.tool}`);
				return undefined;
			},
			settle: (call, _outcome, ctx) => {
				ctx.state.stages.push(`settle ${call.tool}`);
			},
			after: (call, outcome, ctx) => {
				ctx.state.stages.push(`after ${call.tool} ${outcome.ok ? "ok" : outcome.code}`);
			},
		},
		hooks: {
			runStarted: (ctx) => {
				ctx.schedule.every(2, "close", { start: 2 });
			},
		},
		jobs: {
			close: (ctx) => {
				ctx.emit("window_closed", {});
			},
		},
		snapshot: kit.snapshot({
			version: 1,
			schema: Type.Object({ count: Type.Integer(), stages: Type.Array(Type.String()) }),
			save: (state) => ({ count: state.count, stages: [...state.stages] }),
			load: (data) => ({ count: data.count, stages: [...data.stages] }),
		}),
	}),
);

/** Suspends A01 at the start; registers a referee limit that fires from minute 2. */
const warden = defineMechanic(
	{
		id: "warden",
		summary: "A test mechanic: a suspension and a run limit.",
		options: Type.Object({ stopAt: Type.Integer({ default: 99, description: "The minute from which the run limit fires." }) }),
		state: () => undefined,
		events: {},
	},
	(kit) => ({
		hooks: {
			runStarted: (ctx) => {
				ctx.residents.suspend("A01", "asleep");
			},
			minuteEnded: () => {
				// A hook cannot keep the run going: the referee decides after it.
			},
		},
		limits: [kit.limit("deadline", "The run ends at the chosen minute.", (view) => (view.minute >= view.options.stopAt ? "deadline reached" : undefined))],
	}),
);

const bumpEveryTurn = scriptedAgent(() => [{ tool: "bump", params: {} }]);

function story(mechanics: readonly MechanicUse[], extra: Partial<CoreStory> = {}): CoreStory {
	return { id: "pipeline", seed: 3, minutes: 4, residents: 3, mechanics, grants: { resident: ["bump"], gamemaker: ["bump"] }, ...extra };
}

describe("the tool pipeline", () => {
	it("counts a limit per actor until the window's event", async () => {
		const records: CallRecord[] = [];
		await playStory({ story: story([counter.with()], { residents: 1 }) }, scriptedAgent(() => [{ tool: "bump", params: {} }], records));
		expect(records.map((record) => `${String(record.minute)} ${record.outcome.ok ? "ok" : record.outcome.code}`)).toEqual(["0 ok", "1 TOOL_LIMIT", "2 ok", "3 TOOL_LIMIT"]);
	});

	it("settles only after a successful execute and runs after for both", async () => {
		const host = createHost({ story: story([counter.with({ failAt: 1 })], { residents: 1 }) });
		host.start();
		await host.call("gamemaker", "bump", {});
		await host.call("script", "bump", {});
		await host.call("gamemaker", "bump", {});
		await host.call("resident:A01", "bump", {});
		const snapshot = host.snapshot().mechanics.counter?.data;
		expect(snapshot).toEqual({ count: 1, stages: ["afford bump", "settle bump", "after bump ok", "afford bump", "after bump JAMMED"] });
		const refused = host.log.ofType("core", "tool_refused").map((event) => event.payload);
		expect(refused).toEqual([
			{ tool: "bump", stage: "lock", code: "TOOL_NOT_GRANTED" },
			{ tool: "bump", stage: "limit", code: "TOOL_LIMIT" },
			{ tool: "bump", stage: "execute", code: "JAMMED" },
		]);
	});

	it("blocks at the guard stage before execute, and fails open when the guard errs", async () => {
		const judge: GuardJudge = {
			label: "test",
			judge: (question) =>
				Promise.resolve(question.text === "broken" ? { ok: false, error: "offline", usage: [] } : { ok: true, allowed: !question.text.includes("secret"), reason: "names a secret", usage: [] }),
		};
		const host = createHost({ story: story([counter.with()], { minutes: 1, tools: { bump: { guard: { rule: "No secrets.", on: "block" } } } }), guard: judge });
		host.start();
		expect(await host.call("resident:A01", "bump", { text: "my secret" })).toEqual({ ok: false, code: "GUARD_BLOCKED", detail: "names a secret" });
		expect(await host.call("resident:A02", "bump", { text: "broken" })).toEqual({ ok: true, reply: "1" });
		// A refused call does not count against the limit; a successful one does.
		expect(await host.call("resident:A02", "bump", {})).toMatchObject({ ok: false, code: "TOOL_LIMIT" });
		expect(await host.call("resident:A01", "bump", { text: "hello" })).toEqual({ ok: true, reply: "2" });
		expect(host.log.ofType("core", "guard_verdict").map((event) => event.payload)).toEqual([
			{ tool: "bump", rule: "No secrets.", allowed: false, reason: "names a secret", by: "model" },
			{ tool: "bump", rule: "No secrets.", allowed: true, reason: "the guard could not decide; let through", by: "model", error: "offline" },
			{ tool: "bump", rule: "No secrets.", allowed: true, reason: "names a secret", by: "model" },
		]);
	});

	it("serialises concurrent calls", async () => {
		const host = createHost({ story: story([counter.with()], { minutes: 1 }) });
		host.start();
		const outcomes = await Promise.all(["A01", "A02", "A03"].map((id) => host.call(`resident:${id}`, "bump", {})));
		expect(outcomes.map((outcome) => (outcome.ok ? outcome.reply : outcome.code))).toEqual(["1", "2", "3"]);
	});
});

/** Echoes the counter's events and the core's refusals, to show the bus's order and causes. */
const echo = defineMechanic(
	{
		id: "echo",
		summary: "A test mechanic that reacts to events.",
		options: Type.Object({}),
		state: () => undefined,
		events: { echoed: Type.Object({ of: Type.String(), seq: Type.Integer() }) },
	},
	(kit) => ({
		listeners: [
			kit.listen(counter, "bumped", (_payload, ctx, event) => {
				ctx.emit("echoed", { of: event.type, seq: event.seq });
			}),
			kit.core("tool_refused", (payload, ctx, event) => {
				ctx.emit("echoed", { of: payload.code, seq: event.seq });
			}),
			kit.on("echoed", () => {
				// Reacting to its own event works too; emitting here again would cascade.
			}),
		],
	}),
);

describe("the event bus", () => {
	it("dispatches once the emitting code returned, in log order, with the cause", async () => {
		const host = createHost({ story: story([echo.with(), counter.with()], { minutes: 1 }) });
		host.start();
		await host.call("gamemaker", "bump", {});
		await host.call("gamemaker", "bump", {});
		const log = host.log.all().slice(1).map((event) => `${String(event.seq)} ${event.source}.${event.type} <- ${String(event.causedBy)} ${event.actor}`);
		expect(log).toEqual([
			"2 core.tool_called <- undefined gamemaker",
			"3 counter.bumped <- 2 gamemaker",
			"4 echo.echoed <- 3 gamemaker",
			"5 core.tool_called <- undefined gamemaker",
			"6 core.tool_refused <- 5 gamemaker",
			"7 echo.echoed <- 6 gamemaker",
		]);
		expect(host.mechanics).toEqual(["echo", "counter"]);
	});
});

describe("residents and the referee", () => {
	it("skips a suspended resident and refuses its calls", async () => {
		const host = await playMinutes({ story: story([warden.with(), counter.with()]) }, bumpEveryTurn, 1);
		const turns = host.log.ofType("core", "turn_started").map((event) => event.payload);
		expect(turns).not.toContainEqual(expect.objectContaining({ resident: "A01" }));
		expect(await host.call("resident:A01", "bump", {})).toMatchObject({ ok: false, code: "RESIDENT_INACTIVE" });
		expect(host.log.ofType("core", "resident_suspended").map((event) => event.payload)).toEqual([{ resident: "A01", by: "warden", reason: "asleep" }]);
	});

	it("stops the run when a mechanic's limit is breached, whatever the hooks do", async () => {
		const run = await playStory({ story: story([warden.with({ stopAt: 2 })], { grants: {} }) }, bumpEveryTurn);
		expect(run.end).toEqual({ reason: "referee", minute: 2, limit: "warden.deadline" });
		expect(run.events.slice(-2).map((event) => [event.type, event.payload])).toEqual([
			["referee_intervened", { limit: "warden.deadline", reason: "deadline reached" }],
			["run_ended", { reason: "referee" }],
		]);
	});

	it("stops at the cost cap and on request", async () => {
		const capped = createHost({ story: story([counter.with()], { limits: { maxCostUsd: 0.5 } }) });
		capped.start();
		capped.recordCost(0.6);
		expect(await capped.playMinute(bumpEveryTurn)).toMatchObject({ reason: "referee", limit: "core.maxCostUsd" });
		expect(capped.log.ofType("core", "turn_started")).toHaveLength(0);
		const stopped = createHost({ story: story([counter.with()]) });
		stopped.start();
		stopped.stop("operator");
		expect(stopped.ended).toEqual({ reason: "stopped", minute: 0 });
		expect(await stopped.playMinute(bumpEveryTurn)).toEqual({ reason: "stopped", minute: 0 });
	});
});

describe("loading", () => {
	const Api = defineApi({ name: "thing", summary: "A test API.", methods: { get: { kind: "query", summary: "Reads.", input: Type.Object({}), output: Type.Integer() } } });
	const provider = (id: string) =>
		defineMechanic({ id, summary: "Provides thing.", provides: [Api], options: Type.Object({}), state: () => undefined, events: {} }, (kit) => ({ services: [kit.provide(Api, { get: () => 1 })] }));
	const user = defineMechanic({ id: "user", summary: "Requires thing.", requires: [Api], options: Type.Object({}), state: () => undefined, events: {} }, () => ({}));

	it("orders by requires and keeps the story's order for ties", () => {
		expect(loadOrder([user.with(), counter.with(), provider("p").with()]).map((use) => use.mechanic.id)).toEqual(["counter", "p", "user"]);
	});

	it("fails at start on a bad combination", () => {
		expect(() => createHost({ story: story([user.with()]) })).toThrow(/requires "thing"/);
		expect(() => createHost({ story: story([provider("a").with(), provider("b").with()]) })).toThrow(/both provide/);
		expect(() => createHost({ story: story([counter.with(), counter.with()]) })).toThrow(/twice/);
		expect(() => createHost({ story: story([counter.with()], { grants: { resident: ["fly"] } }) })).toThrow(/"fly"/);
		expect(() => createHost({ story: story([counter.with({ failAt: 1.5 })]) })).toThrow(/options/);
		const noSnapshot = defineMechanic({ id: "leaky", summary: "State without a slice.", options: Type.Object({}), state: () => ({ n: 0 }), events: {} }, () => ({}));
		expect(() => createHost({ story: story([noSnapshot.with()]) })).toThrow(/no snapshot slice/);
		const reserved = defineMechanic({ id: "clash", summary: "Declares a core event.", options: Type.Object({}), state: () => undefined, events: { run_ended: Type.Object({}) } }, () => ({}));
		expect(() => createHost({ story: story([reserved.with()]) })).toThrow(/reserved/);
	});

	it("checks emitted payloads against their schema", () => {
		const sloppy = defineMechanic(
			{ id: "sloppy", summary: "Emits a bad payload.", options: Type.Object({}), state: () => undefined, events: { said: Type.Object({ n: Type.Integer() }) } },
			() => ({
				hooks: {
					runStarted: (ctx) => {
						ctx.emit("said", { n: 0.5 });
					},
				},
			}),
		);
		const host = createHost({ story: defineCoreStory({ id: "s", seed: 1, minutes: 1, residents: 1, mechanics: [sloppy.with()], grants: {} }) });
		expect(() => {
			host.start();
		}).toThrow(/does not match/);
	});
});
