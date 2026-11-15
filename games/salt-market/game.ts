// SPDX-License-Identifier: Apache-2.0
/**
 * Salt Market: four solo traders play a match of negotiation games. In each game every trader holds a bundle of five
 * goods, values them privately and has a secret contract (a bundle that pays a bonus); the goods each one needs sit
 * with the others. All goods move through a bank that executes only offers both sides hold the goods for; part of each
 * trader's goods arrives as a shipment in a later round, so it can be sold early only on credit (a plain promise, or
 * escrow against the shipment); trades above a size pay a tax; one good spoils every round; the deal rotates, so every
 * trader plays every position once in four games. The rules are in the `salt-market` mechanic. Every game starts from
 * a fresh context; the only memory across games is each trader's private strategy brain (`brain: false`: the same
 * briefings, no brain). The mechanic scores every game against the optimal allocation, for the report only. A port of
 * the old `stories/salt-market/story.ts`: the variants are options of the factory, the id is always `salt-market`.
 * The file exports the game family: the variants that an experiment or `--set` may choose are its params, and its
 * defaults give the game of the old platform.
 */
import { saltMarket } from "@swarmtales/mechanic-salt-market";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, defineGameFamily } from "@swarmtales/sdk";
import { Type } from "typebox";
import { briefings, SEATS } from "./briefing.ts";

/**
 * The variants of Salt Market.
 *
 * @public
 */
export interface SaltMarketOptions {
	/** Games in the match (default 4: one full rotation of the deal). */
	readonly games?: number;
	/** Trading rounds per game (default 6), one tick each. */
	readonly rounds?: number;
	/** Each trader keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Goods spoil at the end of each round but the last (default on). */
	readonly spoil?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** Mark a trader's own offers as its own in what it reads (A46, P478; default off, the text of the old game). */
	readonly markOwnOffers?: boolean;
	/** The seed of the run; 41 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default is an upper bound from the rounds (the match ends the run earlier). */
	readonly ticks?: number;
}

/** The defaults of the old game. */
const DEFAULTS = { games: 4, rounds: 6, brain: true, spoil: true, maxWords: 150, markOwnOffers: false, seed: 41 } as const satisfies SaltMarketOptions;
const RETRO_TICKS = 2;
const TOOLS = ["viewMarket", "offer", "accept", "decline", "withdraw", "give", "say"] as const;

/** An upper bound of the ticks: every round, every retro to its timeout, a start tick per game. */
const ticksFor = (games: number, rounds: number): number => games * (rounds + 1) + (games + 1) * RETRO_TICKS + 4;

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(saltMarketGame({ games: 1, brain: false }), { seed: 13 });
 * ```
 *
 * @public
 */
export function saltMarketGame(options: SaltMarketOptions = {}) {
	const { games, rounds, brain, spoil, maxWords, markOwnOffers, seed } = { ...DEFAULTS, ...options };
	return defineGame({
		id: "salt-market",
		title: "Salt Market",
		seed,
		residents: [...SEATS],
		// Salt Market before the brain: its round clock ends a round before the brain opens a retro window (old hook numbers 150 and 200).
		mechanics: [
			// The mark is passed only when on, so that the game of the old platform keeps its hash (A41).
			saltMarket({ games, rounds, spoil, roundMinutes: 1, ...(markOwnOffers ? { markOwnOffers } : {}) }),
			strategyBrain({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
		],
		grants: { resident: [...TOOLS, ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["writeBrain"] : [],
		// Three passes a tick: make offers, answer them, close the deals. The reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 3, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "salt-market" }] } },
		limits: { maxCallsPerTick: 12 },
		end: { ticks: options.ticks ?? ticksFor(games, rounds) },
		win: { fact: "salt-market.scores" },
		briefing: briefings(brain),
		// The old entry set no output cap: the default of 4000 stands.
		model: { id: "anthropic/claude-haiku-5-5" },
	});
}

/**
 * The params of the family: the variants an arm of an experiment or `--set` may choose, with the bounds of the old
 * variant-name parser. The seed and the tick count are no params: the seed is the run's, and the tick count follows
 * from the games and the rounds.
 */
const Params = Type.Object(
	{
		games: Type.Integer({ minimum: 1, maximum: 20, default: DEFAULTS.games, description: "Games in the match; 4 is one full rotation of the deal." }),
		rounds: Type.Integer({ minimum: 2, maximum: 20, default: DEFAULTS.rounds, description: "Trading rounds per game." }),
		brain: Type.Boolean({ default: DEFAULTS.brain, description: "Each trader keeps a strategy brain; false: the same briefings, no brain, no retro (the control arm)." }),
		spoil: Type.Boolean({ default: DEFAULTS.spoil, description: "Goods spoil at the end of each round but the last." }),
		maxWords: Type.Integer({ minimum: 1, default: DEFAULTS.maxWords, description: "Words a brain may have." }),
		markOwnOffers: Type.Boolean({ default: DEFAULTS.markOwnOffers, description: "Mark a trader's own offers as its own in what it reads (A46, P478); false is the text of the old game and keeps its hash." }),
	},
	{ description: "The variants of Salt Market." },
);

/**
 * Salt Market as a game family: the default params give the registry default of the old platform (four rotated games
 * of six rounds, spoilage, a brain per trader); `{ brain: false }` is the control arm.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: saltMarketFamily, params: { brain: false }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const saltMarketFamily = defineGameFamily(Params, (params) => saltMarketGame(params));

export default saltMarketFamily;
