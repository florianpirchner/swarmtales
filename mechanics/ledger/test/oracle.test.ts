// SPDX-License-Identifier: Apache-2.0
/**
 * The oracle proofs of the ledger (specification of M3, section 2.5, projections 4 and 5). No City of Keys oracle
 * can be replayed whole, so the test walks the oracle's timeline: it makes every `transferPoints` call of the file,
 * and books what the file's other mechanics booked (rewards, penalties, goals) through the ledger's service, where
 * the file has it. The ledger's events and the answers of the calls are then compared with the file's, byte for
 * byte after the registered mappings. Every proof also runs against a copy of the file changed by hand.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { defineGame, defineHead, defineMechanic, refuse, reply, type MechanicUse } from "@swarmtales/sdk";
import { eventBurst, OracleSchema, projectCalls, projectionDifference, projectionRest, projectLog, projectOracle, readOracle, renumbered, testKernel, timelineOf, type Oracle, type ProjectedEvent, type TestKernel } from "@swarmtales/testkit";
import { LedgerService, SYSTEM_ACCOUNT } from "../src/contract.ts";
import { ledger } from "../src/index.ts";

const pathOf = (file: string): string => resolve(import.meta.dirname, `../../../oracles/cityofkeys/${file}.json`);
// A copy of an oracle file with one text replaced by hand; the copy is still a valid oracle.
function changed(file: string, from: string, to: string): Oracle {
	const text = readFileSync(pathOf(file), "utf8");
	expect(text.split(from)).toHaveLength(2);
	return Value.Parse(OracleSchema, JSON.parse(text.replace(from, to)));
}

const Booking = Type.Object({ debit: Type.String(), credit: Type.String(), amount: Type.Number(), reason: Type.String() });
const Target = Type.Object({ target: Type.String() });
const Named = Type.Object({ agent: Type.String(), name: Type.String() });

// Stands in for the mechanics that are not in the slice: `book` mints or burns through the service, `strike` banishes.
const bank = defineMechanic(
	defineHead({
		id: "bank",
		package: "@test/bank",
		summary: "Test: books and banishes for the mechanics that are not ported.",
		requires: [LedgerService, ExileService],
		tools: { book: { description: "Books as another mechanic.", params: Booking, for: ["resident"] }, strike: { description: "Banishes.", params: Target, for: ["resident"] } },
	}),
	{
		tools: {
			book: {
				run: ({ debit, credit, amount, reason }, ctx) => {
					if (debit === SYSTEM_ACCOUNT) ctx.call(LedgerService, "mint", { account: credit, amount, reason });
					else if (credit === SYSTEM_ACCOUNT) ctx.call(LedgerService, "burn", { account: debit, amount, reason });
					else return refuse("NO_SYSTEM_BOOKING");
					return reply("booked");
				},
			},
			strike: { run: ({ target }, ctx) => (ctx.call(ExileService, "banish", { resident: target }).ok ? reply("banished") : refuse("REFUSED")) },
		},
	},
);

const TOOLS = ["transferPoints"];
const BOOKS = [{ source: "ledger", type: "ledger_entry" }, { source: "ledger", type: "transfer" }] as const;

// What another mechanic booked at this place of the oracle; undefined for the ledger's own entries: the start
// points (its hook) and the entry of a transfer (its tool), which are never fed.
function foreign(timeline: Oracle["timeline"], index: number): Static<typeof Booking> | undefined {
	const [before, entry] = [timeline[index - 1], timeline[index]];
	if (entry?.k !== "event" || entry.source !== "ledger" || entry.type !== "ledger_entry") return undefined;
	const { debit, credit, amount, reason } = Value.Parse(Booking, entry.payload);
	return reason === "start points" || (before?.k === "call" && TOOLS.includes(before.tool)) ? undefined : { debit, credit, amount, reason };
}

// Walks the oracle up to `until`: the file's transfers are called, the bookings of other mechanics are fed in.
async function replayed(oracle: Oracle, until = oracle.timeline.length, extra: readonly MechanicUse[] = []): Promise<{ test: TestKernel; fed: number }> {
	const timeline = oracle.timeline.slice(0, until);
	const test = testKernel(defineGame({ id: "ledger-oracle", seed: oracle.seed, residents: oracle.setup.residents, mechanics: [ledger({ startPoints: 15 }), exile(), bank(), ...extra], end: { ticks: 99 } }));
	let fed = 0;
	for (const [index, entry] of timeline.entries()) {
		if (entry.k === "call" && TOOLS.includes(entry.tool)) await test.call(entry.actor.slice("resident:".length), entry.tool, entry.params);
		const booking = foreign(timeline, index);
		if (booking === undefined) continue;
		expect(await test.call(oracle.setup.residents[0] ?? "", "book", booking)).toMatchObject({ ok: true });
		fed++;
	}
	return { test, fed };
}

const namesOf = (oracle: Oracle): readonly Static<typeof Named>[] => projectOracle(oracle.timeline, [{ source: "names", type: "name_chosen" }]).map((event) => Value.Parse(Named, event.payload));
// Registered mappings of an answer's text: `names` is not in the slice (a resident is shown by its id), nor is `receipts`
// (no receipt id). With `named`, a stand-in of `identity` shows the file's names, and only the receipt is mapped.
function mapping(oracle: Oracle, named = false): (text: string) => string {
	const names = named ? [] : namesOf(oracle);
	return (text) => names.reduce((mapped, { agent, name }) => mapped.replaceAll(name, agent), text).replace(/receipt R-\d+$/, "receipt none");
}

// Stands in for `names` with the names the file chose (M5-12): every id in a text is shown by its name.
function identityOf(oracle: Oracle): MechanicUse {
	const names = namesOf(oracle);
	const display = (text: string): string => names.reduce((shown, { agent, name }) => shown.replaceAll(agent, name), text);
	const nameOf = (resident: string): string | null => names.find(({ agent }) => agent === resident)?.name ?? null;
	const resolveName = (text: string): string => names.find(({ name }) => name === text)?.agent ?? text;
	const head = defineHead({ id: "names", package: "@test/names", summary: "Test: the names of the oracle file.", provides: [IdentityService] });
	return defineMechanic(head, { services: { identity: { nameOf: ({ resident }) => nameOf(resident), display: ({ text }) => display(text), resolve: ({ text }) => resolveName(text) } } })();
}

type Lists = readonly [expected: readonly ProjectedEvent[], actual: readonly ProjectedEvent[]];
// Projection 5: the books and the answers of the whole file against the run.
async function books(oracle: Oracle, named = false): Promise<{ events: Lists; calls: Lists; fed: number; rest: Readonly<Record<string, number>> }> {
	const { test, fed } = await replayed(oracle, oracle.timeline.length, named ? [identityOf(oracle)] : []);
	const log = test.kernel.log.all();
	const expected = projectOracle(oracle.timeline, BOOKS);
	return {
		events: [renumbered(expected, ["txId"]).events, renumbered(projectLog(log, BOOKS), ["txId"]).events],
		calls: [projectCalls(oracle.timeline, TOOLS, mapping(oracle, named)), projectCalls(timelineOf(log), TOOLS)],
		fed,
		rest: projectionRest(oracle.timeline, ["ledger"], expected),
	};
}

describe("projection 5: every transferPoints call, ledger_entry and transfer of act one", () => {
	it.each([
		["cityofkeys-act1-s7", 62, 47],
		["cityofkeys-act1-s11", 60, 45],
	] as const)("%s: the books and the answers are byte-equal after the mappings", async (file, entries, others) => {
		const { events, calls, fed, rest } = await books(readOracle(pathOf(file)));
		expect([events[0].length, calls[0].length, fed]).toEqual([entries + 9, 9, others]);
		expect(projectionDifference(...events)).toBeUndefined();
		expect(projectionDifference(...calls)).toBeUndefined();
		expect(JSON.stringify(calls[1][0])).toContain('"ok":true,"reply":"ok · 1 points to A0');
		// Nothing the ledger wrote is left out; printed for the record (`oracles/cityofkeys/README.md`).
		console.info(`${file}: ledger events left out of projection 5: ${JSON.stringify(rest)}; entries of other mechanics fed through the service: ${String(fed)}`);
		expect(rest).toEqual({});
	});

	it.each(["cityofkeys-act1-s7", "cityofkeys-act1-s11"] as const)("%s: with a stand-in of identity the answers show the file's names, only the receipt is mapped", async (file) => {
		const { events, calls } = await books(readOracle(pathOf(file)), true);
		expect(projectionDifference(...events)).toBeUndefined();
		expect(projectionDifference(...calls)).toBeUndefined();
		expect(JSON.stringify(calls[1][0])).toMatch(/"reply":"ok · 1 points to [A-Z][a-z]+-\d{4} · /);
	});

	it.each([
		["a balance in an answer", "your balance: 22 ·", "your balance: 23 ·", "calls", 0],
		["the amount of a transfer event", '"amount":1,"memo":"a deal at minute 3","txId":"TX21"', '"amount":2,"memo":"a deal at minute 3","txId":"TX21"', "events", 21],
		["a transfer booked the other way", '{"txId":"TX22","debit":"A02","credit":"A03"', '{"txId":"TX22","debit":"A03","credit":"A02"', "events", 22],
		// The reward is fed in, so the books follow the copy; the balance the ledger then answers with does not.
		["a reward of a sender before its transfer", '"txId":"TX10","debit":"SYSTEM_MINT_BURN","credit":"A04","amount":5', '"txId":"TX10","debit":"SYSTEM_MINT_BURN","credit":"A04","amount":6', "calls", 2],
	] as const)("a copy of the oracle with %s changed is found", async (_what, from, to, list, index) => {
		const proof = await books(changed("cityofkeys-act1-s7", from, to));
		expect(projectionDifference(...proof[list])?.index).toBe(index);
		expect(projectionDifference(...proof[list === "calls" ? "events" : "calls"])).toBeUndefined();
	});
});

const ENTRIES = [{ source: "ledger", type: "ledger_entry" }] as const;
// Projection 4: the ledger's entries up to and with the burn of the first exile, the balance reached through the service.
async function burn(oracle: Oracle): Promise<Lists> {
	const burst = eventBurst(oracle.timeline, "exile", "exiled");
	const { agent } = Value.Parse(Type.Object({ agent: Type.String() }), burst.entries[0]?.k === "event" ? burst.entries[0].payload : undefined);
	const { test } = await replayed(oracle, burst.index);
	expect(await test.call(oracle.setup.residents.find((id) => id !== agent) ?? "", "strike", { target: agent })).toMatchObject({ ok: true });
	const expected = projectOracle(oracle.timeline.slice(0, burst.index + burst.entries.length), ENTRIES);
	return [renumbered(expected, ["txId"]).events, renumbered(projectLog(test.kernel.log.all(), ENTRIES), ["txId"]).events];
}

describe("projection 4: the burn after the first exile of cityofkeys-burn-s7", () => {
	it("the entry that burns the 35 points of A04 is byte-equal, the balance reached by the oracle's entries", async () => {
		const [expected, actual] = await burn(readOracle(pathOf("cityofkeys-burn-s7")));
		expect(expected).toHaveLength(25);
		expect(expected[24]?.payload).toEqual({ txId: 25, debit: "A04", credit: SYSTEM_ACCOUNT, amount: 35, reason: "exiled A04" });
		expect(projectionDifference(expected, actual)).toBeUndefined();
	});

	it.each([
		["another amount burned", '"amount":35,"reason":"exiled A04"', '"amount":36,"reason":"exiled A04"', 35],
		["another reason", '"amount":35,"reason":"exiled A04"', '"amount":35,"reason":"exile A04"', 35],
		// A04 earned one point more before the exile: the run burns 36, the copy still says 35.
		["a reward of A04 before the exile", '"credit":"A04","amount":5,"reason":"level 1 solved"', '"credit":"A04","amount":6,"reason":"level 1 solved"', 36],
	] as const)("a copy of the oracle with %s is found", async (_what, from, to, burned) => {
		const [expected, actual] = await burn(changed("cityofkeys-burn-s7", from, to));
		expect(projectionDifference(expected, actual)).toMatchObject({ index: 24, actual: { payload: { amount: burned, reason: "exiled A04" } } });
	});
});
