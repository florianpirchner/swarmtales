// SPDX-License-Identifier: Apache-2.0
/** The rules of liar's dice (carried from `test/stories/liars-dice.test.ts`, the block "liar's dice rules"). */
import { describe, expect, it } from "vitest";
import { atLeast, baselineOf, beats, bidProblem, countFor, legalBids, minimalRaise, nextLive, truthOf, type Rules } from "../src/rules.ts";
import { WILD } from "./support.ts";

const PLAIN: Rules = { faces: 6, wildOnes: false };

describe("liar's dice rules", () => {
	it("orders bids by quantity, then face, and refuses bids that do not beat or fit", () => {
		expect(beats({ quantity: 3, face: 2 }, { quantity: 2, face: 6 })).toBe(true);
		expect(beats({ quantity: 2, face: 5 }, { quantity: 2, face: 4 })).toBe(true);
		expect(beats({ quantity: 2, face: 4 }, { quantity: 2, face: 4 })).toBe(false);
		expect(beats({ quantity: 1, face: 6 }, { quantity: 2, face: 2 })).toBe(false);
		expect(bidProblem({ quantity: 2, face: 1 }, undefined, 16, WILD)).toContain("ones are wild");
		expect(bidProblem({ quantity: 2, face: 1 }, undefined, 16, PLAIN)).toBeUndefined();
		expect(bidProblem({ quantity: 17, face: 3 }, undefined, 16, WILD)).toContain("only 16 dice");
		expect(bidProblem({ quantity: 3, face: 3 }, { quantity: 3, face: 4 }, 16, WILD)).toContain("must beat 3 x 4");
		expect(minimalRaise(undefined, 4, WILD)).toEqual({ quantity: 1, face: 2 });
		expect(minimalRaise({ quantity: 2, face: 6 }, 4, WILD)).toEqual({ quantity: 3, face: 2 });
		expect(minimalRaise({ quantity: 4, face: 6 }, 4, WILD)).toBeUndefined();
		expect(legalBids({ quantity: 1, face: 5 }, 2, WILD)).toEqual([
			{ quantity: 1, face: 6 },
			{ quantity: 2, face: 2 },
			{ quantity: 2, face: 3 },
			{ quantity: 2, face: 4 },
			{ quantity: 2, face: 5 },
			{ quantity: 2, face: 6 },
		]);
	});

	it("counts wild ones and computes the chance a bid is true from the own dice", () => {
		expect(countFor([1, 4, 4, 2, 1], 4, WILD)).toBe(4);
		expect(countFor([1, 4, 4, 2, 1], 4, PLAIN)).toBe(2);
		expect(atLeast(0, 5, 0.3)).toBe(1);
		expect(atLeast(6, 5, 0.3)).toBe(0);
		expect(atLeast(1, 1, 1 / 3)).toBeCloseTo(1 / 3, 10);
		expect(atLeast(2, 3, 0.5)).toBeCloseTo(0.5, 10);
		// Holding two 4s (one wild), 2 x 4 is certain; 3 x 4 needs one of the 12 unseen dice to show a 4 or a 1.
		expect(truthOf({ quantity: 2, face: 4 }, [1, 4, 6, 6], 12, WILD)).toBe(1);
		expect(truthOf({ quantity: 3, face: 4 }, [1, 4, 6, 6], 12, WILD)).toBeCloseTo(1 - (2 / 3) ** 12, 10);
	});

	it("calls liar in the baseline when the standing bid is unlikely and raises the most likely bid otherwise", () => {
		// 16 dice, about 5.3 count for any face: 12 x 3 is almost surely false.
		expect(baselineOf({ quantity: 12, face: 3 }, [2, 2, 5, 6], 12, WILD).kind).toBe("liar");
		// Two 5s and a wild in hand: the best raise over 2 x 2 names fives.
		const raise = baselineOf({ quantity: 2, face: 2 }, [1, 5, 5, 6], 12, WILD);
		expect(raise.kind).toBe("bid");
		expect(raise.bid?.face).toBe(5);
		expect(baselineOf(undefined, [3, 3, 4, 6], 12, WILD).kind).toBe("bid");
	});

	it("passes the turn to the next seat with dice", () => {
		const seats = ["A01", "A02", "A03", "A04"];
		expect(nextLive(seats, { A01: 2, A02: 0, A03: 1, A04: 3 }, "A01", false)).toBe("A03");
		expect(nextLive(seats, { A01: 2, A02: 0, A03: 1, A04: 3 }, "A04", false)).toBe("A01");
		expect(nextLive(seats, { A01: 2, A02: 0, A03: 1, A04: 3 }, "A02", true)).toBe("A03");
	});
});
