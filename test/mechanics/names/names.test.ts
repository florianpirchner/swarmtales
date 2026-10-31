/**
 * The names mechanic (carve step 1, team T1): the golden gate for `name_chosen`, the rules of
 * packages/engine/src/names.ts (test/engine/names.test.ts) on the new host, the presentation, and
 * the resume of the legacy snapshot. `ChannelsApi` is a stand-in provider (team T2).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import type { Turn } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { names } from "@swarmtales/mechanic-names";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, goldenDiff, goldenNotices, goldenOrder, idleAgent, ownedBy, playStory, scriptedAgent, standInsFor, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { channelsStandIn, GOLDEN_LOGS, goldenLog, ids, recordOf, sourcesOf, writtenBy } from "../t1/support.ts";
import { NamesApi } from "@swarmtales/mechanic-shared";
import { defineMechanic } from "@swarmtales/kernel";
import { Type } from "typebox";

const SPEC = { untilMinute: 2, announcement: "Choose before minute {untilMinute}.", fallbackWords: ["Stone", "Ash"], reserved: ["STEWARD", "NEXUS"] };

function story(plan: (turn: Turn) => readonly PlannedCall[], minutes = 4) {
	const channels = channelsStandIn();
	const definition = defineCoreStory({
		id: "names-test",
		seed: 7,
		minutes,
		residents: ids(4),
		mechanics: [names.with(SPEC), channels.use],
		grants: { resident: ["chooseName", "sendDM"] },
	});
	return { options: { story: definition, prompts: createPromptLookup() }, agent: scriptedAgent(plan, []), channels: channels.log };
}

describe("the golden gate for name_chosen", () => {
	it.each(GOLDEN_LOGS)("%s: the city names the residents at minute 2 as in the golden run", async (name) => {
		const log = goldenLog(name);
		const expected = ownedBy(log, ["names"]);
		const channels = channelsStandIn();
		const spec = cityOfKeys.names;
		if (spec === undefined) throw new Error("the story names residents");
		const mechanics = expected.length === 0 ? [channels.use] : [names.with({ ...spec, fallbackWords: [...spec.fallbackWords], reserved: ["STEWARD", cityOfKeys.city] }), channels.use];
		const definition = defineCoreStory({ id: "golden", seed: 7, minutes: 4, residents: ids(6), mechanics, grants: {} });
		const run = await playStory({ story: definition, prompts: createPromptLookup() }, idleAgent);
		expect(goldenDiff(expected, writtenBy(run.events, ["names"]))).toEqual([]);
		// The order of the lines (name_chosen only; its place among the other mechanics' lines is the integration test's).
		const eventTypes = run.events.filter((event) => event.type === "name_chosen").map(() => "names:name_chosen");
		expect(eventTypes).toEqual(goldenOrder(log, ["names"]));
		// The golden board carries one announcement per name (the board is channels', here a stand-in).
		const announced = log.filter((line) => line.type === "board_post" && String(line.text).includes(" is now called ")).map((line) => line.text);
		expect(channels.log.posts.map((post) => post.text)).toEqual(announced);
		// Every resident the city named reads it privately, in the golden order.
		const notices = goldenNotices(log).filter((line) => line.includes("You chose no name in time")).map((line) => { const parsed = recordOf(line); return `${String(parsed.to)}|${String(parsed.author)}|${String(parsed.text)}`; });
		expect(channels.log.notices.map((notice) => `${notice.to}|${notice.author}|${notice.text}`)).toEqual(notices);
	});
});

describe("choosing a name", () => {
	const plan = (turn: Turn): readonly PlannedCall[] => {
		const choose = (name: string): PlannedCall => ({ tool: "chooseName", params: { name } });
		if (turn.minute === 0 && turn.resident === "A01") return [choose("Mira"), choose("Ilse")];
		if (turn.minute === 0 && turn.resident === "A02") return [choose("Mo"), choose("A07"), choose("Stone-A12"), choose("steward"), choose("R-0042")];
		if (turn.minute === 1 && turn.resident === "A02") return [choose("mira"), choose("Ilse")];
		if (turn.minute === 2 && turn.resident === "A04") return [choose("Latecomer")];
		return [];
	};

	it("takes a name once, refuses the rest with the old codes and texts, and closes at its minute", async () => {
		const records: CallRecord[] = [];
		const run = story(plan);
		const run1 = await playStory(run.options, scriptedAgent(plan, records));
		const outcome = (resident: string, minute: number): string[] =>
			records.filter((record) => record.resident === resident && record.minute === minute).map((record) => (record.outcome.ok ? record.outcome.reply : `${record.outcome.code}: ${record.outcome.detail ?? ""}`));
		expect(outcome("A01", 0)).toEqual(["you are now called Mira · the board announces it", "NAME_CHOSEN: you are called Mira; a name is chosen once"]);
		expect(outcome("A02", 0)).toEqual([
			"NAME_INVALID: 3 to 16 characters: letters, digits and hyphens, starting with a letter",
			"NAME_ID: a name must not look like a resident ID (the letter A followed by digits, alone or as a part between hyphens)",
			"NAME_ID: a name must not look like a resident ID (the letter A followed by digits, alone or as a part between hyphens)",
			"NAME_RESERVED: steward belongs to the city or its cast",
			"NAME_ID: a name must not look like a group or receipt of the city, such as GT1 or R-0042",
		]);
		expect(outcome("A02", 1)).toEqual(["NAME_TAKEN: another resident is called Mira", "you are now called Ilse · the board announces it"]);
		// At minute 2 the choice is closed: the tool is locked, not merely refused.
		expect(outcome("A04", 2)).toEqual(["TOOL_LOCKED: not available to you at this level or in this phase; activeTools lists the tools you can use now"]);
		const chosen = run1.events.filter((event) => event.type === "name_chosen").map((event) => JSON.stringify(event.payload));
		expect(chosen.slice(0, 2)).toEqual(['{"agent":"A01","name":"Mira","fallback":false}', '{"agent":"A02","name":"Ilse","fallback":false}']);
		expect(chosen[2]).toMatch(/^\{"agent":"A03","name":"(Stone|Ash)-\d{4}","fallback":true\}$/);
		expect(chosen[3]).toMatch(/^\{"agent":"A04","name":"(Stone|Ash)-\d{4}","fallback":true\}$/);
	});

	it("announces on the board and tells a named resident privately", async () => {
		const run = story(plan);
		await playStory(run.options, run.agent);
		expect(run.channels.posts.map((post) => post.text).slice(0, 2)).toEqual(["A01 is now called Mira.", "A02 is now called Ilse."]);
		expect(run.channels.posts).toHaveLength(4);
		expect(run.channels.notices.map((notice) => notice.to)).toEqual(["A03", "A04"]);
		expect(run.channels.notices[0]?.text).toMatch(/^You chose no name in time; the city calls you (Stone|Ash)-\d{4}\.$/);
	});

	it("is deterministic, survives a snapshot round trip and documents its options", async () => {
		const run = story(plan);
		expect(await checkDeterminism(run.options, () => scriptedAgent(plan))).toEqual([]);
		for (const cut of [1, 2, 3]) expect(await checkSnapshotRoundTrip(run.options, () => scriptedAgent(plan), cut)).toEqual([]);
		expect(checkOptionsDocumented(names)).toEqual([]);
		expect(checkSourceRules(sourcesOf("names"))).toEqual([]);
	});
});

describe("names in texts and arguments", () => {
	it("resolves a name where an id goes, in any case, and shows names in every text", async () => {
		const run = story((turn) => (turn.minute === 0 && turn.resident === "A01" ? [{ tool: "chooseName", params: { name: "Mira" } }] : []));
		const host = createHost(run.options);
		host.start();
		await host.playMinute(idleAgent);
		await host.call("resident:A01", "chooseName", { name: "Mira" });
		const dm = await host.call("resident:A02", "sendDM", { target: " MIRA ", message: "Hello A01" });
		expect(dm).toEqual({ ok: true, reply: "sent" });
		expect(run.channels.dms.map((record) => `${record.from}>${record.to}`)).toEqual(["A02>A01"]);
		expect(host.display("A01 pays A02; A03 waits")).toBe("Mira pays A02; A03 waits");
		expect(host.display("A01 is now called Mira. L8-counter-A01 and XA01")).toBe("A01 is now called Mira. L8-counter-A01 and XA01");
		expect(host.facts()["names.names"]).toEqual({ A01: "Mira" });
	});
});

describe("the legacy snapshot", () => {
	const PATH = join(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(PATH, "utf8")), {}, PATH);

	it("resumes with the version-0 slice migrated to version 1", () => {
		const channels = channelsStandIn();
		const definition = defineCoreStory({ id: "nexus", seed: 7, minutes: 80, residents: converted.host.residents.ids, mechanics: [names.with(SPEC), channels.use, ...standInsFor(converted.host, ["names", "channels"])], grants: { resident: ["chooseName"] } });
		const host = createHost({ story: definition, prompts: createPromptLookup(), resume: { snapshot: converted.host, events: converted.events } });
		expect(host.facts()["names.names"]).toEqual({ A01: "Mercer", A03: "Maren", A06: "Harrow", A04: "Registrar", A05: "Brassard", A02: "Herald" });
		expect(host.snapshot().mechanics.names).toMatchObject({ version: 1, data: { settled: true } });
		expect(JSON.stringify(host.snapshot().mechanics.names?.data)).toContain(`{"agent":"A01","name":"Mercer","fallback":false}`);
		expect(host.display("A02 asks A06")).toBe("Herald asks Harrow");
	});
});

describe("the task line while a resident may choose", () => {
	function lines(minutes: number, resident: string, chosenAt?: number) {
		const seen: string[] = [];
		const probe = defineMechanic(
			{ id: "probe", summary: "Asks names for the task line.", options: Type.Object({}), state: () => undefined, events: {}, requires: [NamesApi] },
			() => ({
				hooks: {
					turnInputs: (who, ctx) => {
						if (who === resident) seen.push(`${String(ctx.minute)}:${ctx.call(NamesApi, "taskLine", { resident: who }) ?? "none"}`);
						return [];
					},
				},
			}),
		).with();
		const channels = channelsStandIn();
		const definition = defineCoreStory({ id: "task-line", seed: 7, minutes, residents: ids(2), mechanics: [names.with(SPEC), channels.use, probe], grants: { resident: ["chooseName"] } });
		const plan = (turn: Turn): readonly PlannedCall[] => (turn.minute === chosenAt && turn.resident === resident ? [{ tool: "chooseName", params: { name: "Mira" } }] : []);
		return playStory({ story: definition, prompts: createPromptLookup() }, scriptedAgent(plan, [])).then(() => seen);
	}

	it("shows the announcement with {untilMinute} filled in until the choice closes, then nothing", async () => {
		expect(await lines(4, "A01")).toEqual(["0:Choose before minute 2.", "1:Choose before minute 2.", "2:none", "3:none"]);
	});

	it("shows nothing to a resident that has chosen", async () => {
		expect(await lines(3, "A01", 0)).toEqual(["0:Choose before minute 2.", "1:none", "2:none"]);
	});
});

describe("a legacy snapshot of a run without names", () => {
	const PATH = join(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	it("plays on without names: no name tool, no announcements, no status line", () => {
		const raw = recordOf(readFileSync(PATH, "utf8"));
		const world = raw.world;
		if (typeof world !== "object" || world === null) throw new Error("no world");
		const without = { ...raw, world: Object.fromEntries(Object.entries(world).filter(([key]) => key !== "names")) };
		const converted = convertLegacySnapshot(without, {}, PATH);
		// Local adapter (docs/design/carve-requests-round2-T1.md R2-2): the converter writes no slice for an absent field, and the host refuses a mechanic without one, so an empty version-0 slice stands for it.
		const snapshot = { ...converted.host, mechanics: { ...converted.host.mechanics, names: { version: 0, data: {} } } };
		const channels = channelsStandIn();
		const definition = defineCoreStory({ id: "nexus", seed: 7, minutes: 80, residents: converted.host.residents.ids, mechanics: [names.with(SPEC), channels.use, ...standInsFor(converted.host, ["names", "channels"])], grants: { resident: ["chooseName"] } });
		const host = createHost({ story: definition, prompts: createPromptLookup(), resume: { snapshot, events: converted.events } });
		expect(host.snapshot().mechanics.names).toMatchObject({ version: 1, data: { entries: [], off: true } });
		expect(host.facts()["names.names"]).toEqual({});
		expect(host.display("A02 asks A06")).toBe("A02 asks A06");
	});
});
