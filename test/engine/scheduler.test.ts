import { describe, expect, it } from "vitest";
import { competitorIds, rngFor } from "@swarmtales/kernel";
import { legacyTurnOrder } from "@swarmtales/mechanic-shared";
import { createHostFixture } from "../helpers/host-fixture.ts";
import { tinyStory } from "../helpers/stories.ts";

/**
 * The old `activationOrder(seed, round, pass, ids)` is the host's turn policy `legacyTurnOrder`
 * (`mechanics/shared/src/order.ts`): the roster shuffled with `rngFor(seed, "order", round, pass)`,
 * round = minute + 1, the run seed's stream as `PassView.rng`.
 */
function activationOrder(seed: number, round: number, pass: number, ids: readonly string[]): readonly string[] {
	return legacyTurnOrder({ seed, minute: round - 1, pass, residents: ids, roster: ids, rng: (...labels) => rngFor(seed, ...labels) });
}

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

	it("leaves out those who may not act, keeping the roster's shuffle (the old order once someone left)", () => {
		const ids = competitorIds(6);
		const all = activationOrder(7, 3, 1, ids);
		const some = legacyTurnOrder({ seed: 7, minute: 2, pass: 1, residents: ids.filter((id) => id !== "A03"), roster: ids, rng: (...labels) => rngFor(7, ...labels) });
		expect(some).toEqual(all.filter((id) => id !== "A03"));
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
	/** The host's blocks of the first pass (`pass_start.blocks`), and the pass's order. */
	async function firstPass(blockSize: number): Promise<{ readonly order: readonly string[]; readonly blocks: readonly (readonly string[])[] }> {
		const fixture = createHostFixture({ story: tinyStory({ agents: 5 }), seed: 7, agents: 5, minutes: 1, passesPerMinute: 1, blockSize, script: () => ({}) });
		await fixture.run();
		const pass = fixture.events("pass_start")[0];
		return { order: pass?.order ?? [], blocks: pass?.blocks ?? [] };
	}

	it("cuts the order into consecutive blocks; the last one may be shorter", async () => {
		const one = await firstPass(1);
		expect(one.order).toEqual(activationOrder(7, 1, 1, competitorIds(5)));
		expect(one.blocks).toEqual(one.order.map((id) => [id]));
		const two = await firstPass(2);
		const [a, b, c, d, e] = two.order;
		expect(two.blocks).toEqual([[a, b], [c, d], [e]]);
		const nine = await firstPass(9);
		expect(nine.blocks).toEqual([nine.order]);
		// A block size below 1: the host refuses the policy (`test/host/turns.test.ts`, "refuses bad policies").
	});
});
