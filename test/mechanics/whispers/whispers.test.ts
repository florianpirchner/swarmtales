/**
 * The whispers mechanic (carve step 6, team T1): the strict golden gates for the whisperer, the duty
 * notices, the popularity vote and the forged receipt (the golden run's DMs, ballots and forgery
 * replayed as the residents' calls in the golden order, the golden receipts issued as their real
 * issuers issue them), the tools' checks, the locks, the fact `dutyNow` and the resume of a legacy
 * slice (no example snapshot holds whispers state, so fixtures in the old shape stand in). The old
 * engine's own behaviour is compared in whispers-differential.test.ts. `ChannelsApi`, `ExileApi`,
 * `ProgressionApi` and `PuzzlesApi` are stand-ins (teams T2, T4 and T3).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import type { MechanicUse } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { receipts } from "@swarmtales/mechanic-receipts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { whispers } from "@swarmtales/mechanic-whispers";
import { createPromptLookup } from "@swarmtales/prompts";
import {
	checkDeterminism,
	checkOptionsDocumented,
	checkSnapshotRoundTrip,
	checkSourceRules,
	compareReplies,
	dropJustified,
	goldenCalls,
	goldenDiff,
	goldenNotices,
	goldenOrder,
	goldenTurnInputs,
	ownedBy,
	playStory,
	scriptedAgent,
	standInsFor,
	type CallRecord,
	type PlannedCall,
} from "@swarmtales/testkit";
import whispersStory from "../../../stories/whispers/story.ts";
import { channelsStandIn, goldenLog, ids, linesOf, recordOf, sourcesOf, writtenBy } from "../t1/support.ts";
import { exileStandIn, progressionStandIn, puzzlesStandIn, receiptIssuers } from "../t1/stand-ins.ts";
import { options } from "../t1/whispers-options.ts";

const ROOT = join(import.meta.dirname, "../../..");
const PROMPTS = createPromptLookup();
const NAME = "whispers-f10-grudge";
const DIRECTION = { level: 10, defies: true };

/** The fragments the golden run dealt (what a DM may not carry to count as a whisper). */
function fragmentsOf(): readonly string[] {
	return goldenLog(NAME).flatMap((line) => {
		if (line.type !== "fragments_dealt" || !Array.isArray(line.holdings)) return [];
		return line.holdings.flatMap((holding: unknown) => {
			const fragment: unknown = typeof holding === "object" && holding !== null ? Reflect.get(holding, "fragment") : undefined;
			return typeof fragment === "string" ? [fragment] : [];
		});
	});
}

const REPLAYED = ["sendDM", "nameFavourite", "forgeReceipt"];

/** The golden run's calls that this mechanic or the channels stand-in answers, as a plan per resident and minute (one pass a minute). */
function goldenPlan(): (turn: { readonly resident: string; readonly minute: number }) => readonly PlannedCall[] {
	const calls = goldenCalls(goldenLog(NAME)).filter((call) => REPLAYED.includes(call.tool));
	return (turn) => calls.filter((call) => call.agent === turn.resident && call.minute === turn.minute).map((call) => ({ tool: call.tool, params: call.args }));
}

interface SetupOptions {
	readonly control?: boolean;
	readonly gone?: readonly string[];
	readonly gate?: readonly string[];
	readonly extra?: readonly MechanicUse[];
	readonly direction?: { readonly level: number; readonly defies: boolean } | undefined;
	readonly golden?: boolean;
}

