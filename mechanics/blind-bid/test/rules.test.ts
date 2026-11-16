// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of the sealed auction as pure functions: the four cases of `blind-bid rules` in the old `test/stories/blind-bid.test.ts`. */
import { describe, expect, it } from "vitest";
import { referenceOf } from "../src/reference.ts";
import { curseFreeCeiling, dealLots, equilibriumBid, resolveLot } from "../src/rules.ts";
import { RULES, SEATS } from "./support.ts";

describe("blind-bid rules", () => {
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
