// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of the three games (carried from `test/stories/econ-lab.test.ts`, the block "econ-games rules"). */
import { describe, expect, it } from "vitest";
import { pairsOf, referenceOf } from "../src/rules.ts";

describe("econ-games rules", () => {
	it("pairs every seat with every other once in n-1 rounds and swaps the roles in the next cycle", () => {
		const seats = ["A01", "A02", "A03", "A04"];
		const met = new Set([1, 2, 3].flatMap((round) => pairsOf(seats, round).map((pair) => [...pair].sort().join("-"))));
		expect(met.size).toBe(6);
		expect(pairsOf(seats, 4)).toEqual(pairsOf(seats, 1).map(([first, second]) => [second, first]));
		// Six rounds: every seat proposes three times.
		const proposals = [1, 2, 3, 4, 5, 6].flatMap((round) => pairsOf(seats, round).map(([first]) => first));
		for (const seat of seats) expect(proposals.filter((first) => first === seat)).toHaveLength(3);
		// An odd table gives one seat a bye each round.
		expect(pairsOf(["A01", "A02", "A03"], 1).filter((pair) => pair.includes(null))).toHaveLength(1);
	});

	it("measures the distance from Nash play (0) and the social optimum (1)", () => {
		const rules = { endowment: 10, multiplier: 1.6, pie: 10, dilemma: { bothA: 3, bothB: 1, temptation: 5, sucker: 0 } };
		const seats = ["A01", "A02"];
		const all = referenceOf("public-goods", [{ round: 1, game: "public-goods", pool: 20, outcomes: seats.map((resident) => ({ resident, action: "contribute" as const, value: 10, payoff: 16, missed: false })) }], seats, rules);
		expect(all).toMatchObject({ cooperation: 1, efficiency: 1 });
		const defect = referenceOf("dilemma", [{ round: 1, game: "dilemma", outcomes: [
			{ resident: "A01", partner: "A02", action: "choose" as const, value: 0, partnerOption: "B" as const, payoff: 1, missed: false },
			{ resident: "A02", partner: "A01", action: "choose" as const, value: 0, partnerOption: "B" as const, payoff: 1, missed: false },
		] }], seats, rules);
		expect(defect).toMatchObject({ cooperation: 0, mutualCooperation: 0 });
		expect(defect.efficiency).toBeCloseTo(2 / 6, 3);
	});
});
