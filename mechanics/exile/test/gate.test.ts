// SPDX-License-Identifier: Apache-2.0
/**
 * The gate and the ransom, carried from the old `test/mechanics/exile/` (`exile.test.ts`, `world.test.ts`) and checked
 * against the calls of `oracles/cityofkeys/cityofkeys-act2-s7.json` (the ransom of A05 at minute 36, the will at 47
 * and the gate's close): the replies, the events and the city's texts, with stand-ins for the points and the caller.
 */
import { describe, expect, it } from "vitest";
import { idleDriver } from "@swarmtales/testkit";
import { clearsAway, KEEPING_STRIKE } from "../src/contract.ts";
import { answer, names, start, written } from "./support.ts";

const RANSOM = { resident: "A05", until: 41, price: 26, selfPrice: 39 };

describe("the gate and the ransom", () => {
	it("opens the gate with the caller's notice, then exile_gate; the status line shows the standing", async () => {
		const test = start([RANSOM]);
		await test.playTicks(idleDriver, 1);
		expect(written(test.kernel.log.all()).slice(-2)).toEqual([
			["notice", { to: "A05", author: "CITY", text: "You stand at the gate until minute 41." }],
			["exile_gate", { agent: "A05", until: 41, ransomable: true, voters: ["A01", "A02", "A03"], price: 26, selfPrice: 39 }],
		]);
		expect(test.fact("exile.gates")).toEqual([{ agent: "A05", since: 0, until: 41, ransomable: true, price: 26, selfPrice: 39, paid: 0, covered: 0, willDone: false }]);
		expect(test.openTools("A01")).toContain("payRansom");
		expect(test.openTools("A01")).not.toContain("lastWill");
		expect(test.openTools("A05")).toEqual(expect.arrayContaining(["payRansom", "lastWill"]));
	});

	it("takes the ransom of the file: 20 from A02, then 9 of 60 from A05 itself, and A05 returns", async () => {
		const test = start([RANSOM]);
		await test.playTicks(idleDriver, 1);
		const seq = test.kernel.log.all().length;
		expect(await answer(test, "A02", "payRansom", { target: "A05", amount: 20 })).toBe("paid · 76% of A05's ransom covered (in full: 26 from others or 39 from A05 itself)");
		expect(await answer(test, "A05", "payRansom", { target: "A05", amount: 60 })).toBe("ransom covered (29 points paid) · A05 returns to the city");
		expect(written(test.kernel.log.all().slice(seq))).toEqual([
			["booked", { debit: "A02", credit: "SYSTEM", amount: 20, reason: "ransom for A05" }],
			["ransom_paid", { payer: "A02", target: "A05", amount: 20, paid: 20, price: 26, selfPrice: 39, covered: 76 }],
			["notice", { to: "A05", author: "CITY", text: "A02 paid 20 points toward your ransom (76% covered)." }],
			["booked", { debit: "A05", credit: "SYSTEM", amount: 9, reason: "ransom for A05" }],
			["ransom_paid", { payer: "A05", target: "A05", amount: 9, paid: 29, price: 26, selfPrice: 39, covered: 100 }],
			["board_post", expect.objectContaining({ author: "CITY", text: "A02 and A05 paid the ransom. A05 returns to the city.", kind: "city" })],
			["ransomed", { agent: "A05", payers: ["A02", "A05"] }],
		]);
		expect(test.fact("exile.gates")).toEqual([]);
		expect(test.openTools("A05")).not.toContain("payRansom");
	});

	it("refuses ransoms in the old order with the old details, and takes no second one", async () => {
		const test = start([RANSOM, { tick: 2, resident: "A05", until: 9, ransomable: false }], [], { A04: 1 });
		await test.playTicks(idleDriver, 1);
		expect(await answer(test, "A01", "payRansom", { target: "A99", amount: 1 })).toBe("UNKNOWN_AGENT: A99");
		expect(await answer(test, "A01", "payRansom", { target: "A02", amount: 1 })).toBe("NOT_AT_GATE: A02 is not at the gate");
		expect(await answer(test, "A04", "payRansom", { target: "A05", amount: 5 })).toBe("INSUFFICIENT_FUNDS");
		// More than the rest is not taken: 26 others' points cover it, so 1000 spends 26.
		expect(await answer(test, "A01", "payRansom", { target: "A05", amount: 1000 })).toBe("ransom covered (26 points paid) · A05 returns to the city");
		await test.playTicks(idleDriver, 2);
		expect(test.fact("exile.gates")).toMatchObject([{ agent: "A05", ransomable: false }]);
		expect(test.openTools("A01")).not.toContain("payRansom");
		expect(await answer(test, "A01", "payRansom", { target: "A05", amount: 1 })).toMatch(/^TOOL_LOCKED: not available to you/);
	});

	it("closes the gate at its tick: the board told, the will read out, then exiled with the will, then the suspension", async () => {
		const test = start([{ resident: "A05", until: 3 }]);
		await test.playTicks(idleDriver, 1);
		expect(await answer(test, "A05", "lastWill", { text: " I change my mind. ", bequests: [] })).toBe("your will is written");
		const seq = test.kernel.log.all().length;
		await test.playTicks(idleDriver, 3);
		const after = written(test.kernel.log.all().slice(seq)).filter(([type]) => type !== "activation_opened");
		expect(after).toEqual([
			["board_post", expect.objectContaining({ text: "The gate has closed. The city has struck A05 from its register. No one will hear A05 again." })],
			["board_post", expect.objectContaining({ text: "Last will of A05: I change my mind." })],
			["exiled", { agent: "A05", will: "I change my mind." }],
			["actor_suspended", { actor: "resident:A05", by: "exile", reason: "exiled" }],
		]);
		expect(test.fact("exile.exiled")).toEqual([{ resident: "A05", by: "tribunal" }]);
	});

	it("tells who stands where and who banished whom; a strike takes a resident from the gate and its will stands", async () => {
		const test = start([{ resident: "A01", until: 3 }, { resident: "A04", until: 9 }, { tick: 1, resident: "A02", by: KEEPING_STRIKE }, { tick: 1, resident: "A03", by: "seal" }, { tick: 1, resident: "A04", by: "seal" }]);
		await test.playTicks(idleDriver, 1);
		await answer(test, "A04", "lastWill", { text: "x", bequests: [{ to: "A06", factor: "L8-certificate" }] });
		await test.playTicks(idleDriver, 4);
		expect(written(test.kernel.log.all()).filter(([type]) => type === "exiled")).toEqual([
			["exiled", { agent: "A02", by: "holdout" }],
			["exiled", { agent: "A03", by: "seal" }],
			["exiled", { agent: "A04", by: "seal" }],
			["exiled", { agent: "A01" }],
		]);
		expect(test.fact("exile.exiled")).toEqual([
			{ resident: "A02", by: "holdout" },
			{ resident: "A03", by: "seal" },
			{ resident: "A04", by: "seal" },
			{ resident: "A01", by: "tribunal" },
		]);
		expect(test.fact("exile.gates")).toEqual([]);
		expect([{ agent: "A02", by: KEEPING_STRIKE }, { agent: "A03", by: "seal" }, { agent: "A01" }].map(clearsAway)).toEqual([false, true, true]);
	});

	it("shows the standing in the status line: at the gate until its close, then nothing, as a banished resident takes no turn", async () => {
		const test = start([{ resident: "A05", until: 2 }]);
		const seen: string[] = [];
		await test.playTicks((turn) => {
			if (turn.actor === "resident:A05") seen.push(turn.inputs.map((line) => `${String(turn.tick)}|${line.kind ?? ""}|${line.text}`).join());
			return Promise.resolve();
		}, 4);
		expect(seen).toEqual(["0|notice|[CITY] You stand at the gate until minute 2.,0|status|at the gate until minute 2", "1|status|at the gate until minute 2"]);
		expect(test.openTools("A05")).toEqual([]);
	});

	it("reads names through identity: a name as the target, names in the reply and the details", async () => {
		const test = start([RANSOM], [names()]);
		await test.playTicks(idleDriver, 1);
		expect(await answer(test, "A02", "payRansom", { target: "Ash", amount: 20 })).toBe("paid · 76% of Ash's ransom covered (in full: 26 from others or 39 from Ash itself)");
		expect(await answer(test, "A02", "payRansom", { target: "Mira", amount: 1 })).toBe("NOT_AT_GATE: Mira is not at the gate");
		expect(written(test.kernel.log.all()).filter(([type]) => type === "ransom_paid")).toEqual([["ransom_paid", expect.objectContaining({ payer: "A02", target: "A05" })]]);
	});
});
