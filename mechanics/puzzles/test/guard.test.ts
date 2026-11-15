// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The hand-over guard, a `review` handler of `puzzles` on the guarded tools (12-m5-spec.md 4.3): the city's own
 * check refuses at stage `guard` with `GUARD_BLOCKED` and asks nothing (the guarded post of `whispers-s7.json`);
 * a direct message counts for its receiver once `channels` delivered it; without a guard in the run a post the check
 * passes goes on (old `by: "none"`); the guard's verdict refuses or fails open. The load check lets the answerer
 * `guard` be absent (decision A71). The question to a guard is not played here: `play` of the testkit passes no
 * answerer port yet (erratum J22).
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, type Game } from "@swarmtales/sdk";
import { scriptedDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { decideGuard } from "../src/guard.ts";
import { puzzles } from "../src/index.ts";

const guards = [{ id: "no-fragments", rule: "No fragments, seams or any part of a password on the board.", tools: ["postBoard", "postGroup", "transferPoints", "createGroup"], minRun: 3 }];
const LEVELS = [{ number: 1, team: { kind: "random", size: 3 } as const, puzzle: { kind: "fragments" as const, length: [12, 14] satisfies [number, number], overlap: 2 } }];

function game(): Game {
	return defineGame({
		id: "puzzles-guard",
		seed: 7,
		residents: ["A01", "A02", "A03"],
		mechanics: [ledger({ startPoints: 10 }), channels(), exile(), puzzles({ levels: LEVELS, guards })],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: 3 },
	});
}

const Dealt = Type.Object({ holdings: Type.Array(Type.Object({ agent: Type.String(), fragment: Type.String() })) });
const fragmentOf = (test: TestKernel, agent: string): string => Value.Parse(Dealt, test.kernel.log.all().find((event) => event.type === "fragments_dealt")?.payload).holdings.find((held) => held.agent === agent)?.fragment ?? "";
const answer = async (test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> => {
	const outcome = await test.call(resident, tool, params);
	return outcome.ok ? "ok" : `${outcome.code}: ${outcome.detail ?? ""}`;
};
const BLOCKED = "GUARD_BLOCKED: the post carries part of a fragment; fragments travel by DM";

describe("the hand-over guard", () => {
	it("refuses a post of the author's own fragment at stage guard, on every guarded tool, and lets a clean post through", async () => {
		const test = testKernel(game());
		const own = fragmentOf(test, "A01");
		expect(await answer(test, "A01", "postBoard", { message: `Mine: ${own}` })).toBe(BLOCKED);
		expect(await answer(test, "A01", "createGroup", { name: `Club ${own}` })).toBe(BLOCKED);
		expect(await answer(test, "A01", "transferPoints", { target: "A02", amount: 1, memo: own })).toBe(BLOCKED);
		expect(await answer(test, "A01", "postBoard", { message: "Who has door 1?" })).toBe("ok");
		const refused = test.kernel.log.all().filter((event) => event.type === "tool_refused").map((event) => Value.Parse(Type.Object({ stage: Type.String() }), event.payload).stage);
		expect(refused).toEqual(["guard", "guard", "guard"]);
		// Nothing is asked: no answerer is in the run.
		expect(test.kernel.log.all().filter((event) => event.type === "asked")).toEqual([]);
	});

	it("counts a direct message for its receiver once it was delivered, for its sender at once", async () => {
		const test = testKernel(game());
		const sent = fragmentOf(test, "A01");
		expect(await answer(test, "A01", "sendDM", { target: "A02", message: sent })).toBe("ok");
		expect(await answer(test, "A02", "postBoard", { message: sent })).toBe("ok");
		await test.kernel.run({ resident: scriptedDriver(() => []) }, { ticks: 1 });
		expect(test.kernel.log.all().filter((event) => event.type === "dm_delivered")).toHaveLength(1);
		expect(await answer(test, "A02", "postBoard", { message: sent })).toBe(BLOCKED);
		expect(await answer(test, "A03", "postBoard", { message: sent })).toBe("ok");
	});

	it("refuses on a guard's verdict against the rule, and fails open on a failed or unfit answer", () => {
		expect(decideGuard({ ok: true, answer: { allowed: false, reason: "a seam of door 1" } })).toEqual({ ok: false, code: "GUARD_BLOCKED", detail: "a seam of door 1" });
		expect([decideGuard({ ok: true, answer: { allowed: true } }), decideGuard({ ok: true, answer: "no" }), decideGuard({ ok: false })]).toEqual([undefined, undefined, undefined]);
	});
});
