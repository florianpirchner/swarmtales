/**
 * The core decisions of the integrator's round-2 pass (docs/design/carve-decisions.md, R2-D2 to
 * R2-D15), each with the scenario of the request or challenger finding that asked for it: an absent
 * legacy slice, the role-presence query, facts that read queries, the old argument handling and
 * reply texts, tools closed by a `lock` handler, the resume hook and listener modes.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineApi, defineCoreStory, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { idleAgent } from "@swarmtales/testkit";
import type { MechanicUse, PromptLookup, RoleCaller } from "@swarmtales/contracts";

const CounterApi = defineApi({
	name: "counter-api",
	summary: "A count and a command that bumps it.",
	methods: {
		count: { kind: "query", summary: "The count.", input: Type.Object({}), output: Type.Integer() },
		bump: { kind: "command", summary: "Bumps the count.", input: Type.Object({}), output: Type.Null() },
	},
});

/** Provides the counter; its slice migrates an empty version-0 slice to a fresh count. */
const counter = defineMechanic(
	{ id: "counter", summary: "A count other mechanics read.", options: Type.Object({}), state: (): { count: number } => ({ count: 0 }), events: {}, provides: [CounterApi] },
	(kit) => ({
		services: [
			kit.provide(CounterApi, {
				count: (_input, ctx) => ctx.state.count,
				bump: (_input, ctx) => {
					ctx.state.count += 1;
					return null;
				},
			}),
		],
		hooks: {
			minuteStarted: (ctx) => {
				ctx.state.count += 1;
			},
		},
		snapshot: kit.snapshot({
			version: 1,
			schema: Type.Object({ count: Type.Integer() }),
			save: (state) => ({ count: state.count }),
			load: (data) => ({ count: data.count }),
			migrations: { 0: (old) => ({ count: typeof old === "object" && old !== null && "count" in old && typeof old.count === "number" ? old.count : 100 }) },
		}),
	}),
);

/** Reads the counter in facts (a query, and a command that must be refused), asks for a judge, has a phase tool. */
const reader = defineMechanic(
	{
		id: "reader",
		summary: "Facts over another mechanic, a judge check and a tool closed by a lock handler.",
		options: Type.Object({ emitInLock: Type.Boolean({ default: false, description: "Emit inside the lock handler (refused when probed)." }) }),
		state: (): { phase: boolean; resumed: number[] } => ({ phase: false, resumed: [] }),
		events: { probed: Type.Object({}), resumed: Type.Object({ minute: Type.Integer() }) },
		prompts: { "reader/claim": [], "reader/open": [], "reader/count": [] },
		requires: [CounterApi],
	},
	(kit) => ({
		tools: [
			kit.tool({ name: "claim", description: "reader/claim", parameters: Type.Object({ n: Type.Integer(), note: Type.Optional(Type.String()) }), execute: (params, ctx) => reply(`${String(params.n)}|${params.note ?? "-"}|judge:${String(ctx.roles.has("judge"))}`) }),
			kit.tool({ name: "phaseTool", description: "reader/open", parameters: Type.Object({}), execute: () => reply("in phase") }),
			kit.tool({ name: "openTools", description: "reader/count", parameters: Type.Object({}), execute: (_params, ctx) => reply(ctx.access.open(ctx.resident ?? "").join(",")) }),
		],
		pipeline: {
			lock: (call, ctx) => {
				if (call.tool !== "phaseTool") return undefined;
				if (ctx.options.emitInLock) ctx.emit("probed", {});
				return ctx.state.phase ? undefined : refuse("TOOL_LOCKED", "closed until the phase");
			},
		},
		hooks: {
			runResumed: (ctx) => {
				ctx.state.resumed.push(ctx.minute);
				ctx.emit("resumed", { minute: ctx.minute });
			},
			minuteStarted: (ctx) => {
				ctx.state.phase = ctx.minute >= 1;
			},
		},
		facts: { seen: kit.fact(Type.Integer(), (view) => view.call(CounterApi, "count", {})) },
		snapshot: kit.snapshot({ version: 0, schema: Type.Object({ phase: Type.Boolean() }), save: (state) => ({ phase: state.phase }), load: (data) => ({ phase: data.phase, resumed: [] }) }),
	}),
);

