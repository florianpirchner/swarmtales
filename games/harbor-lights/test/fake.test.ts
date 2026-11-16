// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The fake run of Harbor Lights (`swt run --fake`, M4 specification 2.2 rule 2): the fake driver plays through the
 * `sample` of every resident tool, and the run ends without an `error` end with an accepted call of every tool that
 * the arm grants and a fake run reaches.
 */
import { fakeDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { harborLightsGame, type HarborLightsOptions } from "../game.ts";
import { accepted } from "./support.ts";

const TOWERS = ["viewTowers", "giveSignal", "playSlot", "discardSlot"];

describe("Harbor Lights, played by the fake driver", () => {
	it.each([
		["the default (crew)", {}, [...TOWERS, "postTeam", "readTeam", "readBrain", "writeBrain"]],
		["solo", { brain: "solo" }, [...TOWERS, "readBrain", "writeBrain"]],
		["nobrain", { brain: "nobrain" }, TOWERS],
	] as const)("%s: ends by the match limit with an accepted call of every granted tool", async (_name, options: HarborLightsOptions, tools) => {
		const game = harborLightsGame(options);
		const { end, events } = await play(game, { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end?.reason).not.toBe("error");
		expect(end).toMatchObject({ reason: "limit", limit: "harbor-lights.match" });
		const counts = accepted(events);
		expect(Object.keys(counts).sort()).toEqual([...tools].sort());
		expect(game.grants?.resident).toEqual(tools);
	});
});
