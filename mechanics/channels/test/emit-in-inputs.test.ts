// SPDX-License-Identifier: Apache-2.0
/** The first test of the direct messages: may a `turnInputs` hook emit? `dm_delivered` is written there. */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { scriptedDriver, testKernel } from "@swarmtales/testkit";

const probe = defineMechanic(
	defineHead({
		id: "probe",
		package: "@test/probe",
		summary: "Emits while a resident's inputs are built.",
		events: { seen: Type.Object({ resident: Type.String({ description: "The resident" }) }, { description: "The inputs of a resident were built" }) },
	}),
	{
		hooks: {
			turnInputs: (resident, ctx) => {
				ctx.emit("seen", { resident });
				return [{ kind: "probe", text: `seen ${resident}` }];
			},
		},
	},
);

describe("a turnInputs hook", () => {
	it("may emit: the event is on the log before the resident acts, and the line reaches the resident", async () => {
		const test = testKernel(defineGame({ id: "probe-test", seed: 1, residents: 2, mechanics: [probe()], scheduler: { id: "turns", options: { order: "roster" } }, end: { ticks: 2 } }));
		const lines: string[] = [];
		await test.playTicks(
			scriptedDriver((activation) => {
				lines.push(...activation.inputs.map((line) => line.text));
				return [];
			}),
			1,
		);
		expect(lines).toEqual(["seen A01", "seen A02"]);
		const events = test.kernel.log.all().filter((event) => event.type === "seen");
		expect(events.map((event) => event.payload)).toEqual([{ resident: "A01" }, { resident: "A02" }]);
	});
});
