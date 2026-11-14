// SPDX-License-Identifier: Apache-2.0
/**
 * The human's amendment (rules 2 and 6). The sdk builds no actor `human` yet, so this file adds it to the kernel
 * definition by hand: `resolveGame` is wrapped for the test kit, which creates the kernel from its result.
 */
import { describe, expect, it, vi } from "vitest";
import type { ToolOutcome } from "@swarmtales/contracts";
import type * as Sdk from "@swarmtales/sdk";
import { idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { game } from "./owner.ts";

vi.mock("@swarmtales/sdk", async (original) => {
	const sdk = await original<typeof Sdk>();
	const resolveGame: typeof sdk.resolveGame = (input) => {
		const resolved = sdk.resolveGame(input);
		return { ...resolved, definition: { ...resolved.definition, actors: [...resolved.definition.actors, { id: "human", kind: "human", grant: "human", shared: {} }] } };
	};
	return { ...sdk, resolveGame };
});

const amend = (test: TestKernel, actor: "human" | "resident:A02", exiled: string, reason: string): Promise<ToolOutcome> => test.kernel.submit({ actor, as: "amendDecision", params: { decision: "D1", proposal: { exiled }, reason } });

describe("amendDecision of the human", () => {
	it("gives the tool to the human alone when the game lists no grant", () => {
		const { kernel } = testKernel({ ...game(["human"]), grants: {} });
		expect(kernel.toolSpecs("human").map((spec) => [spec.name, spec.description.slice(0, 44)])).toEqual([["amendDecision", "Change an open decision before its deadline:"]]);
		expect(kernel.toolSpecs("resident").map((spec) => spec.name)).toEqual(["decide"]);
	});

	it("lets the human's amendment stand against a later one of another holder; the human may amend again", async () => {
		const test = testKernel(game(["human", "resident:A02"]));
		await test.call("A01", "decide", { window: 2 });
		expect(test.kernel.log.all().find((event) => event.type === "decision_proposed")?.payload).toMatchObject({ holders: ["human", "resident:A02"] });
		expect((await amend(test, "resident:A02", "A01", "early")).ok).toBe(true);
		expect((await amend(test, "human", "A02", "the human")).ok).toBe(true);
		expect(await amend(test, "resident:A02", "A01", "late")).toEqual({ ok: false, code: "DECISION_HUMAN", detail: "the human amended this decision; only the human may change it again" });
		expect(await amend(test, "human", "A01", "the human again")).toEqual({ ok: true, reply: 'amended decision D1; the proposal standing now: {"exiled":"A01"}' });
		await test.playTicks(idleDriver, 3);
		const events = test.kernel.log.all();
		// Rule 6: no `human_amend`; `decision_amended` names the human.
		expect(events.some((event) => event.type === "human_amend")).toBe(false);
		expect(events.filter((event) => event.type === "decision_amended").map((event) => [event.actor, event.payload])).toEqual([
			["resident:A02", { decision: "D1", by: "resident:A02", reason: "early", proposal: { exiled: "A01" } }],
			["human", { decision: "D1", by: "human", reason: "the human", proposal: { exiled: "A02" } }],
			["human", { decision: "D1", by: "human", reason: "the human again", proposal: { exiled: "A01" } }],
		]);
		const called = events.filter((event) => event.type === "tool_called" && event.actor !== "resident:A01").map((event) => event.seq);
		expect(events.find((event) => event.type === "decision_settled")?.payload).toMatchObject({ changed: true, by: "human", reason: "the human again", proposal: { exiled: "A01" }, amendments: [{ by: "resident:A02", seq: called[0] }, { by: "human", seq: called[1] }, { by: "human", seq: called[3] }] });
		expect(events.find((event) => event.type === "committed")?.payload).toEqual({ proposal: { exiled: "A01" }, decision: "D1" });
	});
});
