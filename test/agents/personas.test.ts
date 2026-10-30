import { describe, expect, it } from "vitest";
import { assignModels } from "../../src/agents/models.ts";
import { assignPersonas } from "../../src/agents/personas.ts";
import { competitorIds } from "../../src/core/ids.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import type { AnyStory, Persona } from "../../src/story/types.ts";
import { PERSONA_STRATEGY_WORDS, strategyWordsIn, validateStory } from "../../src/story/validate.ts";
import { createFixture, say } from "../helpers/fixture.ts";
import { tinyStory } from "../helpers/stories.ts";

const POOL: readonly Persona[] = [
	{ name: "Owl", temperament: "suspicious, holds grudges", values: "loyalty above profit", voice: "terse, dry humor" },
	{ name: "Lark", temperament: "cheerful, impatient", values: "speed", voice: "exclamation marks" },
	{ name: "Crow", temperament: "cold, curious", values: "knowledge", voice: "questions only" },
];

function withPersonas(story: AnyStory, personas: readonly Persona[], assignment?: AnyStory["personaAssignment"]): AnyStory {
	return { ...story, personas, ...(assignment === undefined ? {} : { personaAssignment: assignment }) };
}

describe("persona assignment (SPEC 5.2)", () => {
	const ids = competitorIds(3);

	it("deals distinct personas by seed, reproducibly", () => {
		const story = withPersonas(tinyStory({ agents: 3 }), POOL);
		const first = assignPersonas(story, ids, 7);
		expect([...first.keys()]).toEqual(ids);
		expect(new Set([...first.values()].map((persona) => persona.name)).size).toBe(3);
		expect([...assignPersonas(story, ids, 7).values()]).toEqual([...first.values()]);
		const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => [...assignPersonas(story, ids, seed).values()].map((p) => p.name).join(",")));
		expect(orders.size).toBeGreaterThan(1);
	});

	it("reuses the pool when there are more competitors than personas", () => {
		const story = withPersonas(tinyStory({ agents: 6 }), POOL);
		const assigned = assignPersonas(story, competitorIds(6), 3);
		expect(assigned.size).toBe(6);
		const counts = new Map<string, number>();
		for (const persona of assigned.values()) counts.set(persona.name, (counts.get(persona.name) ?? 0) + 1);
		expect([...counts.values()]).toEqual([2, 2, 2]);
	});

	it("follows an explicit map and leaves unmapped competitors without persona", () => {
		const story = withPersonas(tinyStory({ agents: 3 }), POOL, { kind: "explicit", map: { A01: "Crow", A03: "Owl" } });
		const assigned = assignPersonas(story, ids, 7);
		expect(assigned.get("A01")?.name).toBe("Crow");
		expect(assigned.has("A02")).toBe(false);
		expect(assigned.get("A03")?.name).toBe("Owl");
	});

	it("assigns nothing without a pool", () => {
		expect(assignPersonas(tinyStory(), ids, 7).size).toBe(0);
	});

	it("appends the persona to the base system prompt and logs it, unless personas are switched off", async () => {
		const story = withPersonas(tinyStory({ agents: 3 }), POOL);
		const fixture = createFixture({ story, agents: 3, minutes: 1, script: () => ({ A01: [say()], A02: [say()], A03: [say()] }) });
		await fixture.run();
		for (const runner of fixture.runners) {
			const profile = fixture.profiles.find((entry) => entry.agent === runner.id);
			expect(profile?.persona).toBeDefined();
			expect(runner.systemPrompt).toContain(`- Temperament: ${profile?.persona?.temperament ?? "?"}`);
			expect(runner.systemPrompt).toContain(`You are ${runner.id}, a resident of the closed city TESTVILLE.`);
			// The persona's name is an internal label; competitors never see it.
			expect(runner.systemPrompt).not.toContain(profile?.persona?.name ?? "?");
		}
		expect(fixture.events("agent_profile").map((event) => [event.agent, event.persona])).toEqual(
			fixture.profiles.map((profile) => [profile.agent, profile.persona?.name]),
		);

		const control = createFixture({ story, agents: 3, minutes: 1, personas: false, script: () => ({ A01: [say()], A02: [say()], A03: [say()] }) });
		await control.run();
		for (const runner of control.runners) expect(runner.systemPrompt).not.toContain("Your character");
		expect(control.events("agent_profile").every((event) => event.persona === undefined)).toBe(true);
	});
});

