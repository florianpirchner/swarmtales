// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `convoy` over the new log of an oracle replay (M4 specification, issue 52): each equals the number
 * computed by hand from the same oracle file, and a metric without its events is absent, never 0. That the replay is
 * the run of the file is `oracle.test.ts` (level 3).
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { convoyGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "convoy");

/** A count over its whole, as read in the file. */
type Part = readonly [part: number, whole: number];
interface Hand {
	readonly saboteurWins: Part;
	readonly damaged: Part;
	readonly damage: Part;
	readonly hits: Part;
	readonly votes: Part;
	readonly down: Part;
}

/**
 * Read by hand in each oracle file (every file holds one game; three are cut after it): the `convoy_game_ended` entry
 * (`winner`, `damaged`); over the seat lines of `convoy_game_scored`, the saboteurs' `damage` over their `chances`, the
 * loyal `hits` over four loyal seats times two saboteurs, the loyal `rightVotes` over their `votes`; the
 * `convoy_votes_revealed` entries without `confidence`. In the silent file the deadline casts every vote and card.
 */
const HAND: Readonly<Record<string, Hand>> = {
	"convoy-g1-s13-silent.json": { saboteurWins: [0, 1], damaged: [0, 1], damage: [0, 0], hits: [0, 8], votes: [0, 0], down: [0, 8] },
	"convoy-nobrain-s104.json": { saboteurWins: [0, 1], damaged: [1, 1], damage: [2, 2], hits: [8, 8], votes: [28, 32], down: [0, 8] },
	"convoy-s101.json": { saboteurWins: [1, 1], damaged: [3, 1], damage: [3, 3], hits: [4, 8], votes: [15, 32], down: [2, 8] },
	"convoy-s104.json": { saboteurWins: [0, 1], damaged: [1, 1], damage: [2, 2], hits: [8, 8], votes: [27, 32], down: [0, 8] },
};

// The payloads of the file's events of one type, in file order.
const payloads = (oracle: Oracle, type: string): readonly object[] => oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.type === type && typeof entry.payload === "object" && entry.payload !== null ? [entry.payload] : []));
const get = (payload: unknown, key: string): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined);
const total = (items: readonly unknown[], key: string): number => items.reduce<number>((sum, one) => sum + Number(get(one, key)), 0);

// The same counts, read from the file's timeline.
function counted(oracle: Oracle): Hand {
	const ended = payloads(oracle, "convoy_game_ended");
	const seats = payloads(oracle, "convoy_game_scored").flatMap((one) => Object.entries(get(one, "seats") ?? {}).map(([, seat]): unknown => seat));
	const [loyal, saboteurs] = [seats.filter((seat) => get(seat, "role") === "loyal"), seats.filter((seat) => get(seat, "role") === "saboteur")];
	const revealed = payloads(oracle, "convoy_votes_revealed");
	return {
		saboteurWins: [ended.filter((one) => get(one, "winner") === "saboteurs").length, ended.length],
		damaged: [total(ended, "damaged"), ended.length],
		damage: [total(saboteurs, "damage"), total(saboteurs, "chances")],
		hits: [total(loyal, "hits"), loyal.length * saboteurs.length],
		votes: [total(loyal, "rightVotes"), total(loyal, "votes")],
		down: [revealed.filter((one) => get(one, "confidence") === false).length, revealed.length],
	};
}

const ratio = ([part, whole]: Part): number | "absent" => (whole === 0 ? "absent" : part / whole);

describe("the metrics of convoy over an oracle replay", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = convoyGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		const { events } = await playOracle(oracle, game);
		expect(counted(oracle)).toEqual(hand);
		expect(metricsOf(game, "convoy", events)).toEqual({
			saboteurWins: ratio(hand.saboteurWins),
			damaged: ratio(hand.damaged),
			damagePerChance: ratio(hand.damage),
			loyalHits: ratio(hand.hits),
			rightVotes: ratio(hand.votes),
			crewsDown: hand.down[1] === 0 ? "absent" : hand.down[0],
		});
	});

	it("reads absent, not 0, for every metric of a run without its events", async () => {
		const oracle = readOracle(join(ORACLES, "convoy-s101.json"));
		const game = convoyGame({ seed: oracle.seed });
		// The same run stopped before its first tick: no stage was played.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "convoy", events)).toEqual({ saboteurWins: "absent", damaged: "absent", damagePerChance: "absent", loyalHits: "absent", rightVotes: "absent", crewsDown: "absent" });
	});
});
