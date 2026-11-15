// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `liars-dice` over the new log of an oracle replay (M4 specification, issue 50): each equals the number
 * computed by hand from the same oracle file, and a metric without its events is absent, never 0.
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, timelineOf, withEndsTurn, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { liarsDiceGame } from "../game.ts";
import { endsTurn, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "liars-dice");

/** A count over its whole, as read in the file; undefined where the whole is empty. */
type Part = readonly [part: number, whole: number] | undefined;
interface Hand {
	readonly rounds: number;
	readonly bluffs: Part;
	readonly lost: Part;
	readonly remarks: Part;
	readonly agree: Part;
	readonly missed: number;
}

/**
 * Read by hand in each oracle file: the `dice_called` entries (one per round) and those whose `loser` is the caller
 * (`seat`); the `dice_decision_scored` entries of kind `bid` with `bluff`, every one with `agree`, every one with
 * `missed`; the `dice_bid` entries without `missed` and those with a `say`. Three files are cut after game 1; in the
 * silent file the deadline makes every decision, so no bid of a seat is left for the remarks.
 */
const HAND: Readonly<Record<string, Hand>> = {
	"liars-dice-g1-s13-probes.json": { rounds: 12, bluffs: [30, 114], lost: [4, 12], remarks: [42, 114], agree: [95, 126], missed: 0 },
	"liars-dice-g1-s13-silent.json": { rounds: 15, bluffs: [0, 15], lost: [15, 15], remarks: undefined, agree: [15, 30], missed: 30 },
	"liars-dice-hu-quiet-g2-d5-s7.json": { rounds: 10, bluffs: [0, 19], lost: [10, 10], remarks: [0, 19], agree: [19, 29], missed: 0 },
	"liars-dice-nobrain-s7.json": { rounds: 13, bluffs: [26, 113], lost: [5, 13], remarks: [43, 113], agree: [92, 126], missed: 0 },
	"liars-dice-s11.json": { rounds: 15, bluffs: [28, 120], lost: [7, 15], remarks: [46, 120], agree: [100, 135], missed: 0 },
	"liars-dice-s7.json": { rounds: 13, bluffs: [26, 113], lost: [5, 13], remarks: [43, 113], agree: [92, 126], missed: 0 },
};

// The payloads of the file's events of one type, in file order.
const payloads = (oracle: Oracle, type: string): readonly object[] => oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.type === type && typeof entry.payload === "object" && entry.payload !== null ? [entry.payload] : []));
const get = (payload: object, key: string): unknown => Reflect.get(payload, key);
const part = (items: readonly object[], passes: (item: object) => boolean): Part => (items.length === 0 ? undefined : [items.filter(passes).length, items.length]);

// The same counts, read from the file's timeline.
function counted(oracle: Oracle): Hand {
	const [called, scored, bids] = [payloads(oracle, "dice_called"), payloads(oracle, "dice_decision_scored"), payloads(oracle, "dice_bid")];
	return {
		rounds: called.length,
		bluffs: part(scored.filter((one) => get(one, "kind") === "bid"), (one) => get(one, "bluff") === true),
		lost: part(called, (one) => get(one, "loser") === get(one, "seat")),
		remarks: part(bids.filter((one) => get(one, "missed") !== true), (one) => get(one, "say") !== undefined),
		agree: part(scored, (one) => get(one, "agree") === true),
		missed: scored.filter((one) => get(one, "missed") === true).length,
	};
}

const ratio = (value: Part): number | "absent" => (value === undefined ? "absent" : value[0] / value[1]);

describe("the metrics of liars-dice over an oracle replay", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = liarsDiceGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		const { events } = await playOracle(oracle, game);
		// The replay is the run of the file: its timeline is the file's (a cut file up to its cut).
		expect(timelineOf(events).slice(0, oracle.timeline.length)).toEqual(withEndsTurn(oracle, endsTurn).timeline);
		expect(counted(oracle)).toEqual(hand);
		expect(metricsOf(game, "liars-dice", events)).toEqual({
			rounds: hand.rounds,
			bluffShare: ratio(hand.bluffs),
			callsLost: ratio(hand.lost),
			remarkShare: ratio(hand.remarks),
			agreement: ratio(hand.agree),
			missed: hand.missed,
		});
	});

	it("reads absent, not 0, for every metric of a run without its events", async () => {
		const oracle = readOracle(join(ORACLES, "liars-dice-s7.json"));
		const game = liarsDiceGame({ seed: oracle.seed });
		// The same run stopped before its first tick: no decision was made.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "liars-dice", events)).toEqual({ rounds: "absent", bluffShare: "absent", callsLost: "absent", remarkShare: "absent", agreement: "absent", missed: "absent" });
	});
});
