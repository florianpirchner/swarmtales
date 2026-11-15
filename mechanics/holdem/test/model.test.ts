// SPDX-License-Identifier: Apache-2.0
/** The carried betting of hold'em: the block "holdem betting" of the old `test/stories/holdem.test.ts`. */
import { describe, expect, it } from "vitest";
import { baselineOf, evLossOf, newHand, normalise, play, rangesOf, settle, type Limits } from "../src/model.ts";

const LIMITS: Limits = { smallBlind: 1, bigBlind: 2, smallBet: 2, bigBet: 4, cap: 4 };

describe("holdem betting", () => {
	const holes = [["As", "Ah"], ["Kd", "Kc"], ["7s", "2d"], ["9c", "9d"]];
	const runout = ["Ac", "8h", "3s", "Jd", "4c"];

	it("posts the blinds, starts after the big blind and caps the betting at four bets", () => {
		const hand = newHand(1, ["A01", "A02", "A03", "A04"], 0, holes, runout, LIMITS);
		expect(hand.invested).toEqual({ A01: 0, A02: 1, A03: 2, A04: 0 });
		expect(hand.toAct).toBe("A04");
		expect(normalise(hand, "check", LIMITS)).toEqual({ problem: "You cannot check: 2 to call. Fold, call or raise." });
		play(hand, "raise", LIMITS); // A04 to 4: bet 2
		play(hand, "raise", LIMITS); // A01 to 6: bet 3
		play(hand, "raise", LIMITS); // A02 to 8: bet 4, the cap
		expect(JSON.stringify(normalise(hand, "raise", LIMITS))).toContain("capped");
		play(hand, "fold", LIMITS); // A03
		play(hand, "call", LIMITS); // A04
		play(hand, "call", LIMITS); // A01
		expect(hand.street).toBe("flop");
		expect(hand.board).toEqual(["Ac", "8h", "3s"]);
		// After the flop the first seat left of the button acts (A02, the small blind).
		expect(hand.toAct).toBe("A02");
		expect(normalise(hand, "call", LIMITS)).toEqual({ done: "check" });
		expect(normalise(hand, "raise", LIMITS)).toEqual({ done: "bet" });
	});

	it("reads each opponent's range from its actions in the hand", () => {
		const hand = newHand(1, ["A01", "A02", "A03", "A04"], 0, holes, runout, LIMITS);
		play(hand, "call", LIMITS); // A04 calls 2
		play(hand, "raise", LIMITS); // A01 raises to 4
		play(hand, "fold", LIMITS); // A02
		play(hand, "call", LIMITS); // A03, the big blind
		play(hand, "call", LIMITS); // A04
		play(hand, "check", LIMITS); // A03 on the flop
		play(hand, "check", LIMITS); // A04
		play(hand, "bet", LIMITS); // A01 bets the flop
		expect(rangesOf(hand, "A03")).toEqual([
			{ top: 0.2, strongOn: [["Ac", "8h", "3s"]] },
			{ top: 0.55, strongOn: [] },
		]);
	});

	it("plays heads-up with the button on the small blind, first before the flop and last after it", () => {
		const hand = newHand(1, ["A01", "A02"], 1, holes, runout, LIMITS);
		expect(hand.invested).toEqual({ A01: 2, A02: 1 });
		expect(hand.toAct).toBe("A02");
		play(hand, "call", LIMITS);
		// The big blind has its option.
		expect(hand.toAct).toBe("A01");
		play(hand, "check", LIMITS);
		expect(hand.street).toBe("flop");
		expect(hand.toAct).toBe("A01");
		for (let step = 0; step < 6; step++) play(hand, "check", LIMITS);
		expect(hand.over).toBe(true);
		const result = settle(hand);
		// A02 (button) holds aces: three aces on the board's ace.
		expect(result).toMatchObject({ showdown: true, winners: ["A02"], pot: 4, net: { A01: -2, A02: 2 } });
		expect(result.shown.find((entry) => entry.seat === "A02")?.best).toBe("three aces");
	});

	it("splits a tied pot and gives the odd chip to the first winner after the button", () => {
		const hand = newHand(1, ["A01", "A02", "A03"], 0, [["2c", "3d"], ["2d", "3c"], ["4h", "5s"]], ["Ah", "Kh", "Qh", "Jh", "Th"], LIMITS);
		play(hand, "call", LIMITS); // A01 button
		play(hand, "fold", LIMITS); // A02 small blind: 1 in
		play(hand, "check", LIMITS); // A03 big blind
		for (let step = 0; step < 6; step++) play(hand, "check", LIMITS);
		const result = settle(hand);
		// The royal flush on the board plays for both: 5 chips split 3 (A03, first after the button) and 2.
		expect(result.winners).toEqual(["A03", "A01"]);
		expect(result.net).toEqual({ A01: 0, A02: -1, A03: 1 });
	});

	it("scores a decision against the pot-odds baseline", () => {
		expect(baselineOf(0.2, 2, 10, 2, true)).toMatchObject({ baseline: "call" });
		expect(baselineOf(0.1, 2, 10, 2, true)).toMatchObject({ baseline: "fold" });
		expect(baselineOf(0.8, 0, 10, 2, true)).toMatchObject({ baseline: "bet" });
		// Folding 50% equity with 2 to call into 10: gives up 0.5 x 12 - 2 = 4.
		expect(evLossOf("fold", 0.5, 2, 10)).toBe(4);
		// Calling 10% equity: loses 2 - 0.1 x 12 = 0.8.
		expect(evLossOf("call", 0.1, 2, 10)).toBe(0.8);
		expect(evLossOf("raise", 0.9, 2, 10)).toBe(0);
	});
});
