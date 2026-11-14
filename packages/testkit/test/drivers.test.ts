// SPDX-License-Identifier: Apache-2.0
import type { Envelope } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { fakeDriver, idleDriver, scriptedDriver, type CallRecord } from "../src/drivers.ts";
import { play } from "../src/play.ts";

const head = defineHead({
	id: "bell",
	package: "@test/bell",
	summary: "A bell to ring.",
	state: Type.Object({ rings: Type.Integer() }),
	start: () => ({ rings: 0 }),
	tools: {
		look: { description: "Shows the rings.", params: Type.Object({}), for: ["resident"], free: true },
		stop: { description: "Ends the turn.", params: Type.Object({}), for: ["resident"] },
		ring: { description: "Rings the bell.", params: Type.Object({ times: Type.Integer({ minimum: 1 }) }), for: ["resident"] },
	},
});
const bell = defineMechanic(head, {
	tools: {
		look: { run: (_params, ctx) => reply(`Rings: ${String(ctx.state.rings)}`) },
		stop: { run: () => reply("Stopped.", { endsTurn: true }), sample: (ctx) => (ctx.state.rings >= 2 ? {} : undefined) },
		ring: {
			run(params, ctx) {
				ctx.state.rings += params.times;
				return reply(`Rings: ${String(ctx.state.rings)}`);
			},
			sample: (_ctx, random) => ({ times: random.int(1, 1) }),
		},
	},
});

const roster = { id: "turns", options: { order: "roster" } } as const;
const game = defineGame({ id: "bell", residents: 2, mechanics: [bell()], scheduler: roster, end: { ticks: 2 } });
const calls = (events: readonly Envelope[]): readonly string[] => events.filter((event) => event.type === "tool_called").map((event) => `${String(event.tick)} ${event.actor} ${String(event.tool).split("/").at(-1) ?? ""}`);

describe("scriptedDriver and idleDriver", () => {
	it("makes the planned calls in order, each awaited, and records every outcome", async () => {
		const record: CallRecord[] = [];
		const plan = scriptedDriver((activation) => Promise.resolve(activation.tick === 0 ? [{ tool: "ring", params: { times: 2 } }, { tool: "ring", params: { times: 0 } }, { tool: "look", params: {} }] : []), record);
		const { events } = await play(game, { drivers: { "resident:A01": plan, resident: idleDriver } });
		expect(record).toEqual([
			{ tick: 0, actor: "resident:A01", tool: "ring", outcome: { ok: true, reply: "Rings: 2" } },
			{ tick: 0, actor: "resident:A01", tool: "ring", outcome: { ok: false, code: "INVALID_ARGUMENTS" } },
			{ tick: 0, actor: "resident:A01", tool: "look", outcome: { ok: true, reply: "Rings: 2" } },
		]);
		expect(calls(events)).toEqual(["0 resident:A01 ring", "0 resident:A01 ring", "0 resident:A01 look"]);
		expect(events.filter((event) => event.type === "activation_opened")).toHaveLength(4);
	});

	it("an actor without a driver ends the run with SWT-R011", async () => {
		await expect(play(game, { drivers: { "resident:A01": idleDriver } })).rejects.toMatchObject({ code: "SWT-R011" });
	});
});

describe("fakeDriver", () => {
	const fake = (played: Parameters<typeof play>[0], seed = 1) => play(played, { drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });

	it("calls the first open tool that samples, until a reply ends the turn", async () => {
		const { events } = await fake(game);
		// `look` never samples; `stop` samples once the bell rang twice.
		expect(calls(events)).toEqual(["0 resident:A01 ring", "0 resident:A01 ring", "0 resident:A01 stop", "0 resident:A02 stop", "1 resident:A01 stop", "1 resident:A02 stop"]);
	});

	it("stops after 8 calls when no reply ends the turn", async () => {
		const endless = defineGame({ id: "bell", residents: 1, mechanics: [bell()], grants: { resident: { drop: ["stop"] } }, end: { ticks: 1 } });
		const { events, kernel } = await fake(endless);
		expect(calls(events)).toEqual(Array.from({ length: 8 }, () => "0 resident:A01 ring"));
		expect(kernel.ended).toEqual({ reason: "ticks", tick: 1 });
	});

	it("makes no call when no open tool samples", async () => {
		const locked = defineGame({ id: "bell", residents: 1, mechanics: [bell()], locked: ["ring"], end: { ticks: 1 } });
		expect(calls((await fake(locked)).events)).toEqual([]);
	});
});
