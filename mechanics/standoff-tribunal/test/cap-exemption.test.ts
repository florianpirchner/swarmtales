// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout's exemption from the cap on direct messages through the real `channels` (decision A75, old
 * `exemptFromCap` and the exemption case of the old `holdout.test.ts`): during its grace the accused may write past a
 * full window to the one who lacks its fragment, and nobody else past it to anybody.
 */
import { describe, expect, it } from "vitest";
import type { ActorDriver, Kernel } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { defineGame, type Game } from "@swarmtales/sdk";
import { checkResumeEveryBoundary, testKernel } from "@swarmtales/testkit";
import { standoffTribunal } from "../src/index.ts";
import { cityOf, type World } from "./support.ts";

const TEXTS = { rule: "The rule.", called: "The called.", drawnAccused: "The drawnAccused.", voteOpened: "The voteOpened.", accusedVote: "The accusedVote.", struck: "The struck.", struckNotice: "The struckNotice.", released: "The released.", dropped: "The dropped.", graceFailed: "The graceFailed.", voteFailed: "The voteFailed.", banished: "The banished.", lot: "The lot.", spared: "The spared." };
const OPTIONS = { stallMinutes: 1, graceMinutes: 2, voteMinutes: 2, maxVotes: 1, fallbackMinutes: 1, texts: TEXTS };

// Door 1: A01 passes it at once, sends its fragment to A03 at tick 0 and keeps it from A02.
const WORLD: World = {
	residents: ["A01", "A02", "A03"],
	ups: new Map([["A01", [[0, 2]]]]),
	fragments: new Map([[1, new Map([["A01", "AAAA"]])]]),
	dms: [{ tick: 0, from: "A01", to: "A03", text: "door 1: AAAA" }],
	opensAt: () => 0,
	lastLevel: 3,
};

function game(): Game {
	return defineGame({
		id: "holdout-cap",
		seed: 7,
		residents: [...WORLD.residents],
		mechanics: [...cityOf(WORLD), channels({ dmLimit: { windowMinutes: 8, perWindow: 1 } }), exile(), standoffTribunal(OPTIONS)],
		grants: { script: ["callTribunal"] },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: 4 },
	});
}

// Who writes to whom in which tick; the Director calls the tribunal on A01 at tick 1, after the turns.
const SENDS: Readonly<Record<number, readonly (readonly [string, string])[]>> = {
	0: [["A01", "A03"], ["A02", "A03"]],
	2: [["A01", "A02"], ["A01", "A03"], ["A02", "A01"]],
};

function driver(kernel: Kernel, replies: string[]): ActorDriver {
	return async (activation) => {
		if (activation.actor !== "resident:A03") return;
		for (const [from, target] of SENDS[activation.tick] ?? []) {
			const outcome = await kernel.submit({ actor: `resident:${from}`, as: "sendDM", params: { target, message: `${from} to ${target}` } });
			replies.push(`${String(activation.tick)} ${from}>${target} ${outcome.ok ? outcome.reply.slice(0, 12) : outcome.code}`);
		}
		if (activation.tick === 1) await kernel.submit({ actor: "script", as: "callTribunal", params: { accused: ["A01"], reason: "A01 holds door 1." } });
	};
}

describe("the accused's exemption from the cap on direct messages", () => {
	it("lets the accused write past its full window to the one who lacks its fragment during the grace, and nobody else", async () => {
		const { kernel } = testKernel(game());
		const replies: string[] = [];
		await kernel.run({ resident: driver(kernel, replies) }, { ticks: 3 });
		expect(replies).toEqual(["0 A01>A03 sent · DM #1", "0 A02>A03 sent · DM #2", "2 A01>A02 sent · DM #4", "2 A01>A03 DM_LIMIT", "2 A02>A01 DM_LIMIT"]);
	});

	it("resumes at every tick boundary through the exempt messages", async () => {
		expect(await checkResumeEveryBoundary(game(), (kernel) => ({ resident: driver(kernel, []) }))).toEqual([]);
	});
});