/** A fact that calls a command: a type error, and refused at run time. */
const commander = defineMechanic(
	{ id: "commander", summary: "A fact that would bump.", options: Type.Object({}), state: () => undefined, events: {}, requires: [CounterApi] },
	(kit) => ({
		// @ts-expect-error -- facts may call queries only
		facts: { bumped: kit.fact(Type.Null(), (view) => view.call(CounterApi, "bump", {})) },
	}),
);

function story(mechanics: readonly MechanicUse[] = [counter.with(), reader.with()]) {
	return defineCoreStory({ id: "round2", seed: 4, minutes: 3, residents: 2, mechanics, grants: { resident: ["claim", "phaseTool", "openTools"] } });
}

describe("an absent slice on resume (R2-D2)", () => {
	it("hands the mechanic an empty version-0 slice, which its migration turns into a fresh state", async () => {
		const host = createHost({ story: story() });
		host.start();
		await host.playMinute(idleAgent);
		const mechanics = Object.fromEntries(Object.entries(host.snapshot().mechanics).filter(([id]) => id !== "counter"));
		const resumed = createHost({ story: story(), resume: { snapshot: { ...host.snapshot(), mechanics }, events: host.log.all() } });
		expect(resumed.snapshot().mechanics.counter).toEqual({ version: 1, data: { count: 100 } });
	});

	it("still fails, naming the mechanic, when the migration cannot take an empty slice", async () => {
		const host = createHost({ story: story() });
		host.start();
		await host.playMinute(idleAgent);
		const mechanics = Object.fromEntries(Object.entries(host.snapshot().mechanics).filter(([id]) => id !== "reader"));
		expect(() => createHost({ story: story(), resume: { snapshot: { ...host.snapshot(), mechanics }, events: host.log.all() } })).toThrow(/no slice for mechanic "reader"/);
	});
});

describe("tools, facts and roles (R2-D3, R2-D4)", () => {
	it("tells a tool whether the run has a role, before anything is asked", async () => {
		const judge: RoleCaller = { ask: () => Promise.resolve({ ok: true, answer: {}, costUsd: 0 }) };
		for (const [roles, expected] of [[{ judge }, "true"], [{}, "false"]] as const) {
			const host = createHost({ story: story(), roles });
			host.start();
			await host.playMinute(async (turn) => {
				if (turn.resident === "A01") expect(await turn.call("claim", { n: 1 })).toEqual({ ok: true, reply: `1|-|judge:${expected}` });
			});
		}
	});

	it("lets a fact read a query of a required API live, and refuses a command", async () => {
		const host = createHost({ story: story() });
		host.start();
		await host.playMinute(idleAgent);
		expect(host.facts()["reader.seen"]).toBe(1);
		const bad = createHost({ story: story([counter.with(), reader.with(), commander.with()]) });
		bad.start();
		expect(() => bad.facts()).toThrow(/only queries/);
	});
});

describe("arguments and replies as the old runner gave them (R2-D6, R2-D7)", () => {
	it("converts arguments like the old runner (1.5 to 1, '3' to 3, an optional null dropped) and refuses the rest with the bare code", async () => {
		// The core's replies from the library (a detail would show), the test mechanics' prompts by id.
		const library = createPromptLookup();
		const prompts: PromptLookup = { render: (owner, id, variables, declared) => (owner === "core" ? library.render(owner, id, variables, declared) : id) };
		const host = createHost({ story: story(), prompts });
		host.start();
		await host.playMinute(async (turn) => {
			if (turn.resident !== "A01") return;
			expect(await turn.call("claim", { n: 1.5 })).toEqual({ ok: true, reply: "1|-|judge:false" });
			expect(await turn.call("claim", { n: "3", note: null })).toEqual({ ok: true, reply: "3|-|judge:false" });
			expect(await turn.call("claim", { n: "x" })).toEqual({ ok: false, code: "INVALID_ARGUMENTS" });
		});
	});

	it("answers a locked tool with the old reply text", () => {
		expect(createPromptLookup().render("core", "replies/core/locked", {}, [])).toBe("not available to you at this level or in this phase; activeTools lists the tools you can use now");
	});
});

