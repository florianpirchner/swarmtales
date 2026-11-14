// SPDX-License-Identifier: Apache-2.0
/**
 * The actor `human` in a run: a game whose grant `human` holds a tool has the actor, and a call of it between two
 * ticks goes through the whole dispatch although no scheduler activates it (the first test of issue M3-12).
 */
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { idleDriver } from "../src/drivers.ts";
import { testKernel } from "../src/play.ts";

const head = defineHead({
	id: "hand",
	package: "@test/hand",
	summary: "A halt for the human and a wave for residents.",
	options: Type.Object({}, { description: "The options." }),
	state: Type.Object({ halted: Type.Boolean(), actors: Type.Array(Type.String()) }),
	start: (setup) => ({ halted: false, actors: [...setup.actors] }),
	events: { halted: Type.Object({ by: Type.String(), resident: Type.Boolean() }) },
	tools: {
		halt: { description: "Halts.", params: Type.Object({}), for: ["human"] },
		wave: { description: "Waves.", params: Type.Object({}), for: ["resident"] },
	},
});
const hand = defineMechanic(head, {
	tools: {
		halt: {
			run(_params, ctx) {
				ctx.state.halted = true;
				ctx.emit("halted", { by: ctx.actor, resident: ctx.resident !== undefined });
				return reply("Halted.");
			},
		},
		wave: { run: (_params, ctx) => reply(ctx.actors.ids.join(" ")) },
	},
	facts: { halted: { output: Type.Boolean(), compute: (view) => view.state.halted }, seen: { output: Type.Array(Type.String()), compute: (view) => view.state.actors } },
});
const game = defineGame({ id: "hand", residents: 2, mechanics: [hand()], end: { ticks: 4 } });
const prompts = { render: (_owner: string, id: string) => id };
const ACTORS = ["resident:A01", "resident:A02", "human"];

describe("the actor `human`", () => {
	it("is an actor of the run that a mechanic sees in `setup.actors` and `ctx.actors`", async () => {
		const run = testKernel(game, { prompts });
		expect(run.fact("hand.seen")).toEqual(ACTORS);
		expect(await run.call("A01", "wave", {})).toMatchObject({ ok: true, reply: ACTORS.join(" ") });
		expect([run.kernel.toolSpecs("human").map((tool) => tool.name), run.kernel.openTools("human"), run.kernel.openTools("resident:A01")]).toEqual([["halt"], ["halt"], ["wave"]]);
	});

	it("calls its tool through `submit` between two ticks, though no scheduler activates it", async () => {
		const events: { readonly type: string; readonly actor: string; readonly tick: number; readonly payload: unknown }[] = [];
		const run = testKernel(game, { prompts, sinks: [{ write: (event) => void events.push(event) }] });
		await run.playTicks(idleDriver, 2);
		expect(await run.kernel.submit({ actor: "human", as: "halt", params: {} })).toMatchObject({ ok: true, reply: "Halted." });
		expect(run.fact("hand.halted")).toBe(true);
		expect(events.filter((event) => event.actor === "human").map((event) => [event.type, event.tick])).toEqual([["tool_called", 2], ["halted", 2], ["tool_result", 2]]);
		expect(events.find((event) => event.type === "halted")?.payload).toEqual({ by: "human", resident: false });
		await run.playTicks(idleDriver, 1);
		expect(events.filter((event) => event.type === "activation_opened").map((event) => event.actor)).not.toContain("human");
		expect(run.kernel.tick).toBe(3);
	});

	it("refuses a resident's call of a `human` tool, and the human's call of a resident tool, as TOOL_NOT_GRANTED", async () => {
		const run = testKernel(game, { prompts });
		expect(await run.call("A01", "halt", {})).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(await run.kernel.submit({ actor: "human", as: "wave", params: {} })).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(run.fact("hand.halted")).toBe(false);
	});

	it("is absent from a game whose grant `human` holds no tool", () => {
		const run = testKernel(defineGame({ ...game, grants: { human: [] } }), { prompts });
		expect(run.fact("hand.seen")).toEqual(ACTORS.slice(0, 2));
		expect(run.kernel.toolSpecs("human")).toEqual([]);
	});
});
