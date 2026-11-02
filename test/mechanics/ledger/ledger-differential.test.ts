/**
 * Differential tests of the ledger mechanic against the old engine: the double-entry book against
 * `PointsLedger` (random bookings, every error code, idempotency keys, strict accounts, the snapshot
 * and its zero-sum check) and the tool `transferPoints` against the old `World` (replies, refusal
 * order, the events, the receipt notice and the snapshot).
 */
import { describe, expect, it } from "vitest";
import { PointsLedger, LedgerError } from "@swarmtales/kernel";
import { defineCoreStory } from "@swarmtales/kernel";
import { book, ledger, LedgerError as NewLedgerError, restored, SYSTEM_ACCOUNT, type LedgerState } from "@swarmtales/mechanic-ledger";
import { receipts } from "@swarmtales/mechanic-receipts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { type PlannedCall } from "@swarmtales/testkit";
import { socialLevels, tinyStory } from "../../helpers/stories.ts";
import { channelsStandIn, ids, recordOf } from "../t1/support.ts";
import { courier, newOwned, oldNotices, oldOwned, playNew, playOld } from "../t1/differential.ts";
import { exileStandIn } from "../t1/stand-ins.ts";

/** A small deterministic generator, so a failing sequence can be replayed. */
function lcg(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const ACCOUNTS = ["A01", "A02", "A03", "ESCROW:X", "GROUP:G1", "NOWHERE"] as const;

function freshState(): LedgerState {
	return { balances: new Map<string, number>([[SYSTEM_ACCOUNT, 0], ["A01", 0], ["A02", 0], ["A03", 0], ["ESCROW:X", 0], ["GROUP:G1", 0]]), entries: [], keys: new Map(), txSeq: 0 };
}

describe("the book against PointsLedger", () => {
	it.each([1, 2, 3, 4, 5])("books 300 random bookings alike (seed %i): same entries, same errors, same snapshot", (seed) => {
		const random = lcg(seed);
		const old = new PointsLedger();
		for (const account of ACCOUNTS.slice(0, 5)) old.open(account);
		const state = freshState();
		const written: string[] = [];
		const oldWritten: string[] = [];
		const oldBook = new PointsLedger((entry) => oldWritten.push(JSON.stringify(entry)));
		for (const account of ACCOUNTS.slice(0, 5)) oldBook.open(account);
		for (let step = 0; step < 300; step++) {
			const pick = (): string => ACCOUNTS[Math.floor(random() * ACCOUNTS.length)] ?? "A01";
			const debit = random() < 0.3 ? SYSTEM_ACCOUNT : pick();
			const credit = random() < 0.3 ? SYSTEM_ACCOUNT : pick();
			const amount = Math.floor(random() * 9) - 1 + (random() < 0.1 ? 0.5 : 0);
			const allowNegative = random() < 0.4;
			const key = random() < 0.25 ? `k${String(Math.floor(random() * 6))}` : undefined;
			let oldCode: string | undefined;
			let newCode: string | undefined;
			try {
				oldBook.transfer(debit, credit, amount, `r${String(step)}`, step, { allowNegativeDebit: allowNegative, ...(key === undefined ? {} : { idempotencyKey: key }) });
			} catch (error) {
				oldCode = error instanceof LedgerError ? error.code : "other";
			}
			try {
				book(state, debit, credit, amount, `r${String(step)}`, step, { allowNegative, strict: true, ...(key === undefined ? {} : { idempotencyKey: key }) }, (entry) => written.push(JSON.stringify(entry)));
			} catch (error) {
				newCode = error instanceof NewLedgerError ? error.code : "other";
			}
			expect(newCode, `step ${String(step)}`).toBe(oldCode);
		}
		expect(written).toEqual(oldWritten);
		const snapshot = oldBook.snapshot();
		expect([...state.balances].map(([account, balance]) => ({ account, balance }))).toEqual(snapshot.balances);
		expect(state.entries.map((entry) => ({ ...entry }))).toEqual(snapshot.entries.map((entry) => ({ ...entry })));
		expect(state.txSeq).toBe(snapshot.txSeq);
		// The snapshot round trip keeps the order of the accounts and the idempotency keys.
		const again = restored({ balances: snapshot.balances, entries: snapshot.entries, txSeq: snapshot.txSeq });
		expect([...again.balances.keys()]).toEqual(snapshot.balances.map((entry) => entry.account));
		expect(again.keys.size).toBe(state.keys.size);
		old.restore(snapshot);
		expect(old.snapshot()).toEqual(snapshot);
	});

	it("restores in the saved order, adds a missing system account last and refuses a snapshot that is not zero-sum (old restore)", () => {
		const data = { balances: [{ account: "A01", balance: 5 }, { account: SYSTEM_ACCOUNT, balance: -5 }, { account: "ESCROW:X", balance: 0 }], entries: [], txSeq: 0 };
		expect([...restored(data).balances.keys()]).toEqual(["A01", SYSTEM_ACCOUNT, "ESCROW:X"]);
		const withoutSystem = restored({ ...data, balances: [{ account: "A01", balance: 0 }] });
		expect([...withoutSystem.balances.keys()]).toEqual(["A01", SYSTEM_ACCOUNT]);
		const broken = { ...data, balances: [{ account: "A01", balance: 5 }] };
		expect(() => restored(broken)).toThrow(/sum to 5, not 0/);
		expect(() => {
			new PointsLedger().restore(broken);
		}).toThrow(/sum to 5, not 0/);
	});
});

const LEVELS = socialLevels(["transferPoints", "showReceipt", "sendDM", "readBoard"]);
const give = (target: string, amount: number, memo?: string): PlannedCall => ({ tool: "transferPoints", params: memo === undefined ? { target, amount } : { target, amount, memo } });

/** Refusals in the old check order (a schema failure is the runner's and the core's own text, not the mechanic's: the old runner also coerced 1.5 to 1), successes with and without a memo, and the DM cap. */
const plan = (agent: string, minute: number): readonly PlannedCall[] => {
	if (minute === 0 && agent === "A01") return [give("A02", 3, "thanks"), give("A01", 1), give("Z99", 1), give("A04", 50), give("A02", 1, "code 559 102"), give("A02", 2), give("A03", 1, "memo")];
	if (minute === 0 && agent === "A02") return [give("A01", 1, "first"), give("A03", 1, "second"), give("A03", 1, "third"), give("A03", 1)];
	if (minute === 0 && agent === "A03") return [give("A02", 100), give("a02", 1), give("A04", 1, "x")];
	if (minute === 1 && agent === "A04") return [give("A01", 4)];
	if (minute === 1 && agent === "A01") return [give("A02", 1, "again")];
	return [];
};

function newOptions(dmLimit: { perWindow: number; windowMinutes: number } | undefined, log = channelsStandIn(dmLimit)) {
	const definition = defineCoreStory({
		id: "ledger-differential",
		seed: 3,
		minutes: 3,
		residents: ids(4),
		mechanics: [ledger.with({ startPoints: 10 }), log.use, exileStandIn([]), receipts.with(), courier(log.log)],
		grants: { resident: ["transferPoints", "sendDM"] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
	return { story: definition, prompts: createPromptLookup() };
}

describe.each([
	["without a DM cap", undefined],
	["with a DM cap of 2 memos and DMs per window", { perWindow: 2, windowMinutes: 3 }],
])("transferPoints against the old World, %s", (_name, dmLimit) => {
	it("answers every call alike, writes the same events and receipt notices and keeps the same snapshot", async () => {
		const base = tinyStory({ agents: 4, levels: LEVELS });
		const story = dmLimit === undefined ? base : { ...base, rules: { ...base.rules, dmLimit } };
		const old = await playOld({ story, agents: 4, minutes: 3, plan });
		const fresh = await playNew(newOptions(dmLimit), plan);
		expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
		for (const [at, replies] of old.replies) expect(fresh.replies.get(at), at).toEqual(replies);
		expect(newOwned(fresh, ["ledger"])).toEqual(oldOwned(old, ["ledger"]));
		expect(newOwned(fresh, ["receipts"])).toEqual(oldOwned(old, ["receipts"]));
		expect(newOwned(fresh, ["channels"]).filter((line) => line.includes('"type":"notice"')).map(recordOf).map((line) => `${String(line.to)}|${String(line.text)}`)).toEqual(
			oldNotices(old).map(recordOf).map((line) => `${String(line.to)}|${String(line.text)}`),
		);
		const legacy = old.world.snapshot().ledger;
		expect(JSON.parse(JSON.stringify(fresh.host.snapshot().mechanics.ledger?.data))).toEqual({ balances: legacy.balances, entries: legacy.entries, txSeq: legacy.txSeq });
		expect(fresh.host.facts()["ledger.balances"]).toEqual(Object.fromEntries(ids(4).map((id) => [id, old.world.ledger.balance(id)])));
	});
});
