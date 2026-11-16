// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The ember-tricks mechanic: the rules as functions, a scripted match, the veto, the move timer, the levers and conformance (offline). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderHand } from "@swarmtales/mechanic-card-table/contract";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { trickPlay } from "../src/index.ts";
import { legalCards, orderAfter, roundPoints, trickWinner, trumpNamer } from "../src/model.ts";
import { field, ofType, SEATS, trickGame, trickPlayer } from "./support.ts";

const SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Cinder", ranks: 8 },
	{ name: "Dust", ranks: 7 },
	{ name: "Ember", ranks: 6 },
];
const SCORING = { hit: 10, perTrick: 3, miss: "square" as const };
const replyOf = (outcome: { readonly ok: boolean; readonly reply?: string }): string => (outcome.ok ? (outcome.reply ?? "") : "");

describe("the rules", () => {
	it("gives the trick to the highest trump, else the highest card of the suit led", () => {
		const plays = [
			{ seat: "A", card: "Ash 3" },
			{ seat: "B", card: "Ash 9" },
			{ seat: "C", card: "Ember 1" },
			{ seat: "D", card: "Brine 9" },
		];
		expect(trickWinner(plays, null)).toBe("B");
		expect(trickWinner(plays, "Ember")).toBe("C");
		expect(trickWinner(plays, "Brine")).toBe("D");
		expect(trickWinner([...plays, { seat: "E", card: "Ember 4" }], "Ember")).toBe("E");
		expect(trickWinner(plays, "Dust")).toBe("B");
	});

	it("makes a follower follow suit and keeps a vetoed suit from the lead", () => {
		const hand = ["Ash 2", "Ash 7", "Brine 4"];
		expect(legalCards(hand, "Ash", undefined)).toEqual(["Ash 2", "Ash 7"]);
		expect(legalCards(hand, "Ember", undefined)).toEqual(hand);
		expect(legalCards(hand, undefined, "Ash")).toEqual(["Brine 4"]);
		expect(legalCards(["Ash 2"], undefined, "Ash")).toEqual(["Ash 2"]);
	});

	it("scores a hit as 10 + 3 per trick and a miss as the error squared", () => {
		expect(roundPoints(0, 0, SCORING)).toBe(10);
		expect(roundPoints(2, 2, SCORING)).toBe(16);
		expect(roundPoints(3, 5, SCORING)).toBe(-4);
		expect(roundPoints(4, 1, SCORING)).toBe(-9);
		expect(roundPoints(4, 1, { ...SCORING, miss: "linear" })).toBe(-30);
		expect(roundPoints(0, 1, { ...SCORING, missBase: 5 })).toBe(-6);
		expect(roundPoints(3, 5, { ...SCORING, missBase: 5 })).toBe(-9);
	});

	it("lets the lowest bidder name trump, the earliest on a tie, and bids from the dealer's left", () => {
		expect(trumpNamer(["B", "C", "D", "A"], { A: 0, B: 2, C: 1, D: 0 })).toBe("D");
		expect(orderAfter(["A", "B", "C", "D"], "C")).toEqual(["D", "A", "B", "C"]);
	});
});

