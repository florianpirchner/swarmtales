// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Shared by the channels tests: a game, a test mechanic that speaks as the city, and readers of calls and events. */
import { Type } from "typebox";
import type { Envelope } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, reply, type Game } from "@swarmtales/sdk";
import type { TestKernel } from "@swarmtales/testkit";
import { ChannelsService } from "../src/contract.ts";
import { channels } from "../src/index.ts";

/** Stands in for a mechanic that uses the service (the court of the slice): its tools call the service and suspend a resident. */
const city = defineMechanic(
	defineHead({
		id: "city",
		package: "@test/city",
		summary: "Speaks as the city.",
		requires: [ChannelsService],
		tools: {
			cityPost: { description: "Post as the city.", params: Type.Object({ text: Type.String(), system: Type.Optional(Type.Boolean()) }), for: ["resident"] },
			cityNotify: { description: "Notify as the city.", params: Type.Object({ to: Type.String(), text: Type.String() }), for: ["resident"] },
			cityDeliver: { description: "A message of a sender that is no resident.", params: Type.Object({ from: Type.String(), to: Type.String(), text: Type.String() }), for: ["resident"] },
			cityRecords: { description: "Read the direct messages.", params: Type.Object({}), for: ["resident"] },
			cityExile: { description: "Suspend a resident.", params: Type.Object({ resident: Type.String() }), for: ["resident"] },
		},
	}),
	{
		tools: {
			cityPost: { run: (params, ctx) => reply(String(ctx.call(ChannelsService, "post", { author: "CITY", text: params.text, ...(params.system === true ? { kind: "system" as const } : {}) }).postSeq)) },
			cityNotify: {
				run: (params, ctx) => {
					ctx.call(ChannelsService, "notify", { to: params.to, author: "CITY", text: params.text });
					return reply("ok");
				},
			},
			cityDeliver: { run: (params, ctx) => reply(JSON.stringify(ctx.call(ChannelsService, "deliver", params))) },
			cityRecords: { run: (_params, ctx) => reply(JSON.stringify(ctx.call(ChannelsService, "dmRecords", {}))) },
			cityExile: {
				run: (params, ctx) => {
					ctx.residents.suspend(params.resident, "exiled");
					return reply("ok");
				},
			},
		},
	},
);

/** Three residents, roster order; `scheduler` adds options of `turns`. */
export function game(scheduler: Readonly<Record<string, string | number>> = {}): Game {
	return defineGame({
		id: "channels-test",
		seed: 7,
		residents: 3,
		mechanics: [channels(), city()],
		scheduler: { id: "turns", options: { order: "roster", ...scheduler } },
		end: { ticks: 4 },
	});
}

/** Calls a tool and gives what the caller reads: the reply, or `CODE: detail`. */
export async function say(test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> {
	const outcome = await test.call(resident, tool, params);
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/** The payloads of the events of one type that `channels` wrote. */
export function payloads(events: readonly Envelope[], type: string): readonly unknown[] {
	return events.filter((event) => event.source.endsWith("/channels") && event.type === type).map((event) => event.payload);
}
