// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of Whispers for the facts table (issue M5-49): over the log of each oracle file played by the game,
 * every metric its mechanics export equals the number read by hand from the file, and the holdout file, the scripted
 * run that reaches every part of the game it loads, has no metric "absent". The facts table of `swt report` is
 * `report.test.ts`'s.
 */
import { join } from "node:path";
import type { Envelope } from "@swarmtales/contracts";
import type { Game } from "@swarmtales/sdk";
import { metricsOf, playOracle, readOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { gameOf, ORACLES } from "./support.ts";

// The metrics of every mechanic the game loads, by `<mechanic id>.<metric id>`, as the facts table has them.
const metricFacts = (game: Game, events: readonly Envelope[]): Readonly<Record<string, number | "absent">> =>
	Object.fromEntries(game.mechanics.flatMap(({ mechanic }) => Object.entries(metricsOf(game, mechanic.id, events)).map(([id, value]) => [`${mechanic.id}.${id}`, value])));

/**
 * Read by hand in each file: the `level_up` events (over the six residents of `act_started`); `exiled` and `ransomed`
 * (the exile writes no event in the other files: absent); `holdout_called` and `holdout_ballot` (beside the
 * `blocker_found` events); the sum of `dms` over the `whisper_duty` notices, `receipt_forged` and `popularity_ballot`;
 * no `blame` beside the `receipt_issued` events; and the `gamemaker_note` events.
 */
const HAND = {
	"whispers-holdout-s7.json": { doors: 27, exiles: 1, holdouts: 1, holdoutVotes: 15, dms: 1, forgeries: 0, ballots: 24, notes: 3 },
	"whispers-s7.json": { doors: 20, exiles: "absent", holdouts: 0, holdoutVotes: 0, dms: 4, forgeries: 1, ballots: 18, notes: 1 },
	"whispers-s11.json": { doors: 20, exiles: "absent", holdouts: 0, holdoutVotes: 0, dms: 4, forgeries: 1, ballots: 18, notes: 1 },
	"whispers-rumours-s7.json": { doors: 20, exiles: "absent", holdouts: 0, holdoutVotes: 0, dms: 4, forgeries: 0, ballots: 18, notes: 1 },
} as const;

describe("the metrics of whispers over its oracle files", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = gameOf(oracle);
		const { events } = await playOracle(oracle, game);
		const ransoms = hand.exiles === "absent" ? "absent" : 0;
		expect(metricFacts(game, events)).toEqual({
			"channels.directorNotes": hand.notes,
			"receipts.blames": 0,
			"receipts.blamesUpheld": 0,
			"whispers.whisperDms": hand.dms,
			"whispers.forgeries": hand.forgeries,
			"whispers.popularityBallots": hand.ballots,
			"progression.doorsPassed": hand.doors,
			"progression.doorsPerResident": hand.doors / 6,
			"exile.exiles": hand.exiles,
			"exile.ransoms": ransoms,
			"standoff-tribunal.holdouts": hand.holdouts,
			"standoff-tribunal.votes": hand.holdoutVotes,
		});
	}, 120_000);

	it("the holdout file, the scripted run, has no metric absent: its row above holds none", () => {
		expect(Object.values(HAND["whispers-holdout-s7.json"])).not.toContain("absent");
	});
});
