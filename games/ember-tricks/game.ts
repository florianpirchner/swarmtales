// SPDX-License-Identifier: Apache-2.0
/**
 * Ember Tricks: an original trick-taking game with exact bidding for four solo seats. Five suits of different lengths
 * (Ash 1-10, Brine 1-9, Cinder 1-8, Dust 1-7, Ember 1-6), rounds of 1 to 8 cards; every seat bids the exact number of
 * tricks it will take, the lowest bidder names the trump once every bid is public, a hit scores 10 + 3 per trick and a
 * miss costs 5 plus the error squared. Each seat has one veto token per game to send a lead card back. Silent table:
 * no chat, the only signals are bids, the named trump and the cards. Every round starts from a fresh context; the only
 * memory across games is each seat's own notes (the strategy brain, a team of one; `brain: false` is the control
 * arm). The rules are the `trick-play` mechanic on the `card-table`. A port of the old `stories/ember-tricks/story.ts`:
 * the variants are params of the game family, the id is always `ember-tricks`.
 */
import { cardTable } from "@swarmtales/mechanic-card-table";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { trickPlay } from "@swarmtales/mechanic-trick-play";
import { defineGame, defineGameFamily } from "@swarmtales/sdk";
import { Type } from "typebox";
import { briefings, SEATS } from "./briefing.ts";

/**
 * One bidding lever under test: the bid sum so far on the table; a calibration line in the end-of-game record; that
 * line with the Monte Carlo worth of the seat's hands (`mcRetro`); or the line plus the hand's worth shown while
 * bidding (`mcBid`).
 *
 * @public
 */
export type EmberLever = "bidSum" | "calibration" | "mcRetro" | "mcBid";

/**
 * The variants of Ember Tricks.
 *
 * @public
 */
export interface EmberTricksOptions {
	/** Games in the match (default 2); the run ends after the last one. */
	readonly games?: number;
	/** Cards per seat, round by round (default 1 to 8). */
	readonly rounds?: readonly number[];
	/** Each seat keeps notes across games; false is the control arm (same briefings, no notes, no retro). */
	readonly brain?: boolean;
	/** The seed of the run; 23 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default scales with the games. */
	readonly ticks?: number;
	/** Words the notes may have. */
	readonly maxWords?: number;
	/** One bidding lever under test; none when absent. */
	readonly lever?: EmberLever;
	/** A move that leaves the seat off turn, and a written note, end the seat's turn, so the answer wakes no turn that only reads "Not your turn" (P475); off, as on the old platform. */
	readonly quietEnds?: boolean;
}

const SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Cinder", ranks: 8 },
	{ name: "Dust", ranks: 7 },
	{ name: "Ember", ranks: 6 },
];
const DEFAULT_ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
/** The defaults of the old game. */
const DEFAULTS = { games: 2, rounds: DEFAULT_ROUNDS, brain: true, seed: 23, maxWords: 200, quietEnds: false } as const satisfies EmberTricksOptions;
type Filled = EmberTricksOptions & Required<Omit<EmberTricksOptions, "ticks" | "lever">>;

const REFERENCE = { mcRetro: "retro", mcBid: "bid" } as const;

// The three mechanics with the options of the old game, in its order.
function mechanicsOf({ games, rounds, brain, maxWords, lever, quietEnds }: Filled) {
	const reference = lever === "mcRetro" || lever === "mcBid" ? REFERENCE[lever] : "off";
	const quiet = quietEnds ? { quietEnds } : {};
	return [
		cardTable({ suits: SUITS, seats: [...SEATS] }),
		trickPlay({ games, rounds: [...rounds], trump: "lowestBidderNames", vetoTokens: 1, scoring: { hit: 10, perTrick: 3, miss: "square", missBase: 5 }, maxIdleMinutes: 3, maxConsecutiveForfeits: 24, briefEveryRound: true, bidSum: lever === "bidSum", calibration: lever === "calibration" || reference !== "off", reference, ...quiet }),
		strategyBrain({ enabled: brain, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 1, retroMaxMinutes: 2, shared: false, brainAtStart: false, solo: true, ...quiet }),
	];
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(emberTricksGame({ games: 1, lever: "calibration" }), { seed: 31 });
 * ```
 *
 * @public
 */
export function emberTricksGame(options: EmberTricksOptions = {}) {
	const filled: Filled = { ...DEFAULTS, ...options };
	const { brain, games, rounds } = filled;
	return defineGame({
		id: "ember-tricks",
		title: "Ember Tricks",
		seed: filled.seed,
		residents: [...SEATS],
		mechanics: mechanicsOf(filled),
		grants: { resident: ["viewTable", "placeBid", "nameTrump", "playCard", "vetoLead", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["writeBrain"] : [],
		// The seat on turn has news; several seats act in one pass when the turn moves along the roster. The reset line comes first, then the brain's lines before those of trick play, as the old hook numbers ordered them.
		scheduler: { id: "turns", options: { passes: 8, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "trick-play" }] } },
		limits: { maxCallsPerTick: 8 },
		end: { ticks: filled.ticks ?? games * (rounds.length * 6 + 6) + 6 },
		win: { fact: "trick-play.totals" },
		briefing: briefings(brain, SEATS.length),
		// The old entry set no output cap: the default of 4000 stands.
		model: "anthropic/haiku",
	});
}

/**
 * The params of the family: the variants an arm of an experiment or `--set` may choose. The seed and the tick count
 * are no params: the seed is the run's, and the tick count follows from the games and rounds.
 */
const Params = Type.Object(
	{
		games: Type.Integer({ minimum: 1, maximum: 20, default: DEFAULTS.games, description: "Games in the match." }),
		rounds: Type.Integer({ minimum: 1, maximum: 10, default: DEFAULT_ROUNDS.length, description: "Rounds of a game: round n deals n cards to each seat." }),
		brain: Type.Boolean({ default: DEFAULTS.brain, description: "Each seat keeps notes across games; false is the control arm." }),
		lever: Type.Union([Type.Literal("none"), Type.Literal("bidSum"), Type.Literal("calibration"), Type.Literal("mcRetro"), Type.Literal("mcBid")], { default: "none", description: "One bidding lever under test: the bid sum on the table, the calibration line, that line with the hands' worth in the retro (mcRetro) or the worth shown while bidding (mcBid)." }),
		maxWords: Type.Integer({ minimum: 1, default: DEFAULTS.maxWords, description: "Words the notes may have." }),
		quietEnds: Type.Boolean({ default: DEFAULTS.quietEnds, description: "A move that leaves the seat off turn, and a written note, end the seat's turn, so the answer wakes no empty turn (P475); false, as on the old platform." }),
	},
	{ description: "The variants of Ember Tricks." },
);

/**
 * Ember Tricks as a game family: the default params give the registry default of the old platform (two games of eight
 * rounds, notes on, no lever); `{ brain: false }` is the control arm, `lever` the bidding levers of its series.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: emberTricksFamily, params: { lever: "mcBid", games: 4 }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const emberTricksFamily = defineGameFamily(Params, ({ games, rounds, brain, lever, maxWords, quietEnds }) =>
	emberTricksGame({ games, brain, maxWords, quietEnds, rounds: Array.from({ length: rounds }, (_, index) => index + 1), ...(lever === "none" ? {} : { lever }) }),
);

export default emberTricksFamily;