describe("a match", () => {
	it("plays two games of three rounds and ends the run", async () => {
		const run = await play(trickGame(), { drivers: { resident: trickPlayer() } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "ember-tricks.match" });
		expect(ofType(run.events, "round_started").map((event) => `${String(field(event, "game"))}.${String(field(event, "round"))} ${String(field(event, "dealer"))}`)).toEqual(["1.1 A01", "1.2 A02", "1.3 A03", "2.1 A02", "2.2 A03", "2.3 A04"]);
		expect(ofType(run.events, "card_played").filter((event) => field(event, "forfeit") === true)).toHaveLength(0);
		// 1 + 2 + 3 cards for four seats, twice.
		expect(ofType(run.events, "card_played")).toHaveLength(48);
		expect(ofType(run.events, "trick_won")).toHaveLength(12);
		const scored = ofType(run.events, "round_scored");
		expect(scored).toHaveLength(6);
		// Round n deals n cards, so its tricks sum to n.
		for (const event of scored) {
			const tricks = field(event, "tricks");
			const sum = typeof tricks === "object" && tricks !== null ? Object.values(tricks).reduce((total: number, value: unknown) => total + Number(value), 0) : -1;
			expect(sum).toBe(Number(field(event, "round")));
		}
		expect(ofType(run.events, "game_ended")).toHaveLength(2);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
		expect(run.kernel.fact("ember-tricks.wins")).toBeDefined();
	});

	it("names trump by the lowest bidder and enforces follow suit", async () => {
		const test = testKernel(trickGame({ games: 1, rounds: [3] }));
		for (const [index, seat] of ["A02", "A03", "A04", "A01"].entries()) {
			expect(await test.call(seat === "A02" ? "A03" : "A02", "placeBid", { tricks: 1 })).toMatchObject(index === 0 ? { ok: false, code: "NOT_YOUR_TURN" } : { ok: false });
			expect(await test.call(seat, "placeBid", { tricks: seat === "A04" ? 0 : 1 })).toMatchObject({ ok: true });
		}
		expect(await test.call("A01", "nameTrump", { suit: "Ember" })).toMatchObject({ ok: false, code: "NOT_YOUR_TURN" });
		expect(await test.call("A04", "nameTrump", { suit: "Smoke" })).toMatchObject({ ok: false, code: "UNKNOWN_SUIT" });
		expect(await test.call("A04", "nameTrump", { suit: "ember" })).toMatchObject({ ok: true });
		expect(ofType(test.kernel.log.all(), "trump_named").map((event) => event.payload)).toEqual([{ game: 1, round: 1, seat: "A04", suit: "Ember", forfeit: false }]);
		expect(/Your hand: (.+)/.exec(replyOf(await test.call("A02", "viewTable", {})))?.[1] ?? "").not.toBe("");
		expect(await test.call("A02", "playCard", { card: "Smoke 3" })).toMatchObject({ ok: false, code: "UNKNOWN_CARD" });
	});

	it("lets the next seat veto a lead once per game, and the leader must lead another suit", async () => {
		const run = await play(trickGame({ games: 1, rounds: [4, 5] }), { drivers: { resident: trickPlayer({ vetoers: ["A03"] }) } });
		const vetoes = ofType(run.events, "lead_vetoed");
		expect(vetoes).toHaveLength(1);
		const veto = vetoes[0];
		if (veto === undefined) throw new RangeError("no veto");
		expect(field(veto, "seat")).toBe("A03");
		const after = run.events.slice(run.events.indexOf(veto)).find((event) => event.type === "card_played");
		expect(after === undefined ? undefined : field(after, "seat")).toBe(field(veto, "leader"));
		expect(String(after === undefined ? "" : field(after, "card")).split(" ")[0]).not.toBe(field(veto, "suit"));
		expect(run.end).toMatchObject({ limit: "ember-tricks.match" });
	});

	it("acts for an idle seat after maxIdleMinutes and ends a match nobody plays as invalid", async () => {
		const run = await play(trickGame({ maxIdleMinutes: 2, maxConsecutiveForfeits: 6 }), { drivers: { resident: idleDriver } });
		const forfeits = [...ofType(run.events, "bid_placed"), ...ofType(run.events, "trump_named"), ...ofType(run.events, "card_played")];
		expect(forfeits).toHaveLength(6);
		expect(forfeits.every((event) => field(event, "forfeit") === true && event.actor === "kernel")).toBe(true);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
		expect(run.end).toMatchObject({ reason: "limit", limit: "ember-tricks.match" });
	});

	it("keeps every hand private: the deal is for humans only and viewTable shows the caller's own hand", async () => {
		const test = testKernel(trickGame());
		const dealt = test.kernel.log.all().filter((event) => event.type === "cards_dealt");
		expect(dealt.map((event) => event.audience)).toEqual([["human"]]);
		const raw = dealt[0] === undefined ? undefined : field(dealt[0], "hands");
		const hands: Record<string, string[]> = typeof raw === "object" && raw !== null ? Object.fromEntries(Object.entries(raw).map(([seat, cards]) => [seat, Array.isArray(cards) ? cards.map(String) : []])) : {};
		for (const seat of SEATS) {
			const view = await test.call(seat, "viewTable", {});
			// Only the seat on turn (A02, left of dealer A01) gets the table; the others a wait line.
			if (seat === "A02") expect(replyOf(view)).toContain(`Your hand: ${renderHand(hands[seat] ?? [], SUITS)}`);
			else expect(view).toEqual({ ok: true, reply: "Not your turn: waiting for A02. You get the full table in your input when it is your turn; do nothing until then." });
			expect(await test.call(seat, "viewHand", {})).toEqual({ ok: true, reply: `Your hand: ${renderHand(hands[seat] ?? [], SUITS)}` });
		}
	});

	it("does not count viewTable as a step against the call limit", async () => {
		const test = testKernel(trickGame({}, { maxCallsPerTick: 2 }));
		for (let look = 0; look < 5; look += 1) expect(await test.call("A02", "viewTable", {})).toMatchObject({ ok: true });
		expect(await test.call("A02", "placeBid", { tricks: 0 })).toMatchObject({ ok: true });
		expect(await test.call("A03", "viewHand", {})).toMatchObject({ ok: true });
		expect(await test.call("A03", "viewHand", {})).toMatchObject({ ok: true });
		expect(await test.call("A03", "viewHand", {})).toMatchObject({ ok: false, code: "STEP_LIMIT" });
	});

	it("does not wake a seat again for the answer of its viewTable alone (activation onNews)", async () => {
		const test = testKernel(trickGame());
		// Nobody acts, everyone looks: A02 (on turn) has news in every pass; the others have none and are skipped, as in the old silent file.
		await test.playTicks(async (turn) => {
			await turn.call("viewTable", {});
		}, 1);
		const opened = test.kernel.log.all().filter((event) => event.type === "activation_opened" && event.tick === 0);
		expect(SEATS.map((seat) => opened.filter((event) => event.actor === `resident:${seat}`).length)).toEqual([0, 6, 0, 0]);
	});

	it("refuses a round longer than the deck allows", () => {
		expect(() => testKernel(trickGame({ rounds: [11] }))).toThrow(/needs more than the deck/);
	});
});