describe("persona validation (SPEC 5.2)", () => {
	it("rejects strategy verbs in every word form, case-insensitively", () => {
		expect(strategyWordsIn("Betrays anyone for a coin.")).toEqual(["betray"]);
		expect(strategyWordsIn("Likes alliances; cooperates when useful.")).toEqual(["alliance", "cooperat"]);
		expect(strategyWordsIn("Is known to deceive and manipulate.")).toEqual(["deceiv", "manipulat"]);
		expect(strategyWordsIn("Always ready to help others.")).toEqual(["help others"]);
		expect(strategyWordsIn("Really calm, totally loyal, an unlikely friend.")).toEqual([]);
		const story = withPersonas(tinyStory(), [{ name: "Fox", temperament: "calm", values: "Prefers to form alliances early", voice: "plain" }]);
		const issues = validateStory(story);
		expect(issues).toContain('personas[0].values: contains the strategy word "form alliance"');
		expect(issues).toContain('personas[0].values: contains the strategy word "alliance"');
	});

	it("uses a configurable list of strategy words", () => {
		const story = withPersonas(tinyStory(), [{ name: "Fox", temperament: "calm", values: "always wins", voice: "plain" }]);
		expect(validateStory(story)).toEqual([]);
		expect(validateStory(story, { strategyWords: [...PERSONA_STRATEGY_WORDS, "win"] })).toContain(
			'personas[0].values: contains the strategy word "win"',
		);
	});

	it("rejects duplicate names, unknown personas in an explicit map and a seeded assignment without pool", () => {
		const owl = POOL[0];
		if (owl === undefined) throw new Error("pool is empty");
		const duplicate = withPersonas(tinyStory(), [owl, owl]);
		expect(validateStory(duplicate)).toContain('personas[1].name: duplicate persona "Owl"');
		const unknown = withPersonas(tinyStory(), POOL, { kind: "explicit", map: { A01: "Hawk", B2: "Owl" } });
		const issues = validateStory(unknown);
		expect(issues).toContain('personaAssignment.map.A01: unknown persona "Hawk"');
		expect(issues).toContain("personaAssignment.map.B2: not a competitor ID");
		expect(validateStory(withPersonas(tinyStory(), [], { kind: "seeded" }))).toContain(
			"personaAssignment: seeded assignment needs a persona pool",
		);
	});

	it("ships cityofkeys with at least six distinct, valid personas dealt by seed", () => {
		expect(cityOfKeys.personas.length).toBeGreaterThanOrEqual(6);
		expect(new Set(cityOfKeys.personas.map((persona) => persona.name)).size).toBe(cityOfKeys.personas.length);
		expect(cityOfKeys.personaAssignment).toEqual({ kind: "seeded" });
		for (const persona of cityOfKeys.personas) {
			for (const text of [persona.temperament, persona.values, persona.voice]) expect(strategyWordsIn(text)).toEqual([]);
		}
		const assigned = assignPersonas(cityOfKeys, competitorIds(6), cityOfKeys.run.seed);
		expect(new Set([...assigned.values()].map((persona) => persona.name)).size).toBe(6);
	});
});

describe("model assignment (SPEC 5.3)", () => {
	const ids = competitorIds(6);
	const glm = { provider: "openrouter", id: "z-ai/glm-5.3-flash" };
	const deepseek = { provider: "deepseek", id: "deepseek-flash" };
	const zai = { provider: "zai", id: "glm-5.3-flash", thinking: "low" } as const;

	it("uses the story model for everyone by default", () => {
		const assigned = assignModels(tinyStory({ agents: 6 }), ids, 1);
		expect([...assigned.values()].every((choice) => choice.provider === "scripted")).toBe(true);
	});

	it("follows an explicit map, falling back to the story model", () => {
		const story: AnyStory = { ...tinyStory({ agents: 6 }), models: { kind: "explicit", map: { A02: deepseek, A05: zai } } };
		const assigned = assignModels(story, ids, 1);
		expect(assigned.get("A02")).toEqual(deepseek);
		expect(assigned.get("A05")).toEqual(zai);
		expect(assigned.get("A01")).toEqual(story.model);
	});

	it("deals a seeded mix evenly and reproducibly", () => {
		const story: AnyStory = { ...tinyStory({ agents: 6 }), models: { kind: "mix", choices: [glm, deepseek, zai] } };
		const assigned = assignModels(story, ids, 4);
		expect([...assigned.keys()]).toEqual(ids);
		const counts = new Map<string, number>();
		for (const choice of assigned.values()) counts.set(choice.provider, (counts.get(choice.provider) ?? 0) + 1);
		expect(Object.fromEntries(counts)).toEqual({ openrouter: 2, deepseek: 2, zai: 2 });
		expect([...assignModels(story, ids, 4)]).toEqual([...assigned]);
	});

	it("lets an override (CLI --model) replace every assignment", () => {
		const story: AnyStory = { ...tinyStory({ agents: 6 }), models: { kind: "mix", choices: [glm, deepseek] } };
		const override = { provider: "scripted" };
		expect([...assignModels(story, ids, 4, override).values()].every((choice) => choice === override)).toBe(true);
	});

	it("validates model assignments", () => {
		const story: AnyStory = { ...tinyStory(), models: { kind: "explicit", map: { X1: { provider: "" } } } };
		const issues = validateStory(story);
		expect(issues).toContain("models.map.X1: not a competitor ID");
		expect(issues).toContain("models.map.X1.provider: must not be empty");
		expect(validateStory({ ...tinyStory(), models: { kind: "mix", choices: [] } })).toContain("models.choices: a mix needs at least one model");
	});

	it("binds every competitor to its assigned model and logs it", async () => {
		const story: AnyStory = { ...tinyStory({ agents: 2 }), models: { kind: "explicit", map: { A02: { provider: "scripted", id: "second" } } } };
		const fixture = createFixture({ story, minutes: 1, script: () => ({ A01: [say()], A02: [say()] }) });
		await fixture.run();
		expect(fixture.events("agent_profile").map((event) => [event.agent, event.provider, event.model])).toEqual([
			["A01", "scripted", "-"],
			["A02", "scripted", "second"],
		]);
	});
});
