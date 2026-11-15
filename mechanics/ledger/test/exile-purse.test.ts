// SPDX-License-Identifier: Apache-2.0
/**
 * The ledger as the keeper of the points of `exile` (`exile-purse`, M5-15): a ransom burns, a last will moves, each
 * booked before the exile's own event as in `oracles/cityofkeys/cityofkeys-act2-s7.json`; the points of a resident
 * that a strike keeps (the holdout trial) are not burned.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileService, KEEPING_STRIKE } from "@swarmtales/mechanic-exile/contract";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { idleDriver, testKernel } from "@swarmtales/testkit";
import { ledger } from "../src/index.ts";

const TEXTS = { exiled: "The gate has closed on {exiled}.", will: "Last will of {exiled}: {will}", ransomed: "{payers} paid the ransom of {exiled}." };

// Stands in for the tribunal and the holdout trial: A05 to the gate at tick 0 (prices 26 and 39), A02 struck at tick 1.
const caller = defineMechanic(
	defineHead({ id: "caller", package: "@test/caller", summary: "Test: opens a gate and strikes.", options: Type.Object({}), requires: [ExileService] }),
	{
		hooks: {
			tickStarted: (ctx) => {
				const gate = { resident: "A05", until: 9, ransomable: true, voters: ["A01"], price: 26, selfPrice: 39, bequestPerHeir: 0.1, notice: "At the gate.", texts: TEXTS };
				if (ctx.tick === 0) ctx.call(ExileService, "toGate", gate);
				if (ctx.tick === 1) ctx.call(ExileService, "banish", { resident: "A02", by: KEEPING_STRIKE });
			},
		},
	},
);

const game = defineGame({ id: "purse-test", seed: 7, residents: ["A01", "A02", "A03", "A04", "A05"], mechanics: [ledger({ startPoints: 30 }), exile(), caller()], end: { ticks: 20 } });

describe("the ledger keeps the points of the exile", () => {
	it("books a ransom and a will before the exile's events, and burns nothing on a strike that keeps", async () => {
		const test = testKernel(game);
		await test.playTicks(idleDriver, 1);
		const seq = test.kernel.log.all().length;
		expect(await test.call("A01", "payRansom", { target: "A05", amount: 20 })).toMatchObject({ ok: true });
		expect(await test.call("A05", "lastWill", { text: "Farewell.", bequests: [{ to: "A04", points: 3 }] })).toMatchObject({ ok: true, reply: "your will is written · 3 points to A04" });
		await test.playTicks(idleDriver, 1);
		const lines = test.kernel.log
			.all()
			.slice(seq)
			.filter((event) => /\/(ledger|exile)$/.test(event.source))
			.map((event) => [event.type, event.payload]);
		expect(lines).toEqual([
			["ledger_entry", { txId: "TX6", debit: "A01", credit: "SYSTEM_MINT_BURN", amount: 20, reason: "ransom for A05" }],
			["ransom_paid", { payer: "A01", target: "A05", amount: 20, paid: 20, price: 26, selfPrice: 39, covered: 76 }],
			["ledger_entry", { txId: "TX7", debit: "A05", credit: "A04", amount: 3, reason: "last will of A05" }],
			["last_will", { agent: "A05", text: "Farewell.", bequests: [{ to: "A04", points: 3 }] }],
			["exiled", { agent: "A02", by: "holdout" }],
		]);
		expect(test.fact("ledger.balances")).toMatchObject({ A01: 10, A02: 30, A04: 33, A05: 27 });
	});
});
