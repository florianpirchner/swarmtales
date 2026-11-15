// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `morris` over the new log of an oracle replay (M4 specification, issue 52): each equals the number
 * computed by hand from the same oracle file, and a metric without its events is absent, never 0. That the replay is
 * the run of the file is `oracle.test.ts` (level 3).
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { morrisGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "morris-teams");

interface Hand {
	readonly games: number;
	readonly x: number;
	readonly draws: number;
	readonly blocked: number;
	readonly turns: number;
	readonly forfeits: number;
	readonly moves: number;
}

/**
 * Read by hand in each oracle file: the `morris.game_ended` entries, those with `result` X or draw and with `reason`
 * blocked, the sum of their `turns`; the `morris.move_played` entries and those with `forfeit`. The first file is cut
 * after game 1; the silent file ends as invalid before any game ends, after six moves of the move timer.
 */
const HAND: Readonly<Record<string, Hand>> = {
	"morris-teams-nobrain-solo-s13.json": { games: 1, x: 1, draws: 0, blocked: 0, turns: 49, forfeits: 0, moves: 62 },
	"morris-teams-nobrain-solo-vs-engine3-s31.json": { games: 3, x: 0, draws: 0, blocked: 2, turns: 73, forfeits: 0, moves: 81 },
	"morris-teams-nobrain-solo-vs-engine3-s33.json": { games: 3, x: 0, draws: 1, blocked: 2, turns: 65, forfeits: 0, moves: 69 },
	"morris-teams-s13-silent.json": { games: 0, x: 0, draws: 0, blocked: 0, turns: 0, forfeits: 6, moves: 6 },
	"morris-teams-solo-vs-engine3-s33.json": { games: 3, x: 0, draws: 0, blocked: 1, turns: 105, forfeits: 0, moves: 123 },
};

// The payloads of the file's `morris` events of one type, in file order.
const payloads = (oracle: Oracle, type: string): readonly object[] =>
	oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "morris" && entry.type === type && typeof entry.payload === "object" && entry.payload !== null ? [entry.payload] : []));
const get = (payload: object, key: string): unknown => Reflect.get(payload, key);

// The same counts, read from the file's timeline.
function counted(oracle: Oracle): Hand {
	const [ended, played] = [payloads(oracle, "game_ended"), payloads(oracle, "move_played")];
	const where = (items: readonly object[], key: string, value: unknown): number => items.filter((one) => get(one, key) === value).length;
	return {
		games: ended.length,
		x: where(ended, "result", "X"),
		draws: where(ended, "result", "draw"),
		blocked: where(ended, "reason", "blocked"),
		turns: ended.reduce((sum, one) => sum + Number(get(one, "turns")), 0),
		forfeits: where(played, "forfeit", true),
		moves: played.length,
	};
}

// The metrics the hand counts give: a share of no game is absent.
const expected = (hand: Hand): Readonly<Record<string, number | "absent">> => {
	const per = (count: number): number | "absent" => (hand.games === 0 ? "absent" : count / hand.games);
	return { games: hand.games === 0 ? "absent" : hand.games, xWinShare: per(hand.x), drawShare: per(hand.draws), blockedShare: per(hand.blocked), turns: per(hand.turns), forfeits: hand.moves === 0 ? "absent" : hand.forfeits };
};

describe("the metrics of morris over an oracle replay", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = morrisGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		const { events } = await playOracle(oracle, game);
		expect(counted(oracle)).toEqual(hand);
		expect(metricsOf(game, "morris", events)).toEqual(expected(hand));
	});

	it("reads absent, not 0, for every metric of a run without its events", async () => {
		const oracle = readOracle(join(ORACLES, "morris-teams-solo-vs-engine3-s33.json"));
		const game = morrisGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		// The same run stopped before its first tick: no move was played.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "morris", events)).toEqual({ games: "absent", xWinShare: "absent", drawShare: "absent", blockedShare: "absent", turns: "absent", forfeits: "absent" });
	});
});
