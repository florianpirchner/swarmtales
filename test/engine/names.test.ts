/**
 * Resident names (v08, SPEC 18): chosen once in the first minutes, a seeded
 * fallback for the rest, names in every text a resident reads, names as
 * aliases in every tool, and IDs in events and snapshots. The rules run on
 * the names mechanic (its book functions, or a host with a channels
 * stand-in); the runs play on the host (step 18).
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { AnyStory, EventEnvelope, HostSnapshot, NamesSpec } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { displayNames, nameLabel, nameRefusal, names, resolveName, withResidents, type NamesState } from "@swarmtales/mechanic-names";
import { createPromptLookup } from "@swarmtales/prompts";
import { validateStory } from "@swarmtales/sdk";
import { idleAgent } from "@swarmtales/testkit";
import { readResumePoint } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { act, createHostFixture as createFixture, say, storyDefaults } from "../helpers/host-fixture.ts";
import { factOf, sliceOf } from "../helpers/host-inspect.ts";
import { channelsStandIn } from "../mechanics/t1/support.ts";

const SPEC: NamesSpec = { untilMinute: 2, announcement: "Choose before minute {untilMinute}.", fallbackWords: ["Stone", "Ash"] };
const RESERVED = ["CITY", "COURIER", "STEWARD", "NEXUS"];
const IDS = ["A01", "A02", "A03", "A04"];
const NamesSlice = Type.Object({ entries: Type.Array(Type.Unknown()), settled: Type.Boolean(), off: Type.Optional(Type.Boolean()) });
const Chosen = Type.Object({ agent: Type.String(), name: Type.String(), fallback: Type.Boolean() });

/** The names book's rules over a state with the given names (the old `NameBook` without a clock). */
function stateWith(entries: Readonly<Record<string, string>>): NamesState {
	return { ids: IDS, entries: new Map(Object.entries(entries).map(([agent, name]) => [agent, { agent, name, fallback: false }])), settled: false, active: true };
}

const reserved = new Set(RESERVED.map((name) => name.toLowerCase()));

/** The names mechanic on a host of four residents (a stand-in for channels), with what it announced. */
function book(seed = 7, resume?: { readonly snapshot: HostSnapshot; readonly events: readonly EventEnvelope[] }) {
	const channels = channelsStandIn();
	const definition = defineCoreStory({
		id: "names-test",
		seed,
		minutes: 8,
		residents: IDS,
		mechanics: [names.with({ ...SPEC, fallbackWords: [...SPEC.fallbackWords], reserved: RESERVED }), channels.use],
		grants: { resident: ["chooseName", "sendDM"] },
	});
	const host = createHost({ story: definition, prompts: createPromptLookup(), ...(resume === undefined ? {} : { resume }) });
	if (resume === undefined) host.start();
	const from = host.log.all().length;
	return {
		host,
		channels: channels.log,
		/** The names given since this host started (old `announce` callback), `*` for the city's fallback. */
		announced: (): string[] =>
			host.log
				.all()
				.slice(from)
				.flatMap((event) => (event.type === "name_chosen" && Check(Chosen, event.payload) ? [`${event.payload.agent}=${event.payload.name}${event.payload.fallback ? "*" : ""}`] : [])),
		choose: (agent: string, name: string) => host.call(`resident:${agent}`, "chooseName", { name }),
		/** Plays minutes until `minute` has started (old `settle(minute)`). */
		settle: async (minute: number): Promise<void> => {
			while (host.minute <= minute) await host.playMinute(idleAgent);
		},
		nameOf: (agent: string): string | undefined => factOf(host, "names.names", Type.Record(Type.String(), Type.String()))[agent],
	};
}

