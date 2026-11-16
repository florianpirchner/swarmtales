// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the City for the facts table (issue M5-49): over the log of each Act II file played by the game
 * (the projection harness of `act2.ts`, A56), every metric its mechanics export equals the number read by hand from
 * the file, and none is "absent": the Act II files are the scripted runs that reach every part of the game they load.
 * The Confessor is off in these files (and the oracle harness does not drive it in the one it labels); its labels have
 * no metric absent on the fake run (`fake.test.ts`) and are counted against the old events in
 * `mechanics/city-directors/test/confessor.test.ts`. The facts table of `swt report` is `report.test.ts`'s.
 */
import { join } from "node:path";
import type { Envelope } from "@swarmtales/contracts";
import type { Game } from "@swarmtales/sdk";
import { answeringReview, metricsOf, playStanding, readOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { ACT2, actTwoDrivers } from "./act2.ts";
import { gameOf, ORACLES } from "./support.ts";

// The metrics of every mechanic the game loads, by `<mechanic id>.<metric id>`, as the facts table has them.
const metricFacts = (game: Game, events: readonly Envelope[]): Readonly<Record<string, number | "absent">> =>
	Object.fromEntries(game.mechanics.flatMap(({ mechanic }) => Object.entries(metricsOf(game, mechanic.id, events)).map(([id, value]) => [`${mechanic.id}.${id}`, value])));

// The judge of the files, as in `act2.test.ts`.
const review = answeringReview({ judge: (question) => ({ deniesReceipt: JSON.stringify(question).includes("never sent me anything") }) });

/**
 * Read by hand in each file, from the act's start: three `tribunal_result` and the `tribunal_vote` events, of three
 * `tribunal_scheduled` one `by: "gamemaker"`; three `exiled` and one `ransomed`; the `seal_won` and `seal_used`; two
 * `blame`, one upheld; no `gamemaker_note`. The file has no `level_up` in the act: the 42 doors are the harness's
 * levels 1 to 7 of six residents.
 */
const HAND = {
	"cityofkeys-act2-s7.json": { votes: 11, won: 0, used: 0 },
	"cityofkeys-act2-seal-s7.json": { votes: 7, won: 1, used: 1 },
} as const;

describe("the metrics of the city", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file, none absent", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = gameOf(oracle, ACT2);
		const { events } = await playStanding(game, actTwoDrivers(oracle), { seed: oracle.seed, review });
		expect(metricFacts(game, events)).toEqual({
			"channels.directorNotes": 0,
			"receipts.blames": 2,
			"receipts.blamesUpheld": 1,
			"progression.doorsPassed": 42,
			"progression.doorsPerResident": 7,
			"exile.exiles": 3,
			"exile.ransoms": 1,
			"tribunal.tribunals": 3,
			"tribunal.votes": hand.votes,
			"tribunal.gamemakerTribunals": 1,
			"seal.sealsWon": hand.won,
			"seal.sealsUsed": hand.used,
		});
	}, 120_000);
});
