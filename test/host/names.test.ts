/**
 * Open grant names (docs/design/overseer-api.md §2, step 18 step 2): overseers take grants under
 * their story names and act as `overseer:<name>`, `human` is a built-in, a tool's `serves` matches
 * an overseer's definition id, policies and limits bind one name, the referee registers the
 * built-ins first in the old order, and every load-time error of the table in §2.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createPromptLookup } from "@swarmtales/prompts";
import { actorOf, createHost, defineCoreStory, defineMechanic, reply, roleOf, type HostOptions } from "@swarmtales/kernel";
import type { CoreStory, MechanicUse, OverseerUse } from "@swarmtales/contracts";
import { PROOF_PROMPTS } from "./proof/story.ts";
import { stubOverseer, terminator } from "./proof/overseers.ts";

const Answer = Type.Object({ guilty: Type.Boolean() });

const dice = defineMechanic(
	{
		id: "dice",
		summary: "Test dice.",
		options: Type.Object({}),
		state: () => undefined,
		events: { rolled: Type.Object({ by: Type.String() }) },
		prompts: { "dice/roll": [], "dice/roll-resident": [], "dice/peek": [], "dice/accuse": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({ name: "roll", description: "dice/roll", parameters: Type.Object({}), serves: ["acme/terminator"], execute: (_p, ctx) => { ctx.emit("rolled", { by: ctx.actor }); return reply("rolled"); } }),
			kit.tool({ name: "roll", description: "dice/roll-resident", parameters: Type.Object({}), serves: ["resident"], execute: () => reply("resident roll") }),
			kit.tool({ name: "peek", description: "dice/peek", parameters: Type.Object({}), limit: { max: 5, per: "run" }, execute: () => reply("peeked") }),
			kit.tool({
				name: "accuse",
				description: "dice/accuse",
				parameters: Type.Object({}),
				consult: { role: "judge", question: Type.Object({}), answer: Answer, ask: () => ({}) },
				execute: (_p, _ctx, consulted) => reply(consulted.ok ? String(consulted.answer.guilty) : consulted.reason),
			}),
		],
	}),
);

const judge = stubOverseer({
	id: "judge",
	summary: "Decides.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	prompts: { "judge/system": [], "judge/question": ["question", "standingOrders"], "judge/verdict": [] },
	system: "judge/system",
	input: "judge/question",
	output: Answer,
	answer: { tool: "verdict", description: "judge/verdict" },
	model: { slot: "classifier" },
	lifetime: "short",
	triggers: [{ consult: true }],
});

interface Parts {
	readonly overseers?: readonly OverseerUse[];
	readonly grants?: CoreStory["grants"];
	readonly tools?: CoreStory["tools"];
	readonly decisions?: CoreStory["decisions"];
	readonly mechanics?: readonly MechanicUse[];
}

function storyOf(parts: Parts): CoreStory {
	return {
		id: "names",
		seed: 3,
		minutes: 3,
		residents: 2,
		mechanics: parts.mechanics ?? [dice.with()],
		overseers: parts.overseers ?? [player.as("terminator-1"), player.as("terminator-2")],
		grants: parts.grants ?? { resident: ["roll", "peek"], "terminator-1": ["roll", "peek"], "terminator-2": ["roll"], human: ["peek"] },
		...(parts.tools === undefined ? {} : { tools: parts.tools }),
		...(parts.decisions === undefined ? {} : { decisions: parts.decisions }),
	};
}

function hostOf(parts: Parts, options: Partial<HostOptions> = {}) {
	const host = createHost({ story: storyOf(parts), ...options });
	host.start();
	return host;
}

function loadError(parts: Parts, options: Partial<HostOptions> = {}): string {
	try {
		createHost({ story: storyOf(parts), ...options });
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	return "loaded";
}

describe("open grant names", () => {
	it("maps actors to grant names and back; built-ins act under their bare name", () => {
		expect(roleOf("resident:A01")).toBe("resident");
		expect(roleOf("overseer:terminator-1")).toBe("terminator-1");
		expect(roleOf("gamemaker")).toBe("gamemaker");
		expect(roleOf("script")).toBe("script");
		expect(roleOf("human")).toBe("human");
		expect(roleOf("host")).toBeUndefined();
		expect(actorOf("terminator-1")).toBe("overseer:terminator-1");
		expect(actorOf("gamemaker")).toBe("gamemaker");
		expect(actorOf("human")).toBe("human");
		expect(actorOf("script")).toBe("script");
		expect(() => actorOf("resident")).toThrow(/resident:<id>/);
	});

	it("lets an overseer call what its name is granted, as overseer:<name>, and nothing else", async () => {
		const host = hostOf({});
		expect(await host.call("overseer:terminator-1", "roll", {})).toEqual({ ok: true, reply: "rolled" });
		const called = host.log.all().filter((event) => event.type === "tool_called");
		expect(called.at(-1)?.actor).toBe("overseer:terminator-1");
		expect(host.log.ofType("dice", "rolled").at(-1)?.payload).toEqual({ by: "overseer:terminator-1" });
		expect(await host.call("overseer:terminator-2", "peek", {})).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(await host.call("overseer:nobody", "roll", {})).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(await host.call("human", "peek", {})).toEqual({ ok: true, reply: "peeked" });
		expect(await host.call("human", "roll", {})).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
	});

	it("finds the variant whose serves names the overseer's definition id, and the resident's own", async () => {
		const host = hostOf({});
		expect(await host.call("overseer:terminator-2", "roll", {})).toEqual({ ok: true, reply: "rolled" });
		expect(await host.call("resident:A01", "roll", {})).toEqual({ ok: true, reply: "resident roll" });
		expect(host.toolSpecs("terminator-1").map((spec) => [spec.name, spec.description])).toEqual([
			["roll", "dice/roll"],
			["peek", "dice/peek"],
		]);
		expect(host.toolSpecs("resident").map((spec) => spec.description)).toEqual(["dice/roll-resident", "dice/peek"]);
	});

	it("refuses two variants that one caller could reach: by a shared entry, or by name and definition id", () => {
		const twice = (serves: readonly string[]) =>
			defineMechanic({ id: "twice", summary: "x", options: Type.Object({}), state: () => undefined, events: {}, prompts: { x: [] } }, (kit) => ({
				tools: [
					kit.tool({ name: "x", description: "x", parameters: Type.Object({}), serves: ["acme/terminator"], execute: () => reply("") }),
					kit.tool({ name: "x", description: "x", parameters: Type.Object({}), serves, execute: () => reply("") }),
				],
			}));
		expect(loadError({ mechanics: [twice(["terminator-2"]).with()], grants: {} })).toMatch(/tool "x" is defined by "twice" too/);
		expect(loadError({ mechanics: [twice(["acme/terminator"]).with()], grants: {} })).toMatch(/tool "x" is defined by "twice" too/);
		expect(loadError({ mechanics: [twice(["resident", "judge"]).with()], grants: {} })).toBe("loaded");
	});

	it("binds a story policy to one grant name only", async () => {
		const host = hostOf({ tools: { "terminator-1": { roll: { limit: { max: 1, per: "run" } } } } });
		expect((await host.call("overseer:terminator-1", "roll", {})).ok).toBe(true);
		expect(await host.call("overseer:terminator-1", "roll", {})).toMatchObject({ ok: false, code: "TOOL_LIMIT" });
		expect((await host.call("overseer:terminator-2", "roll", {})).ok).toBe(true);
		expect((await host.call("overseer:terminator-2", "roll", {})).ok).toBe(true);
	});

	it("registers limits for the built-ins first in the old order, then human, then the overseers in story order", async () => {
		const limit = { limit: { max: 9, per: "run" as const } };
		const host = hostOf({
			grants: { resident: ["peek"], gamemaker: ["peek"], script: ["peek"], human: ["peek"], "terminator-1": ["peek"], "terminator-2": ["peek"] },
			tools: { "terminator-2": { peek: limit }, "terminator-1": { peek: limit }, human: { peek: limit }, script: { peek: limit }, gamemaker: { peek: limit }, resident: { peek: limit } },
		});
		for (const actor of ["resident:A01", "gamemaker", "script", "human", "overseer:terminator-1", "overseer:terminator-2"] as const) expect((await host.call(actor, "peek", {})).ok).toBe(true);
		// `peek#0` is the tool's own limit; the policies follow in registration order.
		expect(host.snapshot().referee.counts).toEqual({
			"peek#0|resident:A01": 1,
			"peek#1|resident:A01": 1,
			"peek#0|gamemaker": 1,
			"peek#2|gamemaker": 1,
			"peek#0|script": 1,
			"peek#3|script": 1,
			"peek#0|human": 1,
			"peek#4|human": 1,
			"peek#0|overseer:terminator-1": 1,
			"peek#5|overseer:terminator-1": 1,
			"peek#0|overseer:terminator-2": 1,
			"peek#6|overseer:terminator-2": 1,
		});
	});

	it("counts maxInterventions under overseer:<name> over every granted tool; the story's limit adds to the head's", async () => {
		const capped = stubOverseer({ ...headOf(terminator), id: "acme/capped", needs: [], limits: { maxInterventions: { max: 2, per: "run" } } });
		const host = hostOf({ overseers: [capped.as("capped-1", { limits: { maxInterventions: { max: 1, per: "minute" } } }), capped.as("capped-2")], grants: { "capped-1": ["peek", "accuse"], "capped-2": ["peek", "accuse"], resident: ["peek"] } });
		expect((await host.call("overseer:capped-1", "peek", {})).ok).toBe(true);
		expect(await host.call("overseer:capped-1", "accuse", {})).toMatchObject({ ok: false, code: "TOOL_LIMIT" });
		expect((await host.call("overseer:capped-2", "peek", {})).ok).toBe(true);
		expect((await host.call("overseer:capped-2", "accuse", {})).ok).toBe(true);
		expect(await host.call("overseer:capped-2", "peek", {})).toMatchObject({ ok: false, code: "TOOL_LIMIT" });
		// The limit binds the overseer's name only.
		for (let call = 0; call < 3; call++) expect((await host.call("resident:A01", "peek", {})).ok).toBe(true);
		expect(host.snapshot().referee.counts["shared:overseer:capped-2|overseer:capped-2"]).toBe(2);
	});

	it("loads today's stories with no overseers exactly as before", () => {
		const host = createHost({ story: defineCoreStory({ id: "plain", seed: 1, minutes: 1, residents: 1, mechanics: [dice.with()], grants: { resident: ["peek"] } }) });
		host.start();
		expect(host.log.all().map((event) => event.type)).toEqual(["run_started"]);
	});
});

function headOf(definition: typeof terminator) {
	return {
		id: definition.id,
		summary: definition.summary,
		options: definition.options,
		state: () => undefined,
		events: definition.events,
		prompts: { "terminator/system": [], "terminator/window": ["decision", "standingOrders"], "terminator/tools/decide": [] },
		system: "terminator/system",
		input: "terminator/window",
		output: definition.output,
		answer: { tool: "decide", description: "terminator/tools/decide" },
		model: definition.model,
		lifetime: definition.lifetime,
		triggers: definition.triggers,
		needs: definition.needs,
	} as const;
}

/** The terminator's head without needs: it plays, it holds nothing. */
const player = stubOverseer({ ...headOf(terminator), needs: [] });

