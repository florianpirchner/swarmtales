// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `morris-referee` over the new log of an oracle replay (M4 specification, issue 67): each equals the
 * number computed by hand from the same oracle file, and a metric without its events is absent, never 0. That the
 * replay is the run of the file is `oracle.test.ts` (level 3).
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { morrisGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "morris-teams");

interface Hand {
	readonly scored: number;
	readonly blunders: number;
	readonly x: number;
	readonly missed: number;
}

/**
 * Read by hand in each oracle file: the `morris-referee.move_scored` entries, those with `class` blunder, those of
 * them with `side` X, and those with `class` missed_win. In the second s33 file one of the 65 turns of the games had
 * no alternative and is not scored; in the silent file O's blunder is a move of the move timer.
 */
const HAND: Readonly<Record<string, Hand>> = {
	"morris-teams-nobrain-solo-s13.json": { scored: 49, blunders: 1, x: 1, missed: 2 },
	"morris-teams-nobrain-solo-vs-engine3-s31.json": { scored: 73, blunders: 1, x: 1, missed: 0 },
	"morris-teams-nobrain-solo-vs-engine3-s33.json": { scored: 64, blunders: 1, x: 1, missed: 0 },
	"morris-teams-s13-silent.json": { scored: 6, blunders: 1, x: 0, missed: 0 },
	"morris-teams-solo-vs-engine3-s33.json": { scored: 105, blunders: 1, x: 1, missed: 0 },
};

// The payloads of the file's `move_scored` events, in file order.
const scoredOf = (oracle: Oracle): readonly object[] =>
	oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "morris-referee" && entry.type === "move_scored" && typeof entry.payload === "object" && entry.payload !== null ? [entry.payload] : []));

// The same counts, read from the file's timeline.
function counted(oracle: Oracle): Hand {
	const scored = scoredOf(oracle);
	const where = (side: unknown, kind: string): number => scored.filter((one) => (side === undefined || Reflect.get(one, "side") === side) && Reflect.get(one, "class") === kind).length;
	return { scored: scored.length, blunders: where(undefined, "blunder"), x: where("X", "blunder"), missed: where(undefined, "missed_win") };
}

describe("the metrics of morris-referee over an oracle replay", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = morrisGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		const { events } = await playOracle(oracle, game);
		expect(counted(oracle)).toEqual(hand);
		expect(metricsOf(game, "morris-referee", events)).toEqual({ blunders: hand.blunders, blunderRate: (100 * hand.blunders) / hand.scored, xBlunders: hand.x, missedWins: hand.missed });
	});

	it("reads absent, not 0, for every metric of a run without its events", async () => {
		const oracle = readOracle(join(ORACLES, "morris-teams-solo-vs-engine3-s33.json"));
		const game = morrisGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		// The same run stopped before its first tick: no turn was scored.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "morris-referee", events)).toEqual({ blunders: "absent", blunderRate: "absent", xBlunders: "absent", missedWins: "absent" });
	});
});
