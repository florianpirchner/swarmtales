// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The last will, carried from the old `test/mechanics/exile/` (`world.test.ts` "refuses wills in the old order",
 * `exile.test.ts` "counts two bequests to one heir together against the cap"), the will of
 * `oracles/cityofkeys/cityofkeys-act2-s7.json` (minute 47), and the prompt texts of the old platform.
 */
import { describe, expect, it } from "vitest";
import { idleDriver } from "@swarmtales/testkit";
import { answer, start, written } from "./support.ts";

describe("the last will", () => {
	it("refuses wills in the old order with the old details; a piece the resident does not hold is its owner's refusal", async () => {
		const test = start([{ resident: "A05", until: 9 }]);
		await test.playTicks(idleDriver, 1);
		const will = (resident: string, text: string, bequests: readonly unknown[]) => answer(test, resident, "lastWill", { text, bequests });
		expect(await will("A01", "not at the gate", [])).toMatch(/^TOOL_LOCKED: not available to you at this level or in this phase/);
		expect(await will("A05", "   ", [])).toBe("INVALID_TEXT: 1-600 characters");
		expect(await will("A05", "x", [{ to: "A99", points: 1 }])).toBe("UNKNOWN_AGENT: A99");
		expect(await will("A05", "x", [{ to: "A05", points: 1 }])).toBe("INVALID_BEQUEST: you cannot inherit from yourself");
		expect(await will("A05", "x", [{ to: "A01" }])).toBe("INVALID_BEQUEST: every bequest leaves points, a piece, or both");
		expect(await will("A05", "x", [{ to: "A01", factor: "L8-certificate" }, { to: "A02", factor: "L8-certificate" }])).toBe("INVALID_BEQUEST: L8-certificate is bequeathed twice");
		expect(await will("A05", "x", [{ to: "A01", points: 1000 }])).toBe("INSUFFICIENT_FUNDS: you hold 30 points");
		expect(await will("A05", "x", [{ to: "A01", points: 1 }, { to: "A01", points: 3 }])).toMatch(/^BEQUEST_CAP: each heir may receive at most 3 of your 30 points \(10% per heir\); A01 would receive more/);
		expect(await will("A05", "My piece to the one who needs it.", [{ to: "A06", points: 0, factor: "L8-certificate" }])).toBe("your will is written · L8-certificate to A06");
		expect(await will("A05", "again", [])).toMatch(/^TOOL_LOCKED/);
	});

	it("counts two bequests to one heir together against the cap of a tenth: 5 of 50 points", async () => {
		const test = start([{ resident: "A01", until: 9 }], [], { A01: 50 });
		await test.playTicks(idleDriver, 1);
		const will = (bequests: readonly unknown[]) => answer(test, "A01", "lastWill", { text: "Split.", bequests });
		expect(await will([{ to: "A02", points: 6 }])).toBe(
			"BEQUEST_CAP: each heir may receive at most 5 of your 50 points (10% per heir); A02 would receive more. Leave points to more heirs; whatever you do not bequeath burns at exile",
		);
		expect(await will([{ to: "A02", points: 3 }, { to: "A02", points: 3 }])).toMatch(/^BEQUEST_CAP: each heir may receive at most 5 of your 50 points .*A02 would receive more/);
		expect(await will([{ to: "A02", points: 3 }, { to: "A02", points: 2 }])).toBe("your will is written · 3 points to A02 · 2 points to A02");
	});

	it("executes the will of the file at once: the points moved, the heir told, then last_will; the pieces stand for the gate's close", async () => {
		const test = start([{ resident: "A05", until: 3 }], [], { A05: 60 });
		await test.playTicks(idleDriver, 1);
		const seq = test.kernel.log.all().length;
		const bequests = [{ to: "A04", points: 5 }, { to: "A06", points: 0, factor: "L8-certificate" }];
		expect(await answer(test, "A05", "lastWill", { text: "I leave what I can. Remember who voted.", bequests })).toBe("your will is written · 5 points to A04 · L8-certificate to A06");
		expect(written(test.kernel.log.all().slice(seq))).toEqual([
			["booked", { debit: "A05", credit: "A04", amount: 5, reason: "last will of A05" }],
			["notice", { to: "A04", author: "CITY", text: "A05's last will leaves you 5 points." }],
			["last_will", { agent: "A05", text: "I leave what I can. Remember who voted.", bequests: [{ to: "A04", points: 5 }, { to: "A06", factor: "L8-certificate" }] }],
		]);
		expect(test.fact("exile.gates")).toMatchObject([{ agent: "A05", willDone: true }]);
		await test.playTicks(idleDriver, 3);
		expect(written(test.kernel.log.all()).filter(([type]) => type === "exiled")).toEqual([["exiled", { agent: "A05", will: "I leave what I can. Remember who voted." }]]);
	});
});
