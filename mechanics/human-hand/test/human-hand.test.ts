// SPDX-License-Identifier: Apache-2.0
/**
 * The Human Hand's mechanic in a real kernel: the cases of the old `test/host/human.test.ts` that are about `pause`
 * and `resume` (specification of M3, section 6.4). Offline, no model.
 */
import { describe, expect, it } from "vitest";
import type { ActorId, Envelope, Kernel } from "@swarmtales/contracts";
import { defineGame } from "@swarmtales/sdk";
import { guessNumber, idleDriver, testKernel } from "@swarmtales/testkit";
import { humanHand } from "../src/index.ts";

/** The game; with `standIn` the two tools are granted to residents too. */
const game = (standIn = false) =>
	defineGame({ id: "human-hand-test", seed: 3, residents: 2, mechanics: [guessNumber({ max: 10 }), humanHand()], grants: standIn ? { resident: { add: ["pause", "resume"] } } : {}, end: { ticks: 3 } });

/**
 * Who plays the Human Hand. The sdk gives a game the actor `human` from issue M3-12 on; a mechanic test cannot
 * build a kernel definition by hand (no dependency on the kernel), so until then resident A02 stands in, with the
 * two tools granted to residents.
 */
const HUMAN: ActorId = testKernel(game()).kernel.openTools("human").includes("pause") ? "human" : "resident:A02";
const played = () => game(HUMAN !== "human");
const started = (): Kernel => testKernel(played()).kernel;
const hand = (kernel: Kernel, tool: string, params: unknown = {}) => kernel.submit({ actor: HUMAN, as: tool, params });
const own = (kernel: Kernel): Envelope[] => kernel.log.all().filter((event) => event.source.endsWith("/humanHand"));

/** One line of a scripted Human Hand: a call at the boundary after `at` finished ticks. */
interface Line {
	readonly at: number;
	readonly tool: string;
}

/** The run loop in small: lines at their boundary, no tick while paused, then one tick. Gives the ticks played. */
async function loop(kernel: Kernel, lines: readonly Line[], ticks: number): Promise<number> {
	const left = [...lines];
	for (let tick = 0; tick < ticks; tick++) {
		while (left[0]?.at === tick || (kernel.fact("humanHand.paused") === true && left.length > 0)) await hand(kernel, left.shift()?.tool ?? "");
		if (kernel.fact("humanHand.paused") === true) return tick;
		await kernel.run({ resident: idleDriver }, { ticks: 1 });
	}
	return ticks;
}

describe("humanHand", () => {
	it("logs pause then resume as calls of the Human Hand, with the events paused and resumed", async () => {
		const kernel = started();
		expect(kernel.fact("humanHand.paused")).toBe(false);
		expect(await hand(kernel, "pause", { reason: "look at the board" })).toEqual({ ok: true, reply: "the run halts at the next tick boundary" });
		expect(kernel.fact("humanHand.paused")).toBe(true);
		expect(await hand(kernel, "resume")).toEqual({ ok: true, reply: "the run goes on" });
		expect(kernel.fact("humanHand.paused")).toBe(false);
		expect(own(kernel).map((event) => [event.type, event.actor, event.payload])).toEqual([["paused", HUMAN, { reason: "look at the board" }], ["resumed", HUMAN, {}]]);
		const calls = kernel.log.all().filter((event) => event.type === "tool_called");
		expect(calls.map((event) => event.actor)).toEqual([HUMAN, HUMAN]);
		expect(calls.map((event) => event.payload)).toMatchObject([{ as: "pause" }, { as: "resume" }]);
	});

	it("refuses a second pause and a resume of a run that is not paused, and writes no event for them", async () => {
		const kernel = started();
		expect(await hand(kernel, "resume")).toMatchObject({ ok: false, code: "NOT_PAUSED" });
		await hand(kernel, "pause");
		expect(await hand(kernel, "pause", { reason: "again" })).toMatchObject({ ok: false, code: "ALREADY_PAUSED" });
		expect(own(kernel).map((event) => [event.type, event.payload])).toEqual([["paused", {}]]);
	});

	it("gives the tools to the grant human only: a resident cannot call pause", async () => {
		const test = testKernel(game());
		expect(await test.call("A01", "pause", {})).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(test.openTools("A01")).toEqual(["guess"]);
		expect(humanHand.head.tools.map((tool) => [tool.name, tool.for])).toEqual([["pause", ["human"]], ["resume", ["human"]]]);
	});

	it("plays no tick while paused, when the loop reads the fact", async () => {
		const kernel = started();
		expect(await loop(kernel, [{ at: 1, tool: "pause" }], 3)).toBe(1);
		expect(kernel.snapshot().tick).toBe(1);
		const [paused] = own(kernel);
		expect([paused?.type, paused?.tick]).toEqual(["paused", 1]);
	});

	it("gives the same log twice with a scripted Human Hand, and the pause moves no tick number", async () => {
		const lines: readonly Line[] = [{ at: 1, tool: "pause" }, { at: 1, tool: "resume" }, { at: 2, tool: "pause" }, { at: 9, tool: "resume" }];
		const [first, second, plain] = [started(), started(), started()];
		expect([await loop(first, lines, 3), await loop(second, lines, 3), await loop(plain, [], 3)]).toEqual([3, 3, 3]);
		expect(JSON.stringify(second.log.all())).toBe(JSON.stringify(first.log.all()));
		expect(own(first).map((event) => [event.type, event.tick])).toEqual([["paused", 1], ["resumed", 1], ["paused", 2], ["resumed", 2]]);
		expect(first.snapshot().tick).toBe(plain.snapshot().tick);
	});

	it("keeps the pause in its slice across a snapshot", async () => {
		const kernel = started();
		await hand(kernel, "pause");
		const snapshot = structuredClone(kernel.snapshot());
		expect(snapshot.plugins.humanHand).toMatchObject({ data: { paused: true } });
		const resumed = testKernel(played(), { resume: { snapshot, log: structuredClone([...kernel.log.all()]) } }).kernel;
		expect(resumed.fact("humanHand.paused")).toBe(true);
		expect(await hand(resumed, "pause")).toMatchObject({ ok: false, code: "ALREADY_PAUSED" });
	});

	// The other cases of the old file are not the mechanic's at M3.
	it.skip("instruct: targets, copies, standing orders, a resident's turn input (M5)", () => undefined);
	it.skip("step: one block per step; the inbox and its safe stops inside a tick; RUN_ENDED (M5)", () => undefined);
	it.skip("the human's amendment of a decision wins (issue M3-09, mechanic decisions)", () => undefined);
});
