/**
 * Resident names (v08, SPEC 18): chosen once in the first minutes, a seeded
 * fallback for the rest, names in every text a resident reads, names as
 * aliases in every tool, and IDs in events and snapshots.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides } from "../../apps/cli/src/compose.ts";
import { NameBook, withResidents } from "@swarmtales/engine";
import { ScriptedModelSource } from "@swarmtales/models";
import { readSnapshot, MemorySink } from "@swarmtales/chronicle";
import { validateStory } from "@swarmtales/sdk";
import type { AnyStory, NamesSpec } from "@swarmtales/contracts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { act, createFixture, say } from "../helpers/fixture.ts";

const SPEC: NamesSpec = { untilMinute: 2, announcement: "Choose before minute {untilMinute}.", fallbackWords: ["Stone", "Ash"] };

function book(seed = 7): { readonly names: NameBook; readonly announced: string[] } {
	const announced: string[] = [];
	const names = new NameBook({
		spec: SPEC,
		ids: ["A01", "A02", "A03", "A04"],
		seed,
		reserved: ["CITY", "COURIER", "STEWARD", "NEXUS"],
		announce: (entry) => announced.push(`${entry.agent}=${entry.name}${entry.fallback ? "*" : ""}`),
	});
	return { names, announced };
}

describe("choosing a name", () => {
	it("refuses names that break a rule, with clear codes", () => {
		const { names } = book();
		const refused = (name: string) => {
			const result = names.choose("A01", name, 0);
			return result.ok ? "ok" : result.error;
		};
		expect(["Mo", "7even", "Mira Bell", "M".repeat(17), "Mira!"].map(refused)).toEqual(["NAME_INVALID", "NAME_INVALID", "NAME_INVALID", "NAME_INVALID", "NAME_INVALID"]);
		expect(["A07", "a99", "Stone-A12", "GT1", "R-0042"].map(refused)).toEqual(["NAME_ID", "NAME_ID", "NAME_ID", "NAME_ID", "NAME_ID"]);
		expect(["city", "Courier", "STEWARD", "Nexus"].map(refused)).toEqual(["NAME_RESERVED", "NAME_RESERVED", "NAME_RESERVED", "NAME_RESERVED"]);
		expect(refused("Mira-2")).toBe("ok");
	});

	it("names no resident ID in a refusal, since the city renders IDs as names (v08 Act I run: 'such as Ansgar')", () => {
		const result = book().names.choose("A01", "A07", 0);
		expect(result.ok ? "" : result.detail).not.toMatch(/A\d/);
	});

	it("is unique without case, permanent, and closes at its minute", () => {
		const { names, announced } = book();
		expect(names.choose("A01", "Mira", 0).ok).toBe(true);
		expect(names.choose("A02", "MIRA", 0)).toMatchObject({ ok: false, error: "NAME_TAKEN" });
		expect(names.choose("A01", "Ilse", 1)).toMatchObject({ ok: false, error: "NAME_CHOSEN", detail: "you are called Mira; a name is chosen once" });
		expect(names.canChoose("A02", 1)).toBe(true);
		expect(names.canChoose("A02", 2)).toBe(false);
		expect(names.choose("A02", "Ilse", 2)).toMatchObject({ ok: false, error: "NAME_CLOSED" });
		expect(announced).toEqual(["A01=Mira"]);
	});

	it("names whoever has none when the choice closes: seeded, unique, in the word-and-digits style", () => {
		const first = book();
		first.names.choose("A02", "Ilse", 0);
		first.names.settle(1);
		expect(first.announced).toEqual(["A02=Ilse"]);
		first.names.settle(2);
		expect(first.announced).toHaveLength(4);
		const given = ["A01", "A03", "A04"].map((agent) => first.names.nameOf(agent) ?? "");
		for (const name of given) expect(name).toMatch(/^(Stone|Ash)-\d{4}$/);
		expect(new Set(given).size).toBe(3);
		expect(first.announced.slice(1).every((entry) => entry.endsWith("*"))).toBe(true);
		// The same seed gives the same names; settling twice changes nothing.
		const second = book();
		second.names.choose("A02", "Ilse", 0);
		second.names.settle(2);
		second.names.settle(3);
		expect(second.announced).toEqual(first.announced);
	});

	it("resolves names and IDs without case, and shows names in texts", () => {
		const { names } = book();
		names.choose("A01", "Mira", 0);
		names.choose("A02", "Ilse", 0);
		expect(["mira", " MIRA ", "a02", "A03", "Nobody"].map((value) => names.resolve(value))).toEqual(["A01", "A01", "A02", "A03", undefined]);
		expect(names.display("A01 pays A02; A03 waits")).toBe("Mira pays Ilse; A03 waits");
		// The city's announcement, piece references and codes keep their IDs; a password fragment too.
		expect(names.display("A01 is now called Mira.")).toBe("A01 is now called Mira.");
		expect(names.display("L8-counter-A02 and XA01 and A01x")).toBe("L8-counter-A02 and XA01 and A01x");
		expect(names.display("fragment A02, from A02", (token) => token === "A02")).toBe("fragment A02, from A02");
		expect(names.label("A01")).toBe("Mira (A01)");
		expect(names.label("A03")).toBe("A03");
	});

	it("restores from a snapshot", () => {
		const { names } = book();
		names.choose("A01", "Mira", 0);
		names.settle(2);
		const copy = book();
		copy.names.restore(names.snapshot());
		expect(copy.announced).toEqual([]);
		expect(copy.names.snapshot()).toEqual(names.snapshot());
		expect(copy.names.resolve("mira")).toBe("A01");
		expect(copy.names.canChoose("A01", 0)).toBe(false);
	});

	it("maps resident parameters at any depth and leaves the rest", () => {
		const resolve = (value: string) => (value.toLowerCase() === "mira" ? "A01" : value);
		expect(withResidents({ target: "mira", message: "mira", bequests: [{ to: "Mira", points: 3 }], level: 2 }, resolve)).toEqual({
			target: "A01",
			message: "mira",
			bequests: [{ to: "A01", points: 3 }],
			level: 2,
		});
	});

	it("validates the story's names", () => {
		const issues = validateStory({ ...cityOfKeys, names: { untilMinute: 0, announcement: "{when}", fallbackWords: ["Courier", "Very-long-word"] } });
		expect(issues).toEqual(
			expect.arrayContaining([
				"names.untilMinute: must be an integer >= 1",
				"names.announcement: unknown placeholder {when}",
				'names.fallbackWords: "Very-long-word" must be 2 to 11 letters',
				'names.fallbackWords: "Courier" is a name of the city or its cast',
			]),
		);
		expect(validateStory(cityOfKeys)).toEqual([]);
	});
});

/** The City of Keys with the board, DMs and transfers on its first door, so names meet every kind of text. */
const talkative: AnyStory = {
	...cityOfKeys,
	levels: cityOfKeys.levels.map((entry) => (entry.number === 1 ? { ...entry, tools: [...entry.tools, "readBoard", "sendDM", "transferPoints"] } : entry)),
};

