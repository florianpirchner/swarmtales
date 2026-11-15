// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The sealed-auction mechanic alone: a scripted match, the lot timer, the lock of `bid`, a fake run and its
 * conformance (offline). The cases are the mechanic's part of the old `test/stories/blind-bid.test.ts`; the game's
 * part (the brain, the briefings, the variant names) is the test of the game `blind-bid`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { sealedAuction } from "../src/index.ts";
import { auctionGame, field, ofType, player } from "./support.ts";

const players = { drivers: { resident: player } };
const HUMAN = JSON.stringify(["human"]);

describe("a match", () => {
	it("plays three games of six sealed lots with purses and a public result per lot", async () => {
		const run = await play(auctionGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "sealed-auction.match" });
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		const resolved = ofType(run.events, "lot_resolved");
		expect(resolved).toHaveLength(18);
		for (const type of ["lots_dealt", "bid_placed", "game_scored"]) expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === HUMAN)).toBe(true);
		expect(resolved.every((event) => JSON.stringify(event.audience) !== HUMAN)).toBe(true);
		// A04 always passes and never wins; nobody bids more than the purse holds.
		expect(resolved.some((event) => field(event, "winner") === "A04")).toBe(false);
		for (const ended of ofType(run.events, "game_ended")) {
			const coins = field(ended, "coins");
			for (const left of Object.values(typeof coins === "object" && coins !== null ? coins : {})) expect(left).toBeGreaterThanOrEqual(0);
		}
		// The true worth is public once a common lot is sold.
		expect(resolved.filter((event) => field(event, "kind") === "common" && field(event, "winner") !== undefined).every((event) => typeof field(event, "worth") === "number")).toBe(true);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
		expect([run.kernel.fact("sealed-auction.scores")]).toEqual(ofType(run.events, "game_ended").slice(2).map((event) => field(event, "totals")));
	});

	it("tells each seat only its own value and shows everyone the result of the last lot", async () => {
		const run = await play(auctionGame({ games: 1 }), players);
		const inputs = run.events.filter((event) => event.type === "activation_opened").map((event) => ({ resident: JSON.stringify(event.actor), text: JSON.stringify(event.payload) }));
		const dealt = ofType(run.events, "lots_dealt")[0];
		const lots = dealt === undefined ? [] : field(dealt, "lots");
		const first: unknown = Array.isArray(lots) ? lots[0] : undefined;
		const values: unknown = typeof first === "object" && first !== null ? Reflect.get(first, "values") : undefined;
		const a01: unknown = typeof values === "object" && values !== null ? Reflect.get(values, "A01") : undefined;
		const opening = inputs.find((input) => input.resident.includes("A01") && input.text.includes("Lot 1 of 6"));
		expect(opening?.text).toContain(`your private value is ${String(a01)}`);
		expect(inputs.some((input) => input.text.includes("Last lot 1 (pay-your-bid): bids A01"))).toBe(true);
	});

	it("counts missed bids as passes and still ends the match", async () => {
		const run = await play(auctionGame(), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "sealed-auction.match" });
		const references = ofType(run.events, "game_scored").map((event) => field(event, "reference"));
		expect(references.map((reference): unknown => (typeof reference === "object" && reference !== null ? Reflect.get(reference, "missed") : undefined))).toEqual([24, 24, 24]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 0, A02: 0, A03: 0, A04: 0 }]);
	});

	it("opens the bid only while a lot waits for the seat and refuses a bid above the coins", async () => {
		const test = testKernel(auctionGame({ games: 1 }), { prompts: { render: (_owner, id, vars) => `${id} ${JSON.stringify(vars)}` } });
		expect(test.openTools("A01")).toContain("bid");
		expect(await test.call("A01", "bid", { amount: 101 })).toMatchObject({ ok: false, code: "OVER_PURSE" });
		expect(await test.call("A01", "bid", { amount: 30 })).toEqual({ ok: true, reply: "Bid sealed on lot 1. Wait for the others." });
		expect(await test.call("A01", "bid", { amount: 31 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		for (const seat of ["A02", "A03"]) expect(await test.call(seat, "bid", { amount: 10 })).toMatchObject({ ok: true });
		expect(await test.call("A04", "bid", { amount: 10 })).toEqual({ ok: true, reply: "Bid sealed. Lot 1 is resolved; use viewAuction for the result." });
		expect(ofType(test.kernel.log.all(), "lot_resolved")[0]).toBeDefined();
		const view = await test.call("A02", "viewAuction", {});
		expect(view.ok && view.reply).toContain("A01 won and paid 30");
		const coins = await test.call("A01", "viewAuction", {});
		expect(coins.ok && coins.reply).toContain("Your coins: 70");
	});

	it("plays to the end of the match in a fake run, with every tool sampled and accepted", async () => {
		expect(sealedAuction.head.tools.map((tool) => [tool.name, tool.sampled])).toEqual([["viewAuction", true], ["bid", true]]);
		const run = await play(auctionGame({ games: 1 }), { drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(run.end).toMatchObject({ reason: "limit", limit: "sealed-auction.match" });
		const accepted = run.events.filter((event) => event.type === "tool_result").map((event) => field(event, "as"));
		for (const tool of ["viewAuction", "bid"]) expect(accepted).toContain(tool);
		expect(ofType(run.events, "bid_placed").length).toBeGreaterThan(0);
	});
});

describe("module conformance", () => {
	it("agrees with its package.json and documents every option but the four ranges of the old platform", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(sealedAuction, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(sealedAuction)).toEqual(["valueMin", "valueMax", "worthMin", "worthMax"].map((name) => `sealed-auction: option "${name}" has no description`));
	});

	it("is deterministic and survives a snapshot round trip inside a game and between games", async () => {
		const small = { games: 2, lots: ["first-price" as const, "common" as const, "second-price" as const] };
		expect(await checkDeterminism(auctionGame(small), () => player)).toEqual([]);
		// The scripted bidders sell a whole game in one tick: the cut falls between games. Without bids every lot
		// waits for its deadline: the cuts fall inside a game, with a lot open or a result recorded.
		for (const cut of [0, 1]) expect(await checkSnapshotRoundTrip(auctionGame(small), () => player, cut)).toEqual([]);
		for (const cut of [1, 4, 7]) expect(await checkSnapshotRoundTrip(auctionGame(small), () => idleDriver, cut)).toEqual([]);
	});
});
