// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Offers, trades and messages through the bank (the old test "refuses bad offers, taxes big trades, holds escrow
 * until it is due" up to the trade, and "refuses a plain promise of shipment goods due before the trader could hand
 * them over"), and messages; the settling of a delivery is in `market.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { fakeDriver, idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { PERISHABLE } from "../src/model.ts";
import { marketGame, payloads, SEATS, stateOf } from "./support.ts";

const held = (test: TestKernel, seat: string) => stateOf(test).holdings[seat] ?? { salt: 0, cloth: 0, copper: 0, spice: 0, wax: 0 };
const next = (seat: string): string => SEATS[(SEATS.indexOf(seat) + 1) % SEATS.length] ?? "A01";

describe("offers and trades", () => {
	it("refuses bad offers, taxes big trades, takes escrow at the trade and books the delivery", async () => {
		const test = testKernel(marketGame({ rounds: 3, spoil: false }));
		const good = PERISHABLE.find((name) => held(test, "A02")[name] > 0) ?? "cloth";
		expect(await test.call("A01", "offer", { to: "A01", give: { salt: 1 }, get: { [good]: 1 } })).toMatchObject({ ok: false, code: "SELF_OFFER" });
		expect(await test.call("A01", "offer", { to: "Z9", give: { salt: 1 }, get: { [good]: 1 } })).toEqual({ ok: false, code: "UNKNOWN_TRADER", detail: "Z9 is not a trader here. Traders: A02, A03, A04, or all." });
		expect(await test.call("A01", "offer", { to: "A02", give: { salt: 50 }, get: { [good]: 1 } })).toMatchObject({ ok: false, code: "CANNOT_COVER" });
		expect(await test.call("A01", "offer", { to: "A02", give: { salt: 1 } })).toMatchObject({ ok: false, code: "USE_GIVE" });
		expect(await test.call("A01", "offer", { to: "A02" })).toMatchObject({ ok: false, code: "EMPTY_OFFER" });
		expect(await test.call("A01", "offer", { to: "A02", give: { salt: 1 }, get: { [good]: 1 }, later: { salt: 1, round: 1 } })).toEqual({ ok: false, code: "BAD_ROUND", detail: "Later goods must be due in a later round of this game (2 to 3)." });
		// 4 salt + 1 good moves 5 units now: no tax; 1 salt in escrow until round 2 costs the fee.
		expect(await test.call("A01", "offer", { to: "a02", give: { salt: 4 }, get: { [good]: 1 }, later: { salt: 1, round: 2, escrow: true }, note: " fair " })).toEqual({
			ok: true,
			reply: `Offer O1 is open: O1 from A01 (you) to A02: A01 (you) gives 4 salt and wants 1 ${good}; later, by the end of round 2, A01 (you) delivers 1 salt (held in escrow by the bank). Note: "fair" When you are done, end your turn.`,
		});
		expect(await test.call("A01", "accept", { offer: "O1" })).toMatchObject({ ok: false, code: "OWN_OFFER" });
		expect(await test.call("A03", "accept", { offer: "O1" })).toEqual({ ok: false, code: "NOT_FOR_YOU", detail: "Offer O1 is for A02." });
		expect(await test.call("A02", "accept", { offer: "O9" })).toMatchObject({ ok: false, code: "NO_SUCH_OFFER" });
		const before = held(test, "A02");
		expect(await test.call("A02", "accept", { offer: "o1" })).toEqual({
			ok: true,
			reply: `Trade O1 done: you got 4 salt and gave 1 ${good}. Tax 0 salt each side, escrow fee 1 salt. P2: A01 owes A02 1 salt by the end of round 2 (escrow, the bank delivers). You now hold ${String(before.salt + 4)} salt${PERISHABLE.filter((name) => before[name] - (name === good ? 1 : 0) > 0).map((name) => `, ${String(before[name] - (name === good ? 1 : 0))} ${name}`).join("")}. When you are done, end your turn.`,
		});
		expect(await test.call("A02", "accept", { offer: "O1" })).toEqual({ ok: false, code: "OFFER_CLOSED", detail: "Offer O1 is accepted." });
		// A01: 6 - 4 - 1 (escrow) - 1 (fee) = 0 salt.
		expect([held(test, "A01").salt, held(test, "A02").salt]).toEqual([0, 10]);
		const state = stateOf(test);
		expect(state.pledges).toEqual([{ id: "P2", offer: "O1", game: 1, from: "A01", to: "A02", goods: { salt: 1, cloth: 0, copper: 0, spice: 0, wax: 0 }, due: 2, escrow: true, delivered: { salt: 0, cloth: 0, copper: 0, spice: 0, wax: 0 }, fromShipment: { salt: 0, cloth: 0, copper: 0, spice: 0, wax: 0 }, status: "pending" }]);
		expect([state.stats.A01, state.stats.A02]).toEqual([{ trades: 1, offers: 1, says: 0, taxPaid: 0, feesPaid: 1 }, { trades: 1, offers: 0, says: 0, taxPaid: 0, feesPaid: 0 }]);
		expect(state.inbox.A03?.at(-1)).toBe(`Trade O1: A01 gave 4 salt to A02 for 1 ${good}. Tax 0 salt each side, escrow fee 1 salt. P2: A01 owes A02 1 salt by the end of round 2 (escrow, the bank delivers).`);
		expect(payloads(test.kernel.log.all(), "market_trade")).toEqual([{ game: 1, round: 1, offer: "O1", from: "A01", to: "A02", give: { salt: 4, cloth: 0, copper: 0, spice: 0, wax: 0 }, get: { ...{ salt: 0, cloth: 0, copper: 0, spice: 0, wax: 0 }, [good]: 1 }, later: { goods: { salt: 1, cloth: 0, copper: 0, spice: 0, wax: 0 }, round: 2, escrow: true }, tax: 0, fee: 1 }]);
		// A big trade to all: 7 units moved, each side pays 1 salt of tax; a decline of an offer to all is a pass.
		const many = PERISHABLE.find((name) => held(test, "A03")[name] >= 1) ?? "cloth";
		const big = await test.call("A02", "offer", { to: "all", give: { salt: 6 }, get: { [many]: 1 } });
		expect(big.ok ? big.reply : "").toContain("Tax if taken: 1 salt each side.");
		expect(await test.call("A04", "decline", { offer: "O3", note: "too dear" })).toEqual({ ok: true, reply: "You passed on O3; it stays open for the others. When you are done, end your turn." });
		expect(stateOf(test).inbox.A02?.at(-1)).toBe('A04 passed on your open offer O3. Note: "too dear"');
		expect(await test.call("A03", "accept", { offer: "O3" })).toMatchObject({ ok: true });
		expect([held(test, "A02").salt, held(test, "A03").salt]).toEqual([3, 11]);
		expect(payloads(test.kernel.log.all(), "market_offer_passed")).toEqual([{ game: 1, id: "O3", by: "A04", note: "too dear" }]);
	});

	it("declines, withdraws and expires offers, and refuses an offer the proposer can no longer cover", async () => {
		const test = testKernel(marketGame({ games: 2, rounds: 3, spoil: false }));
		const good = PERISHABLE.find((name) => held(test, "A02")[name] > 0) ?? "cloth";
		for (let n = 0; n < 3; n++) expect(await test.call("A01", "offer", { to: "A02", give: { salt: 2 }, get: { [good]: 1 } })).toMatchObject({ ok: true });
		expect(await test.call("A01", "offer", { to: "A02", give: { salt: 1 }, get: { [good]: 1 } })).toEqual({ ok: false, code: "TOO_MANY_OFFERS", detail: "You have 3 open offers; withdraw one first." });
		expect(await test.call("A02", "withdraw", { offer: "O1" })).toEqual({ ok: false, code: "NOT_YOURS", detail: "Offer O1 is not yours." });
		expect(await test.call("A03", "decline", { offer: "O1" })).toMatchObject({ ok: false, code: "NOT_FOR_YOU" });
		expect(await test.call("A02", "decline", { offer: "O1", note: "no" })).toEqual({ ok: true, reply: "Offer O1 declined. When you are done, end your turn." });
		expect(await test.call("A01", "withdraw", { offer: "O2" })).toEqual({ ok: true, reply: "Offer O2 withdrawn. When you are done, end your turn." });
		expect(stateOf(test).inbox.A01).toEqual(['A02 declined your offer O1. Note: "no"']);
		// A01 gives its salt away in a trade to A03, so O3 is no longer covered.
		const other = PERISHABLE.find((name) => held(test, "A03")[name] > 0) ?? "cloth";
		expect(await test.call("A01", "offer", { to: "A03", give: { salt: 5 }, get: { [other]: 1 } })).toMatchObject({ ok: true });
		expect(await test.call("A03", "accept", { offer: "O4" })).toMatchObject({ ok: true });
		expect(await test.call("A02", "accept", { offer: "O3" })).toEqual({ ok: false, code: "PROPOSER_CANNOT_COVER", detail: "A01 no longer holds 2 salt; the bank cannot execute O3." });
		// O3 of round 1 lives through round 2 and expires at its end.
		await test.playTicks(idleDriver, 1);
		expect(stateOf(test).offers.find((offer) => offer.id === "O3")?.status).toBe("open");
		await test.playTicks(idleDriver, 1);
		expect(stateOf(test).offers.find((offer) => offer.id === "O3")?.status).toBe("expired");
		expect(payloads(test.kernel.log.all(), "market_offer_closed")).toEqual([
			{ game: 1, id: "O1", status: "declined", by: "A02", note: "no" },
			{ game: 1, id: "O2", status: "withdrawn", by: "A01", note: "" },
			{ game: 1, id: "O4", status: "accepted", by: "A03", note: "" },
			{ game: 1, id: "O3", status: "expired", by: "", note: "" },
		]);
		// After the last round the market is closed.
		await test.playTicks(idleDriver, 1);
		expect(await test.call("A01", "say", { text: "hello" })).toMatchObject({ ok: false, code: "MARKET_CLOSED" });
	});

	it("refuses a plain promise of shipment goods due before the trader could hand them over, and reserves escrow from the shipment", async () => {
		const test = testKernel(marketGame());
		const state = stateOf(test);
		const seat = SEATS.find((id) => (state.profiles[id]?.arrives ?? 0) > 0) ?? "A01";
		const profile = state.profiles[seat];
		const good = PERISHABLE.find((name) => (profile?.shipment[name] ?? 0) > 0) ?? "cloth";
		const arrives = profile?.arrives ?? 0;
		const later = { [good]: held(test, seat)[good] + 1, round: arrives };
		expect(await test.call(seat, "offer", { to: next(seat), give: { salt: 1 }, get: { salt: 1 }, later })).toMatchObject({ ok: false, code: "TOO_EARLY_FOR_SHIPMENT" });
		expect(await test.call(seat, "offer", { to: next(seat), give: { salt: 1 }, get: { salt: 1 }, later: { ...later, round: arrives + 1 } })).toMatchObject({ ok: true });
		// Escrow due by the arrival comes from the free shipment: the proposer holds only the salt and the fee.
		expect(await test.call(seat, "offer", { to: next(seat), give: { salt: 1 }, get: { salt: 1 }, later: { [good]: 1, round: arrives, escrow: true } })).toMatchObject({ ok: true });
		expect(await test.call(next(seat), "accept", { offer: "O2" })).toMatchObject({ ok: true });
		expect(stateOf(test).reserved[seat]).toEqual({ ...{ salt: 0, cloth: 0, copper: 0, spice: 0, wax: 0 }, [good]: 1 });
		expect(stateOf(test).pledges.map((pledge) => [pledge.escrow, pledge.fromShipment[good]])).toEqual([[true, 1]]);
	});
});

