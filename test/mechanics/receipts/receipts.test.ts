/**
 * The receipts mechanic (carve step 5, team T1): the golden gate for `receipt_issued` (the golden
 * run's level-up and DM receipts replayed through `ReceiptsApi`, as their issuers progression and
 * channels call it), the tool `showReceipt`, the blame desk with a judge stub, the status part and
 * the resume of the legacy snapshot. `ChannelsApi` and `ExileApi` are stand-ins (teams T2 and T4).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import type { RoleCaller, Turn } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { receipts } from "@swarmtales/mechanic-receipts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, goldenDiff, goldenOrder, idleAgent, ownedBy, playStory, scriptedAgent, standInsFor, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import { channelsStandIn, GOLDEN_LOGS, goldenLog, ids, sourcesOf, writtenBy } from "../t1/support.ts";
import { exileStandIn, progressionStandIn, receiptIssuers } from "../t1/stand-ins.ts";
import { courier } from "../t1/differential.ts";

const PROMPTS = createPromptLookup();


describe("the golden gate for receipt_issued", () => {
	it.each(GOLDEN_LOGS)("%s: the receipts equal the golden run's", async (name) => {
		const log = goldenLog(name);
		const definition = defineCoreStory({
			id: "golden",
			seed: 7,
			minutes: 21,
			residents: ids(6),
			mechanics: [ledger.with(), channelsStandIn().use, receipts.with({ quoteDms: name.startsWith("whispers") }), receiptIssuers(log, name.startsWith("whispers"))],
			grants: {},
		});
		const run = await playStory({ story: definition, prompts: PROMPTS }, idleAgent);
		const expected = ownedBy(log, ["receipts"]);
		expect(expected.length).toBeGreaterThan(20);
		expect(goldenDiff(expected, writtenBy(run.events, ["receipts"]))).toEqual([]);
		expect(run.events.filter((event) => event.type === "receipt_issued").map(() => "receipts:receipt_issued")).toEqual(goldenOrder(log, ["receipts"]));
	});
});

const give = (target: string, amount: number, memo?: string): PlannedCall => ({ tool: "transferPoints", params: memo === undefined ? { target, amount } : { target, amount, memo } });
const show = (receiptId: string, to?: string): PlannedCall => ({ tool: "showReceipt", params: to === undefined ? { receiptId } : { receiptId, to } });
const blame = (dm: number, accused: string, claim: number): PlannedCall => ({ tool: "blame", params: { dm, accused, claim } });
const dmTo = (target: string, message: string): PlannedCall => ({ tool: "sendDM", params: { target, message } });

const said = (record: CallRecord): string => (record.outcome.ok ? record.outcome.reply : `${record.outcome.code}: ${record.outcome.detail ?? ""}`);

const plan = (turn: Turn): readonly PlannedCall[] => {
	if (turn.minute === 0 && turn.resident === "A01") return [give("A02", 3, "thanks"), dmTo("A02", "Door 2 is open.")];
	if (turn.minute === 1 && turn.resident === "A02") return [dmTo("A01", "I never got a DM from you.")];
	if (turn.minute === 2 && turn.resident === "A03") return [show("R-0001"), show("R-0099"), show("r-1")];
	if (turn.minute === 2 && turn.resident === "A01") {
		return [show("R-0001", "A01"), show("R-0001", "Z99"), show("R-0001", "A04"), show("R-0001", "A02"), show("1"), blame(1, "A02", 2), blame(1, "A02", 2), blame(1, "A01", 2), blame(1, "Z99", 2), blame(77, "A02", 2)];
	}
	return [];
};

function judge(answer: unknown, questions: unknown[] = []): RoleCaller {
	return {
		ask: (question) => {
			questions.push(question.question);
			return Promise.resolve(answer === undefined ? { ok: false, error: "no answer", costUsd: 0 } : { ok: true, answer, costUsd: 0 });
		},
	};
}

function setup(roles: Readonly<Record<string, RoleCaller>> = {}, options: object = {}) {
	const channels = channelsStandIn();
	const progression = progressionStandIn({ ladder: [5] });
	const definition = defineCoreStory({
		id: "receipts-test",
		seed: 7,
		minutes: 4,
		residents: ids(4),
		mechanics: [ledger.with({ startPoints: 10 }), channels.use, exileStandIn(["A04"]), progression.use, receipts.with(options), courier(channels.log)],
		grants: { resident: ["transferPoints", "sendDM", "showReceipt", "blame"] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
	return { options: { story: definition, prompts: PROMPTS, roles }, channels };
}

describe("showReceipt", () => {
	it("issues the transfer receipt at once, tells the recipient and checks a show in the old order", async () => {
		const records: CallRecord[] = [];
		const { options, channels } = setup({ judge: judge({ deniesReceipt: false }) });
		const run = await playStory(options, scriptedAgent(plan, records));
		const lines = writtenBy(run.events, ["ledger", "receipts"]);
		const at = lines.findIndex((line) => line.includes('"type":"transfer"'));
		expect(lines[at + 1]).toBe('{"type":"receipt_issued","receipt":"R-0001","kind":"transfer","parties":["A01","A02"],"text":"R-0001: A01 → A02, 3 points, minute 0, memo \\"thanks\\"","minute":0}');
		expect(channels.log.notices[0]).toEqual({ to: "A02", author: "CITY", text: 'R-0001: A01 → A02, 3 points, minute 0, memo "thanks"' });
		const a03 = records.filter((record) => record.resident === "A03" && record.minute === 2).map(said);
		expect(a03).toEqual(["NOT_A_PARTY: R-0001", "UNKNOWN_RECEIPT: R-0099", "NOT_A_PARTY: r-1"]);
		const a01 = records.filter((record) => record.resident === "A01" && record.minute === 2 && record.tool === "showReceipt").map(said);
		expect(a01).toEqual([
			"SELF_TARGET: show it to another resident, or on the board",
			"UNKNOWN_AGENT: Z99",
			"EXILED: A04 was exiled",
			"shown privately to A02 · R-0001",
			expect.stringMatching(/^shown · board #\d+ · CITY verifies R-0001: A01 → A02, 3 points, minute 0, memo "thanks" · shown by A01$/),
		]);
		expect(channels.log.notices.some((notice) => notice.to === "A02" && notice.text === 'A01 shows you a receipt: the city verifies R-0001: A01 → A02, 3 points, minute 0, memo "thanks".')).toBe(true);
		const shown = writtenBy(run.events, ["receipts"]).filter((line) => line.includes('"type":"receipt_shown"'));
		expect(shown[0]).toBe('{"type":"receipt_shown","receipt":"R-0001","by":"A01","to":"A02","minute":2}');
		expect(shown[1]).toMatch(/^\{"type":"receipt_shown","receipt":"R-0001","by":"A01","postSeq":\d+,"minute":2\}$/);
	});

	it("shows how many receipts a resident holds in its status line", async () => {
		const seen: string[] = [];
		const { options } = setup();
		await playStory(options, scriptedAgent((turn) => {
			if (turn.resident === "A01") seen.push(`${String(turn.minute)}: ${turn.inputs.map((note) => note.text).filter((text) => /receipts?$/.test(text)).join("|")}`);
			return plan(turn);
		}));
		expect(seen).toEqual(["0: ", "1: 7 points · 2 receipts", "2: 7 points · 3 receipts", "3: 2 points · 3 receipts"]);
	});
});

describe("blame", () => {
	it("upholds a blame the judge agrees with: the liar pays, the city posts its record and the pair is spent", async () => {
		const records: CallRecord[] = [];
		const questions: unknown[] = [];
		const { options, channels } = setup({ judge: judge({ deniesReceipt: true, board: "A02 wrote 1234567 plainly", gamemaker: "clear" }, questions) });
		const run = await playStory(options, scriptedAgent(plan, records));
		const replies = records.filter((record) => record.resident === "A01" && record.tool === "blame").map(said);
		expect(replies[0]).toMatch(/^upheld · A02 pays 5 points · the city posted its record on the board as #\d+$/);
		expect(replies.slice(1)).toEqual([
			"ALREADY_BLAMED: DM #1 and message #2 were blamed already",
			"SELF_BLAME: you cannot blame yourself",
			"UNKNOWN_AGENT: Z99",
			expect.stringMatching(/^rejected · DM #77 is not a DM of yours to A02 · you paid 5 points \(your next lost blame costs 5\) · the city's record is on the board as #\d+$/),
		]);
		expect(questions[0]).toMatchObject({ sender: "A01", accused: "A02", dm: { number: 1, text: "Door 2 is open." }, claim: { number: 2, channel: "dm", text: "I never got a DM from you." } });
		const record = channels.log.posts.find((post) => post.text.startsWith("City record: A02 lied."));
		expect(record?.text).toContain('The judge: "A02 wrote [number] plainly"');
		const blames = writtenBy(run.events, ["receipts"]).filter((line) => line.includes('"type":"blame"'));
		expect(blames[0]).toMatch(/^\{"type":"blame","caller":"A01","accused":"A02","dm":1,"claim":2,"outcome":"upheld","payer":"A02","penalty":5,"post":\d+,"judge":"\\"A02 wrote \[number\] plainly\\"","whisper":"clear","minute":2\}$/);
		expect(blames[1]).toContain('"outcome":"rejected","payer":"A01","penalty":5,"reason":"DM #77 is not a DM of yours to A02"');
		expect(run.host.facts()["ledger.balances"]).toEqual({ A01: 10 - 3 - 5, A02: 10 + 3 - 5, A03: 10, A04: 10 });
	});

	it("rejects a blame the judge does not agree with", async () => {
		const records: CallRecord[] = [];
		const { options } = setup({ judge: judge({ deniesReceipt: false }) });
		await playStory(options, scriptedAgent(plan, records));
		const first = records.find((record) => record.tool === "blame");
		expect(first === undefined ? "" : said(first)).toMatch(/^rejected · the city's judge finds that DM #2 by A02 does not deny receiving DM #1 · you paid 5 points \(your next lost blame costs 5\) · the city's record is on the board as #\d+$/);
	});

	it("reports an absent judge and a failed judge, and a failed judge leaves the pair free", async () => {
		const absent: CallRecord[] = [];
		await playStory(setup({}).options, scriptedAgent(plan, absent));
		expect(absent.filter((record) => record.tool === "blame").map(said)[0]).toBe("JUDGE_ABSENT: the city's judge is absent");
		const failed: CallRecord[] = [];
		await playStory(setup({ judge: judge(undefined) }).options, scriptedAgent(plan, failed));
		const codes = failed.filter((record) => record.tool === "blame").map(said);
		expect(codes[0]).toBe("JUDGE_FAILED: the city's judge could not decide; the blame had no effect, you may try again");
		expect(codes[1]).toBe(codes[0]);
	});
});

describe("the mechanic", () => {
	it("is deterministic, survives snapshot round trips and conforms", async () => {
		const { options } = setup({ judge: judge({ deniesReceipt: true }) });
		expect(await checkDeterminism(options, () => scriptedAgent(plan))).toEqual([]);
		for (const cut of [1, 2, 3]) expect(await checkSnapshotRoundTrip(options, () => scriptedAgent(plan), cut)).toEqual([]);
		expect(checkOptionsDocumented(receipts)).toEqual([]);
		expect(checkSourceRules(sourcesOf("receipts"))).toEqual([]);
	});
});

describe("the legacy snapshot", () => {
	const PATH = join(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(PATH, "utf8")), {}, PATH);

	it("resumes with the version-0 slice migrated to version 1 and numbers the next receipt after the last", () => {
		const definition = defineCoreStory({
			id: "nexus",
			seed: 7,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [ledger.with(), channelsStandIn().use, receipts.with(), ...standInsFor(converted.host, ["receipts", "ledger", "channels"])],
			grants: {},
		});
		const host = createHost({ story: definition, prompts: PROMPTS, resume: { snapshot: converted.host, events: converted.events } });
		const old = converted.host.mechanics.receipts?.data;
		const legacy: unknown = Reflect.get(old ?? {}, "receipts");
		const slice = host.snapshot().mechanics.receipts;
		expect(slice?.version).toBe(1);
		expect(JSON.stringify(Reflect.get(slice?.data ?? {}, "receipts"))).toBe(JSON.stringify(legacy));
		expect(host.facts()["receipts.issued"]).toBe(Array.isArray(legacy) ? legacy.length : -1);
	});
});
