/**
 * The tool lists at the gate and in phases (round 3, must-fix 2; R2-D13). The real exile, puzzles
 * and progression run on one host (ledger, channels, receipts, marks and the standoff are
 * stand-ins). A resident at the gate may no longer submit a code (old `enabledTools`,
 * world.ts:1446-1448): the old tool answered `TOOL_LOCKED` (`LOCKED_REPLY`) and `getStatus` and
 * `activeTools` did not list `submitSolution`. A03 is at the gate until minute 41 and submits a
 * correct code at minute 38: no `level_up`.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { LOCKED_REPLY } from "@swarmtales/engine";
import type { Host } from "@swarmtales/contracts";
import { exile } from "@swarmtales/mechanic-exile";
import { progression } from "@swarmtales/mechanic-progression";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { ExileApi, PuzzlesApi, StandoffApi } from "@swarmtales/mechanic-shared";
import { idleAgent } from "@swarmtales/testkit";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { probe, runProbe, SUPPORT_PROMPTS } from "../exile/support/host.ts";
import { provider } from "../exile/support/provider.ts";
import { progressionOptions, RESIDENTS, storyOf } from "../progression/harness.ts";
import { channelsStandIn, ledgerStandIn, marksStandIn, receiptsStandIn } from "../progression/standins.ts";
import { puzzleOptions } from "../puzzles/harness.ts";

const SPEC = (() => {
	const found = storyOf("cityofkeys-f4g4").tribunal;
	if (found === undefined) throw new Error("cityofkeys has no tribunal");
	// The city never calls on its own here: the test opens the gate itself.
	return { ...found, first: { ...found.first, latestAfter: 1000 } };
})();

const STORY = storyOf("cityofkeys-f4g4");
const TOOLS = ["getStatus", "activeTools", "getProblem", "submitSolution", "listAgents"] as const;

/** A script tool that tells the correct code of a resident (the host has no other way to ask `PuzzlesApi.solutionOf`). */
const solutions = defineMechanic(
	{ id: "solutions", summary: "Probe: the correct code.", options: Type.Object({}), state: (): undefined => undefined, events: {}, requires: [PuzzlesApi], prompts: { "gamemaker/tools/notify": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "probeSolution",
				description: "gamemaker/tools/notify",
				parameters: Type.Object({ resident: Type.String(), level: Type.Integer() }),
				suggest: ["script"],
				execute: (params, ctx) => reply(ctx.call(PuzzlesApi, "solutionOf", params) ?? ""),
			}),
		],
	}),
);

function city(): Host {
	const story = defineCoreStory({
		id: "t3-gate",
		seed: 7,
		minutes: 60,
		residents: [...RESIDENTS],
		mechanics: [
			probe.with(),
			solutions.with(),
			ledgerStandIn().with(),
			channelsStandIn([]).with(),
			receiptsStandIn([]).with(),
			marksStandIn(STORY).with(),
			provider("standoff", StandoffApi, { keep: () => null, noteGiven: () => null }).with(),
			puzzles.with(puzzleOptions(STORY)),
			progression.with(progressionOptions(STORY)),
			exile.with(),
			tribunal.with(SPEC),
		],
		grants: { resident: TOOLS, script: ["probe", "probeSolution"] },
	});
	const host = createHost({ story, prompts: createPromptLookup({ mechanics: { ...mechanicPromptFolders(), probe: SUPPORT_PROMPTS } }) });
	host.start();
	return host;
}

async function playTo(host: Host, minute: number): Promise<void> {
	while (host.minute < minute) await host.playMinute(idleAgent);
}

async function codeOf(host: Host, resident: string, level: number): Promise<string> {
	const outcome = await host.call("script", "probeSolution", { resident, level });
	if (!outcome.ok || outcome.reply === "") throw new Error(`${resident} has no code on level ${String(level)}`);
	return outcome.reply;
}

function replyOf(outcome: Awaited<ReturnType<Host["call"]>>): string {
	return outcome.ok ? outcome.reply : outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

describe("a resident at the gate", () => {
	it("cannot submit: TOOL_LOCKED as the old tool, no level_up, and the lists do not offer it", async () => {
		const host = city();
		await playTo(host, 38);
		await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "toGate", { resident: "A03", until: 41, ransomable: true, voters: ["A01", "A02"], price: 1, selfPrice: 1 }));
		const before = host.log.ofType("progression", "level_up").length;

		const locked = await host.call("resident:A03", "submitSolution", { level: 1, code: await codeOf(host, "A03", 1) });
		expect(locked.ok).toBe(false);
		expect(replyOf(locked)).toBe(LOCKED_REPLY);
		expect(host.log.ofType("progression", "level_up")).toHaveLength(before);

		const status = replyOf(await host.call("resident:A03", "getStatus", {}));
		expect(status).toMatch(/^unlocked tools: .*getProblem/m);
		expect(status).not.toMatch(/^unlocked tools: .*submitSolution/m);
		expect(replyOf(await host.call("resident:A03", "activeTools", {}))).not.toContain("submitSolution");

		// A resident in the city submits as before.
		const free = await host.call("resident:A04", "submitSolution", { level: 1, code: await codeOf(host, "A04", 1) });
		expect(free.ok).toBe(true);
		expect(host.log.ofType("progression", "level_up")).toHaveLength(before + 1);
		expect(replyOf(await host.call("resident:A04", "activeTools", {}))).toContain("submitSolution");
	});
});
