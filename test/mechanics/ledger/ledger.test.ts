/**
 * The ledger mechanic (carve step 2, team T1): the golden gate for `ledger_entry` and `transfer`,
 * the transfer tool's checks and replies as the old engine gave them (check order, codes, texts),
 * the zero-sum limit and the resume of the legacy snapshot. `ChannelsApi`, `ExileApi` and the
 * receipt that `transferPoints` names are stand-ins (teams T2, T4 and the receipts mechanic).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import type { MechanicUse, Turn } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LedgerEvents } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, compareGolden, idleAgent, ownedBy, playStory, scriptedAgent, standInsFor, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import { channelsStandIn, GOLDEN_LOGS, goldenLog, ids, sourcesOf, writtenBy } from "../t1/support.ts";
import { exileStandIn, ledgerReplay } from "../t1/stand-ins.ts";

/** The receipt a transfer gets, as the real receipts mechanic issues it right after `transfer`. */
function receiptStub(): MechanicUse {
	return defineMechanic(
		{ id: "receipts", summary: "Stand-in receipt.", options: Type.Object({}), state: () => ({ issued: 0 }), events: { receipt_issued: Type.Object({ receipt: Type.String() }) } },
		(kit) => ({
			listeners: [
				kit.listen(
					LedgerEvents,
					"transfer",
					(_payload, ctx) => {
						ctx.state.issued += 1;
						ctx.emit("receipt_issued", { receipt: `R-${String(ctx.state.issued).padStart(4, "0")}` });
					},
					{ immediate: true },
				),
			],
			snapshot: kit.snapshot({ version: 1, schema: Type.Object({ issued: Type.Integer() }), save: (state) => ({ issued: state.issued }), load: (data) => ({ issued: data.issued }) }),
		}),
	).with();
}

describe("the golden gate for ledger_entry and transfer", () => {
	it.each(GOLDEN_LOGS)("%s: the ledger writes the golden bookings for the golden calls", async (name) => {
		const log = goldenLog(name);
		const start = log.find((line) => line.type === "ledger_entry")?.amount;
		const definition = defineCoreStory({
			id: "golden",
			seed: 7,
			minutes: 21,
			residents: ids(6),
			mechanics: [ledger.with({ startPoints: typeof start === "number" ? start : 0 }), ledgerReplay(log)],
			grants: {},
		});
		const run = await playStory({ story: definition, prompts: createPromptLookup() }, idleAgent);
		const expected = ownedBy(log, ["ledger"]);
		expect(expected.length).toBeGreaterThan(20);
		expect(compareGolden(expected, writtenBy(run.events, ["ledger"]))).toBeUndefined();
		expect(run.host.facts()["ledger.entries"]).toBe(expected.length);
	});
});

const plan = (turn: Turn): readonly PlannedCall[] => {
	const give = (target: string, amount: number, memo?: string): PlannedCall => ({ tool: "transferPoints", params: memo === undefined ? { target, amount } : { target, amount, memo } });
	if (turn.minute === 0 && turn.resident === "A01") return [give("A02", 3, "thanks"), give("A01", 1), give("Z99", 1), give("A04", 1), give("A02", 1, "code 559 102"), give("A02", 50)];
	if (turn.minute === 0 && turn.resident === "A03") return [give("A02", 1, "hello"), give("A02", 2)];
	if (turn.minute === 1 && turn.resident === "A02") return [give("A01", 13)];
	return [];
};

function setup() {
	const channels = channelsStandIn();
	const definition = defineCoreStory({
		id: "ledger-test",
		seed: 7,
		minutes: 3,
		residents: ids(4),
		mechanics: [ledger.with({ startPoints: 10 }), channels.use, exileStandIn(["A04"]), receiptStub()],
		grants: { resident: ["transferPoints", "sendDM"] },
	});
	return { options: { story: definition, prompts: createPromptLookup() }, channels };
}

