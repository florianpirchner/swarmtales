// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the cast tests: a city of six residents with the real `ledger` and `channels`, a stand-in for
 * `progression` that writes a correct `submission` (`solve`), and a driver that makes the script's calls to the
 * service `cast` (a tool per method) and hands a direct message to a member in, as a router of `channels` would (`dmCast`).
 */
import { Type } from "typebox";
import type { Envelope } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { CastExtrasService, ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { defineGame, defineHead, defineMechanic, reply, type Game } from "@swarmtales/sdk";
import type { TestKernel } from "@swarmtales/testkit";
import { cast, CastService } from "../src/index.ts";

/** Stands in for `progression`: `solve` writes a correct submission of the level. */
const levels = defineMechanic(
	defineHead({ id: "progression", package: "@test/progression", summary: "Test: stands in for the progression.", events: ProgressionEvents.events, tools: { solve: { description: "Solve a level.", params: Type.Object({ level: Type.Integer() }), for: ["resident"] } } }),
	{
		tools: {
			solve: {
				run: ({ level }, ctx) => {
					ctx.emit("submission", { agent: ctx.resident ?? "", level, outcome: "correct", deltaPoints: 0 });
					return reply("");
				},
			},
		},
	},
);

const m = CastService.methods;
const tool = <T>(params: T) => ({ description: "Test: calls the cast.", params, for: ["resident"] });

/** The script's side (a tool per method of `cast`, and `active` of `cast-extras`), the router of a direct message (`dmCast`), the run's stream (`pick`). */
const driver = defineMechanic(
	defineHead({
		id: "driver",
		package: "@test/driver",
		summary: "Test: calls the cast.",
		requires: [CastService, CastExtrasService],
		tools: {
			active: tool(Type.Object({})),
			isActive: tool(m.isActive.input),
			reveal: tool(m.reveal.input),
			retire: tool(m.retire.input),
			setLevel: tool(m.setLevel.input),
			escrow: tool(m.escrow.input),
			startCollection: tool(m.startCollection.input),
			shortenCollection: tool(m.shortenCollection.input),
			revealCollection: tool(m.revealCollection.input),
			drawLottery: tool(m.drawLottery.input),
			collection: tool(m.collection.input),
			dmCast: tool(Type.Object({ target: Type.String(), message: Type.String(), number: Type.Integer() })),
			pick: tool(Type.Object({ labels: Type.Array(Type.Union([Type.String(), Type.Integer()])), items: Type.Array(Type.String()) })),
		},
	}),
	{
		tools: {
			active: { run: (_params, ctx) => reply(JSON.stringify(ctx.call(CastExtrasService, "active", {}))) },
			isActive: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "isActive", params))) },
			reveal: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "reveal", params))) },
			retire: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "retire", params))) },
			setLevel: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "setLevel", params))) },
			escrow: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "escrow", params))) },
			startCollection: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "startCollection", params))) },
			shortenCollection: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "shortenCollection", params))) },
			revealCollection: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "revealCollection", params))) },
			drawLottery: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "drawLottery", params))) },
			collection: { run: (params, ctx) => reply(JSON.stringify(ctx.call(CastService, "collection", params))) },
			pick: { run: ({ labels, items }, ctx) => reply(ctx.rng(...labels).pick(items)) },
			dmCast: {
				run: ({ target, message, number }, ctx) => {
					const from = ctx.resident ?? "";
					if (!ctx.call(CastService, "isActive", { cast: target })) return reply("inactive");
					const received = ctx.call(CastService, "receive", { from, cast: target, text: message.trim(), number });
					if (received.newSender.length > 0) ctx.call(CastService, "collected", { from, cast: target, into: received.newSender });
					return reply(JSON.stringify(received));
				},
			},
		},
	},
);

/**
 * Six residents with 10 points each, the cast with `options`, and its neighbours.
 *
 * @param options - The options of the cast.
 * @param ticks - The ticks.
 * @returns The game.
 */
export function game(options: Parameters<typeof cast>[0] = { members: { STEWARD: { level: 10, hidden: false, escrow: 10 } } }, ticks = 14): Game {
	return defineGame({
		id: "cast-test",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
		mechanics: [ledger({ startPoints: 10 }), channels(), levels(), cast(options), driver()],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks },
	});
}

/**
 * Calls a tool and gives what the caller reads: the reply, or `CODE: detail`.
 *
 * @param test - The kernel.
 * @param resident - The caller.
 * @param tool - The tool.
 * @param params - The params.
 * @returns The answer.
 */
export async function say(test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> {
	const outcome = await test.call(resident, tool, params);
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/**
 * A call of the script's side: one method of the cast, answered as JSON text.
 *
 * @param test - The kernel.
 * @param method - The method.
 * @param input - Its input.
 * @returns The answer.
 */
export function drive(test: TestKernel, method: string, input: object = {}): Promise<string> {
	return say(test, "A06", method, input);
}

/**
 * The payloads of the events of one type.
 *
 * @param events - The log.
 * @param type - The type.
 * @returns The payloads.
 */
export function payloads(events: readonly Envelope[], type: string): readonly unknown[] {
	return events.filter((event) => event.type === type).map((event) => event.payload);
}
