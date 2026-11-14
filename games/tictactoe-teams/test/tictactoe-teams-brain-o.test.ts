// SPDX-License-Identifier: Apache-2.0
/**
 * The asymmetric arm: only team O keeps a strategy brain (option `brainTeams`), offline and scripted. Carried from
 * `test/stories/tictactoe-teams-brain-o.test.ts`.
 */
import { checkDeterminism, checkSnapshotRoundTrip, play, testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { briefing, field, goldenGame, ofType, resets, ticTacToePlayer } from "./support.ts";

const game = () => goldenGame({ brainTeams: ["O"] });
const drivers = () => ({ drivers: { resident: ticTacToePlayer() } });

describe("tictactoe-teams with a brain for team O only", () => {
	it("lets only O write brains, with no retro window for X", async () => {
		const run = await play(game(), drivers());
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		const written = ofType(run.events, "brain_written");
		expect(written.map((event) => field(event, "team"))).toEqual(["O", "O", "O"]);
		expect(ofType(run.events, "retro_started").map((event) => field(event, "team"))).toEqual(["O", "O", "O"]);
		expect(ofType(run.events, "retro_closed")).toHaveLength(3);
		const third = ofType(run.events, "activation_opened").filter((event) => JSON.stringify(field(event, "inputs") ?? "").includes("Game 3 begins"));
		expect(third.length).toBeGreaterThan(0);
	});

	it("answers BRAIN_DISABLED to X's readBrain, refuses its writeBrain, and keeps O's brain", async () => {
		const test = testKernel(game());
		expect(await test.call("A01", "readBrain", {})).toMatchObject({ ok: false, code: "BRAIN_DISABLED" });
		expect(await test.call("A01", "writeBrain", { text: "x" })).toMatchObject({ ok: false });
		expect(test.openTools("A01")).not.toContain("writeBrain");
		expect(test.openTools("A04")).toContain("writeBrain");
		expect(await test.call("A04", "writeBrain", { text: "o rules" })).toMatchObject({ ok: true });
		expect(await test.call("A05", "readBrain", {})).toMatchObject({ ok: true });
	});

	it("tells X the result-only briefing and O its brain", async () => {
		const run = await play(game(), drivers());
		const third = resets(run.events).filter((reset) => reset.text.startsWith("Game 3 begins"));
		expect(third.some((reset) => reset.resident === "A01")).toBe(true);
		for (const reset of third) {
			if (["A01", "A02", "A03"].includes(reset.resident)) expect(reset.text).not.toContain("version");
			else expect(reset.text).toContain("version 3");
		}
	});

	it("is deterministic and survives a snapshot round trip", async () => {
		expect(await checkDeterminism(game(), ticTacToePlayer)).toEqual([]);
		// The old cut after 9 ticks came after the end of the run (8 ticks) and resumed nothing; 7 is the last tick that is resumed.
		for (const cut of [1, 4, 7]) expect(await checkSnapshotRoundTrip(game(), ticTacToePlayer, cut)).toEqual([]);
	});

	it("promises a brain only to the team that has one, and leaves the default 3x3 text unchanged", () => {
		expect(briefing({ brainTeams: ["O"] }, "A01")).not.toContain("strategy brain");
		expect(briefing({ brainTeams: ["O"] }, "A04")).toContain("strategy brain");
		expect(briefing({}, "A01")).toBe(briefing({ brainTeams: ["X", "O"] }, "A01"));
		expect(briefing({}, "A01")).toContain("strategy brain");
		expect(briefing({ brain: false }, "A04")).not.toContain("strategy brain");
	});
});