describe("tools closed by a lock handler (R2-D13)", () => {
	it("are not open, and open once the handler lets them through", async () => {
		const host = createHost({ story: story() });
		host.start();
		await host.playMinute(async (turn) => {
			if (turn.resident === "A01") expect(await turn.call("openTools", {})).toEqual({ ok: true, reply: "claim,openTools" });
		});
		await host.playMinute(async (turn) => {
			if (turn.resident === "A01") expect(await turn.call("openTools", {})).toEqual({ ok: true, reply: "claim,phaseTool,openTools" });
		});
	});

	it("refuses a lock handler that emits while it is only asked", async () => {
		const host = createHost({ story: story([counter.with(), reader.with({ emitInLock: true })]) });
		host.start();
		await expect(
			host.playMinute(async (turn) => {
				await turn.call("openTools", {});
			}),
		).rejects.toThrow(/must not emit/);
	});
});

describe("the resume hook (R2-D9)", () => {
	it("runs once in a resumed run, at the snapshot's last played minute, before the next minute starts; never in a fresh run", async () => {
		const host = createHost({ story: story() });
		host.start();
		await host.playMinute(idleAgent);
		expect(host.log.all().some((event) => event.type === "resumed")).toBe(false);
		const resumed = createHost({ story: story(), resume: { snapshot: host.snapshot(), events: host.log.all() } });
		await resumed.playMinute(idleAgent);
		await resumed.playMinute(idleAgent);
		const after = resumed.log.since(host.log.all().length).map((event) => `${event.type}@${String(event.minute)}`);
		// At the snapshot's last played minute (the old restore's clock, challenge L1), before the next minute starts.
		expect(after.filter((entry) => entry.startsWith("resumed"))).toEqual(["resumed@0"]);
		expect(after.indexOf("resumed@0")).toBeLessThan(after.indexOf("minute_started@1"));
	});
});

describe("listener modes (R2-D15)", () => {
	const source = defineMechanic(
		{ id: "source", summary: "Emits one event.", options: Type.Object({}), state: () => undefined, events: { rang: Type.Object({}) }, prompts: { "source/ring": [] } },
		(kit) => ({ tools: [kit.tool({ name: "ring", description: "source/ring", parameters: Type.Object({}), execute: (_params, ctx) => (ctx.emit("rang", {}), reply("rang")) })] }),
	);
	const listener = (id: string, order: number, immediate: boolean) =>
		defineMechanic({ id, summary: "Listens.", options: Type.Object({}), state: () => undefined, events: {} }, (kit) => ({ listeners: [kit.listen(source, "rang", () => undefined, { order, immediate })] }));

	it("refuses explicit orders on one event when the listeners do not share a mode (the order would be ignored)", () => {
		const mixed = defineCoreStory({ id: "modes", seed: 1, minutes: 1, residents: 1, mechanics: [source.with(), listener("early", 100, false).with(), listener("late", 200, true).with()], grants: { resident: ["ring"] } });
		expect(() => createHost({ story: mixed })).toThrow(/source\.rang.*immediate/);
		const same = defineCoreStory({ id: "modes", seed: 1, minutes: 1, residents: 1, mechanics: [source.with(), listener("early", 100, true).with(), listener("late", 200, true).with()], grants: { resident: ["ring"] } });
		expect(() => createHost({ story: same })).not.toThrow();
	});
});
