// SPDX-License-Identifier: Apache-2.0
/**
 * The last will, carried from the old `test/mechanics/exile/` (`world.test.ts` "refuses wills in the old order",
 * `exile.test.ts` "counts two bequests to one heir together against the cap"), the will of
 * `oracles/cityofkeys/cityofkeys-act2-s7.json` (minute 47), and the prompt texts of the old platform.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { idleDriver } from "@swarmtales/testkit";
import { exile } from "../src/index.ts";
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

describe("the head", () => {
	it("carries the eleven prompt texts of the old platform; only the ids differ", () => {
		// The sha256 of the old files: `library/prompts/<old id>.md`, the last three `mechanics/exile/prompts/<old id>.md`.
		const old: readonly (readonly [string, string, string])[] = [
			["exile/tools/payRansom", "tools/payRansom", "9bca50fa92f96186ef6c7228659e6402dc0fe854444fd0fa03dc6fe3f2af9357"],
			["exile/tools/lastWill", "tools/lastWill", "f115a507db48b4fda6557e93d6aef71b7f68d32c340ef3422021f73696c49e16"],
			["exile/replies/locked", "replies/locked", "70f509570c857b3348bb1283497fe786aec9052bc745265380856cf93a5d8d24"],
			["exile/replies/ransom-covered", "replies/ransom-covered", "9335ccdfee90b2b936e535d4702de4f82d92f0de976fb7fbe7a2fbe17d685317"],
			["exile/replies/ransom-paid", "replies/ransom-paid", "a1be51d9a8856405cebfcf64573ce56d1ed793be02a3a635f77d65c0685ae913"],
			["exile/replies/will-invalid", "replies/will-invalid", "a14ade8c2566a5d54b3d9f99d46f0fae7dbc4185833c977d461102e99fc0c7f6"],
			["exile/replies/will-written", "replies/will-written", "ea7d6bafd87ab8fbd9f3120aa9ad1a02c1ea04d44bb8eceadff86b7c198ce4b2"],
			["exile/status/gate", "competitor/status/gate", "4ec98a3c40da79a8d67f88df936fd03119c40ba909d54752ac6a48770d80206b"],
			["exile/status-exiled", "exile/status-exiled", "ec7cb8367c5998d857bf8dd6752719770ad577b001808621f8d794553dfcdf6a"],
			["exile/ransom-toward", "exile/ransom-toward", "61440d4345e572c1c0137974291ddfdb928789c41359fc27680e5bc19ca1b419"],
			["exile/will-points", "exile/will-points", "0a569d629d919e05892ea719968e9a589aeb79498b95646c4749ed487d5c3389"],
		];
		for (const [id, oldId, sha256] of old) {
			const text = readFileSync(new URL(`../prompts/${id}.md`, import.meta.url), "utf8").replace(`id: ${id}`, `id: ${oldId}`);
			expect([id, createHash("sha256").update(text).digest("hex")]).toEqual([id, sha256]);
		}
		expect(Object.keys(exile.head.prompts).sort()).toEqual(old.map(([id]) => id).sort());
		expect(exile.head.tools.map((tool) => [tool.name, tool.description, tool.for])).toEqual([
			["payRansom", "exile/tools/payRansom", ["resident"]],
			["lastWill", "exile/tools/lastWill", ["resident"]],
		]);
	});
});