describe("load-time errors of names (§2 table)", () => {
	it.each([
		["a built-in other than gamemaker", "script", /overseer name "script" is a built-in name/],
		["human", "human", /overseer name "human" is a built-in name/],
		["resident", "resident", /overseer name "resident" is a built-in name/],
		["the host", "host", /overseer name "host" is the host's/],
		["upper case and spaces", "Terminator 1", /overseer name "Terminator 1" is not lower case/],
		["a leading digit", "1-terminator", /overseer name "1-terminator" is not lower case/],
	])("refuses an overseer named after %s", (_what, name, error) => {
		expect(loadError({ overseers: [terminator.as(name)], grants: { [name]: ["amendDecision"] } })).toMatch(error);
	});

	it("allows an overseer named gamemaker, acting as gamemaker", async () => {
		const host = hostOf({ overseers: [player.as("gamemaker")], grants: { gamemaker: ["roll"] }, mechanics: [dice.with(), decider.with()] });
		expect(await host.call("gamemaker", "roll", {})).toEqual({ ok: true, reply: "rolled" });
	});

	it("refuses two overseers of one name", () => {
		expect(loadError({ overseers: [terminator.as("t-1"), terminator.as("t-1")], grants: {} })).toMatch(/two overseers are named "t-1"/);
	});

	it("refuses grants, policies and decision holders of an undeclared name", () => {
		expect(loadError({ grants: { terminater: ["roll"] } })).toMatch(/grants name "terminater", which is neither built in nor an overseer/);
		expect(loadError({ grants: { resident: ["peek"] }, tools: { terminater: { peek: { limit: { max: 1, per: "run" } } } } })).toMatch(/tools name "terminater"/);
		expect(loadError({ grants: { resident: ["peek"] }, decisions: { "decider.pick": { holders: ["terminater"] } } })).toMatch(/decisions name "terminater"/);
	});

	it("refuses a decision holder that is not granted amendDecision", () => {
		expect(loadError({ grants: { "terminator-1": ["amendDecision"], "terminator-2": ["roll"] }, decisions: { "decider.pick": { holders: ["terminator-2"] } }, mechanics: [dice.with(), decider.with()] })).toMatch(
			/"terminator-2" holds decider.pick but is not granted amendDecision/,
		);
	});

	it("refuses an overseer whose needs are not granted to its name", () => {
		expect(loadError({ overseers: [terminator.as("terminator-1")], grants: { "terminator-1": ["roll"] } })).toMatch(/overseer "terminator-1" \(acme\/terminator\) needs amendDecision/);
	});

	it("refuses amendDecision for residents", () => {
		expect(loadError({ grants: { resident: ["amendDecision"] }, overseers: [] })).toMatch(/amendDecision is granted to residents/);
	});

	it("refuses an overseer event that clashes with a core, a mechanic or another overseer event, and two definitions with one id", () => {
		const emitting = (id: string, type: string) => stubOverseer({ ...headOf(terminator), id, needs: [], events: { [type]: Type.Object({}) } });
		expect(loadError({ overseers: [emitting("a", "decision_settled").as("a-1")], grants: {} })).toMatch(/a: event "decision_settled" is reserved by the core/);
		expect(loadError({ overseers: [emitting("a", "rolled").as("a-1")], grants: {} })).toMatch(/a: event "rolled" is declared by "dice" too/);
		expect(loadError({ overseers: [emitting("a", "spun").as("a-1"), emitting("b", "spun").as("b-1")], grants: {} })).toMatch(/b: event "spun" is declared by "a" too/);
		expect(loadError({ overseers: [emitting("a", "spun").as("a-1"), emitting("a", "turned").as("a-2")], grants: {} })).toMatch(/two overseer definitions have the id "a"/);
		const one = emitting("a", "spun");
		expect(loadError({ overseers: [one.as("a-1"), one.as("a-2")], grants: {} })).toBe("loaded");
	});

	it("refuses a consult role served by an overseer and by the app's role caller", () => {
		const roles = { judge: { ask: () => Promise.resolve({ ok: false as const, error: "x", costUsd: 0 }) } };
		expect(loadError({ overseers: [judge.as("judge")], grants: {} }, { roles })).toMatch(/consult role "judge" is served by the overseer judge and by the app's role caller/);
		expect(loadError({ overseers: [judge.as("judge")], grants: {} })).toBe("loaded");
	});

	it("refuses a consult overseer whose output is another schema object than the tool's answer", () => {
		const own = stubOverseer({ ...headOf(terminator), id: "own-judge", needs: [], output: Type.Object({ guilty: Type.Boolean() }), triggers: [{ consult: true }] });
		expect(loadError({ overseers: [own.as("judge")], grants: {} })).toMatch(/overseer "judge" answers dice's accuse with another schema object/);
	});

	it("refuses an input prompt that does not take or does not end with {{standingOrders}}", () => {
		const early = stubOverseer({ ...headOf(terminator), id: "early", needs: [], prompts: { ...headOf(terminator).prompts, "terminator/early": ["decision", "standingOrders"] }, input: "terminator/early" });
		const prompts = createPromptLookup({ mechanics: { early: PROOF_PROMPTS, "acme/terminator": PROOF_PROMPTS } });
		expect(loadError({ overseers: [early.as("early-1")], grants: {} }, { prompts })).toMatch(/early: the input prompt "terminator\/early" does not end with \{\{standingOrders\}\}/);
		expect(loadError({ overseers: [terminator.as("t-1")], grants: { "t-1": ["amendDecision"] } }, { prompts })).toBe("loaded");
		// The types refuse such a head (`InputPromptId`); an erased definition (a plugin from JSON, later) meets the loader.
		const without = { ...terminator, id: "without", needs: [], prompts: { "terminator/system": [], "terminator/plain": ["decision"] }, input: "terminator/plain" };
		expect(loadError({ overseers: [{ name: "w-1", overseer: without, options: {} }], grants: {} })).toMatch(/without: the input prompt "terminator\/plain" does not take \{\{standingOrders\}\}/);
	});
});

/** A mechanic with one decision kind, so `decisions` policies have a kind to name. */
const decider = defineMechanic(
	{ id: "decider", summary: "Test decisions.", options: Type.Object({}), state: () => undefined, events: {}, decisions: { pick: Type.Object({ value: Type.Integer() }) } },
	() => ({ commits: { pick: () => undefined } }),
);
