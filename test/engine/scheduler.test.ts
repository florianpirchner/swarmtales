import { describe, expect, it } from "vitest";
import { competitorIds } from "@swarmtales/kernel";
import { activationOrder, blocksOf } from "@swarmtales/engine";

describe("activation order (SPEC 3)", () => {
	it("is a permutation of all competitors in every pass", () => {
		const ids = competitorIds(6);
		for (let round = 1; round <= 50; round++) {
			for (let pass = 1; pass <= 3; pass++) expect([...activationOrder(7, round, pass, ids)].sort()).toEqual([...ids]);
		}
	});

	it("is reproducible for a fixed seed and changes between rounds and passes", () => {
		const ids = competitorIds(6);
		expect(activationOrder(7, 3, 2, ids)).toEqual(activationOrder(7, 3, 2, ids));
		const orders = new Set(Array.from({ length: 20 }, (_, index) => activationOrder(7, index + 1, 1, ids).join(",")));
		expect(orders.size).toBeGreaterThan(10);
		const passes = new Set(Array.from({ length: 20 }, (_, index) => activationOrder(7, 3, index + 1, ids).join(",")));
		expect(passes.size).toBeGreaterThan(10);
		expect(activationOrder(8, 3, 1, ids)).not.toEqual(activationOrder(7, 3, 1, ids));
	});

	it.each([6, 12, 24])("gives every one of %i competitors a fair average position", (count) => {
		const ids = competitorIds(count);
		const rounds = 1_000;
		const passes = 2;
		const positionSum = new Map(ids.map((id) => [id, 0]));
		const firstCount = new Map(ids.map((id) => [id, 0]));
		for (let round = 1; round <= rounds; round++) {
			for (let pass = 1; pass <= passes; pass++) {
				activationOrder(7, round, pass, ids).forEach((id, position) => {
					positionSum.set(id, (positionSum.get(id) ?? 0) + position);
					if (position === 0) firstCount.set(id, (firstCount.get(id) ?? 0) + 1);
				});
			}
		}
		const middle = (count - 1) / 2;
		const draws = rounds * passes;
		for (const id of ids) {
			const average = (positionSum.get(id) ?? 0) / draws;
			expect(Math.abs(average - middle), `${id} average position ${average}`).toBeLessThan(count * 0.05);
			const firstShare = (firstCount.get(id) ?? 0) / draws;
			expect(Math.abs(firstShare - 1 / count), `${id} goes first ${firstShare}`).toBeLessThan(0.5 / count);
		}
	});
});

describe("blocks of a pass (SPEC 3)", () => {
	it("cuts the order into consecutive blocks; the last one may be shorter", () => {
		const order = competitorIds(5);
		expect(blocksOf(order, 1)).toEqual(order.map((id) => [id]));
		expect(blocksOf(order, 2)).toEqual([["A01", "A02"], ["A03", "A04"], ["A05"]]);
		expect(blocksOf(order, 9)).toEqual([order]);
		expect(blocksOf([], 2)).toEqual([]);
		expect(() => blocksOf(order, 0)).toThrow(RangeError);
	});
});
