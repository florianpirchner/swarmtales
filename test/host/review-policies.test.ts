/**
 * Fixes of the challenger review (docs/design/core-review-2c.md), part 5: story policies per role
 * (problem 8) and limit windows that fit the old caps (problem 9): the old DM cap counts DMs and
 * memo transfers over two tools in aligned N-minute windows (world.ts:2130-2138).
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { playStory, scriptedAgent, type CallRecord } from "@swarmtales/testkit";
import type { ToolLimit } from "@swarmtales/contracts";

/** `poke` and `postBoard` for residents and the gamemaker; `sendDM` and `transfer` that share the cap `dm-cap` when `cap` is set. */
const town = (cap?: ToolLimit) =>
	defineMechanic(
		{
			id: "town",
			summary: "A test mechanic: tools of residents and the gamemaker.",
			options: Type.Object({}),
			state: () => undefined,
			events: {},
			prompts: { "town/poke": [], "town/post": [], "town/dm": [], "town/transfer": [] },
		},
		(kit) => ({
			tools: [
				kit.tool({ name: "poke", description: "town/poke", parameters: Type.Object({}), execute: (_params, ctx) => reply(`poked by ${ctx.actor}`) }),
				kit.tool({ name: "postBoard", description: "town/post", parameters: Type.Object({ text: Type.String() }), execute: () => reply("posted") }),
				kit.tool({ name: "sendDM", description: "town/dm", parameters: Type.Object({}), ...(cap === undefined ? {} : { limit: cap }), execute: () => reply("sent") }),
				kit.tool({ name: "transfer", description: "town/transfer", parameters: Type.Object({}), ...(cap === undefined ? {} : { limit: cap }), execute: () => reply("moved") }),
			],
		}),
	);

describe("story policies per role (review problem 8)", () => {
	it("binds a resident limit and rule only to residents, not to the gamemaker's call of the same tool", async () => {
		const story = defineCoreStory({
			id: "roles",
			seed: 1,
			minutes: 1,
			residents: 1,
			mechanics: [town().with()],
			grants: { resident: ["poke", "postBoard"], gamemaker: ["poke", "postBoard"] },
			tools: { resident: { poke: { limit: { max: 1, per: "minute" } }, postBoard: { rules: [{ kind: "maxLength", param: "text", max: 5 }] } } },
		});
		const host = createHost({ story });
		host.start();
		expect(await host.call("gamemaker", "poke", {})).toMatchObject({ ok: true });
		expect(await host.call("gamemaker", "poke", {})).toMatchObject({ ok: true });
		expect(await host.call("gamemaker", "postBoard", { text: "a long announcement" })).toMatchObject({ ok: true });
		expect(await host.call("resident:A01", "poke", {})).toMatchObject({ ok: true });
		expect(await host.call("resident:A01", "poke", {})).toMatchObject({ ok: false, code: "TOOL_LIMIT" });
		expect(await host.call("resident:A01", "postBoard", { text: "too long" })).toMatchObject({ ok: false, code: "TEXT_TOO_LONG" });
	});

	it("refuses a guard policy for another role than residents", () => {
		const story = defineCoreStory({
			id: "roles",
			seed: 1,
			minutes: 1,
			residents: 1,
			mechanics: [town().with()],
			grants: { gamemaker: ["postBoard"] },
			tools: { gamemaker: { postBoard: { guard: { rule: "No codes.", on: "block" } } } },
		});
		expect(() => createHost({ story })).toThrow(/guard covers residents only/);
	});
});

describe("aligned windows and shared counters (review problem 9)", () => {
	it("counts DMs and transfers together in windows of three minutes", async () => {
		const cap = { max: 2, per: { minutes: 3 }, key: "dm-cap" } as const;
		const story = defineCoreStory({ id: "cap", seed: 1, minutes: 7, residents: 1, mechanics: [town(cap).with()], grants: { resident: ["sendDM", "transfer"] } });
		const records: CallRecord[] = [];
		const plan = scriptedAgent((turn) => (turn.minute === 0 ? [{ tool: "sendDM", params: {} }, { tool: "transfer", params: {} }] : turn.minute % 2 === 1 ? [{ tool: "transfer", params: {} }] : [{ tool: "sendDM", params: {} }]), records);
		await playStory({ story }, plan);
		expect(records.map((record) => `${String(record.minute)} ${record.tool} ${record.outcome.ok ? "ok" : record.outcome.code}`)).toEqual([
			"0 sendDM ok",
			"0 transfer ok",
			"1 transfer TOOL_LIMIT",
			"2 sendDM TOOL_LIMIT",
			// Minute 3 opens the window 3-5.
			"3 transfer ok",
			"4 sendDM ok",
			"5 transfer TOOL_LIMIT",
			"6 sendDM ok",
		]);
	});

	it("refuses shared counters in different windows and windows without minutes", () => {
		const story = (first: ToolLimit, second: ToolLimit) => {
			const mixed = defineMechanic({ id: "mixed", summary: "Two capped tools.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "mixed/a": [], "mixed/b": [] } }, (kit) => ({
				tools: [
					kit.tool({ name: "a", description: "mixed/a", parameters: Type.Object({}), limit: first, execute: () => reply("") }),
					kit.tool({ name: "b", description: "mixed/b", parameters: Type.Object({}), limit: second, execute: () => reply("") }),
				],
			}));
			return defineCoreStory({ id: "mixed", seed: 1, minutes: 1, residents: 1, mechanics: [mixed.with()], grants: { resident: ["a", "b"] } });
		};
		expect(() => createHost({ story: story({ max: 1, per: { minutes: 3 }, key: "k" }, { max: 1, per: "minute", key: "k" }) })).toThrow(/different windows/);
		expect(() => createHost({ story: story({ max: 1, per: { minutes: 0 } }, { max: 1, per: "run" }) })).toThrow(/invalid window/);
	});
});
