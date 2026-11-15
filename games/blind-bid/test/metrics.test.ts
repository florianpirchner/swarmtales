// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of `sealed-auction` over the new log of an oracle replay (M4 specification, issue 50): each equals the
 * number computed by hand from the same oracle file, and a metric without its event is absent, never 0.
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, timelineOf, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { blindBidGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "blind-bid");

/** One number of the reference of each `game_scored` entry of a file, game by game. */
interface Hand {
	readonly shading: readonly number[];
	readonly truthfulness: readonly number[];
	readonly bidToEstimate: readonly number[];
	readonly cursed: readonly number[];
	readonly unspent: readonly number[];
	readonly missed: readonly number[];
}

/**
 * Read by hand in each oracle file: `firstPrice.shading`, `secondPrice.truthfulness`, `common.bidToEstimate`,
 * `common.cursed`, `unspent` and `missed` of the reference of its three `game_scored` entries (every game has lots of
 * all three kinds). `blind-bid-s31-live` replays the old smoke run: its shading is the 0.66, 0.82 and 0.69 of the old
 * report. In the silent file every bid is missed, so no bid counts and each kind reads 0, as its `game_scored` does.
 */
const HAND: Readonly<Record<string, Hand>> = {
	"blind-bid-nobrain-s7.json": { shading: [0.75, 0.9, 0.749], truthfulness: [0.485, 0.558, 0.473], bidToEstimate: [0.676, 0.777, 0.586], cursed: [1, 0, 0], unspent: [0.5, 0.495, 0.423], missed: [0, 0, 0] },
	"blind-bid-s11.json": { shading: [0.816, 0.85, 0.731], truthfulness: [0.554, 0.479, 0.474], bidToEstimate: [0.71, 0.713, 0.498], cursed: [1, 1, 0], unspent: [0.505, 0.498, 0.41], missed: [0, 0, 0] },
	"blind-bid-s13-silent.json": { shading: [0, 0, 0], truthfulness: [0, 0, 0], bidToEstimate: [0, 0, 0], cursed: [0, 0, 0], unspent: [1, 1, 1], missed: [24, 24, 24] },
	"blind-bid-s31-live.json": { shading: [0.659, 0.82, 0.694], truthfulness: [1, 1, 1], bidToEstimate: [0.565, 0.607, 0.732], cursed: [1, 1, 0], unspent: [0.478, 0.425, 0.43], missed: [0, 0, 0] },
	"blind-bid-s7.json": { shading: [0.75, 0.9, 0.749], truthfulness: [0.485, 0.558, 0.473], bidToEstimate: [0.676, 0.777, 0.586], cursed: [1, 0, 0], unspent: [0.5, 0.495, 0.423], missed: [0, 0, 0] },
};

// One number of the reference of the file's `game_scored` entries, by its path, in file order.
const inFile = (oracle: Oracle, path: readonly string[]): readonly number[] =>
	oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.type === "game_scored" ? [Number(path.reduce((value: unknown, key) => Reflect.get(Object(value), key), Reflect.get(Object(entry.payload), "reference")))] : []));
const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]): number => sum(values) / values.length;

describe("the metrics of sealed-auction over an oracle replay", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = blindBidGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		const { events } = await playOracle(oracle, game);
		// The replay is the run of the file.
		expect(timelineOf(events)).toEqual(oracle.timeline);
		expect({
			shading: inFile(oracle, ["firstPrice", "shading"]),
			truthfulness: inFile(oracle, ["secondPrice", "truthfulness"]),
			bidToEstimate: inFile(oracle, ["common", "bidToEstimate"]),
			cursed: inFile(oracle, ["common", "cursed"]),
			unspent: inFile(oracle, ["unspent"]),
			missed: inFile(oracle, ["missed"]),
		}).toEqual(hand);
		expect(metricsOf(game, "sealed-auction", events)).toEqual({
			shading: mean(hand.shading),
			truthfulness: mean(hand.truthfulness),
			bidToEstimate: mean(hand.bidToEstimate),
			cursed: sum(hand.cursed),
			unspent: mean(hand.unspent),
			missed: sum(hand.missed),
		});
	});

	it("reads absent, not 0, for every metric of a run without its event, and leaves out a game without lots of a kind", async () => {
		const oracle = readOracle(join(ORACLES, "blind-bid-s7.json"));
		const game = blindBidGame({ seed: oracle.seed });
		// The same run stopped before its first tick: no game was scored.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "sealed-auction", events)).toEqual({ shading: "absent", truthfulness: "absent", bidToEstimate: "absent", cursed: "absent", unspent: "absent", missed: "absent" });
		// A match of pay-your-bid lots only: the two other kinds have no game to average.
		const single = blindBidGame({ games: 1, lots: ["first-price"], brain: false });
		const played = await playOracle({ ...oracle, setup: { ...oracle.setup, minutes: 40 }, timeline: [] }, single);
		expect(metricsOf(single, "sealed-auction", played.events)).toMatchObject({ shading: 0, truthfulness: "absent", bidToEstimate: "absent", missed: 4 });
	});
});
