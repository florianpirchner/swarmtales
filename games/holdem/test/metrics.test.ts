// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `holdem` over the new log of an oracle replay (M4 specification, issue 51): each equals the number
 * computed by hand from the same oracle file, and a metric without its events is absent, never 0.
 */
import { join } from "node:path";
import { metricsOf, play, playOracle, readOracle, timelineOf, withEndsTurn, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { holdemGame } from "../game.ts";
import { endsTurn, field, ofType, player, rosterGame, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "holdem");

/** A count over its whole, as read in the file; undefined where the whole is empty. */
type Part = readonly [part: number, whole: number] | undefined;
interface Hand {
	/** The sum of `evLoss` over the decisions, rounded to cents, and the decisions. */
	readonly evLoss: readonly [sum: number, decisions: number];
	readonly callsWithoutOdds: Part;
	readonly foldsFacingBet: Part;
	/** The sum of the seats' `vpip` over the scored games, rounded to three places, and the seat-games. */
	readonly vpip: readonly [sum: number, seatGames: number] | undefined;
	readonly agreement: Part;
	readonly missed: number;
}

/**
 * Read by hand in each oracle file: the `decision_scored` entries (their `evLoss`; the calls whose `baseline` is a
 * fold; those with `toCall` above 0 and the folds among them; those whose `done` is of the baseline's kind, fold,
 * check-call or bet-raise; those `missed`) and the `vpip` of every seat of every `game_scored` entry. Four files are
 * cut in game 1, before any game is scored, so their VPIP is absent; in the silent file the deadline makes every
 * decision (a check, or a fold facing a bet). The scripted seats do not read the aid line, so the aid's file plays the
 * decisions of the no-brain file.
 */
const HAND: Readonly<Record<string, Hand>> = {
	"holdem-aid-mixed-s7.json": { evLoss: [37.45, 79], callsWithoutOdds: [14, 79], foldsFacingBet: [13, 49], vpip: undefined, agreement: [31, 79], missed: 0 },
	"holdem-hu-s13-silent.json": { evLoss: [24.38, 24], callsWithoutOdds: [0, 24], foldsFacingBet: [24, 24], vpip: [0, 4], agreement: [0, 24], missed: 24 },
	"holdem-hu-s7.json": { evLoss: [28.16, 60], callsWithoutOdds: [13, 60], foldsFacingBet: [0, 30], vpip: undefined, agreement: [21, 60], missed: 0 },
	"holdem-nobrain-s7.json": { evLoss: [37.45, 79], callsWithoutOdds: [14, 79], foldsFacingBet: [13, 49], vpip: undefined, agreement: [31, 79], missed: 0 },
	"holdem-s11.json": { evLoss: [42.33, 81], callsWithoutOdds: [18, 81], foldsFacingBet: [13, 50], vpip: undefined, agreement: [34, 81], missed: 0 },
	"holdem-s7.json": { evLoss: [37.45, 77], callsWithoutOdds: [14, 77], foldsFacingBet: [13, 48], vpip: undefined, agreement: [30, 77], missed: 0 },
};

// The payloads of the file's events of one type, in file order.
const payloads = (oracle: Oracle, type: string): readonly object[] => oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.type === type && typeof entry.payload === "object" && entry.payload !== null ? [entry.payload] : []));
const get = (payload: unknown, key: string): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined);
// The `vpip` of every seat of a `game_scored` payload's `stats`, in its key order.
const vpipsOf = (stats: unknown): readonly number[] => (typeof stats === "object" && stats !== null ? Object.values(stats).map((seat) => Number(get(seat, "vpip"))) : []);
const part = (items: readonly object[], passes: (item: object) => boolean): Part => (items.length === 0 ? undefined : [items.filter(passes).length, items.length]);
const total = (values: readonly number[], places: number): number => Math.round(values.reduce((sum, value) => sum + value, 0) * 10 ** places) / 10 ** places;
const kind = (move: unknown): string => (move === "check" || move === "call" ? "passive" : move === "fold" ? "fold" : "aggressive");

// The same counts, read from the file's timeline.
function counted(oracle: Oracle): Hand {
	const [scored, games] = [payloads(oracle, "decision_scored"), payloads(oracle, "game_scored")];
	const vpips = games.flatMap((game) => vpipsOf(get(game, "stats")));
	return {
		evLoss: [total(scored.map((one) => Number(get(one, "evLoss"))), 2), scored.length],
		callsWithoutOdds: part(scored, (one) => get(one, "done") === "call" && get(one, "baseline") === "fold"),
		foldsFacingBet: part(scored.filter((one) => Number(get(one, "toCall")) > 0), (one) => get(one, "done") === "fold"),
		vpip: vpips.length === 0 ? undefined : [total(vpips, 3), vpips.length],
		agreement: part(scored, (one) => kind(get(one, "done")) === kind(get(one, "baseline"))),
		missed: scored.filter((one) => get(one, "missed") === true).length,
	};
}

const ratio = (value: Part): number | "absent" => (value === undefined ? "absent" : value[0] / value[1]);

describe("the metrics of holdem over an oracle replay", () => {
	it.each(Object.entries(HAND))("%s: every metric equals the number read by hand in the file", async (file, hand) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = holdemGame(VARIANTS[oracle.variant]);
		const { events } = await playOracle(oracle, game);
		// The replay is the run of the file: its timeline is the file's (a cut file up to its cut).
		expect(timelineOf(events).slice(0, oracle.timeline.length)).toEqual(withEndsTurn(oracle, endsTurn).timeline);
		expect(counted(oracle)).toEqual(hand);
		const metrics = metricsOf(game, "holdem", events);
		expect(metrics).toMatchObject({ callsWithoutOdds: ratio(hand.callsWithoutOdds), foldsFacingBet: ratio(hand.foldsFacingBet), agreement: ratio(hand.agreement), missed: hand.missed });
		// The two means are sums of fractions: equal to the hand's sum over its count up to the rounding of the sum.
		expect(metrics.evLoss).toBeCloseTo(hand.evLoss[0] / hand.evLoss[1], 6);
		if (hand.vpip === undefined) expect(metrics.vpip).toBe("absent");
		else expect(metrics.vpip).toBeCloseTo(hand.vpip[0] / hand.vpip[1], 6);
	});

	it("averages VPIP over every seat of every scored game of a finished match", async () => {
		const game = rosterGame({ games: 2, hands: 3 });
		const { events } = await play(game, { seed: 7, drivers: () => ({ resident: player }) });
		const vpips = ofType(events, "game_scored").flatMap((scored) => vpipsOf(field(scored, "stats")));
		expect(vpips).toHaveLength(8);
		expect(metricsOf(game, "holdem", events).vpip).toBeCloseTo(total(vpips, 3) / 8, 6);
		expect(total(vpips, 3)).toBeGreaterThan(0);
	});

	it("reads absent, not 0, for every metric of a run without its events", async () => {
		const oracle = readOracle(join(ORACLES, "holdem-s7.json"));
		const game = holdemGame();
		// The same run stopped before its first tick: no decision was made, no game scored.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "holdem", events)).toEqual({ evLoss: "absent", callsWithoutOdds: "absent", foldsFacingBet: "absent", vpip: "absent", agreement: "absent", missed: "absent" });
	});
});
