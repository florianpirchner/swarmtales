// SPDX-License-Identifier: Apache-2.0
/**
 * The fake run of Ember Tricks (`swt run --fake`, M4 specification 2.2 rule 2): the fake driver plays through the
 * `sample` of every resident tool, and the run ends without an `error` end with an accepted call of every tool that
 * the arm grants and a fake run reaches.
 */
import { fakeDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { emberTricksGame, type EmberTricksOptions } from "../game.ts";
import { accepted } from "./support.ts";

const TABLE = ["viewTable", "placeBid", "nameTrump", "playCard", "vetoLead"];

describe("Ember Tricks, played by the fake driver", () => {
	it.each([
		["the default (notes)", {}, [...TABLE, "readBrain", "writeBrain"]],
		["nobrain", { brain: false }, TABLE],
	] as const)("%s: ends by the match limit with an accepted call of every granted tool", async (_name, options: EmberTricksOptions, tools) => {
		const game = emberTricksGame(options);
		const { end, events } = await play(game, { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end?.reason).not.toBe("error");
		expect(end).toMatchObject({ reason: "limit", limit: "trick-play.match" });
		expect(Object.keys(accepted(events)).sort()).toEqual([...tools].sort());
		expect(game.grants?.resident).toEqual(tools);
	});
});
