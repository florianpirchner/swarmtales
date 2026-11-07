/** The Blind Bid story through the real mechanics: scripted bidders, offline. */
import { describe, expect, it } from "vitest";
import type { CoreStory, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { curseFreeCeiling, dealLots, equilibriumBid, referenceOf, resolveLot, type Rules } from "../../mechanics/sealed-auction/src/model.ts";
import { blindBidStory, type BlindBidOptions } from "../../stories/blind-bid/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;

/** A key of an untyped object, or undefined. */
function get(value: unknown, key: string): unknown {
	if (typeof value !== "object" || value === null) return undefined;
	const found: unknown = Reflect.get(value, key);
	return found;
}
const RULES: Rules = { purse: 100, valueMin: 10, valueMax: 60, worthMin: 20, worthMax: 80, noise: 15, reserve: 1 };
const SEATS = ["A01", "A02", "A03", "A04"];

function story(extra: BlindBidOptions = {}): CoreStory {
	const base = blindBidStory(extra);
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: BlindBidOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

/** A01 bids its value or estimate, A02 half of it, A03 its value plus 5, A04 always passes; each capped by the coins left. */
const player: TurnTaker = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${turn.resident}: bid below the estimate on shared-worth lots.` });
		return;
	}
	const own = /your (?:private value is|estimate of the worth is) (-?\d+)/.exec(told)?.[1];
	const coins = /You have (\d+) coins/.exec(told)?.[1];
	if (own === undefined || coins === undefined) return;
	const value = Number(own);
	const wanted = turn.resident === "A01" ? value : turn.resident === "A02" ? Math.floor(value / 2) : turn.resident === "A03" ? value + 5 : 0;
	await turn.call("bid", { amount: Math.max(0, Math.min(Number(coins), wanted)), reason: "script" });
};

describe("sealed-auction rules", () => {
	it("deals private values per seat and a hidden worth with estimates inside the noise", () => {
		let n = 7;
		const draw = { int: (min: number, max: number) => min + (n++ % (max - min + 1)) };
		const lots = dealLots(["first-price", "common"], SEATS, RULES, draw);
		expect(lots.map((lot) => lot.kind)).toEqual(["first-price", "common"]);
		for (const value of Object.values(lots[0]?.values ?? {})) expect(value).toBeGreaterThanOrEqual(10);
		const common = lots[1];
		expect(common?.worth).toBeDefined();
		for (const estimate of Object.values(common?.values ?? {})) expect(Math.abs(estimate - (common?.worth ?? 0))).toBeLessThanOrEqual(15);
	});

	it("charges the own bid in a first-price lot and the runner-up's bid in a second-price lot", () => {
		const values = { A01: 50, A02: 40, A03: 30, A04: 20 };
		const bids = { A01: 35, A02: 30, A03: 0, A04: 10 };
		const first = resolveLot({ number: 1, kind: "first-price", values }, bids, SEATS, RULES, [], () => "A01");
		expect(first).toMatchObject({ winner: "A01", price: 35, profit: 15, tie: false });
		const second = resolveLot({ number: 2, kind: "second-price", values }, bids, SEATS, RULES, [], () => "A01");
		expect(second).toMatchObject({ winner: "A01", price: 30, profit: 20 });
		// One counting bid pays the reserve; no counting bid leaves the lot unsold.
		expect(resolveLot({ number: 3, kind: "second-price", values }, { A02: 25 }, SEATS, RULES, [], () => "A02")).toMatchObject({ winner: "A02", price: 1, profit: 39 });
		const unsold = resolveLot({ number: 4, kind: "first-price", values }, {}, SEATS, RULES, ["A01"], () => "A01");
		expect(unsold.winner).toBeUndefined();
		expect(unsold).toMatchObject({ price: 0, missed: ["A01"] });
		// A tie goes to the draw.
		expect(resolveLot({ number: 5, kind: "first-price", values }, { A01: 20, A02: 20 }, SEATS, RULES, [], (tied) => tied[1] ?? "")).toMatchObject({ winner: "A02", tie: true, profit: 20 });
	});

	it("makes the winner of a common lot pay for an estimate that was too high (the curse)", () => {
		const lot = { number: 1, kind: "common" as const, worth: 40, values: { A01: 55, A02: 38, A03: 30, A04: 44 } };
		const result = resolveLot(lot, { A01: 52, A02: 25, A03: 20, A04: 40 }, SEATS, RULES, [], () => "A01");
		expect(result).toMatchObject({ winner: "A01", price: 52, profit: -12 });
		const reference = referenceOf([lot], [result], SEATS, RULES, { A01: 48, A02: 100, A03: 100, A04: 100 });
		expect(reference.common).toMatchObject({ lots: 1, cursed: 1, winnerProfit: -12 });
		// The ceiling for four bidders is the estimate minus 15 * 3/5 = 9: A01's 52 (> 46) and A04's 40 (> 35) are above it.
		expect(curseFreeCeiling(55, 4, RULES)).toBe(46);
		expect(reference.common.aboveCeiling).toBe(2);
		expect(reference.revenue).toBe(52);
		expect(reference.unspent).toBeCloseTo(0.87, 2);
	});

	it("scores shading against the equilibrium and truthfulness in second-price lots", () => {
		expect(equilibriumBid(50, 4, RULES)).toBe(40);
		const values = { A01: 50, A02: 30, A03: 20, A04: 10 };
		const lots = [{ number: 1, kind: "first-price" as const, values }, { number: 2, kind: "second-price" as const, values }];
		const truthful = { A01: 50, A02: 30, A03: 20, A04: 10 };
		const results = [resolveLot(lots[0] ?? { number: 1, kind: "first-price", values }, { A01: 40, A02: 24, A03: 16, A04: 10 }, SEATS, RULES, [], () => "A01"), resolveLot(lots[1] ?? { number: 2, kind: "second-price", values }, truthful, SEATS, RULES, [], () => "A01")];
		const reference = referenceOf(lots, results, SEATS, RULES, {});
		expect(reference.firstPrice).toMatchObject({ lots: 1, efficiency: 1, overbids: 0 });
		expect(reference.secondPrice).toMatchObject({ lots: 1, efficiency: 1, truthfulness: 1, overbids: 0, underbids: 0, capped: 0 });
		expect(reference.firstPrice.equilibriumShading).toBeGreaterThan(reference.firstPrice.shading - 0.2);
		// A bid below the value that spends every coin left is the purse's doing, not shading.
		const poor = referenceOf(lots, [{ ...(results[0] ?? resolveLot(lots[0] ?? { number: 1, kind: "first-price", values }, {}, SEATS, RULES, [], () => "A01")), price: 90 }, resolveLot(lots[1] ?? { number: 2, kind: "second-price", values }, { A01: 10, A02: 30, A03: 20, A04: 10 }, SEATS, RULES, [], () => "A02")], SEATS, RULES, {});
		expect(poor.secondPrice).toMatchObject({ capped: 1, underbids: 0, truthfulness: 1 });
	});
});

describe("blind-bid, scripted match", () => {
	it("plays three games of six sealed lots with purses, a public result per lot and a brain per seat", async () => {
		const run = await playStory(options(), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "sealed-auction.match" });
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		const resolved = ofType(run.events, "lot_resolved");
		expect(resolved).toHaveLength(18);
		for (const type of ["lots_dealt", "bid_placed", "game_scored"]) expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		expect(ofType(run.events, "lot_resolved").every((event) => event.audience === undefined)).toBe(true);
		// A04 always passes and never wins; nobody bids more than the purse holds.
		expect(resolved.some((event) => field(event, "winner") === "A04")).toBe(false);
		for (const ended of ofType(run.events, "game_ended")) {
			const coins = field(ended, "coins");
			for (const left of Object.values(typeof coins === "object" && coins !== null ? coins : {})) expect(left).toBeGreaterThanOrEqual(0);
		}
		// The true worth is public once a common lot is sold.
		expect(resolved.filter((event) => field(event, "kind") === "common" && field(event, "winner") !== undefined).every((event) => typeof field(event, "worth") === "number")).toBe(true);
		expect(ofType(run.events, "brain_written")).toHaveLength(12);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
	});

	it("tells each seat only its own value and shows everyone the result of the last lot", async () => {
		const run = await playStory(options({ brain: false, games: 1 }), player);
		const inputs = run.events.filter((event) => event.type === "turn_started").map((event) => ({ resident: String(field(event, "resident")), text: JSON.stringify(field(event, "inputs")) }));
		const dealt = ofType(run.events, "lots_dealt")[0];
		const lots = dealt === undefined ? [] : field(dealt, "lots");
		const first: unknown = Array.isArray(lots) ? lots[0] : undefined;
		const a01 = get(get(first, "values"), "A01");
		const opening = inputs.find((input) => input.resident === "A01" && input.text.includes("Lot 1 of 6"));
		expect(opening?.text).toContain(`your private value is ${String(a01)}`);
		expect(inputs.some((input) => input.text.includes("Last lot 1 (pay-your-bid): bids A01"))).toBe(true);
	});

	it("counts missed bids as passes and still ends the match", async () => {
		const run = await playStory(options({ brain: false }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "sealed-auction.match" });
		const references = ofType(run.events, "game_scored").map((event) => field(event, "reference"));
		expect(references.map((reference) => get(reference, "missed"))).toEqual([24, 24, 24]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 0, A02: 0, A03: 0, A04: 0 }]);
	});

	it("opens the bid only while a lot waits for the seat and refuses a bid above the coins", async () => {
		const host = createHost(options({ brain: false, games: 1 }));
		host.start();
		expect(host.openTools("A01")).toContain("bid");
		expect(await host.call(as("A01"), "bid", { amount: 101 })).toMatchObject({ ok: false, code: "OVER_PURSE" });
		expect(await host.call(as("A01"), "bid", { amount: 30 })).toMatchObject({ ok: true });
		expect(await host.call(as("A01"), "bid", { amount: 31 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		for (const seat of ["A02", "A03", "A04"]) expect(await host.call(as(seat), "bid", { amount: 10 })).toMatchObject({ ok: true });
		expect(ofType(host.log.all(), "lot_resolved")[0]).toBeDefined();
		const view = await host.call(as("A02"), "viewAuction", {});
		expect(view.ok && view.reply).toContain("A01 won and paid 30");
		const coins = await host.call(as("A01"), "viewAuction", {});
		expect(coins.ok && coins.reply).toContain("Your coins: 70");
	});

	it("is registered with its arms and named variants", () => {
		for (const name of ["blind-bid", "blind-bid-nobrain", "blind-bid-g5", "blind-bid-nobrain-g2"]) expect(findCoreStory(name)?.story.id).toBe(name);
		expect(findCoreStory("blind-bid-g0")).toBeUndefined();
		// The name of the first smoke run still finds the story.
		expect(findCoreStory("lantern-auction")?.story.id).toBe("blind-bid");
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(options(), () => player)).toEqual([]);
		for (const cut of [0, 3, 13]) expect(await checkSnapshotRoundTrip(options(), () => player, cut)).toEqual([]);
	});
});
