// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of `salt-market` over the new log of an oracle replay (M4 specification, issue 67): each equals the
 * number computed by hand from the same oracle file, and a metric without its events is absent, never 0. That the
 * replay is the run of the file is `oracle.test.ts` (level 3).
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { saltMarketGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "salt-market");

interface Hand {
	readonly gain: readonly number[];
	readonly efficiency: readonly number[];
	readonly total: readonly number[];
	readonly contracts: readonly number[];
	readonly trades: number;
	readonly later: number;
	readonly broken: number;
}

/**
 * Read by hand in each oracle file: per `market_game_scored` entry the reference's `gainOverIdle`, `efficiency`,
 * `total` and `contractsMet`; the `market_trade` entries and those with a `later` part; the `market_promise_settled`
 * entries with status broken (the one settled promise, in `salt-market-s45.json`, was kept). Three files are cut
 * after game 2; in the silent file nobody trades in four games, which is 0 trades, not absent.
 */
const HAND: Readonly<Record<string, Hand>> = {
	"salt-market-nobrain-s45.json": { gain: [0.147, 0.389], efficiency: [-0.149, 0.238], total: [156, 195], contracts: [1, 2], trades: 27, later: 0, broken: 0 },
	"salt-market-s13-silent.json": { gain: [0, 0, 0, 0], efficiency: [-0.252, -0.193, -0.286, -0.261], total: [126, 133, 122, 125], contracts: [0, 0, 0, 0], trades: 0, later: 0, broken: 0 },
	"salt-market-s45.json": { gain: [0.353, 0.341], efficiency: [0.129, 0.178], total: [184, 189], contracts: [2, 2], trades: 28, later: 1, broken: 0 },
	"salt-market-s46.json": { gain: [0.176, 0.284], efficiency: [-0.156, -0.013], total: [153, 164], contracts: [1, 2], trades: 21, later: 0, broken: 0 },
};

// The payloads of the file's `salt-market` events of one type, in file order.
const payloads = (oracle: Oracle, type: string): readonly object[] =>
	oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "salt-market" && entry.type === type && typeof entry.payload === "object" && entry.payload !== null ? [entry.payload] : []));
const get = (payload: unknown, key: string): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined);
const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

// The same counts, read from the file's timeline.
function counted(oracle: Oracle): Hand {
	const references = payloads(oracle, "market_game_scored").map((one) => get(one, "reference"));
	const read = (key: string): readonly number[] => references.map((reference) => Number(get(reference, key)));
	const trades = payloads(oracle, "market_trade");
	return {
		gain: read("gainOverIdle"),
		efficiency: read("efficiency"),
		total: read("total"),
		contracts: read("contractsMet"),
		trades: trades.length,
		later: trades.filter((one) => get(one, "later") !== undefined).length,
		broken: payloads(oracle, "market_promise_settled").filter((one) => get(one, "status") === "broken").length,
	};
}

describe("the metrics of salt-market over an oracle replay", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = saltMarketGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		const { events } = await playOracle(oracle, game);
		expect(counted(oracle)).toEqual(hand);
		expect(metricsOf(game, "salt-market", events)).toEqual({
			gainOverIdle: sum(hand.gain) / hand.gain.length,
			efficiency: sum(hand.efficiency) / hand.efficiency.length,
			tablePoints: sum(hand.total),
			contracts: sum(hand.contracts),
			trades: hand.trades,
			credit: hand.later,
			brokenPromises: hand.broken,
		});
	});

	it("reads absent, not 0, for every metric of a run without its events", async () => {
		const oracle = readOracle(join(ORACLES, "salt-market-s45.json"));
		const game = saltMarketGame({ seed: oracle.seed });
		// The same run stopped before its first tick: no game started.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		const absent = { gainOverIdle: "absent", efficiency: "absent", tablePoints: "absent", contracts: "absent", trades: "absent", credit: "absent", brokenPromises: "absent" };
		expect(metricsOf(game, "salt-market", events)).toEqual(absent);
	});
});
