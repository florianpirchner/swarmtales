// SPDX-License-Identifier: Apache-2.0
/**
 * Blind Bid: four solo seats bid on a series of lots with sealed bids and a purse per game. Each game sells six lots
 * of three kinds, two each: pay-your-bid and pay-the-runner-up lots with private values, and shared-worth lots with
 * one hidden worth and a noisy estimate per seat (the winner's curse). A match is several games; each starts from a
 * fresh context, a full purse and fresh lots, and the only memory across games is each seat's private strategy brain
 * (`brain: false`: the same briefings, no brain). The `sealed-auction` mechanic scores each game against closed-form
 * single-lot references for the report; the seats never see it. A port of the old `stories/blind-bid/story.ts`: the
 * variants are options of the factory, the id is always `blind-bid`.
 */
import { sealedAuction, type LotKind } from "@swarmtales/mechanic-sealed-auction";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame } from "@swarmtales/sdk";
import { briefings, SEATS } from "./briefing.ts";

/**
 * The variants of Blind Bid.
 *
 * @public
 */
export interface BlindBidOptions {
	/** Games of the match (default 3). */
	readonly games?: number;
	/** The kinds of each game's lots in order (default two of each kind, mixed). */
	readonly lots?: readonly LotKind[];
	/** Coins per seat and game (default 100: enough for two or three lots, not for all six). */
	readonly purse?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** The seed of the run; 31 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default is an upper bound from the lots (the match ends the run earlier). */
	readonly ticks?: number;
}

/**
 * The lots of a game of the old game: two of each kind, mixed.
 *
 * @public
 */
export const DEFAULT_LOTS: readonly LotKind[] = ["first-price", "second-price", "common", "first-price", "common", "second-price"];

/** The defaults of the old game. */
const DEFAULTS = { games: 3, lots: DEFAULT_LOTS, purse: 100, brain: true, maxWords: 150, seed: 31 } as const satisfies BlindBidOptions;
const DEADLINE = 2;
const RETRO_TICKS = 2;

/** An upper bound of the ticks: every lot runs to its deadline, every retro to its timeout. */
const ticksFor = (games: number, lots: number): number => games * lots * DEADLINE + (games + 1) * RETRO_TICKS + 4;

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(blindBidGame({ games: 1, brain: false }), { seed: 7 });
 * ```
 *
 * @public
 */
export function blindBidGame(options: BlindBidOptions = {}) {
	const { games, lots, purse, brain, maxWords, seed } = { ...DEFAULTS, ...options };
	return defineGame({
		id: "blind-bid",
		title: "Blind Bid",
		seed,
		residents: [...SEATS],
		mechanics: [
			sealedAuction({ games, lots: [...lots], purse, deadline: DEADLINE }),
			strategyBrain({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewAuction", "bid", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["bid", ...(brain ? (["writeBrain"] as const) : [])],
		// Four passes a tick: a lot's bids and the next lot's opening fit in one tick. The reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "sealed-auction" }] } },
		limits: { maxCallsPerTick: 6 },
		end: { ticks: options.ticks ?? ticksFor(games, lots.length) },
		win: { fact: "sealed-auction.scores" },
		briefing: briefings(brain),
		// The old entry set no output cap: the default of 4000 stands.
		model: "anthropic/claude-haiku-5-5",
	});
}

export default blindBidGame();
