import { describe, expect, it } from "vitest";
import { splitDirection } from "../../src/cast/figures.ts";
import { composeRun, type RunOverrides } from "../../src/cli/compose.ts";
import { worldOracle } from "../../src/cli/oracle.ts";
import { directFigure, directionLevel, FigureCues } from "../../src/engine/direction.ts";
import { MemorySink } from "../../src/engine/events.ts";
import { characterLines } from "../../src/gamemaster/situation.ts";
import { gamemasterSystemPrompt } from "../../src/gamemaster/system-prompt.ts";
import { oracleScript } from "../../src/model/scripted.ts";
import { ScriptedModelSource } from "../../src/model/source.ts";

import nexus from "../../stories/nexus/story.ts";

const FIGURES = nexus.cores?.figures ?? [];
const CAST = ["banner", "second-chair", "house", "believer", "crier", "old-wound"];

function compose(overrides: RunOverrides, log = new MemorySink()) {
	return composeRun({
		story: nexus,
		overrides: { names: true, agents: 6, cast: CAST, ...overrides },
		models: (world) => new ScriptedModelSource(oracleScript(world.competitors, () => worldOracle(world), 50)),
		sinks: [log],
	});
}

describe("the direction dial", () => {
	it("rounds a value down to its defined level", () => {
		expect([0, 3, 4, 5, 6, 7, 8, 9, 10].map(directionLevel)).toEqual([0, 0, 4, 4, 6, 6, 8, 8, 10]);
		expect(() => directionLevel(11)).toThrow();
	});

	it("splits a figure's direction sections from who it is", () => {
		const split = splitDirection("## Who you are\n\nA.\n\n## Orders\n\n- Lie.\n- Betray.\n\n## Rivals\n\n- house: Watch them.\n\n## In brief\n\nShort.", "test");
		expect(split.body).toBe("## Who you are\n\nA.");
		expect(split.direction).toEqual({ brief: "Short.", tendencies: [], orders: ["Lie.", "Betray."], rivals: [{ figure: "house", text: "Watch them." }] });
		expect(splitDirection("## Who you are\n\nA.", "test")).toEqual({ body: "## Who you are\n\nA." });
		expect(() => splitDirection("## Orders\n\nnot a bullet", "test")).toThrow(/"- " lines only/);
		const house = FIGURES.find((figure) => figure.id === "house");
		expect(house?.text).not.toContain("## Orders");
		expect(house?.direction?.orders.length).toBeGreaterThan(0);
	});

	it("shows more of a figure with every level", () => {
		const direction = FIGURES.find((figure) => figure.id === "house")?.direction;
		const playedBy = (figure: string) => (figure === "believer" ? "A03" : undefined);
		expect(directFigure(4, direction, playedBy)).toBeUndefined();
		expect(directFigure(6, direction, playedBy)).toMatchObject({ tendencies: [], rivals: [], orders: [] });
		const eight = directFigure(8, direction, playedBy);
		expect(eight?.rivals.map((rival) => rival.agent)).toEqual(["A03"]);
		expect(eight?.rivals[0]?.text).toContain("see through you");
		expect(eight?.orders).toEqual([]);
		expect(directFigure(10, direction, playedBy)?.duty).toContain("promise");
	});

	it("repeats the full figure every ten minutes and the brief in every step", () => {
		const cues = new FigureCues(new Map([["A01", { brief: "[you] short", full: "long" }]]));
		const kinds = (minute: number) => cues.inputsFor("A01", minute).map((input) => input.text.startsWith("[you, in full]") ? "full" : "brief");
		expect(kinds(3)).toEqual(["full", "brief"]);
		expect(kinds(12)).toEqual(["brief"]);
		expect(kinds(13)).toEqual(["full", "brief"]);
		expect(cues.inputsFor("A02", 3)).toEqual([]);
	});

	it("plays figure direction 10: the figure first, no persona, orders last, rivals by resident", () => {
		const run = compose({ figureDirection: 10 });
		const house = run.world.competitors.find((agent) => run.world.coreOf(agent)?.figure === "house");
		const believer = run.world.competitors.find((agent) => run.world.coreOf(agent)?.figure === "believer");
		const prompt = run.runners.find((runner) => runner.id === house)?.systemPrompt ?? "";
		expect(prompt).not.toContain("Your character:");
		expect(prompt.indexOf("Who you are, deep inside")).toBeLessThan(prompt.indexOf("The city:"));
		expect(prompt.indexOf("Your orders")).toBeGreaterThan(prompt.indexOf("The city:"));
		expect(prompt).toContain(`- ${believer ?? "?"}: They will see through you.`);
		expect(prompt).toContain("Your duty this act:");
		expect(run.profiles.every((profile) => profile.persona === undefined)).toBe(true);
	});

	it("hands every step the figure's brief before the status line", async () => {
		const log = new MemorySink();
		await compose({ figureDirection: 6, minutes: 2 }, log).arena.run();
		const inputs = log.events.flatMap((event) => (event.type === "turn_input" ? [event.inputs] : []));
		expect(inputs.length).toBeGreaterThan(0);
		for (const step of inputs) expect(step.some((text) => text.startsWith("[you] "))).toBe(true);
		expect(inputs[0]?.[0]).toMatch(/^\[you, in full\]/);
		expect(inputs[0]?.join("\n")).not.toContain("Your orders");
	}, 30_000);

	it("keeps the v12 prompt at the default level", () => {
		const plain = compose({});
		const prompt = plain.runners[0]?.systemPrompt ?? "";
		expect(prompt).toContain("Your character:");
		expect(prompt).not.toContain("Your orders");
		expect(prompt).not.toContain("## Orders");
	});

	it("turns the director into an author at gm direction 10 and shows it the figures' orders", () => {
		const spec = nexus.gamemaster;
		if (spec === undefined) throw new Error("nexus has a game master");
		const input = { city: "NEXUS", agents: 6, survivors: 2, rules: nexus.rules, spec, tribunal: { factions: true }, characters: true, seal: true };
		const four = gamemasterSystemPrompt(input);
		const ten = gamemasterSystemPrompt({ ...input, direction: 10 });
		expect(four).toContain("Offer dilemmas, not instructions.");
		expect(ten).toContain("You are the author of this act");
		expect(ten).toContain("Write orders, not dilemmas");
		expect(ten).not.toContain("Never tell a resident what to do about its goal.");
		expect(gamemasterSystemPrompt({ ...input, direction: 8 })).toContain("tendency or one of its rivals");
		const run = compose({});
		expect(characterLines(run.world, 4).join("\n")).not.toContain("orders:");
		expect(characterLines(run.world, 8).join("\n")).toContain("tendencies:");
		expect(characterLines(run.world, 10).join("\n")).toContain("orders:");
	});
});
