// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The scripted run of the Confessor's tests: the statements of the old classifier's recording (`legacy`
 * `test/overseers/classifier.test.ts`, the old prompts in `fixtures/old-classifier.json`) said by stand-ins of
 * `channels` and `cast`, which write their events at the end of the tick, before the stand-in of the run frame writes
 * `round_end`. So the round's statements wait for the look after the round with or without the quiet triggers of
 * M5-67, which are not merged yet. A stand-in of `names` names A02 "Maren", as the old run did.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { nameOf, type ActorDriver, type DriverTable, type Kernel } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { defineGame, defineHead, defineMechanic, parseTake, reply, RESIDENT_KIND } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { confessor, confessorOptions, interpretations } from "../src/index.ts";
import { lookup } from "./support.ts";

/** The old recording: the prompt of every batch, and the events of the old interpreter. */
export const OLD = Parse(
	Type.Object({ prompts: Type.Array(Type.String()), events: Type.Array(Type.Record(Type.String(), Type.Unknown())) }),
	JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "old-classifier.json"), "utf8")),
);

/** One line of a statement in a prompt: the reference, who, where, the text as JSON. */
export const LINE = /^#(\d+) (A\d\d) (.+?): (".*")$/;

/** Whether a line of an old prompt is a resident's thought or aside, which no event of this platform carries. */
export const isPrivate = (line: string): boolean => line.includes("(private)");

const Payload = Type.Record(Type.String({ description: "A field" }), Type.Unknown({ description: "Its value" }), { description: "A payload" });
const Say = Type.Object({ event: Type.String({ description: "The event" }), payload: Payload }, { description: "An event to write at the tick's end" });
const Pending = Type.Object({ pending: Type.Array(Say, { description: "In order" }) }, { description: "The events of this tick" });

// A payload in the key order of the real event, so a resumed queue gives the firings back as the straight run had them.
const shaped = (...keys: readonly string[]) => Type.Object(Object.fromEntries(keys.map((key) => [key, Type.Unknown({ description: key })])), { description: "A payload" });
const EVENTS: Readonly<Record<string, ReturnType<typeof shaped>>> = { dm_sent: shaped("from", "to", "text", "number"), board_post: shaped("postSeq", "author", "text", "kind"), group_post: shaped("group", "author", "postSeq", "text"), cast_dm: shaped("from", "cast", "text", "collections") };

// A stand-in that writes what residents said at the end of the tick.
const speaker = (id: string, events: readonly string[]) =>
	defineMechanic(
		defineHead({ id, package: `@test/${id}`, summary: "Test: stands in.", state: Pending, start: () => ({ pending: [] }), events: Object.fromEntries(events.map((event) => [event, EVENTS[event] ?? Payload])), tools: { [`say${id}`]: { description: "Says.", params: Say, for: ["resident"] } } }),
		{
			tools: { [`say${id}`]: { run: (params, ctx) => (ctx.state.pending.push(params), reply("said")) } },
			hooks: { tickEnded: (ctx) => { for (const { event, payload } of ctx.state.pending.splice(0)) ctx.emit(event, payload); } },
		},
	);

const frame = defineMechanic(defineHead({ id: "arena", package: "@test/frame", summary: "Test: ends rounds.", events: { round_end: Type.Object({ round: Type.Integer({ description: "The tick plus one" }) }, { description: "A round" }) } }), {
	hooks: { tickEnded: (ctx) => { ctx.emit("round_end", { round: ctx.tick + 1 }); } },
});

const names = defineMechanic(defineHead({ id: "names", package: "@test/names", summary: "Test: stands in for identity.", provides: [IdentityService] }), {
	services: { identity: { nameOf: ({ resident }) => (resident === "A02" ? "Maren" : null), display: ({ text }) => text, resolve: ({ text }) => text } },
});

