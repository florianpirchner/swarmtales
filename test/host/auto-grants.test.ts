/**
 * `grants: "auto"` (docs/design/grants-auto.md): the grants derived from the tools' `suggest`, in load
 * order; tweaks (`set`, `drop`, `add`) per name; open overseer names (also by definition id); and the
 * load-time errors. The equality with the explicit lists of the real stories is in
 * test/mechanics/auto-grants-equality.test.ts.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineApi, defineCoreStory, defineMechanic, reply, type HostOptions } from "@swarmtales/kernel";
import type { CoreStory, MechanicUse, OverseerUse } from "@swarmtales/contracts";
import { stubOverseer } from "./proof/overseers.ts";

const none = Type.Object({});

const BaseApi = defineApi({ name: "base", summary: "Something the later mechanic requires.", methods: { ping: { kind: "query", summary: "Ping.", input: none, output: Type.Null() } } });

function suggesting(id: string, tools: readonly (readonly [string, readonly string[] | undefined])[], link?: "provides" | "requires") {
	return defineMechanic(
		{
			id,
			summary: `Test mechanic ${id}.`,
			options: none,
			state: () => undefined,
			events: {},
			prompts: { [`${id}/tool`]: [] },
			...(link === "provides" ? { provides: [BaseApi] } : {}),
			...(link === "requires" ? { requires: [BaseApi] } : {}),
		},
		(kit) => ({
			...(link === "provides" ? { services: [kit.provide(BaseApi, { ping: () => null })] } : {}),
			tools: tools.map(([name, suggest]) =>
				kit.tool({ name, description: `${id}/tool`, parameters: none, ...(suggest === undefined ? {} : { suggest }), execute: () => reply(`${id}:${name}`) }),
			),
		}),
	);
}

const first = suggesting("first", [["look", ["resident"]], ["shout", ["resident", "gamemaker"]], ["secret", undefined]], "provides");
const second = suggesting("second", [["nudge", ["gamemaker"]], ["look2", ["resident"]], ["stranger", ["nobody"]], ["fate", ["acme/roller"]]]);

const roller = stubOverseer({
	id: "acme/roller",
	summary: "Rolls.",
	options: none,
	state: () => undefined,
	events: {},
	prompts: { "roller/system": [], "roller/window": ["standingOrders"], "roller/tools/decide": [] },
	system: "roller/system",
	input: "roller/window",
	output: Type.Object({ reason: Type.String() }),
	answer: { tool: "decide", description: "roller/tools/decide" },
	model: { slot: "terminator" },
	lifetime: "short",
	triggers: [{ event: "core", type: "decision_proposed" }],
});

interface Parts {
	readonly mechanics?: readonly MechanicUse[];
	readonly overseers?: readonly OverseerUse[];
	readonly grants?: CoreStory["grants"];
	readonly grantTweaks?: CoreStory["grantTweaks"];
}

function storyOf(parts: Parts): CoreStory {
	return {
		id: "auto",
		seed: 1,
		minutes: 2,
		residents: 2,
		mechanics: parts.mechanics ?? [first.with(), second.with()],
		...(parts.overseers === undefined ? {} : { overseers: parts.overseers }),
		grants: parts.grants ?? "auto",
		...(parts.grantTweaks === undefined ? {} : { grantTweaks: parts.grantTweaks }),
	};
}

function hostOf(parts: Parts, options: Partial<HostOptions> = {}) {
	const host = createHost({ story: storyOf(parts), ...options });
	host.start();
	return host;
}

function loadError(parts: Parts): string {
	try {
		createHost({ story: storyOf(parts) });
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	return "loaded";
}

const toolsOf = (parts: Parts, role: string): readonly string[] => hostOf(parts).toolSpecs(role).map((spec) => spec.name);

describe("grants: auto", () => {
	it("grants every tool to the names it suggests, in load order, and nothing else", () => {
		expect(toolsOf({}, "resident")).toEqual(["look", "shout", "look2"]);
		expect(toolsOf({}, "gamemaker")).toEqual(["shout", "nudge"]);
		expect(toolsOf({}, "script")).toEqual([]);
		expect(toolsOf({}, "human")).toEqual([]);
	});

	it("follows the load order of the mechanics, not the order of the story", () => {
		const late = suggesting("late", [["after", ["resident"]]], "requires");
		expect(toolsOf({ mechanics: [late.with(), first.with()] }, "resident")).toEqual(["look", "shout", "after"]);
	});

	it("does not grant a tool without a suggestion, and the call is refused", async () => {
		const host = hostOf({});
		expect(await host.call("resident:A01", "secret", {})).toMatchObject({ ok: false });
		expect(await host.call("resident:A01", "look", {})).toEqual({ ok: true, reply: "first:look" });
	});

	it("drops a suggestion of a name the story does not know", () => {
		const host = hostOf({});
		expect(host.toolSpecs("nobody")).toEqual([]);
		expect(toolsOf({}, "resident")).not.toContain("stranger");
	});

	it("takes a suggestion that is a definition id for every overseer of that definition, and open names work", async () => {
		const parts = { overseers: [roller.as("roller-1"), roller.as("roller-2")] };
		const host = hostOf(parts);
		expect(host.toolSpecs("roller-1").map((spec) => spec.name)).toEqual(["fate"]);
		expect(host.toolSpecs("roller-2").map((spec) => spec.name)).toEqual(["fate"]);
		expect(await host.call("overseer:roller-2", "fate", {})).toEqual({ ok: true, reply: "second:fate" });
		expect(host.toolSpecs("resident").map((spec) => spec.name)).not.toContain("fate");
	});

	it("lists a tool once however often its suggestions name the same grant name", () => {
		const twice = suggesting("twice", [["again", ["resident", "resident", "roller-1", "acme/roller"]]]);
		const parts = { mechanics: [twice.with()], overseers: [roller.as("roller-1")] };
		expect(toolsOf(parts, "resident")).toEqual(["again"]);
		expect(toolsOf(parts, "roller-1")).toEqual(["again"]);
	});

	it("lets a tweak replace, drop and extend the derived list of a name", () => {
		const grantTweaks = {
			resident: { drop: ["shout"], add: ["secret", "look"] },
			gamemaker: { set: ["secret"], add: ["nudge"] },
		} as const;
		expect(toolsOf({ grantTweaks }, "resident")).toEqual(["look", "look2", "secret"]);
		expect(toolsOf({ grantTweaks }, "gamemaker")).toEqual(["secret", "nudge"]);
	});

	it("grants tools to a name that derived nothing, by a tweak", async () => {
		const parts = { grantTweaks: { script: { add: ["nudge"] } } };
		const host = hostOf(parts);
		expect(host.toolSpecs("script").map((spec) => spec.name)).toEqual(["nudge"]);
		expect(await host.call("script", "nudge", {})).toEqual({ ok: true, reply: "second:nudge" });
	});

	it("derives the same grants as the explicit story that lists them", () => {
		const explicit = storyOf({ grants: { resident: ["look", "shout", "look2"], gamemaker: ["shout", "nudge"] } });
		const derived = storyOf({});
		for (const role of ["resident", "gamemaker", "script", "human"]) {
			const names = (story: CoreStory) => createHost({ story }).toolSpecs(role).map((spec) => spec.name);
			expect(names(derived)).toEqual(names(explicit));
		}
	});

	it("still checks the derived grants like explicit ones (overseer needs, human tools)", () => {
		const needy = stubOverseer({ ...headOfRoller(), needs: ["nudge"] });
		expect(loadError({ overseers: [needy.as("needy")] })).toMatch(/overseer "needy".*needs nudge/);
		expect(loadError({ overseers: [needy.as("needy")], grantTweaks: { needy: { add: ["nudge"] } } })).toBe("loaded");
		expect(loadError({ grantTweaks: { resident: { add: ["pause"] } } })).toMatch(/pause is granted to "resident", but only the human uses it/);
	});

	const refused: readonly (readonly [string, Parts, RegExp])[] = [
		["a tweak for an unknown name", { grantTweaks: { terminater: { add: ["look"] } } }, /grants name "terminater", which is neither built in nor an overseer/],
		["a tweak for a tool no mechanic defines", { grantTweaks: { resident: { add: ["missing"] } } }, /tool "missing" is granted, locked or configured, but no loaded mechanic defines it/],
		["a drop of a tool no mechanic defines (F2 m3)", { grantTweaks: { resident: { drop: ["shuot"] } } }, /grantTweaks\.resident\.drop names tool "shuot", which no loaded mechanic defines/],
		["a set with a tool no mechanic defines (F2 m3)", { grantTweaks: { resident: { set: ["look", "shuot"] } } }, /grantTweaks\.resident\.set names tool "shuot", which no loaded mechanic defines/],
		["tweaks with an explicit list", { grants: { resident: ["look"] }, grantTweaks: { resident: { add: ["shout"] } } }, /grantTweaks only apply with grants: "auto"/],
	];
	it.each(refused)("refuses %s", (_what, parts, error) => {
		expect(loadError(parts)).toMatch(error);
	});

	it("keeps an explicit story untouched", () => {
		const host = createHost({ story: defineCoreStory({ id: "plain", seed: 1, minutes: 1, residents: 1, mechanics: [first.with()], grants: { resident: ["secret"] } }) });
		expect(host.toolSpecs("resident").map((spec) => spec.name)).toEqual(["secret"]);
	});
});

function headOfRoller() {
	return {
		id: roller.id,
		summary: roller.summary,
		options: roller.options,
		state: () => undefined,
		events: roller.events,
		prompts: { "roller/system": [], "roller/window": ["standingOrders"], "roller/tools/decide": [] },
		system: "roller/system",
		input: "roller/window",
		output: roller.output,
		answer: { tool: "decide", description: "roller/tools/decide" },
		model: roller.model,
		lifetime: roller.lifetime,
		triggers: roller.triggers,
	} as const;
}
