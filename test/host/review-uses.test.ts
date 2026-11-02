/**
 * Fixes of the challenger review (docs/design/core-review-2c.md), part 3: optional dependencies
 * (problem 3). The scenario: exile's `#onExiled` tells goals and then seal, synchronously and in
 * that order, but only when they are loaded (world.ts:2810-2811); seal strikes through exile and
 * exile tells seal, so they use each other; whispers asks `isExiled`, but the whispers golden loads
 * no exile at all.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineApi, defineCoreStory, defineMechanic, loadOrder, refuse, reply } from "@swarmtales/kernel";
import type { MechanicUse } from "@swarmtales/contracts";

const Resident = Type.Object({ resident: Type.String() });
const ExileApi = defineApi({
	name: "exile",
	summary: "Who is exiled.",
	methods: {
		isExiled: { kind: "query", summary: "Whether a resident is exiled.", input: Resident, output: Type.Boolean() },
		exile: { kind: "command", summary: "Exiles a resident.", input: Resident, output: Type.Boolean() },
	},
});
const SealApi = defineApi({ name: "seal", summary: "The seal.", methods: { onExiled: { kind: "command", summary: "A resident left.", input: Resident, output: Type.Null() } } });
const GoalsApi = defineApi({ name: "goals", summary: "Goals.", methods: { onExiled: { kind: "command", summary: "A resident left.", input: Resident, output: Type.Null() } } });

const exile = defineMechanic(
	{
		id: "exile",
		summary: "Exiles residents and tells goals and seal.",
		provides: [ExileApi],
		uses: [GoalsApi, SealApi],
		options: Type.Object({}),
		state: (): { exiled: string[] } => ({ exiled: [] }),
		events: { exiled: Type.Object({ agent: Type.String() }) },
	},
	(kit) => ({
		services: [
			kit.provide(ExileApi, {
				isExiled: (input, ctx) => ctx.state.exiled.includes(input.resident),
				exile: (input, ctx) => {
					ctx.state.exiled.push(input.resident);
					ctx.emit("exiled", { agent: input.resident });
					ctx.tryCall(GoalsApi, "onExiled", { resident: input.resident });
					ctx.tryCall(SealApi, "onExiled", { resident: input.resident });
					return true;
				},
			}),
		],
		snapshot: kit.snapshot({ version: 1, schema: Type.Object({ exiled: Type.Array(Type.String()) }), save: (state) => ({ exiled: [...state.exiled] }), load: (data) => ({ exiled: [...data.exiled] }) }),
	}),
);

const seal = defineMechanic(
	{
		id: "seal",
		summary: "Strikes through exile when it is loaded.",
		provides: [SealApi],
		uses: [ExileApi],
		options: Type.Object({}),
		state: () => undefined,
		events: { seal_expired: Type.Object({ agent: Type.String() }) },
		prompts: { "seal/strike": [] },
	},
	(kit) => ({
		services: [kit.provide(SealApi, { onExiled: (input, ctx) => {
			ctx.emit("seal_expired", { agent: input.resident });
			return null;
		} })],
		tools: [
			kit.tool({
				name: "strike",
				description: "seal/strike",
				parameters: Resident,
				execute: (params, ctx) => (ctx.tryCall(ExileApi, "exile", params) === undefined ? refuse("NO_EXILE") : reply("struck")),
			}),
		],
	}),
);

const goals = defineMechanic(
	{ id: "goals", summary: "Resolves goals.", provides: [GoalsApi], options: Type.Object({}), state: () => undefined, events: { goal_resolved: Type.Object({ agent: Type.String() }) } },
	(kit) => ({ services: [kit.provide(GoalsApi, { onExiled: (input, ctx) => {
		ctx.emit("goal_resolved", { agent: input.resident });
		return null;
	} })] }),
);

/** Like whispers: asks `isExiled` when exile is loaded and treats everyone as present otherwise. */
const whispers = defineMechanic(
	{ id: "whispers", summary: "Counts who is present.", uses: [ExileApi], options: Type.Object({}), state: () => undefined, events: { counted: Type.Object({ present: Type.Integer(), exileLoaded: Type.Boolean() }) } },
	() => ({ hooks: { minuteStarted: (ctx) => {
		const present = ctx.residents.ids.filter((id) => ctx.tryCall(ExileApi, "isExiled", { resident: id }) !== true).length;
		ctx.emit("counted", { present, exileLoaded: ctx.has(ExileApi) });
	} } }),
);

