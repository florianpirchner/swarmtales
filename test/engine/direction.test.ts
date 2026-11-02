import { describe, expect, it } from "vitest";
import { splitDirection } from "@swarmtales/sdk";
import { directionLevel } from "@swarmtales/contracts";
import type { RunOverrides } from "../../apps/cli/src/run-options.ts";
import { hostOracle } from "../../apps/cli/src/oracle.ts";
import { directFigure, FigureCues } from "../../apps/cli/src/host/direction.ts";
import { characterLines } from "../../apps/cli/src/host/report.ts";
import { gamemakerSystemPrompt } from "@swarmtales/roles";
import { oracleScript } from "@swarmtales/models";
import { createHostFixture, storyDefaults } from "../helpers/host-fixture.ts";
import { coreMotiveOf } from "../helpers/host-inspect.ts";

import cityOfKeys from "../../stories/cityofkeys/story.ts";

const FIGURES = cityOfKeys.coreMotives?.figures ?? [];
const CAST = ["banner", "second-chair", "house", "believer", "crier", "old-wound"];

/** The story's own defaults (the fixture's test defaults undone), names on and the six figures cast. */
function compose(overrides: RunOverrides) {
	return createHostFixture({
		story: cityOfKeys,
		...storyDefaults(cityOfKeys),
		names: true,
		agents: 6,
		cast: CAST,
		...overrides,
		script: (host) => oracleScript(host.residents, () => hostOracle(host), 50),
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
		const kinds = (minute: number) => cues.linesFor("A01", minute).map((text) => (text.startsWith("[you, in full]") ? "full" : "brief"));
		expect(kinds(3)).toEqual(["full", "brief"]);
		expect(kinds(12)).toEqual(["brief"]);
		expect(kinds(13)).toEqual(["full", "brief"]);
		expect(cues.linesFor("A02", 3)).toEqual([]);
	});

	it("plays figure direction 10: the figure first, no persona, orders last, rivals by resident", () => {
		const run = compose({ figureDirection: 10 });
		const house = run.host.residents.find((agent) => coreMotiveOf(run.host, agent)?.figure === "house");
		const believer = run.host.residents.find((agent) => coreMotiveOf(run.host, agent)?.figure === "believer");
		const prompt = run.runners().find((runner) => runner.id === house)?.systemPrompt ?? "";
		expect(prompt).not.toContain("Your character:");
		expect(prompt.indexOf("Who you are, deep inside")).toBeLessThan(prompt.indexOf("The city:"));
		expect(prompt.indexOf("Your orders")).toBeGreaterThan(prompt.indexOf("The city:"));
		expect(prompt).toContain(`- ${believer ?? "?"}: They will see through you.`);
		expect(prompt).toContain("Your duty this act:");
		expect(run.profiles.every((profile) => profile.persona === undefined)).toBe(true);
	});

	it("hands every step the figure's brief before the status line", async () => {
		const run = compose({ figureDirection: 6, minutes: 2 });
		await run.run();
		const inputs = run.log.events.flatMap((event) => (event.type === "turn_input" ? [event.inputs] : []));
		expect(inputs.length).toBeGreaterThan(0);
		for (const step of inputs) expect(step.some((text) => text.startsWith("[you] "))).toBe(true);
		expect(inputs[0]?.[0]).toMatch(/^\[you, in full\]/);
		expect(inputs[0]?.join("\n")).not.toContain("Your orders");
	}, 30_000);

	it("keeps the v12 prompt at the default level", () => {
		const plain = compose({});
		const prompt = plain.runners()[0]?.systemPrompt ?? "";
		expect(prompt).toContain("Your character:");
		expect(prompt).not.toContain("Your orders");
		expect(prompt).not.toContain("## Orders");
	});

	it("turns the director into an author at gm direction 10 and shows it the figures' orders", () => {
		const spec = cityOfKeys.gamemaker;
		if (spec === undefined) throw new Error("cityofkeys has a gamemaker");
		const input = { city: "NEXUS", agents: 6, survivors: 2, rules: cityOfKeys.rules, spec, tribunal: { factions: true }, characters: true, seal: true };
		const four = gamemakerSystemPrompt(input);
		const ten = gamemakerSystemPrompt({ ...input, direction: 10 });
		expect(four).toContain("Offer dilemmas, not instructions.");
		expect(ten).toContain("You are the author of this act");
		expect(ten).toContain("Write orders, not dilemmas");
		expect(ten).not.toContain("Never tell a resident what to do about its goal.");
		expect(gamemakerSystemPrompt({ ...input, direction: 8 })).toContain("tendency or one of its rivals");
		const run = compose({});
		const lines = (direction: 4 | 8 | 10) => characterLines(cityOfKeys, { facts: run.host.facts(), direction }, run.host.residents).join("\n");
		expect(lines(4)).not.toContain("orders:");
		expect(lines(8)).toContain("tendencies:");
		expect(lines(10)).toContain("orders:");
	});

	it("lets a resident refuse the gamemaker's order at gm direction 10, and shows the refusal to it", async () => {
		const off = compose({ figureDirection: 10, gmDirection: 8 });
		expect(off.host.openTools("A01")).not.toContain("defy");
		const run = createHostFixture({
			story: cityOfKeys,
			...storyDefaults(cityOfKeys),
			names: true,
			agents: 6,
			cast: CAST,
			figureDirection: 10,
			gmDirection: 10,
			script: () => ({}),
			gamemakerScript: () => [],
		});
		expect(run.host.openTools("A01")).toContain("defy");
		expect(run.runners()[0]?.systemPrompt).toContain("defy(reason, note)");
		expect((await run.host.call("resident:A01", "defy", { reason: "too short" })).ok).toBe(false);
		expect((await run.host.call("resident:A01", "defy", { reason: "The House never steals in the open; it collects.", note: 12 })).ok).toBe(true);
		const defied = run.log.events.filter((event) => event.type === "gamemaker_defied");
		expect(defied).toHaveLength(1);
		expect(run.gamemakerPrompt).toContain("A refusal is a turning point");
	});
});
