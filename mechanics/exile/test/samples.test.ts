// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The `sample` of `payRansom` and `lastWill`: what the fake driver (`--fake`) may call at the gate (offline, a test mechanic opens the gate and keeps the points). */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { RandomSource } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { ExilePurseService, ExileService } from "../src/contract.ts";
import { exile } from "../src/index.ts";

const texts = { exiled: "{exiled} left.", will: "{exiled}: {will}", ransomed: "{payers} bought {exiled} back." };

// The stand-in of a court and a purse: a tool that sends a resident to the gate, and 10 points for every account.
const court = defineMechanic(
	defineHead({
		id: "court",
		package: "@test/court",
		summary: "Test: opens a gate and keeps the points.",
		requires: [ExileService],
		provides: [ExilePurseService],
		tools: { toGate: { description: "court/toGate", params: Type.Object({ resident: Type.String({ description: "The resident." }) }), for: ["resident"] } },
	}),
	{
		tools: {
			toGate: {
				run: ({ resident }, ctx) => {
					ctx.call(ExileService, "toGate", { resident, until: 5, ransomable: true, voters: [], price: 20, selfPrice: 10, bequestPerHeir: 0.5, notice: "To the gate.", texts });
					return reply("sent");
				},
			},
		},
		services: { "exile-purse": { balance: () => 10, burn: () => null, move: () => null } },
	},
);

const game = defineGame({ id: "exile-samples", seed: 7, residents: ["A01", "A02", "A03", "A04"], mechanics: [exile(), court()], end: { ticks: 10 } });

const fail = (): never => {
	throw new RangeError("an empty draw");
};

describe("the samples of the gate", () => {
	it("give nothing and draw nothing without a gate, then a payment of the rest and a will, one time in four, and every sampled call is taken", async () => {
		const test = testKernel(game, { prompts: { render: (_owner: string, id: string) => id } });
		const nexts: number[] = [];
		const random = (next: number): RandomSource => ({ next: () => (nexts.push(next), next), int: (_min, max) => max, pick: (items) => items[0] ?? fail(), shuffle: (items) => [...items] });
		const sample = (resident: string, tool: string, next = 0): unknown => test.kernel.sample(`resident:${resident}`, tool, random(next));
		expect([sample("A01", "payRansom"), sample("A04", "lastWill"), nexts.length]).toEqual([undefined, undefined, 0]);
		await test.call("A01", "toGate", { resident: "A04" });
		const logged = test.kernel.log.all().length;
		// Others pay the price of 20 in their points, the resident its own price of 10; each holds 10.
		expect([sample("A01", "payRansom", 0.25), sample("A01", "payRansom"), sample("A04", "payRansom")]).toEqual([undefined, { target: "A04", amount: 10 }, { target: "A04", amount: 10 }]);
		expect([sample("A01", "lastWill"), sample("A04", "lastWill", 0.25), sample("A04", "lastWill")]).toEqual([undefined, undefined, { text: "I leave the city what I could not spend.", bequests: [{ to: "A01", points: 5 }] }]);
		expect(test.kernel.log.all()).toHaveLength(logged);
		expect(await test.call("A01", "payRansom", { target: "A04", amount: 10 })).toMatchObject({ ok: true });
		expect(await test.call("A04", "lastWill", { text: "I leave the city what I could not spend.", bequests: [{ to: "A01", points: 5 }] })).toMatchObject({ ok: true });
		// The will is written; the rest of the ransom is what A02 pays in its points: 10.
		expect([sample("A04", "lastWill"), sample("A02", "payRansom")]).toEqual([undefined, { target: "A04", amount: 10 }]);
	});
});