function story(mechanics: readonly MechanicUse[]) {
	const strike = mechanics.some((use) => use.mechanic.id === "seal");
	return defineCoreStory({ id: "uses", seed: 3, minutes: 1, residents: 3, mechanics, grants: { resident: strike ? ["strike"] : [] } });
}

const types = (host: ReturnType<typeof createHost>): readonly string[] => host.log.all().filter((event) => event.source !== "core").map((event) => event.type);

describe("optional dependencies (review problem 3)", () => {
	it("loads seal and exile that use each other, and tells goals then seal, in that order", async () => {
		const host = createHost({ story: story([seal.with(), exile.with(), goals.with()]) });
		expect(host.mechanics).toEqual(["goals", "seal", "exile"]);
		host.start();
		expect(await host.call("resident:A01", "strike", { resident: "A02" })).toEqual({ ok: true, reply: "struck" });
		expect(types(host)).toEqual(["exiled", "goal_resolved", "seal_expired"]);
	});

	it("breaks a cycle of optional uses by the story's order, after the requires and the acyclic uses", () => {
		const ids = (uses: readonly MechanicUse[]) => loadOrder(uses).map((use) => use.mechanic.id);
		expect(ids([seal.with(), exile.with(), goals.with()])).toEqual(["goals", "seal", "exile"]);
		expect(ids([exile.with(), seal.with(), goals.with()])).toEqual(["goals", "exile", "seal"]);
		expect(ids([whispers.with(), exile.with()])).toEqual(["exile", "whispers"]);
	});

	it("loads a story without the used providers and answers has and tryCall accordingly", async () => {
		const alone = createHost({ story: story([seal.with(), whispers.with()]) });
		alone.start();
		expect(await alone.call("resident:A01", "strike", { resident: "A02" })).toEqual({ ok: false, code: "NO_EXILE" });
		await alone.playMinute(() => Promise.resolve());
		expect(alone.log.ofType("whispers", "counted")[0]?.payload).toEqual({ present: 3, exileLoaded: false });
		const without = createHost({ story: story([exile.with()]) });
		expect(without.mechanics).toEqual(["exile"]);
		const both = createHost({ story: story([whispers.with(), exile.with(), seal.with()]) });
		both.start();
		await both.call("resident:A01", "strike", { resident: "A03" });
		await both.playMinute(() => Promise.resolve());
		expect(both.log.ofType("whispers", "counted")[0]?.payload).toEqual({ present: 2, exileLoaded: true });
	});

	it("still refuses a cycle of requires", () => {
		const PingApi = defineApi({ name: "ping", summary: "Ping.", methods: {} });
		const PongApi = defineApi({ name: "pong", summary: "Pong.", methods: {} });
		const ping = defineMechanic({ id: "ping", summary: "Ping.", provides: [PingApi], requires: [PongApi], options: Type.Object({}), state: () => undefined, events: {} }, (kit) => ({ services: [kit.provide(PingApi, {})] }));
		const pong = defineMechanic({ id: "pong", summary: "Pong.", provides: [PongApi], requires: [PingApi], options: Type.Object({}), state: () => undefined, events: {} }, (kit) => ({ services: [kit.provide(PongApi, {})] }));
		expect(() => loadOrder([ping.with(), pong.with()])).toThrow(/form a cycle/);
	});
});
