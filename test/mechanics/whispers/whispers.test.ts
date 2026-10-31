/**
 * The whispers mechanic (carve step 6, team T1): the golden gate for the whisperer, the duty
 * notices, the popularity vote and the forged receipt (the golden run's DMs, ballots and forgery
 * replayed as the residents' calls; the golden receipts through `ReceiptsApi`, as their issuers
 * call it), the tools' checks and the migration of the legacy slice (no example snapshot holds
 * whispers state, so a fixture in the old shape stands in). `ChannelsApi` and `ExileApi` are
 * stand-ins (teams T2 and T4).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { receipts } from "@swarmtales/mechanic-receipts";
import { ProgressionEvents } from "@swarmtales/mechanic-shared";
import { whispers } from "@swarmtales/mechanic-whispers";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, compareGolden, goldenCalls, ownedBy, playStory, scriptedAgent, standInsFor, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import whispersStory from "../../../stories/whispers/story.ts";
import { channelsStandIn, goldenLog, ids, sourcesOf, writtenBy } from "../t1/support.ts";
import { exileStandIn, fragmentsStandIn, receiptReplay, standInWithEvents } from "../t1/stand-ins.ts";

const ROOT = join(import.meta.dirname, "../../..");
const PROMPTS = createPromptLookup({ mechanics: { receipts: join(ROOT, "mechanics/receipts/prompts") } });
const NAME = "whispers-f10-grudge";

function options(story: typeof whispersStory) {
	const rules = story.rules.marks;
	if (rules === undefined) throw new Error("the story has marks");
	const { ranges, ...base } = rules;
	const spec = story.whisperer;
	if (spec === undefined || story.popularity === undefined) throw new Error("the story has a whisperer and a vote");
	return {
		marks: { rules: ranges === undefined ? base : { ...base, ranges: ranges.map((range) => ({ ...range })) } },
		whispers: {
			whisperer: {
				...(spec.agent === undefined ? {} : { agent: spec.agent }),
				forgery: spec.forgery,
				duty: { ...spec.duty },
				...(spec.direction?.quota === undefined ? {} : { quota: { ...spec.direction.quota, report: { ...spec.direction.quota.report } } }),
			},
			popularity: { rounds: story.popularity.rounds.map((round) => ({ ...round })), texts: { ...story.popularity.texts } },
		},
	};
}

/** The golden run's calls that this mechanic or the channels stand-in answers, as a plan per resident and minute. */
function goldenPlan(): (turn: { readonly resident: string; readonly minute: number }) => readonly PlannedCall[] {
	const calls = goldenCalls(goldenLog(NAME)).filter((call) => ["sendDM", "nameFavourite", "forgeReceipt"].includes(call.tool));
	return (turn) => calls.filter((call) => call.agent === turn.resident && call.minute === turn.minute).map((call) => ({ tool: call.tool, params: call.args }));
}

function setup(control = false) {
  const configured = options(whispersStory);
	const channels = channelsStandIn();
	const definition = defineCoreStory({
		id: "whispers-test",
		seed: 7,
		minutes: 21,
		residents: ids(6),
		mechanics: [ledger.with({ startPoints: 15 }), channels.use, exileStandIn([]), fragmentsStandIn(goldenLog(NAME)), marks.with(configured.marks), receipts.with({ quoteDms: true }), receiptReplay(goldenLog(NAME)), whispers.with({ ...configured.whispers, control })],
		grants: { resident: ["sendDM", "nameFavourite", "forgeReceipt"] },
	});
	return { options: { story: definition, prompts: PROMPTS }, channels };
}

describe("the golden gate for the whisperer, the vote and the forgery", () => {
	it("writes the golden events for the golden calls", async () => {
		const records: CallRecord[] = [];
		const { options: host } = setup();
		const run = await playStory(host, scriptedAgent(goldenPlan(), records));
		const expected = ownedBy(goldenLog(NAME), ["whispers"]);
		expect(expected.length).toBeGreaterThan(15);
		expect(compareGolden(ballotsSorted(expected), ballotsSorted(writtenBy(run.events, ["whispers"])))).toBeUndefined();
		expect(records.filter((record) => record.tool !== "sendDM").every((record) => record.outcome.ok)).toBe(true);
	});

	it("has no whisperer in a control run", async () => {
		const { options: host } = setup(true);
		const run = await playStory(host, scriptedAgent(() => []));
		expect(run.host.facts()["whispers.whisperer"]).toBeNull();
		expect(writtenBy(run.events, ["whispers"]).some((line) => line.includes("whisperer_chosen") || line.includes("whisper_duty"))).toBe(false);
	});
});

