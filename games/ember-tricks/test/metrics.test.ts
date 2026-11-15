// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `trick-play` over the new log of an oracle replay (M4 specification, issue 51): each equals the number
 * computed by hand from the same oracle file, and a metric without its events is absent, never 0.
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, timelineOf, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "ember-tricks");

/** A count over the bids of the scored rounds, as read in the file. */
type Part = readonly [part: number, bids: number];
interface Hand {
	readonly hits: Part;
	readonly zeroBids: Part;
	/** The tricks bid, summed. */
	readonly bid: number;
	/** The points of every seat-round, summed. */
	readonly points: number;
	readonly vetoes: number;
	/** The timer's actions over the bids, trumps and cards. */
	readonly forfeits: Part;
}

/**
 * Read by hand in each oracle file: every seat of every `round_scored` entry (its bid against its tricks, a bid of 0,
 * its points), the `lead_vetoed` entries, and the `bid_placed`, `trump_named` and `card_played` entries with
 * `forfeit`. The two four-game files are cut in game 1 after eight rounds; in the silent file the move timer acts for
 * every seat, and the run is ended as invalid after two rounds.
 */
const HAND: Readonly<Record<string, Hand>> = {
	"ember-tricks-calib-g4-s32.json": { hits: [16, 32], zeroBids: [14, 32], bid: 20, points: 59, vetoes: 2, forfeits: [0, 186] },
	"ember-tricks-g1-s31.json": { hits: [19, 32], zeroBids: [13, 32], bid: 22, points: 125, vetoes: 2, forfeits: [0, 186] },
	"ember-tricks-mcbid-g4-s32.json": { hits: [15, 32], zeroBids: [18, 32], bid: 16, points: 46, vetoes: 1, forfeits: [0, 185] },
	"ember-tricks-s13-silent.json": { hits: [3, 8], zeroBids: [2, 8], bid: 7, points: 0, vetoes: 0, forfeits: [24, 24] },
};

// The payloads of the file's events of the types, in file order.
const payloads = (oracle: Oracle, ...types: readonly string[]): readonly object[] => oracle.timeline.flatMap((entry) => (entry.k === "event" && types.includes(entry.type) && typeof entry.payload === "object" && entry.payload !== null ? [entry.payload] : []));
const get = (payload: unknown, key: string): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined);
const entriesOf = (value: unknown): readonly (readonly [string, unknown])[] => (typeof value === "object" && value !== null ? Object.entries(value) : []);

// The same counts, read from the file's timeline.
function counted(oracle: Oracle): Hand {
	const seats = payloads(oracle, "round_scored").flatMap((round) => entriesOf(get(round, "bids")).map(([seat, bid]) => ({ bid: Number(bid), took: Number(get(get(round, "tricks"), seat)), points: Number(get(get(round, "points"), seat)) })));
	const acted = payloads(oracle, "bid_placed", "trump_named", "card_played");
	return {
		hits: [seats.filter((seat) => seat.bid === seat.took).length, seats.length],
		zeroBids: [seats.filter((seat) => seat.bid === 0).length, seats.length],
		bid: seats.reduce((sum, seat) => sum + seat.bid, 0),
		points: seats.reduce((sum, seat) => sum + seat.points, 0),
		vetoes: payloads(oracle, "lead_vetoed").length,
		forfeits: [acted.filter((one) => get(one, "forfeit") === true).length, acted.length],
	};
}

describe("the metrics of trick-play over an oracle replay", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = arm(VARIANTS[oracle.variant]);
		const { events } = await playOracle(oracle, game);
		// The replay is the run of the file: its timeline is the file's (a cut file up to its cut).
		expect(timelineOf(events).slice(0, oracle.timeline.length)).toEqual(oracle.timeline);
		expect(counted(oracle)).toEqual(hand);
		const bids = hand.hits[1];
		expect(metricsOf(game, "trick-play", events)).toEqual({
			hits: hand.hits[0] / bids,
			zeroBids: hand.zeroBids[0] / bids,
			meanBid: hand.bid / bids,
			points: hand.points / bids,
			vetoes: hand.vetoes,
			forfeits: hand.forfeits[0],
		});
	});

	it("reads absent, not 0, for every metric of a run without its events", async () => {
		const oracle = readOracle(join(ORACLES, "ember-tricks-g1-s31.json"));
		const game = arm(VARIANTS[oracle.variant]);
		// The same run stopped before its first tick: no bid was placed, no round scored.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "trick-play", events)).toEqual({ hits: "absent", zeroBids: "absent", meanBid: "absent", points: "absent", vetoes: "absent", forfeits: "absent" });
	});
});