describe("choosing a name", () => {
	it("refuses names that break a rule, with clear codes", () => {
		const state = stateWith({});
		const refused = (name: string) => nameRefusal(state, reserved, name)?.error ?? "ok";
		expect(["Mo", "7even", "Mira Bell", "M".repeat(17), "Mira!"].map(refused)).toEqual(["NAME_INVALID", "NAME_INVALID", "NAME_INVALID", "NAME_INVALID", "NAME_INVALID"]);
		expect(["A07", "a99", "Stone-A12", "GT1", "R-0042"].map(refused)).toEqual(["NAME_ID", "NAME_ID", "NAME_ID", "NAME_ID", "NAME_ID"]);
		expect(["city", "Courier", "STEWARD", "Nexus"].map(refused)).toEqual(["NAME_RESERVED", "NAME_RESERVED", "NAME_RESERVED", "NAME_RESERVED"]);
		expect(refused("Mira-2")).toBe("ok");
	});

	it("names no resident ID in a refusal, since the city renders IDs as names (v08 Act I run: 'such as Ansgar')", () => {
		expect(nameRefusal(stateWith({}), reserved, "A07")?.detail ?? "").not.toMatch(/A\d/);
	});

	it("is unique without case, permanent, and closes at its minute", async () => {
		const { host, announced, choose } = book();
		expect((await choose("A01", "Mira")).ok).toBe(true);
		expect(await choose("A02", "MIRA")).toMatchObject({ ok: false, code: "NAME_TAKEN" });
		await host.playMinute(idleAgent);
		expect(await choose("A01", "Ilse")).toMatchObject({ ok: false, code: "NAME_CHOSEN", detail: "you are called Mira; a name is chosen once" });
		expect(host.openTools("A02")).toContain("chooseName");
		await host.playMinute(idleAgent);
		// At minute 2 the choice is closed: the tool is locked (the book's NAME_CLOSED is behind the lock).
		expect(host.openTools("A02")).not.toContain("chooseName");
		expect(await choose("A02", "Ilse")).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(announced()).toEqual(["A01=Mira"]);
	});

	it("names whoever has none when the choice closes: seeded, unique, in the word-and-digits style", async () => {
		const first = book();
		await first.choose("A02", "Ilse");
		await first.settle(1);
		expect(first.announced()).toEqual(["A02=Ilse"]);
		await first.settle(2);
		expect(first.announced()).toHaveLength(4);
		const given = ["A01", "A03", "A04"].map((agent) => first.nameOf(agent) ?? "");
		for (const name of given) expect(name).toMatch(/^(Stone|Ash)-\d{4}$/);
		expect(new Set(given).size).toBe(3);
		expect(first.announced().slice(1).every((entry) => entry.endsWith("*"))).toBe(true);
		// The same seed gives the same names; settling twice changes nothing.
		const second = book();
		await second.choose("A02", "Ilse");
		await second.settle(2);
		await second.settle(3);
		expect(second.announced()).toEqual(first.announced());
	});

	it("resolves names and IDs without case, and shows names in texts", () => {
		const state = stateWith({ A01: "Mira", A02: "Ilse" });
		expect(["mira", " MIRA ", "a02", "A03", "Nobody"].map((value) => resolveName(state, value))).toEqual(["A01", "A01", "A02", "A03", undefined]);
		const display = (text: string, keep: (token: string) => boolean = () => false) => displayNames(state, text, keep);
		expect(display("A01 pays A02; A03 waits")).toBe("Mira pays Ilse; A03 waits");
		// The city's announcement, piece references and codes keep their IDs; a password fragment too.
		expect(display("A01 is now called Mira.")).toBe("A01 is now called Mira.");
		expect(display("L8-counter-A02 and XA01 and A01x")).toBe("L8-counter-A02 and XA01 and A01x");
		expect(display("fragment A02, from A02", (token) => token === "A02")).toBe("fragment A02, from A02");
		expect(nameLabel(state, "A01")).toBe("Mira (A01)");
		expect(nameLabel(state, "A03")).toBe("A03");
	});

	it("restores from a snapshot", async () => {
		const original = book();
		await original.choose("A01", "Mira");
		await original.settle(2);
		const copy = book(7, { snapshot: original.host.snapshot(), events: original.host.log.all() });
		expect(copy.announced()).toEqual([]);
		expect(copy.host.snapshot().mechanics.names).toEqual(original.host.snapshot().mechanics.names);
		expect((await copy.host.call("resident:A02", "sendDM", { target: "mira", message: "hello" })).ok).toBe(true);
		expect(copy.channels.dms.map((dm) => dm.to)).toEqual(["A01"]);
		expect(copy.host.openTools("A01")).not.toContain("chooseName");
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
		expect(fixture.runners()[0]?.systemPrompt).toContain("Before minute 2 you choose the name the city knows you by, once, with chooseName");
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
		// The names book plays switched off (old `hasNames` false).
		expect(sliceOf(fixture.host, "names", NamesSlice).off).toBe(true);
		expect(fixture.events("request").every((event) => !event.tools.includes("chooseName"))).toBe(true);
		expect(fixture.runners()[0]?.systemPrompt).not.toContain("chooseName");
		expect(fixture.inputsOf("A01")[1]).not.toContain("chooseName");
	});

	it("resumes a snapshot from before names with IDs and no choice", () => {
		const point = readResumePoint(join(process.cwd(), "examples", "cityofkeys-act1-06a-02", "snapshot-L7.json"));
		const run = createFixture({
			story: cityOfKeys,
			...storyDefaults(cityOfKeys),
			...resumedOverrides(point, { gamemaker: false, classifier: false }),
			script: () => ({}),
			resume: { point, name: "snapshot-L7.json" },
		});
		// The names book plays switched off: no names, no choice (old `hasNames` false, no `names` in the old snapshot).
		expect(sliceOf(run.host, "names", NamesSlice)).toEqual({ entries: [], settled: false, off: true });
		expect(run.host.openTools("A01")).not.toContain("chooseName");
		expect(run.host.display("A01 pays A02")).toBe("A01 pays A02");
		expect(run.runners()[0]?.systemPrompt).not.toContain("chooseName");
	});
});