describe("the tools", () => {
	it("locks nameFavourite until a vote is open and forgeReceipt to the whisperer, and checks a ballot and a forgery in the old order", async () => {
		const records: CallRecord[] = [];
		const { options: host } = setup();
		const plan = (turn: { readonly resident: string; readonly minute: number }): readonly PlannedCall[] => {
			const vote = (agent: string): PlannedCall => ({ tool: "nameFavourite", params: { agent } });
			const forge = (to: string, receiptId: string, text: string): PlannedCall => ({ tool: "forgeReceipt", params: { to, receiptId, text } });
			if (turn.minute === 1 && turn.resident === "A01") return [vote("A02")];
			if (turn.minute === 5 && turn.resident === "A01") return [vote("A01"), vote("Z99"), vote("A02"), vote("A03")];
			if (turn.minute === 14 && turn.resident === "A06") return [forge("A03", "R-0099", "x"), forge("A03", "R-0002", "x"), forge("A03", "R-0001", "   "), forge("A06", "R-0001", "x"), forge("Z99", "R-0001", "x")];
			if (turn.minute === 14 && turn.resident === "A01") return [forge("A03", "R-0001", "x")];
			return [];
		};
		await playStory(host, scriptedAgent((turn) => [...plan(turn), ...goldenPlan()(turn).filter((call) => call.tool === "sendDM")], records));
		const said = (record: CallRecord): string => (record.outcome.ok ? record.outcome.reply : `${record.outcome.code}: ${record.outcome.detail ?? ""}`);
		const of = (resident: string, minute: number, tool: string): string[] => records.filter((record) => record.resident === resident && record.minute === minute && record.tool === tool).map(said);
		expect(of("A01", 1, "nameFavourite")[0]).toMatch(/^TOOL_LOCKED/);
		expect(of("A01", 5, "nameFavourite")).toEqual(["SELF_VOTE: you cannot name yourself", "UNKNOWN_AGENT: Z99", expect.stringMatching(/^ballot cast for A02 · secret · the vote closes at minute 6; your last ballot counts$/), expect.stringMatching(/^ballot cast for A03 /)]);
		expect(of("A06", 14, "forgeReceipt")).toEqual([
			"UNKNOWN_RECEIPT: R-0099",
			"NOT_A_PARTY: R-0002",
			"INVALID_TEXT: 1-800 characters",
			"SELF_TARGET: show it to another resident",
			"UNKNOWN_AGENT: Z99",
		]);
		expect(of("A01", 14, "forgeReceipt")[0]).toMatch(/^TOOL_LOCKED/);
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

/**
 * Ballots of one round come in the order the residents act. The host shuffles the turn order of a
 * minute on its own, so the gate compares the ballots of a run as a set (sorted), the rest in order.
 */
function ballotsSorted(lines: readonly string[]): readonly string[] {
	const sorted: string[] = [];
	let run: string[] = [];
	const flush = (): void => {
		sorted.push(...run.sort());
		run = [];
	};
	for (const line of lines) {
		if (line.includes('"type":"popularity_ballot"')) run.push(line);
		else {
			flush();
			sorted.push(line);
		}
	}
	flush();
	return sorted;
}

describe("the legacy slice (a fixture in the old shape: no example snapshot holds whispers state)", () => {
	const PATH = join(ROOT, "examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(PATH, "utf8")), {}, PATH);
	const legacy = { whispers: { whisperer: "A02", forgeries: [3, 5], forgedTo: ["A04", "A05"], popularity: { round: 1, state: "open", ballots: [{ agent: "A01", choice: "A03" }] } } };
	const snapshot = { ...converted.host, mechanics: { ...converted.host.mechanics, whispers: { version: 0, data: legacy } } };

	it("resumes with the version-0 slice migrated to version 1", () => {
		const configured = options(whispersStory);
		const definition = defineCoreStory({
			id: "nexus",
			seed: 7,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [ledger.with(), channelsStandIn().use, exileStandIn([]), marks.with(configured.marks), receipts.with(), whispers.with(configured.whispers), standInWithEvents(ProgressionEvents), ...standInsFor(snapshot, ["ledger", "channels", "exile", "marks", "receipts", "whispers", "progression"])],
			grants: {},
		});
		const host = createHost({ story: definition, prompts: PROMPTS, resume: { snapshot, events: converted.events } });
		const slice = host.snapshot().mechanics.whispers;
		expect(slice?.version).toBe(1);
		expect(slice?.data).toEqual({
			whisperer: "A02",
			forgeries: [{ minute: 3, to: "A04" }, { minute: 5, to: "A05" }],
			round: 1,
			phase: "open",
			ballots: [{ agent: "A01", choice: "A03" }],
		});
		expect(host.facts()["whispers.whisperer"]).toBe("A02");
	});
});
