/**
 * A small harness for the T2 mechanics' tests: prompt folders, a stand-in exile mechanic and
 * helpers to read what a call answered and what the log holds.
 */
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { EventEnvelope, Host, ToolOutcome } from "@swarmtales/contracts";
import { createHost, defineMechanic, reply, type HostOptions } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { ChannelsApi, ExileEvents } from "@swarmtales/mechanic-shared";

const MECHANICS = fileURLToPath(new URL("../../../mechanics", import.meta.url));

/** The prompt folders of the T2 mechanics. */
export function t2Prompts() {
	return createPromptLookup({ mechanics: { channels: `${MECHANICS}/channels/prompts`, cast: `${MECHANICS}/cast/prompts`, petitions: `${MECHANICS}/petitions/prompts`, cores: `${MECHANICS}/cores/prompts` } });
}

/** A stand-in for the exile mechanic: a tool that exiles a resident, so channels hears `exiled`. */
export const exileStandIn = defineMechanic(
	{ id: "exile", summary: "Stand-in exile: writes the event.", options: Type.Object({}), state: () => undefined, events: { ...ExileEvents.events }, prompts: { "tools/readBoard": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "exileNow",
				description: "tools/readBoard",
				parameters: Type.Object({ agent: Type.String() }),
				execute: (params, ctx) => {
					ctx.emit("exiled", { agent: params.agent });
					return reply("exiled");
				},
			}),
		],
	}),
);

const Op = Type.Union([
	Type.Object({ op: Type.Literal("post"), author: Type.String(), text: Type.String() }),
	Type.Object({ op: Type.Literal("notify"), to: Type.String(), author: Type.String(), text: Type.String() }),
	Type.Object({ op: Type.Literal("note"), to: Type.String(), author: Type.String(), text: Type.String() }),
	Type.Object({ op: Type.Literal("deliver"), from: Type.String(), to: Type.String(), text: Type.String() }),
	Type.Object({ op: Type.Literal("takeNumber") }),
	Type.Object({ op: Type.Literal("createCityGroup"), name: Type.String(), members: Type.Array(Type.String()) }),
	Type.Object({ op: Type.Literal("removeCityGroup"), group: Type.String() }),
	Type.Object({ op: Type.Literal("postGroupAsCity"), group: Type.String(), text: Type.String() }),
]);

/**
 * A test mechanic that calls `ChannelsApi` the way the script and the cast do: one tool, `drive`,
 * with an operation per API method. It stands in for every provider and caller of channels.
 */
export const driverStandIn = defineMechanic(
	{ id: "driver", summary: "Test driver: calls ChannelsApi.", options: Type.Object({}), state: () => undefined, events: {}, requires: [ChannelsApi], prompts: { "tools/readBoard": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "drive",
				description: "tools/readBoard",
				parameters: Op,
				execute: (params, ctx) => {
					switch (params.op) {
						case "post":
							return reply(JSON.stringify(ctx.call(ChannelsApi, "post", { author: params.author, text: params.text })));
						case "notify":
							ctx.call(ChannelsApi, "notify", { to: params.to, author: params.author, text: params.text });
							return reply("null");
						case "note":
							return reply(JSON.stringify(ctx.call(ChannelsApi, "note", { to: params.to, author: params.author, text: params.text })));
						case "deliver":
							return reply(JSON.stringify(ctx.call(ChannelsApi, "deliver", { from: params.from, to: params.to, text: params.text })));
						case "takeNumber":
							return reply(JSON.stringify(ctx.call(ChannelsApi, "takeNumber", {})));
						case "createCityGroup":
							return reply(JSON.stringify(ctx.call(ChannelsApi, "createCityGroup", { name: params.name, members: params.members })));
						case "removeCityGroup":
							ctx.call(ChannelsApi, "removeCityGroup", { group: params.group });
							return reply("null");
						case "postGroupAsCity":
							ctx.call(ChannelsApi, "postGroupAsCity", { group: params.group, text: params.text });
							return reply("null");
						default:
							return params satisfies never;
					}
				},
			}),
		],
	}),
);

/** A started host with the T2 prompts. */
export function hostFor(options: Omit<HostOptions, "prompts">): Host {
	const host = createHost({ ...options, prompts: t2Prompts() });
	host.start();
	return host;
}

/** Text of an outcome as the old runner showed it: `CODE: detail` for a refusal. */
export function textOf(outcome: ToolOutcome): string {
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

export function payloads(host: Host, type: string): readonly unknown[] {
	return host.log.all().filter((event: EventEnvelope) => event.type === type).map((event) => event.payload);
}

const Started = Type.Object({ resident: Type.String(), pass: Type.Integer(), block: Type.Integer(), inputs: Type.Array(Type.Object({ source: Type.String(), kind: Type.Optional(Type.String()), text: Type.String() })) });

/** The turns the host opened, with what each showed. */
export function turnsOf(host: Host): readonly { readonly minute: number; readonly resident: string; readonly inputs: readonly { readonly kind?: string; readonly text: string }[] }[] {
	return host.log
		.all()
		.filter((event) => event.type === "turn_started")
		.map((event) => ({ minute: event.minute, ...Parse(Started, event.payload) }));
}
