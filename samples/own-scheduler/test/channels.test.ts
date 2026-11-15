// SPDX-License-Identifier: LicenseRef-SUL-1.0
// Test 10 of section 3.7 of the M4 specification: the limit of `channels` under `parallel`. Its board's "seen" mark
// is taken when a resident's inputs are built and assumes that no other activation is open until that resident's
// activation ends. Under `parallel` that is not so, and the mark goes wrong; `docs/SCHEDULERS.md` names this test.
import type { ActorDriver, Envelope } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { channels } from "@swarmtales/mechanic-channels";
import { defineGame } from "@swarmtales/sdk";
import { idleDriver, testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { parallel } from "../src/index.ts";

const schedulers = { turns, parallel };
const SCHEDULERS = { turns: { id: "turns", options: { activation: "onNews", order: "roster" } }, parallel: { id: "parallel", options: { activation: "onNews" } } };

// What A02 read in its first activation.
const read: unknown[] = [];

// A03 has asked a question on the board before the run. A01 answers it; A02 thinks a moment, then reads the board.
const A01: ActorDriver = async (activation) => {
	await activation.call("postBoard", { message: "answer" });
};
const A02: ActorDriver = async (activation) => {
	await new Promise((resolve) => {
		setTimeout(resolve, 5);
	});
	read.push(await activation.call("readBoard", {}));
};

// `tick resident` of every activation_opened.
const opened = (events: readonly Envelope[]): readonly string[] => events.filter((event) => event.type === "activation_opened").map((event) => `${String(event.tick)} ${event.actor.replace("resident:", "")}`);

async function played(scheduler: keyof typeof SCHEDULERS): Promise<{ readonly opened: readonly string[]; readonly read: unknown }> {
	read.length = 0;
	const game = defineGame({ id: "channels-race", seed: 7, residents: 3, mechanics: [channels()], scheduler: SCHEDULERS[scheduler], end: { ticks: 2 } });
	const test = testKernel(game, { schedulers });
	await test.call("A03", "postBoard", { message: "question" });
	await test.kernel.run({ "resident:A01": A01, "resident:A02": A02, "resident:A03": idleDriver }, { ticks: 2 });
	return { opened: opened(test.kernel.log.all()), read: read[0] };
}

describe("the limit of channels under parallel", () => {
	it("wakes A02 once more for a post it has read: the seen mark was taken while A01 was open", async () => {
		const straight = await played("turns");
		const raced = await played("parallel");
		// Both times A02 has read the answer in its activation of tick 0.
		expect([straight.read, raced.read]).toEqual([0, 1].map(() => ({ ok: true, reply: "#1 A03: question\n#2 A01: answer" })));
		expect(straight.opened).toEqual(["0 A01", "0 A02", "0 A03"]);
		// The wrong line is the last one: A02 has no news it has not read, but its mark is still at the question.
		expect(raced.opened).toEqual(["0 A01", "0 A02", "0 A03", "1 A02"]);
	});
});