describe("the levers", () => {
	it("shows the bidder its hand's Monte Carlo worth with reference bid, and records the worth of every hand", async () => {
		const test = testKernel(trickGame({ games: 1, rounds: [3], reference: "bid", referenceSamples: 50 }));
		const worth = /rates your hand at about (\d+\.\d) tricks/.exec(replyOf(await test.call("A02", "viewTable", {})))?.[1];
		expect(Number(worth)).toBeGreaterThanOrEqual(0);
		expect(Number(worth)).toBeLessThanOrEqual(3);
		const plain = testKernel(trickGame({ games: 1, rounds: [3] }));
		expect(replyOf(await plain.call("A02", "viewTable", {}))).not.toContain("rates your hand");
	});

	it("shows the bid sum so far with bidSum", async () => {
		const test = testKernel(trickGame({ games: 1, rounds: [3], bidSum: true }));
		expect(replyOf(await test.call("A02", "viewTable", {}))).toContain("Tricks bid so far: 0 of the round's 3 (4 bid(s) still to come).");
		await test.call("A02", "placeBid", { tricks: 2 });
		expect(replyOf(await test.call("A03", "viewTable", {}))).toContain("Tricks bid so far: 2 of the round's 3 (3 bid(s) still to come).");
		const plain = testKernel(trickGame({ games: 1, rounds: [3] }));
		expect(replyOf(await plain.call("A02", "viewTable", {}))).not.toContain("Tricks bid so far");
	});

	it("tells every seat its calibration after a game, with the worth of its hands under reference retro", async () => {
		const run = await play(trickGame({ games: 2, calibration: true, reference: "retro", referenceSamples: 20 }, { brain: true }), { drivers: { resident: trickPlayer() } });
		const inputs = run.events.filter((event) => event.type === "activation_opened").map((event) => JSON.stringify(field(event, "inputs")));
		const told = inputs.filter((text) => text.includes("Game 1 is over. Winner: "));
		expect(told.length).toBeGreaterThan(0);
		expect(told.every((text) => text.includes("Your calibration this game: you bid ") && text.includes("A simulation of random deals and trumps rated your hands at "))).toBe(true);
	});
});

describe("mechanic conformance", () => {
	it("fits its package, and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(trickPlay, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(trickPlay)).toEqual([]);
	});

	it("gives the fake driver an accepted call of every tool, and no call that is refused", async () => {
		// Only the mechanic's own tools: the fake driver takes the first open tool that samples, and `viewHand` always does.
		const test = testKernel(trickGame({ games: 3, rounds: [3, 4, 5] }, { grants: ["viewTable", "placeBid", "nameTrump", "playCard", "vetoLead"] }));
		await test.playTicks(fakeDriver(test.kernel, 7), 60);
		const events = test.kernel.log.all();
		const accepted = new Set(events.filter((event) => event.type === "tool_result").map((event) => event.tool?.split("/").at(-1)));
		expect([...accepted].sort()).toEqual(["nameTrump", "placeBid", "playCard", "vetoLead", "viewTable"]);
		expect(events.filter((event) => event.type === "tool_refused")).toEqual([]);
		expect(ofType(events, "game_ended").length).toBeGreaterThan(0);
	});

	it("is deterministic, and a run resumed from a snapshot plays on as the whole run", async () => {
		expect(await checkDeterminism(trickGame(), () => trickPlayer())).toEqual([]);
		// In the middle of a round and between games.
		expect(await checkSnapshotRoundTrip(trickGame(), () => trickPlayer(), 1)).toEqual([]);
		expect(await checkSnapshotRoundTrip(trickGame(), () => trickPlayer(), 3)).toEqual([]);
		// Silent seats: the cut falls between a tick's start and the timer action of the next.
		expect(await checkSnapshotRoundTrip(trickGame({ maxIdleMinutes: 1, maxConsecutiveForfeits: 8 }), () => idleDriver, 3)).toEqual([]);
	});
});
