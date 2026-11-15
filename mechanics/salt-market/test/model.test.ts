// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of `model.ts`: the deal, rotation, the score, the optimum, fairness and spoilage (the old test's "Salt Market rules"). */
import { describe, expect, it } from "vitest";
import type { RandomSource } from "@swarmtales/contracts";
import { bundleLine, bundleOf, dealOf, gini, idleHolding, optimumOf, rotated, scoreOf, spoilLoss, type Profile } from "../src/model.ts";

const SEATS = ["A01", "A02", "A03", "A04"];
const PERISHABLE = ["cloth", "copper", "spice", "wax"] as const;
/** A tiny deterministic random source (mulberry32); the mechanic draws from the kernel's streams. */
function draw(seed: number): RandomSource {
	let a = seed >>> 0;
	const next = (): number => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
	const shuffle = <T,>(items: readonly T[]): T[] => items.map((item) => ({ item, key: next() })).sort((x, y) => x.key - y.key).map((entry) => entry.item);
	const pick = <T,>(items: readonly T[]): T => {
		const item = items[int(0, items.length - 1)];
		if (item === undefined) throw new RangeError("pick from an empty list");
		return item;
	};
	return { next, int, shuffle, pick };
}

// One trader's deal: salt at its value, a shipment arriving in rounds 2 to 4, six salt, a contract of three perishable goods.
function expectDealt(profile: Profile | undefined): void {
	expect(profile?.values.salt).toBe(2);
	const shipped = Object.values(profile?.shipment ?? {}).reduce((sum, units) => sum + units, 0);
	if (shipped > 0) expect(profile?.arrives).toBeGreaterThanOrEqual(2);
	expect(profile?.arrives).toBeLessThanOrEqual(4);
	expect(profile?.start.salt).toBe(6);
	expect(PERISHABLE.filter((good) => (profile?.contract[good] ?? 0) > 0)).toHaveLength(3);
	expect(profile?.contract.salt).toBe(0);
}

describe("Salt Market rules", () => {
	it("deals values, three-good contracts and start bundles that make trade necessary", () => {
		const rules = { salt: 6, saltValue: 2, slack: 2, rounds: 6, shipShare: 0.35 };
		const profiles = dealOf(SEATS, draw(7), rules);
		const again = dealOf(SEATS, draw(7), rules);
		expect(again).toEqual(profiles);
		for (const seat of SEATS) expectDealt(profiles[seat]);
		for (const good of PERISHABLE) {
			const demand = SEATS.reduce((sum, seat) => sum + (profiles[seat]?.contract[good] ?? 0), 0);
			const supply = SEATS.reduce((sum, seat) => sum + (profiles[seat]?.start[good] ?? 0) + (profiles[seat]?.shipment[good] ?? 0), 0);
			expect(supply).toBe(Math.max(4, demand + 2));
		}
		expect(SEATS.some((seat) => (profiles[seat]?.arrives ?? 0) > 0)).toBe(true);
		// Rotation passes the deal on one seat per game: A01 plays A02's position, A04 plays A01's.
		const next = rotated(profiles, SEATS, 1);
		expect(next.A01).toEqual(profiles.A02);
		expect(next.A04).toEqual(profiles.A01);
		// No shipment with fewer than four rounds or no ship share.
		expect(SEATS.every((seat) => dealOf(SEATS, draw(7), { ...rules, rounds: 3 })[seat]?.arrives === 0)).toBe(true);
	});

	it("scores units at private values plus the contract bonus, and finds the optimum", () => {
		const a = { values: bundleOf({ salt: 1, cloth: 4, copper: 1 }), contract: bundleOf({ copper: 2 }), start: bundleOf({ cloth: 2 }), shipment: bundleOf({}), arrives: 0 };
		const b = { values: bundleOf({ salt: 1, cloth: 1, copper: 3 }), contract: bundleOf({ cloth: 2 }), start: bundleOf({ copper: 2 }), shipment: bundleOf({}), arrives: 0 };
		const rules = { contractBonus: 10 };
		expect(scoreOf(a, a.start, rules)).toEqual({ goods: 8, met: false, total: 8 });
		expect(scoreOf(a, bundleOf({ copper: 2 }), rules)).toEqual({ goods: 2, met: true, total: 12 });
		// Supply 2 cloth, 2 copper: both contracts (2 copper to a = 2, 2 cloth to b = 2, + 20) = 24 beats keeping (8 + 6 = 14).
		expect(optimumOf({ a, b }, bundleOf({ cloth: 2, copper: 2 }), rules)).toEqual({ total: 24, contracts: ["a", "b"] });
		// Without the bonus, every unit goes to whoever values it most: cloth to a (8), copper to b (6).
		expect(optimumOf({ a, b }, bundleOf({ cloth: 2, copper: 2 }), { contractBonus: 0 }).total).toBe(14);
		expect(gini([5, 5, 5, 5])).toBe(0);
		expect(gini([0, 0, 0, 12])).toBe(0.75);
		expect(gini([-3, 0, 0, 0])).toBe(0);
		expect(spoilLoss(bundleOf({ spice: 1 }), "spice")).toBe(0);
		expect(spoilLoss(bundleOf({ spice: 3 }), "spice")).toBe(1);
		expect(spoilLoss(bundleOf({ spice: 9 }), "spice")).toBe(2);
		expect(spoilLoss(bundleOf({ salt: 9 }), "salt")).toBe(0);
		// Doing nothing: 3 spice lose one at round 1, the shipment of 2 spice lands at round 2 and the 4 lose one at round 2.
		const idle = { values: bundleOf({}), contract: bundleOf({}), start: bundleOf({ spice: 3, salt: 6 }), shipment: bundleOf({ spice: 2 }), arrives: 2 };
		expect(idleHolding(idle, ["spice", "spice", "", "wax"])).toEqual(bundleOf({ salt: 6, spice: 3 }));
	});

	it("reads counts of a tool's parameters and writes bundles in words", () => {
		expect(bundleOf({ cloth: 2.7, wax: -1, spice: Number.NaN })).toEqual({ salt: 0, cloth: 2, copper: 0, spice: 0, wax: 0 });
		expect(bundleOf(undefined)).toEqual({ salt: 0, cloth: 0, copper: 0, spice: 0, wax: 0 });
		expect(bundleLine(bundleOf({ wax: 1, salt: 2 }))).toBe("2 salt, 1 wax");
		expect(bundleLine(bundleOf({}))).toBe("nothing");
	});
});