// The call that says one line of an old prompt, through the stand-in of `cast` or of `channels`.
function callOf(line: string): readonly [string, unknown] {
	const [, , agent = "", where = "", quoted = '""'] = LINE.exec(line) ?? [];
	const text: unknown = JSON.parse(quoted);
	const to = where.replace("DM to ", "");
	if (where.startsWith("DM to C")) return ["saycast", { event: "cast_dm", payload: { from: agent, cast: to, text, collections: [] } }];
	if (where.startsWith("DM")) return ["saychannels", { event: "dm_sent", payload: { from: agent, to, text, number: 1 } }];
	if (where.startsWith("in group")) return ["saychannels", { event: "group_post", payload: { group: where.slice(9), author: agent, postSeq: 1, text } }];
	return ["saychannels", { event: "board_post", payload: { postSeq: 1, author: agent, text, kind: "player" } }];
}

/** The calls of the run, by tick: A01 says every statement of the old minute, in the old order. */
export function scriptOf(): ReadonlyMap<number, readonly (readonly [string, unknown])[]> {
	const script = new Map<number, (readonly [string, unknown])[]>();
	for (const prompt of OLD.prompts) {
		const tick = Number(/\(minute (\d+)\)/.exec(prompt)?.[1]);
		const lines = prompt.split("Statements of this round:\n")[1]?.split("\n") ?? [];
		script.set(tick, [...(script.get(tick) ?? []), ...lines.filter((line) => !isPrivate(line)).map(callOf)]);
	}
	// The city's own post is no statement.
	script.get(0)?.splice(3, 0, ["saychannels", { event: "board_post", payload: { postSeq: 2, author: "A04", text: "The city speaks.", kind: "city" } }]);
	return script;
}

/** The options of the Confessor in the scripted run. */
export const OPTIONS = confessorOptions(lookup, { label: "test/classifier" });

/** The game: four residents, five ticks (rounds 1 to 4 are looked at; the fifth round has no slot left). */
export const GAME = defineGame({
	id: "confessed",
	seed: 3,
	residents: 4,
	mechanics: [names(), speaker("channels", ["dm_sent", "board_post", "group_post"])(), speaker("cast", ["cast_dm"])(), frame(), interpretations()],
	directors: [{ use: confessor, options: OPTIONS }],
	scheduler: { id: "turns", options: { order: "roster", afterBlocks: ["director"] } },
	end: { ticks: 5 },
});

/** What the Confessor's model answers to one question; undefined: no answer. */
export type Asker = (input: string, tick: number) => unknown;

// The engine's driver of a Director that acts on an answer (`packages/engine/src/directors/driver.ts`), which a
// mechanic's test may not import: take, build the context, ask, act on the answer or the fallback.
function confessorDriver(kernel: Kernel, ask: Asker, inputs: string[]): ActorDriver {
	return async (activation) => {
		const taken = await activation.call("take", {});
		const firings = taken.ok ? (parseTake(taken.reply)?.firings ?? []) : [];
		if (firings.length === 0) return;
		const ctx = { name: "confessor", options: confessor.parseOptions(OPTIONS), tick: activation.tick, firings, facts: Object.fromEntries(confessor.facts.map((key) => [key, kernel.fact(key)])) };
		const input = confessor.input(ctx);
		inputs.push(input);
		await confessor.act(ask(input, activation.tick) ?? confessor.fallback(ctx), { ...ctx, call: (tool, params) => activation.call(tool, params) });
	};
}

/**
 * The drivers of the scripted run.
 *
 * @param ask - The Confessor's model.
 * @param inputs - Gets every question.
 * @returns The drivers, for `play` and the standing checks.
 */
export function drivers(ask: Asker, inputs: string[] = []): (kernel: Kernel) => DriverTable {
	const script = scriptOf();
	const resident: ActorDriver = async (activation) => {
		if (nameOf(activation.actor) !== "A01") return;
		for (const [tool, params] of script.get(activation.tick) ?? []) await activation.call(tool, params);
	};
	return (kernel) => ({ [RESIDENT_KIND]: resident, "director:confessor": confessorDriver(kernel, ask, inputs) });
}
