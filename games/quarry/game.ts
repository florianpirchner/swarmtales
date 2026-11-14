// SPDX-License-Identifier: Apache-2.0
/**
 * Quarry: four solo seats play a match of drafting games. In each game every seat opens packs of cards, keeps one
 * card per pick and passes the rest around the table; at the end every quarry scores the square of each resource it
 * holds, a bonus for strictly the most of a resource, minus the burns it used to destroy cards a neighbour wanted.
 * The rules are in the `draft-rounds` mechanic. Every game starts from a fresh context; the only memory across games
 * is each seat's private strategy brain (`brain: false`: the same briefings, no brain), so the question is whether a
 * seat learns to read what its neighbours pass and to stay out of their lanes. The mechanic scores every pick
 * against the greedy pick and every game against four greedy seats on the same deal, for the report only. A port of
 * the old `stories/quarry/story.ts`: the variants are options of the factory, the id is always `quarry`. The file
 * exports the game family: the variants that an experiment or `--set` may choose are its params, and its defaults
 * give the game of the old platform.
 */
import { draftRounds } from "@swarmtales/mechanic-draft-rounds";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, defineGameFamily } from "@swarmtales/sdk";
import { Type } from "typebox";
import { briefings, SEATS } from "./briefing.ts";

/**
 * The variants of Quarry.
 *
 * @public
 */
export interface QuarryOptions {
	/** Games in the match (default 3). */
	readonly games?: number;
	/** Pack rounds per game (default 2). */
	readonly packs?: number;
	/** Cards per pack (default 6). */
	readonly packSize?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Burns allowed (default off since P125: burns cost Haiku about 13 % of the table; on is the hate-drafting arm). */
	readonly burns?: boolean;
	/** Every seat sees every quarry during the game (default off). */
	readonly openHands?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** The seed of the run; 29 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default is an upper bound from the picks (the match ends the run earlier). */
	readonly ticks?: number;
}

const DEADLINE = 2;
const RETRO_TICKS = 2;
/** The defaults of the old game. */
const DEFAULTS = { games: 3, packs: 2, packSize: 6, brain: true, burns: false, openHands: false, maxWords: 150, seed: 29 } as const satisfies QuarryOptions;
type Filled = QuarryOptions & Required<Omit<QuarryOptions, "ticks">>;

// An upper bound of the ticks: every pick runs to its deadline, every retro to its timeout.
const ticksFor = ({ games, packs, packSize }: Filled): number => games * packs * packSize * DEADLINE + (games + 1) * RETRO_TICKS + 4;

// The two mechanics with the options of the old game, in its order.
function mechanicsOf({ games, packs, packSize, brain, burns, openHands, maxWords }: Filled) {
	return [
		draftRounds({ games, packs, packSize, openHands, deadline: DEADLINE, ...(burns ? {} : { maxBurns: 0 }) }),
		strategyBrain({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
	] as const;
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(quarryGame({ openHands: true }), { seed: 59 });
 * ```
 *
 * @public
 */
export function quarryGame(options: QuarryOptions = {}) {
	const filled: Filled = { ...DEFAULTS, ...options };
	const brainTools = filled.brain ? (["readBrain", "writeBrain"] as const) : [];
	return defineGame({
		id: "quarry",
		title: "Quarry",
		seed: filled.seed,
		residents: [...SEATS],
		mechanics: mechanicsOf(filled),
		grants: { resident: ["viewTable", "pick", ...brainTools] },
		locked: filled.brain ? ["pick", "writeBrain"] : ["pick"],
		// Four passes a tick: a pick and the next pick fit in one tick; the reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "draft-rounds" }] } },
		limits: { maxCallsPerTick: 6 },
		end: { ticks: filled.ticks ?? ticksFor(filled) },
		win: { fact: "draft-rounds.scores" },
		briefing: briefings(filled.brain),
		model: "anthropic/haiku",
	});
}

/**
 * The params of the family: the variants an arm of an experiment or `--set` may choose. The seed and the tick count
 * are no params: the seed is the run's, and the tick count follows from the picks.
 */
const Params = Type.Object(
	{
		games: Type.Integer({ minimum: 1, default: DEFAULTS.games, description: "Games in the match." }),
		packs: Type.Integer({ minimum: 1, default: DEFAULTS.packs, description: "Pack rounds per game." }),
		packSize: Type.Integer({ minimum: 2, default: DEFAULTS.packSize, description: "Cards per pack." }),
		brain: Type.Boolean({ default: DEFAULTS.brain, description: "Each seat keeps a strategy brain; false: the same briefings, no brain, no retro." }),
		burns: Type.Boolean({ default: DEFAULTS.burns, description: "Burns allowed: the hate-drafting arm." }),
		openHands: Type.Boolean({ default: DEFAULTS.openHands, description: "Every seat sees every quarry during the game: the treatment arm of the open-quarries experiment." }),
		maxWords: Type.Integer({ minimum: 1, default: DEFAULTS.maxWords, description: "Words a brain may have." }),
	},
	{ description: "The variants of Quarry." },
);

/**
 * Quarry as a game family: the default params give the game of the old platform (the control arm of the
 * open-quarries experiment), `{ openHands: true }` its treatment arm.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: quarryFamily, params: { openHands: true }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const quarryFamily = defineGameFamily(Params, (params) => quarryGame(params));

export default quarryFamily;
