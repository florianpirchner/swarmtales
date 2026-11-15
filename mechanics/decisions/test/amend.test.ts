// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** `amendDecision`: the amendment cases of the old `test/host/decisions.test.ts`, with residents as holders. */
import { describe, expect, it } from "vitest";
import type { ToolOutcome } from "@swarmtales/contracts";
import { idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { game, told } from "./owner.ts";

const HOLDERS = ["resident:A02", "resident:A03"];

/** A started kernel in which `A01` has opened `D1` at tick 0 with a window of 2. */
async function opened(holders: string[] = HOLDERS, ticks?: number): Promise<TestKernel> {
	const test = testKernel(game(holders, ticks));
	await test.call("A01", "decide", { window: 2 });
	return test;
}

const amend = (test: TestKernel, resident: string, exiled: unknown, reason = "because", decision = "D1"): Promise<ToolOutcome> => test.call(resident, "amendDecision", { decision, proposal: { exiled }, reason });

/** The payloads of one event type, in log order. */
const payloads = (test: TestKernel, type: string): unknown[] => test.kernel.log.all().filter((event) => event.type === type).map((event) => event.payload);

describe("amendDecision", () => {
	it("lets the amendment of a holder stand: the owner commits it and learns who and why", async () => {
		const test = await opened();
		expect(await amend(test, "A02", "A01", "wrong one")).toEqual({ ok: true, reply: 'amended decision D1; the proposal standing now: {"exiled":"A01"}' });
		expect(payloads(test, "decision_amended")).toEqual([{ decision: "D1", n: 1, by: "resident:A02", reason: "wrong one", proposal: { exiled: "A01" } }]);
		expect(test.kernel.snapshot().plugins.decisions?.data).toMatchObject({ open: { D1: { proposal: { exiled: "A03" }, amendments: [{ by: "resident:A02", n: 1, proposal: { exiled: "A01" }, reason: "wrong one" }] } } });
		await test.playTicks(idleDriver, 3);
		const settled = { decision: "D1", kind: "owner.verdict", owner: "owner", changed: true, by: "resident:A02", reason: "wrong one", proposal: { exiled: "A01" }, amendments: [{ by: "resident:A02", n: 1 }] };
		expect(told(test.kernel.log.all()).slice(-2)).toEqual([[2, "decision_settled", settled], [2, "committed", { proposal: { exiled: "A01" }, decision: "D1" }]]);
	});

	it("lets the last of two amendments stand, and says unchanged when it repeats the original", async () => {
		const test = await opened();
		expect((await amend(test, "A02", "A01", "first")).ok).toBe(true);
		expect((await amend(test, "A03", "A03", "second")).ok).toBe(true);
		await test.playTicks(idleDriver, 3);
		const amendments = [{ by: "resident:A02", n: 1 }, { by: "resident:A03", n: 2 }];
		expect(payloads(test, "decision_settled")).toEqual([{ decision: "D1", kind: "owner.verdict", owner: "owner", changed: false, by: "resident:A03", reason: "second", proposal: { exiled: "A03" }, amendments }]);
	});

	it("refuses a decision that is not open, a caller that is no holder and a proposal off the schema, and writes nothing", async () => {
		const test = await opened();
		expect(await amend(test, "A02", "A01", "x", "D9")).toEqual({ ok: false, code: "DECISION_CLOSED", detail: "this decision is not open (it settled already or never opened)" });
		expect(await amend(test, "A02", "A01", "x", "constructor")).toMatchObject({ ok: false, code: "DECISION_CLOSED" });
		expect(await amend(test, "A01", "A02")).toEqual({ ok: false, code: "DECISION_NOT_HELD", detail: "you do not hold the right to amend this decision" });
		expect(await amend(test, "A02", 3)).toEqual({ ok: false, code: "PROPOSAL_INVALID", detail: "/exiled must be string" });
		expect(await test.call("A02", "amendDecision", { decision: "D1", proposal: 3, reason: "x" })).toEqual({ ok: false, code: "PROPOSAL_INVALID", detail: "/ must be object" });
		expect(await test.call("A02", "amendDecision", { decision: 1, proposal: {} })).toEqual({ ok: false, code: "INVALID_ARGUMENTS" });
		expect(payloads(test, "tool_refused").at(-2)).toEqual({ as: "amendDecision", stage: "rule", code: "PROPOSAL_INVALID", detail: "/ must be object" });
		expect(payloads(test, "decision_amended")).toEqual([]);
		expect(test.kernel.snapshot().plugins.decisions?.data).toMatchObject({ open: { D1: { amendments: [] } } });
	});

	it("refuses an amendment after the deadline", async () => {
		const test = await opened();
		await test.playTicks(idleDriver, 3);
		expect(await amend(test, "A02", "A01")).toMatchObject({ ok: false, code: "DECISION_CLOSED" });
		expect(payloads(test, "decision_settled")).toMatchObject([{ changed: false, amendments: [] }]);
	});

	// The old `test/host/human.test.ts`, "decisions still open when the run ends": the original stands, the amendments are listed.
	it("keeps an amendment of a decision that outlasts the run, and settles the original proposal when the run ends", async () => {
		const test = await opened(HOLDERS, 2);
		expect(await amend(test, "A02", "A01")).toEqual({ ok: true, reply: "amended decision D1, but its deadline (tick 2) lies after the run's last tick (1): the decision stays open and is never settled" });
		expect((await test.playTicks(idleDriver, 5))?.reason).toBe("ticks");
		const settled = { decision: "D1", kind: "owner.verdict", owner: "owner", changed: false, proposal: { exiled: "A03" }, amendments: [{ by: "resident:A02", n: 1 }] };
		expect(told(test.kernel.log.all()).slice(-2)).toEqual([[2, "decision_settled", settled], [2, "committed", { proposal: { exiled: "A03" }, decision: "D1" }]]);
		expect(test.kernel.log.all().at(-1)?.type).toBe("run_ended");
		expect(test.kernel.snapshot().plugins.decisions?.data).toEqual({ next: 2, open: {} });
	});
});