describe("messages", () => {
	it("sends to everyone or to one trader, a few per round", async () => {
		const test = testKernel(marketGame());
		expect(await test.call("A01", "say", { text: "hello", to: "A03" })).toEqual({ ok: true, reply: "Sent to A03. When you are done, end your turn." });
		expect(await test.call("A01", "say", { text: "hi", to: "A01" })).toEqual({ ok: false, code: "UNKNOWN_TRADER", detail: "A01 is not another trader. Traders: A02, A03, A04, or all." });
		for (let n = 0; n < 3; n++) expect(await test.call("A04", "say", { text: `call ${String(n)}` })).toMatchObject({ ok: true, reply: "Sent to everyone. When you are done, end your turn." });
		expect(await test.call("A04", "say", { text: "one too many" })).toMatchObject({ ok: false, code: "TOO_MANY_MESSAGES" });
		expect(await test.call("A02", "say", { text: "   " })).toMatchObject({ ok: false, code: "EMPTY_MESSAGE" });
		expect(stateOf(test).inbox.A03).toEqual(['A01 to you (private): "hello"', 'A04 to everyone: "call 0"', 'A04 to everyone: "call 1"', 'A04 to everyone: "call 2"']);
		expect(payloads(test.kernel.log.all(), "market_said")[0]).toEqual({ game: 1, round: 1, from: "A01", to: "A03", text: "hello" });
		// A new round gives new messages.
		await test.playTicks(idleDriver, 1);
		expect(await test.call("A04", "say", { text: "again" })).toMatchObject({ ok: true });
	});

	it("samples only calls the bank takes: a fake run trades", async () => {
		const test = testKernel(marketGame());
		await test.playTicks(fakeDriver(test.kernel, 5), 6);
		const log = test.kernel.log.all();
		expect(payloads(log, "market_offer_made").length).toBeGreaterThan(0);
		expect(payloads(log, "market_trade").length).toBeGreaterThan(0);
		expect(payloads(log, "market_said").length).toBeGreaterThan(0);
		// Only the kernel's limit of calls a tick refuses: no sampled call breaks a rule of the market.
		expect(log.filter((event) => event.type === "tool_refused" && !JSON.stringify(event.payload).includes('"stage":"limit"'))).toEqual([]);
	});
});
