// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game's part of the old `test/stories/salt-market.test.ts`, played through the game file: a scripted match of
 * four rotated games with a brain per trader and a fresh context per game, and a match where nobody acts. The rules,
 * the refusals and the old scripted match on the mechanic's own table are in `mechanics/salt-market/test/`; the
 * assertions on the old `turn_started` read `activation_opened`, and the old end `referee` is the end `limit`.
 */
import { idleDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { field, ofType, rosterGame, trader } from "./support.ts";

describe("salt-market, scripted match through the game file", () => {
	it("plays four rotated games with trades, kept and broken promises, a reference and a brain per trader", async () => {
		const run = await play(rosterGame(), { drivers: { resident: trader } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "salt-market.match" });
		expect(ofType(run.events, "market_game_ended")).toHaveLength(4);
		expect(ofType(run.events, "market_trade").length).toBeGreaterThan(8);
		const settled = ofType(run.events, "market_promise_settled").filter((event) => field(event, "game") === 1);
		expect(settled.filter((event) => field(event, "from") === "A04").map((event) => field(event, "status"))).toEqual(["broken"]);
		expect(ofType(run.events, "market_spoiled")).toHaveLength(4 * 5);
		// One brain before game 1 and after games 1 to 3, per trader.
		expect(ofType(run.events, "brain_written")).toHaveLength(16);
		expect(ofType(run.events, "market_match_ended").map((event) => field(event, "scores"))).toEqual([run.kernel.fact("salt-market.scores")]);
		const resets = ofType(run.events, "activation_opened").flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => input.text) : [];
		});
		const second = resets.filter((text) => text.startsWith("Game 2 begins"));
		expect(second).toHaveLength(4);
		expect(second[0]).toContain("broken promises: A04 to A01");
		expect(second[0]).toContain("A01 wanted");
	});

	it("ends the match without trades when nobody acts", async () => {
		const run = await play(rosterGame({ brain: false }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "salt-market.match" });
		expect(ofType(run.events, "market_trade")).toEqual([]);
		expect(ofType(run.events, "brain_written")).toEqual([]);
		expect(ofType(run.events, "market_game_scored")).toHaveLength(4);
	});
});