describe("transferPoints", () => {
	it("books the transfer, writes ledger_entry then transfer, and replies with the receipt", async () => {
		const records: CallRecord[] = [];
		const { options } = setup();
		const run = await playStory(options, scriptedAgent(plan, records));
		const reply = (resident: string, minute: number): string[] => records.filter((record) => record.resident === resident && record.minute === minute).map((record) => (record.outcome.ok ? record.outcome.reply : `${record.outcome.code}: ${record.outcome.detail ?? ""}`));
		const first = reply("A01", 0);
		expect(first[0]).toMatch(/^ok · 3 points to A02 · your balance: 7 · receipt R-000[1-3]$/);
		expect(first.slice(1)).toEqual([
			"SELF_TRANSFER: ",
			"UNKNOWN_AGENT: Z99",
			"EXILED: A04 was exiled",
			"MEMO_DIGITS: memos may not carry numbers of 4+ digits; send codes by message",
			"INSUFFICIENT_FUNDS: ",
		]);
		const lines = writtenBy(run.events, ["ledger"]).filter((line) => !line.includes("start points"));
		const at = lines.findIndex((line) => line.includes('"reason":"thanks"'));
		expect(lines[at]).toMatch(/^\{"type":"ledger_entry","txId":"TX\d+","debit":"A01","credit":"A02","amount":3,"reason":"thanks","minute":0\}$/);
		expect(lines[at + 1]).toMatch(/^\{"type":"transfer","from":"A01","to":"A02","amount":3,"memo":"thanks","txId":"TX\d+","minute":0\}$/);
		// A transfer without a memo is booked as `transfer`.
		expect(lines.some((line) => line.includes('"reason":"transfer"'))).toBe(true);
		expect(run.host.facts()["ledger.balances"]).toEqual({ A01: 10 - 3 + 13, A02: 10 + 3 + 2 - 13 + 1, A03: 7, A04: 10 });
	});

	it("checks the DM cap for a memo, not for a transfer without one", async () => {
		const records: CallRecord[] = [];
		const { options, channels } = setup();
		channels.log.window = { sent: 8, limit: 8, from: 0, until: 4 };
		await playStory(options, scriptedAgent(plan, records));
		const a03 = records.filter((record) => record.resident === "A03").map((record) => (record.outcome.ok ? "ok" : `${record.outcome.code}: ${record.outcome.detail ?? ""}`));
		expect(a03).toEqual(["DM_LIMIT: 8 DMs and memos sent since minute 0; send a memo again from minute 4, or transfer without one", "ok"]);
	});

	it("is deterministic, survives snapshot round trips and conforms", async () => {
		const { options } = setup();
		expect(await checkDeterminism(options, () => scriptedAgent(plan))).toEqual([]);
		for (const cut of [1, 2]) expect(await checkSnapshotRoundTrip(options, () => scriptedAgent(plan), cut)).toEqual([]);
		expect(checkOptionsDocumented(ledger)).toEqual([]);
		expect(checkSourceRules(sourcesOf("ledger"))).toEqual([]);
	});
});

describe("the legacy snapshot", () => {
	const PATH = join(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(PATH, "utf8")), {}, PATH);

	it("resumes with the version-0 slice migrated to version 1 and keeps booking where it stopped", () => {
		const definition = defineCoreStory({ id: "nexus", seed: 7, minutes: 80, residents: converted.host.residents.ids, mechanics: [ledger.with(), ...standInsFor(converted.host, ["ledger"])], grants: {} });
		const host = createHost({ story: definition, prompts: createPromptLookup(), resume: { snapshot: converted.host, events: converted.events } });
		expect(host.facts()["ledger.balances"]).toEqual({ A01: 78, A02: 80, A03: 80, A04: 80, A05: 80, A06: 80 });
		const slice = host.snapshot().mechanics.ledger;
		expect(slice?.version).toBe(1);
		const old = converted.host.mechanics.ledger?.data;
		expect(JSON.stringify(slice?.data)).toBe(JSON.stringify(Reflect.get(old ?? {}, "ledger")));
	});
});
