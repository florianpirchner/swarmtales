// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The exemption from the cap on direct messages (decision A75): a full window asks the service `cap-exemption` before
 * it refuses `DM_LIMIT`. Ported from the old `differential.test.ts` of `channels` ("the holdout's exemption from the
 * DM cap"), with a stand-in of the holdout tribunal that exempts A01's messages to A02.
 */
import { describe, expect, it } from "vitest";
import { CapExemptionService } from "@swarmtales/mechanic-contracts";
import { defineGame, defineHead, defineMechanic, type MechanicUse } from "@swarmtales/sdk";
import { checkSnapshotRoundTrip, scriptedDriver, testKernel, type PlannedCall, type TestKernel } from "@swarmtales/testkit";
import { channels } from "../src/index.ts";
import { payloads, say } from "./support.ts";

/** The accused A01 may always write to A02, who lacks its fragment; the tribunal proves its own answer. */
const holdout = defineMechanic(defineHead({ id: "holdout-standin", package: "@test/holdout", summary: "Test: a stand-in holdout tribunal.", provides: [CapExemptionService] }), {
	services: { "cap-exemption": { exempt: ({ from, to }) => from === "A01" && to === "A02" } },
});

function game(extra: readonly MechanicUse[]) {
	return defineGame({
		id: "channels-cap-exemption",
		seed: 7,
		residents: 4,
		mechanics: [channels({ dmLimit: { windowMinutes: 3, perWindow: 2 } }), ...extra],
		scheduler: { id: "turns", options: { order: "roster" } },
		end: { ticks: 6 },
	});
}

const dm = (target: string, message: string) => ({ target, message });

async function send(test: TestKernel, calls: readonly { target: string; message: string }[]): Promise<readonly string[]> {
	const replies: string[] = [];
	for (const params of calls) replies.push(await say(test, "A01", "sendDM", params));
	return replies;
}

describe("the exemption from the cap on direct messages", () => {
	it("lets an exempt message pass the full window, counts it, and refuses every other as before", async () => {
		const test = testKernel(game([holdout()]));
		expect(await send(test, [dm("A03", "one"), dm("A04", "two"), dm("A02", "past the cap, to A02"), dm("A03", "past the cap, to A03")])).toEqual([
			"sent · DM #1 to A03 · the city confirms delivery when it reaches them",
			"sent · DM #2 to A04 · the city confirms delivery when it reaches them",
			"sent · DM #3 to A02 · the city confirms delivery when it reaches them",
			"DM_LIMIT: 3 DMs sent since minute 0; you can send again from minute 3",
		]);
		expect(await say(test, "A02", "sendDM", dm("A01", "a"))).toContain("sent · DM #4");
		expect(await say(test, "A02", "sendDM", dm("A03", "b"))).toContain("sent · DM #5");
		// Only A01 to A02 is exempt: A02's own full window refuses its message to A01.
		expect(await say(test, "A02", "sendDM", dm("A04", "c"))).toBe("DM_LIMIT: 2 DMs sent since minute 0; you can send again from minute 3");
		await test.playTicks(scriptedDriver(() => []), 1);
		expect(await send(test, [dm("A03", "minute 1"), dm("A02", "again, to A02"), dm("A04", "still capped")])).toEqual([
			"DM_LIMIT: 3 DMs sent since minute 0; you can send again from minute 3",
			"sent · DM #6 to A02 · the city confirms delivery when it reaches them",
			"DM_LIMIT: 4 DMs sent since minute 0; you can send again from minute 3",
		]);
		expect(payloads(test.kernel.log.all(), "dm_sent").filter((sent) => JSON.stringify(sent).includes('"from":"A01","to":"A02"'))).toHaveLength(2);
	});

	it("changes nothing while no mechanic provides cap-exemption", async () => {
		const test = testKernel(game([]));
		expect(await send(test, [dm("A03", "one"), dm("A04", "two"), dm("A02", "past the cap, to A02")])).toEqual([
			"sent · DM #1 to A03 · the city confirms delivery when it reaches them",
			"sent · DM #2 to A04 · the city confirms delivery when it reaches them",
			"DM_LIMIT: 2 DMs sent since minute 0; you can send again from minute 3",
		]);
	});

	it("plays on equal from a run cut at any tick, with the exemption", async () => {
		const plan = (turn: { tick: number; actor: string }): readonly PlannedCall[] =>
			turn.actor === "resident:A01" ? ["A03", "A04", "A02", "A03"].map((target) => ({ tool: "sendDM", params: dm(target, `tick ${String(turn.tick)}`) })) : [];
		for (const cut of [1, 2, 4]) expect(await checkSnapshotRoundTrip(game([holdout()]), () => scriptedDriver(plan), cut)).toEqual([]);
	});
});