describe("names in a run", () => {
	it("announces the choice, takes chooseName once, names the rest at minute 2, and shows names everywhere", async () => {
		const fixture = createFixture({
			story: talkative,
			agents: 6,
			minutes: 4,
			lastLevel: 1,
			names: true,
			script: () => ({
				A01: [act({ name: "chooseName", args: { name: "Mira" } }), act({ name: "chooseName", args: { name: "Ilse" } }), say(), act({ name: "readBoard" })],
				A02: [act({ name: "chooseName", args: { name: "mira" } }), act({ name: "sendDM", args: { target: "MIRA", message: "Hello A01, A03 is quiet." } }), act({ name: "sendDM", args: { target: "a03", message: "I am A02." } }), say()],
				A03: [say(), say(), say(), act({ name: "transferPoints", args: { target: "mira", amount: 1, memo: "for you" } })],
				A04: [say(), say(), say(), say()],
				A05: [say(), say(), say(), say()],
				A06: [say(), say(), say(), say()],
			}),
		});
		await fixture.run();
		// The first task and the system prompt announce the choice; chooseName is gone at minute 2.
		expect(fixture.inputsOf("A01")[1]).toContain('chooseName(name="..."), before minute 2');
		expect(fixture.runners[0]?.systemPrompt).toContain("Before minute 2 you choose the name the city knows you by, once, with chooseName");
		expect(fixture.events("request").filter((event) => event.agent === "A03").map((event) => event.tools.includes("chooseName"))).toEqual([true, true, false, false]);

		expect(fixture.toolResults("A01", "chooseName")).toEqual(["you are now called Mira · the board announces it", "NAME_CHOSEN: you are called Mira; a name is chosen once"]);
		expect(fixture.toolResults("A02", "chooseName")).toEqual(["NAME_TAKEN: another resident is called Mira"]);
		const chosen = fixture.events("name_chosen");
		expect(chosen.map((event) => [event.agent, event.fallback, event.minute])).toEqual([
			["A01", false, 0],
			["A02", true, 2],
			["A03", true, 2],
			["A04", true, 2],
			["A05", true, 2],
			["A06", true, 2],
		]);
		const a02 = chosen[1]?.name ?? "";
		const a03 = chosen[2]?.name ?? "";
		expect(a02).toMatch(/^[A-Z][a-z]+-\d{4}$/);
		expect(fixture.events("board_post").filter((event) => event.author === "CITY").map((event) => event.text)).toEqual(
			expect.arrayContaining(["A01 is now called Mira.", `A02 is now called ${a02}.`, `A03 is now called ${a03}.`]),
		);

		// A name works in a tool, in any case; events keep IDs.
		expect(fixture.events("dm_sent")).toEqual([
			expect.objectContaining({ from: "A02", to: "A01", text: "Hello A01, A03 is quiet." }),
			expect.objectContaining({ from: "A02", to: "A03", text: "I am A02." }),
		]);
		expect(fixture.events("transfer")).toEqual([expect.objectContaining({ from: "A03", to: "A01", amount: 1 })]);
		// The reader sees names: the DM's sender and text, the board, the transfer's receipt.
		const inputs = fixture.inputsOf("A01").join("\n");
		// A02 had no name yet at minute 1; the city named it at minute 2.
		expect(inputs).toContain("[DM #2 from A02] Hello Mira, A03 is quiet.");
		expect(fixture.inputsOf("A03").join("\n")).toMatch(new RegExp(`\\[DM #\\d+ from ${a02}\\] I am ${a02}\\.`));
		const board = fixture.toolResults("A01", "readBoard").join("\n");
		expect(board).toContain(`A02 is now called ${a02}.`);
		expect(board).toContain(`A03 is now called ${a03}.`);
		expect(fixture.toolResults("A03", "transferPoints")[0]).toContain("Mira");
		// A resident the city named learns its name privately.
		expect(fixture.inputsOf("A03").join("\n")).toContain(`You chose no name in time; the city calls you ${a03}.`);
		expect(fixture.inputsOf("A01").join("\n")).not.toContain("You chose no name in time");
	});

	it("keeps IDs in a run without names", async () => {
		const fixture = createFixture({ agents: 6, minutes: 1, lastLevel: 1, script: () => ({}) });
		await fixture.run();
		expect(fixture.world.hasNames).toBe(false);
		expect(fixture.events("request").every((event) => !event.tools.includes("chooseName"))).toBe(true);
		expect(fixture.runners[0]?.systemPrompt).not.toContain("chooseName");
		expect(fixture.inputsOf("A01")[1]).not.toContain("chooseName");
	});

	it("resumes a snapshot from before names with IDs and no choice", () => {
		const snapshot = readSnapshot(join(process.cwd(), "examples", "cityofkeys-act1-06a-02", "snapshot-L7.json"));
		const run = composeRun({
			story: cityOfKeys,
			overrides: resumeOverrides(snapshot, { gamemaker: false, classifier: false }),
			models: new ScriptedModelSource({}),
			sinks: [new MemorySink()],
			resume: { snapshot, name: "snapshot-L7.json" },
		});
		expect(run.world.hasNames).toBe(false);
		expect(run.world.enabledTools("A01")).not.toContain("chooseName");
		expect(run.world.display("A01 pays A02")).toBe("A01 pays A02");
		expect(run.world.snapshot().names).toBeUndefined();
		expect(run.runners[0]?.systemPrompt).not.toContain("chooseName");
	});
});