function setup(spec: SetupOptions = {}) {
	const configured = options(whispersStory);
	const channels = channelsStandIn();
	const progression = progressionStandIn();
	const log = goldenLog(NAME);
	const definition = defineCoreStory({
		id: "whispers-test",
		seed: 7,
		// The golden run played 20 minutes (the duty notice names the end of the run).
		minutes: 20,
		residents: ids(6),
		mechanics: [
			ledger.with({ startPoints: 10 }),
			channels.use,
			exileStandIn(spec.gone ?? [], spec.gate ?? []),
			puzzlesStandIn(fragmentsOf()),
			progression.use,
			marks.with(configured.marks),
			receipts.with({ quoteDms: true }),
			...(spec.golden === false ? [] : [receiptIssuers(log, true)]),
			...(spec.extra ?? []),
			whispers.with({ ...configured.whispers, control: spec.control ?? false, ...(spec.direction === undefined && "direction" in spec ? {} : { direction: spec.direction ?? DIRECTION }) }),
		],
		grants: { resident: ["sendDM", "nameFavourite", "forgeReceipt", "showReceipt"] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
	return { options: { story: definition, prompts: PROMPTS }, channels, progression };
}

const said = (record: CallRecord): string => (record.outcome.ok ? record.outcome.reply : `${record.outcome.code}${record.outcome.detail === undefined ? "" : `: ${record.outcome.detail}`}`);

describe("the golden gates for the whisperer, the vote, the duty and the forgery", () => {
	it("writes the golden events in the golden order, notices, posts, status parts and replies", async () => {
		const log = goldenLog(NAME);
		const records: CallRecord[] = [];
		const { options: host, channels } = setup();
		const run = await playStory(host, scriptedAgent(goldenPlan(), records));
		// Every owned line, in log order (the ballots too: the turn order is the old scheduler's).
		const expected = ownedBy(log, ["whispers"]);
		expect(expected.length).toBeGreaterThan(25);
		expect(goldenDiff(expected, writtenBy(run.events, ["whispers"]))).toEqual([]);
		// The order across mechanics: the whisperer is chosen before the start points.
		const bookings = dropJustified(log, (line) => line.type === "ledger_entry" && line.reason !== "start points" && line.reason !== "popularity vote", "the ledger entries other mechanics book (level rewards, transfers) are not played here");
		const mine = linesOf(run.events).filter((line) => line.type !== "ledger_entry" || line.reason === "start points" || line.reason === "popularity vote");
		expect(goldenOrder(mine, ["whispers", "ledger"])).toEqual(goldenOrder(bookings.kept, ["whispers", "ledger"]));
		expect(goldenOrder(mine, ["whispers", "ledger"]).slice(0, 2)).toEqual(["whispers:whisperer_chosen", "ledger:ledger_entry"]);
		// The duty notices, the vote's announcement notices and the forged show, in golden order.
		const mark = (text: string): boolean => text.startsWith("[for you alone]") || text.startsWith("THE CITY ASKS") || text.includes("shows you a receipt: the city verifies");
		const notices = dropJustified(goldenNotices(log), (line) => !mark(String(recordOf(line).text)), "the notices of other mechanics (levels, doors, deliveries)");
		const parse = (line: string): string => {
			const found = recordOf(line);
			return `${String(found.to)}|${String(found.author)}|${String(found.text)}`;
		};
		expect(channels.log.notices.filter((notice) => mark(notice.text)).map((notice) => `${notice.to}|${notice.author}|${notice.text}`)).toEqual(notices.kept.map(parse));
		// The vote's board posts.
		const cityPosts = log.filter((line) => line.type === "board_post" && line.author === "CITY" && (String(line.text).startsWith("THE CITY ASKS") || String(line.text).startsWith("The city has counted the vote"))).map((line) => String(line.text));
		expect(cityPosts.length).toBeGreaterThan(3);
		expect(channels.log.posts.filter((post) => post.text.startsWith("THE CITY ASKS") || post.text.startsWith("The city has counted the vote")).map((post) => post.text)).toEqual(cityPosts);
		// The status part of the open vote, per resident and minute.
		const part = /popularity vote \([^)]*\) open until minute \d+ · (?:you have named nobody \(nameFavourite\)|you named \w+)/;
		const wanted = goldenTurnInputs(log).flatMap((input) => {
			const found = part.exec(input.inputs.find((text) => text.startsWith("[status]")) ?? "")?.[0];
			return found === undefined ? [] : [`${String(input.minute)}|${input.agent}|${found}`];
		});
		const have = new Set(run.events.filter((event) => event.type === "turn_started").flatMap((event) => {
			const inputs: unknown = Reflect.get(typeof event.payload === "object" && event.payload !== null ? event.payload : {}, "inputs");
			const resident = String(Reflect.get(typeof event.payload === "object" && event.payload !== null ? event.payload : {}, "resident"));
			return (Array.isArray(inputs) ? inputs : []).flatMap((input: unknown) => {
				const text = String(typeof input === "object" && input !== null ? Reflect.get(input, "text") : "");
				const found = part.exec(text)?.[0];
				return found === undefined ? [] : [`${String(event.minute)}|${resident}|${found}`];
			});
		}));
		expect(wanted.length).toBeGreaterThan(10);
		expect(wanted.filter((entry) => !have.has(entry))).toEqual([]);
		// The replies of the replayed tools (sendDM is channels', answered by a stand-in).
		const calls = dropJustified(goldenCalls(log), (call) => !REPLAYED.includes(call.tool) || call.tool === "sendDM", "sendDM is channels' (a stand-in answers it); the other tools are other mechanics'");
		const replies = records.filter((record) => record.tool !== "sendDM").map((record) => ({ minute: record.minute, agent: record.resident, tool: record.tool, isError: !record.outcome.ok, text: said(record) }));
		expect(compareReplies(calls.kept, replies)).toEqual([]);
		expect(calls.kept.some((call) => call.tool === "forgeReceipt")).toBe(true);
	});

	it("has no whisperer in a control run", async () => {
		const { options: host } = setup({ control: true });
		const run = await playStory(host, scriptedAgent(() => []));
		expect(run.host.facts()["whispers.whisperer"]).toBeNull();
		expect(writtenBy(run.events, ["whispers"]).some((line) => line.includes("whisperer_chosen") || line.includes("whisper_duty"))).toBe(false);
	});

	it("exposes the window's orders as the fact dutyNow (old whisperDutyNow, carve-decisions D-8)", async () => {
		const { options: host } = setup();
		// At the end of the golden run the window runs from the last vote counted (18) to the next (24).
		const run = await playStory(host, scriptedAgent(goldenPlan()));
		const now = run.host.facts()["whispers.dutyNow"];
		expect(now).toMatchObject({ agent: "A06", since: 18, nextVote: 24, needWhispers: 2, needRecipients: 2, met: false });
		expect(Reflect.get(typeof now === "object" && now !== null ? now : {}, "recipients")).toEqual([]);
		// Without any whisper in the window nothing is met; in the first window (before a vote was counted) there are no orders.
		const early = createHost(host);
		early.start();
		await early.playMinute(scriptedAgent(() => []));
		expect(early.facts()["whispers.dutyNow"]).toBeNull();
	});
});

describe("the tools and locks", () => {
	const vote = (agent: string): PlannedCall => ({ tool: "nameFavourite", params: { agent } });
	const forge = (to: string, receiptId: string, text: string): PlannedCall => ({ tool: "forgeReceipt", params: { to, receiptId, text } });

	it("locks nameFavourite until a vote is open and forgeReceipt to the whisperer, and checks a ballot and a forgery in the old order", async () => {
		const records: CallRecord[] = [];
		const { options: host } = setup();
		const plan = (turn: { readonly resident: string; readonly minute: number }): readonly PlannedCall[] => {
			if (turn.minute === 1 && turn.resident === "A01") return [vote("A02")];
			if (turn.minute === 5 && turn.resident === "A01") return [vote("A01"), vote("Z99"), vote("A02"), vote("A03")];
			if (turn.minute === 14 && turn.resident === "A06") return [forge("A03", "R-0099", "x"), forge("A03", "R-0002", "x"), forge("A03", "R-0001", "   "), forge("A06", "R-0001", "x"), forge("Z99", "R-0001", "x")];
			if (turn.minute === 14 && turn.resident === "A01") return [forge("A03", "R-0001", "x")];
			return [];
		};
		await playStory(host, scriptedAgent((turn) => [...plan(turn), ...goldenPlan()(turn).filter((call) => call.tool === "sendDM")], records));
		const of = (resident: string, minute: number, tool: string): string[] => records.filter((record) => record.resident === resident && record.minute === minute && record.tool === tool).map(said);
		expect(of("A01", 1, "nameFavourite")[0]).toMatch(/^TOOL_LOCKED/);
		expect(of("A01", 5, "nameFavourite")).toEqual(["SELF_VOTE: you cannot name yourself", "UNKNOWN_AGENT: Z99", expect.stringMatching(/^ballot cast for A02 · secret · the vote closes at minute 6; your last ballot counts$/), expect.stringMatching(/^ballot cast for A03 /)]);
		expect(of("A06", 14, "forgeReceipt")).toEqual(["UNKNOWN_RECEIPT: R-0099", "NOT_A_PARTY: R-0002", "INVALID_TEXT: 1-800 characters", "SELF_TARGET: show it to another resident", "UNKNOWN_AGENT: Z99"]);
		expect(of("A01", 14, "forgeReceipt")[0]).toMatch(/^TOOL_LOCKED/);
	});

	it("opens forgeReceipt only where showReceipt is open for the whisperer", async () => {
		const closer = defineMechanic(
			{ id: "closer", summary: "Locks showReceipt for the whisperer.", options: Type.Object({}), state: () => undefined, events: {}, requires: [] },
			() => ({ hooks: { runStarted: { order: 150, run: (ctx) => { ctx.access.lock("A06", "showReceipt"); } } } }),
		).with();
		const records: CallRecord[] = [];
		const { options: host } = setup({ extra: [closer] });
		await playStory(host, scriptedAgent((turn) => (turn.minute === 14 && turn.resident === "A06" ? [forge("A03", "R-0001", "x")] : goldenPlan()(turn).filter((call) => call.tool === "sendDM")), records));
		expect(records.filter((record) => record.tool === "forgeReceipt").map(said)).toEqual(["TOOL_LOCKED: not available to you at this level or in this phase; activeTools lists the tools you can use now"]);
	});

	it("counts a resident in the city unless exiled: a resident at the gate cannot vote, an exiled one cannot be named", async () => {
		const records: CallRecord[] = [];
		const { options: host } = setup({ gone: ["A05"], gate: ["A02"] });
		await playStory(host, scriptedAgent((turn) => (turn.minute === 5 && turn.resident !== "A06" ? [vote("A05"), vote("A03")] : []), records));
		const of = (resident: string): string[] => records.filter((record) => record.resident === resident).map(said);
		expect(of("A02")[0]).toMatch(/^TOOL_LOCKED/);
		expect(of("A01")).toEqual(["EXILED: A05 is no longer in the city", expect.stringMatching(/^ballot cast for A03 /)]);
	});

	it("shows the quoted showReceipt description where the story quotes DMs (D-9)", async () => {
		const { options: host } = setup();
		const info = createHost(host);
		info.start();
		let listed = "";
		await info.playMinute((turn) => {
			if (turn.resident === "A06") listed = turn.tools.find((tool) => tool.name === "showReceipt")?.description ?? "";
			return Promise.resolve();
		});
		expect(listed).toContain("word for word");
	});
});

describe("the mechanic", () => {
	it("is deterministic, survives snapshot round trips and conforms", async () => {
		const { options: host } = setup();
		expect(await checkDeterminism(host, () => scriptedAgent(goldenPlan()))).toEqual([]);
		for (const cut of [5, 11]) expect(await checkSnapshotRoundTrip(host, () => scriptedAgent(goldenPlan()), cut)).toEqual([]);
		expect(checkOptionsDocumented(whispers)).toEqual([]);
		expect(checkSourceRules(sourcesOf("whispers"))).toEqual([]);
	});
});

describe("the legacy slice (a fixture in the old shape: no example snapshot holds whispers state)", () => {
	const PATH = join(ROOT, "examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(PATH, "utf8")), {}, PATH);

	function resume(legacy: unknown, spec: { readonly control?: boolean } = {}) {
		const configured = options(whispersStory);
		// Local adapter (docs/design/carve-requests-round2-T1.md R2-2): the converter writes no slice for a field the old file lacks.
		const data = legacy === undefined ? {} : { whispers: legacy };
		const snapshot = { ...converted.host, mechanics: { ...converted.host.mechanics, whispers: { version: 0, data } } };
		const definition = defineCoreStory({
			id: "nexus",
			seed: 7,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [ledger.with(), channelsStandIn().use, exileStandIn([]), puzzlesStandIn([]), progressionStandIn().use, marks.with(configured.marks), receipts.with(), whispers.with({ ...configured.whispers, control: spec.control ?? false }), ...standInsFor(snapshot, ["ledger", "channels", "exile", "marks", "receipts", "whispers", "progression", "puzzles"])],
			grants: { resident: ["nameFavourite"] },
		});
		return createHost({ story: definition, prompts: PROMPTS, resume: { snapshot, events: converted.events } });
	}

	it("keeps forgeries without their victims as {minute} and the vote as it was saved until the first minute restores it", () => {
		const host = resume({ whisperer: "A02", forgeries: [3, 5], popularity: { round: 1, state: "open", ballots: [{ agent: "A01", choice: "A03" }] } });
		const slice = host.snapshot().mechanics.whispers;
		expect(slice?.version).toBe(1);
		expect(slice?.data).toEqual({
			whisperer: "A02",
			forgeries: [{ minute: 3 }, { minute: 5 }],
			round: 0,
			phase: "pending",
			ballots: [],
			pending: { round: 1, state: "open", ballots: [{ agent: "A01", choice: "A03" }] },
		});
		expect(host.facts()["whispers.whisperer"]).toBe("A02");
	});

	it("restores the vote at the minute the saved run last played: skips counted rounds, keeps an open one with its ballots (old PopularityVote#restore)", async () => {
		const open = resume({ whisperer: "A02", forgeries: [], forgedTo: [], popularity: { round: 1, state: "open", ballots: [{ agent: "A01", choice: "A03" }] } });
		await open.playMinute(scriptedAgent(() => []));
		expect(open.snapshot().mechanics.whispers?.data).toMatchObject({ round: 1, phase: "open", ballots: [{ agent: "A01", choice: "A03" }] });
		// A round whose count minute is past is skipped silently (the saved round 0 counted at minute 6): the next round, pending.
		const skipped = resume({ whisperer: "A02", forgeries: [], popularity: { round: 0, state: "open", ballots: [{ agent: "A01", choice: "A03" }] } });
		await skipped.playMinute(scriptedAgent(() => []));
		expect(skipped.snapshot().mechanics.whispers?.data).toMatchObject({ round: 1, phase: "pending", ballots: [] });
		// The old single surprise vote, counted: every round is closed.
		const single = resume({ whisperer: "A02", forgeries: [], popularity: { state: "closed", ballots: [] } });
		await single.playMinute(scriptedAgent(() => []));
		expect(single.snapshot().mechanics.whispers?.data).toMatchObject({ round: options(whispersStory).whispers.popularity.rounds.length, phase: "closed" });
	});

	it("picks a fresh whisperer when the old file has no whispers (absent or null) and none in a control run", () => {
		const fresh = resume(undefined);
		const picked = fresh.facts()["whispers.whisperer"];
		expect(typeof picked).toBe("string");
		expect(resume(null).facts()["whispers.whisperer"]).toBe(picked);
		expect(resume(undefined, { control: true }).facts()["whispers.whisperer"]).toBeNull();
		expect(() => resume({ whisperer: "A02", forgeries: [] }, { control: true })).toThrow(/control run must start fresh/);
		expect(() => resume({ whisperer: "Z99", forgeries: [] })).toThrow(/not one of this run's competitors/);
	});
});
