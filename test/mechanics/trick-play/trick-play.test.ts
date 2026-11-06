/** The trick-play mechanic: the rules as functions, a scripted match, the veto, the move timer and conformance (offline). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createHost } from "@swarmtales/kernel";
import { renderHand } from "@swarmtales/mechanic-card-table";
import { trickPlay } from "@swarmtales/mechanic-trick-play";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, idleAgent, playStory } from "@swarmtales/testkit";
import { legalCards, orderAfter, roundPoints, trickWinner, trumpNamer } from "../../../mechanics/trick-play/src/model.ts";
import { field, ofType, SEATS, trickPlayer, trickStory } from "./support.ts";

const SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Cinder", ranks: 8 },
	{ name: "Dust", ranks: 7 },
	{ name: "Ember", ranks: 6 },
];
const SCORING = { hit: 10, perTrick: 3, miss: "square" as const };

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
	});

	it("lets the lowest bidder name trump, the earliest on a tie, and bids from the dealer's left", () => {
		expect(trumpNamer(["B", "C", "D", "A"], { A: 0, B: 2, C: 1, D: 0 })).toBe("D");
		expect(orderAfter(["A", "B", "C", "D"], "C")).toEqual(["D", "A", "B", "C"]);
	});
});

describe("a match", () => {
	it("plays two games of three rounds and ends the run", async () => {
		const run = await playStory({ story: trickStory() }, trickPlayer());
		expect(run.end).toMatchObject({ reason: "referee", limit: "trick-play.match" });
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
		const ended = ofType(run.events, "game_ended");
		expect(ended).toHaveLength(2);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
		expect(run.host.facts()["trick-play.wins"]).toBeDefined();
	});

	it("names trump by the lowest bidder and enforces follow suit", async () => {
		const host = createHost({ story: trickStory({ games: 1, rounds: [3] }) });
		host.start();
		const order = ["A02", "A03", "A04", "A01"];
		for (const [index, seat] of order.entries()) {
			expect(await host.call(`resident:${seat === "A02" ? "A03" : "A02"}`, "placeBid", { tricks: 1 })).toMatchObject(index === 0 ? { ok: false, code: "NOT_YOUR_TURN" } : { ok: false });
			expect(await host.call(`resident:${seat}`, "placeBid", { tricks: seat === "A04" ? 0 : 1 })).toMatchObject({ ok: true });
		}
		expect(await host.call("resident:A01", "nameTrump", { suit: "Ember" })).toMatchObject({ ok: false, code: "NOT_YOUR_TURN" });
		expect(await host.call("resident:A04", "nameTrump", { suit: "Smoke" })).toMatchObject({ ok: false, code: "UNKNOWN_SUIT" });
		expect(await host.call("resident:A04", "nameTrump", { suit: "ember" })).toMatchObject({ ok: true });
		expect(ofType(host.log.all(), "trump_named").map((event) => event.payload)).toEqual([{ game: 1, round: 1, seat: "A04", suit: "Ember", forfeit: false }]);
		const table = await host.call("resident:A02", "viewTable", {});
		expect(table).toMatchObject({ ok: true });
		const hand = table.ok ? (/Your hand: (.+)/.exec(table.reply)?.[1] ?? "") : "";
		expect(hand).not.toBe("");
		expect(await host.call("resident:A02", "playCard", { card: "Smoke 3" })).toMatchObject({ ok: false, code: "UNKNOWN_CARD" });
	});

	it("lets the next seat veto a lead once per game, and the leader must lead another suit", async () => {
		const run = await playStory({ story: trickStory({ games: 1, rounds: [4, 5] }) }, trickPlayer({ vetoers: ["A03"] }));
		const vetoes = ofType(run.events, "lead_vetoed");
		expect(vetoes).toHaveLength(1);
		const veto = vetoes[0];
		if (veto === undefined) throw new Error("no veto");
		expect(field(veto, "seat")).toBe("A03");
		const after = run.events.slice(run.events.indexOf(veto)).find((event) => event.type === "card_played");
		expect(after === undefined ? undefined : field(after, "seat")).toBe(field(veto, "leader"));
		expect(String(after === undefined ? "" : field(after, "card")).split(" ")[0]).not.toBe(field(veto, "suit"));
		expect(run.end).toMatchObject({ limit: "trick-play.match" });
	});

	it("acts for an idle seat after maxIdleMinutes and ends a match nobody plays as invalid", async () => {
		const run = await playStory({ story: trickStory({ maxIdleMinutes: 2, maxConsecutiveForfeits: 6 }) }, idleAgent);
		const forfeits = [...ofType(run.events, "bid_placed"), ...ofType(run.events, "trump_named"), ...ofType(run.events, "card_played")];
		expect(forfeits).toHaveLength(6);
		expect(forfeits.every((event) => field(event, "forfeit") === true)).toBe(true);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
		expect(run.end).toMatchObject({ reason: "referee", limit: "trick-play.match" });
	});

	it("keeps every hand private: the deal is for humans only and viewTable shows the caller's own hand", async () => {
		const host = createHost({ story: trickStory() });
		host.start();
		const dealt = ofType(host.log.all(), "cards_dealt");
		expect(dealt.map((event) => event.audience)).toEqual([["human"]]);
		const raw = dealt[0] === undefined ? undefined : field(dealt[0], "hands");
		const hands: Record<string, string[]> = typeof raw === "object" && raw !== null ? Object.fromEntries(Object.entries(raw).map(([seat, cards]) => [seat, Array.isArray(cards) ? cards.map(String) : []])) : {};
		for (const seat of SEATS) {
			const view = await host.call(`resident:${seat}`, "viewTable", {});
			expect(view).toMatchObject({ ok: true });
			expect(view.ok && view.reply.includes(`Your hand: ${renderHand(hands[seat] ?? [], SUITS)}`)).toBe(true);
			const hand = await host.call(`resident:${seat}`, "viewHand", {});
			expect(hand).toEqual({ ok: true, reply: `Your hand: ${renderHand(hands[seat] ?? [], SUITS)}` });
		}
	});

	it("refuses a round longer than the deck allows", () => {
		const host = createHost({ story: trickStory({ rounds: [11] }) });
		expect(() => {
			host.start();
		}).toThrow(/needs more than the deck/);
	});
});

describe("module conformance", () => {
	it("documents every option and takes randomness and time only from the host", () => {
		expect(checkOptionsDocumented(trickPlay)).toEqual([]);
		const files = ["index", "model", "events", "api"].map((name) => ({ path: `mechanics/trick-play/src/${name}.ts`, text: readFileSync(`mechanics/trick-play/src/${name}.ts`, "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});

	it("has prompt files for its tool descriptions", () => {
		const host = createHost({ story: trickStory(), prompts: createPromptLookup() });
		const names = host.toolSpecs("resident").map((spec) => spec.name).sort();
		expect(names).toEqual(["nameTrump", "placeBid", "playCard", "vetoLead", "viewHand", "viewTable"]);
		for (const spec of host.toolSpecs("resident")) expect(spec.description).not.toMatch(/^(trick-play|card-table)\//);
	});

	it("gives the same events for the same seed", async () => {
		expect(await checkDeterminism({ story: trickStory() }, () => trickPlayer())).toEqual([]);
	});

	it("survives a snapshot round trip in the middle of a round and between games", async () => {
		expect(await checkSnapshotRoundTrip({ story: trickStory() }, () => trickPlayer(), 1)).toEqual([]);
		expect(await checkSnapshotRoundTrip({ story: trickStory() }, () => trickPlayer(), 3)).toEqual([]);
	});
});
