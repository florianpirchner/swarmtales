/**
 * `ProgressionApi.hasSolved` (step 18, A1-6): true exactly for the levels a resident solved by a
 * correct submission, which is what the old `#reachablePoints` read (`solved.includes(level)`);
 * `hasPassed` also holds beyond a level and at a shut door.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { defineMechanic, reply } from "@swarmtales/kernel";
import { ProgressionApi } from "@swarmtales/mechanic-shared";
import { GOLDEN_NAMES, goldenLog, progressionHost, replay } from "./harness.ts";

const Pair = Type.Tuple([Type.Boolean(), Type.Boolean()]);

const probe = defineMechanic(
	{ id: "solvedprobe", summary: "Stand-in probe.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "gamemaker/tools/notify": [] }, requires: [ProgressionApi] },
	(kit) => ({
		tools: [
			kit.tool({
				name: "solvedAndPassed",
				description: "gamemaker/tools/notify",
				parameters: Type.Object({ resident: Type.String(), level: Type.Integer() }),
				suggest: ["script"],
				execute: (params, ctx) => reply(JSON.stringify([ctx.call(ProgressionApi, "hasSolved", params), ctx.call(ProgressionApi, "hasPassed", params)])),
			}),
		],
	}),
);

describe("ProgressionApi.hasSolved", () => {
	it.each(GOLDEN_NAMES)("is true for the levels the golden %s solved and false for the others", async (name) => {
		const host = progressionHost(name, [], [probe.with()], ["solvedAndPassed"]);
		await replay(host, name);
		const solved = new Set(goldenLog(name).flatMap((line) => (line.type === "submission" && line.outcome === "correct" ? [`${String(line.agent)}:${String(line.level)}`] : [])));
		expect(solved.size).toBeGreaterThan(0);
		for (const resident of host.residents) {
			for (let level = 1; level <= 12; level++) {
				const outcome = await host.call("script", "solvedAndPassed", { resident, level });
				if (!outcome.ok) throw new Error(outcome.code);
				const [wasSolved, wasPassed] = Parse(Pair, JSON.parse(outcome.reply));
				expect(wasSolved, `${resident} level ${String(level)}`).toBe(solved.has(`${resident}:${String(level)}`));
				// Solved implies passed; the golden has no pass without a solve.
				if (wasSolved) expect(wasPassed).toBe(true);
			}
		}
	}, 60_000);
});
