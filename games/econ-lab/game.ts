// SPDX-License-Identifier: Apache-2.0
/**
 * Econ Lab: four solo seats play a match of three classic experimental-economics games in neutral framing, one
 * after another, each over several rounds: a split offer (ultimatum), a shared fund (public goods) and an A-or-B
 * choice (prisoner's dilemma). The rules are in the `econ-games` mechanic. Every game starts from a fresh context;
 * the only memory across games is each seat's private strategy brain, rewritten before the first game and after
 * each game, so the question is whether a norm learned in one game carries into the next (`brain: false`: the same
 * briefings, no brain). The mechanic scores each game against Nash play and the social optimum, for the report
 * only. A port of the old `stories/econ-lab/story.ts`: the variants are options of the factory, the id is always
 * `econ-lab`. The file exports the game family: the variants that an experiment or `--set` may choose are its params,
 * and its defaults give the game of the old platform.
 */
import { econGames, type Block } from "@swarmtales/mechanic-econ-games";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, defineGameFamily } from "@swarmtales/sdk";
import { Type } from "typebox";
import { briefings, SEATS } from "./briefing.ts";

/**
 * The variants of Econ Lab.
 *
 * @public
 */
export interface EconLabOptions {
	/** The games of the match in order, with their rounds (default: split offer 6, shared fund 7, A-or-B 5; different lengths so a brain cannot learn the horizon of the next game). */
	readonly blocks?: readonly Block[];
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Tell the seats how many rounds a game has (default off: unknown horizon). */
	readonly showHorizon?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** A later game shows the results of the earlier games (default on, the old game); false: no briefing and no `viewTable` holds an earlier game's points, so the brain is the only memory (LH19). */
	readonly showResults?: boolean;
	/** The seed of the run; 23 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default is an upper bound from the rounds (the match ends the run earlier). */
	readonly ticks?: number;
}

const DEADLINE = 2;
const RETRO_TICKS = 2;

/**
 * The games of the default match, in order, with their rounds.
 *
 * @public
 */
export const DEFAULT_BLOCKS: readonly Block[] = [
	{ game: "ultimatum", rounds: 6 },
	{ game: "public-goods", rounds: 7 },
	{ game: "dilemma", rounds: 5 },
];

/** The defaults of the old game. */
const DEFAULTS = { blocks: DEFAULT_BLOCKS, brain: true, showHorizon: false, maxWords: 150, showResults: true, seed: 23 } as const satisfies EconLabOptions;
type Filled = EconLabOptions & Required<Omit<EconLabOptions, "ticks">>;

// An upper bound of the ticks: every phase runs to its deadline (a split offer has two), every retro to its timeout.
function ticksFor(blocks: readonly Block[]): number {
	const rounds = blocks.reduce((sum, block) => sum + block.rounds * (block.game === "ultimatum" ? 2 : 1) * DEADLINE, 0);
	return rounds + (blocks.length + 1) * RETRO_TICKS + 4;
}

// The two mechanics with the options of the old game, in its order. The options of `showResults` are passed only when it is off: the default game keeps its hash.
function mechanicsOf({ blocks, brain, showHorizon, maxWords, showResults }: Filled) {
	return [
		econGames({ blocks: blocks.map((block) => ({ ...block })), showHorizon, deadline: DEADLINE, ...(showResults ? {} : { showEarlierPoints: false }) }),
		strategyBrain({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true, ...(showResults ? {} : { showResults: false }) }),
	] as const;
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(econLabGame({ brain: false }), { seed: 41 });
 * ```
 *
 * @public
 */
export function econLabGame(options: EconLabOptions = {}) {
	const filled: Filled = { ...DEFAULTS, ...options };
	const brainTools = filled.brain ? (["readBrain", "writeBrain"] as const) : [];
	return defineGame({
		id: "econ-lab",
		title: "Econ lab",
		seed: filled.seed,
		residents: [...SEATS],
		mechanics: mechanicsOf(filled),
		grants: { resident: ["viewTable", "contribute", "offer", "respond", "choose", ...brainTools] },
		locked: ["contribute", "offer", "respond", "choose", ...(filled.brain ? (["writeBrain"] as const) : [])],
		// Four passes a tick: a round's decisions and the next round's opening fit in one tick; the reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "econ-games" }] } },
		limits: { maxCallsPerTick: 6 },
		end: { ticks: filled.ticks ?? ticksFor(filled.blocks) },
		win: { fact: "econ-games.scores" },
		briefing: briefings(filled.brain),
		model: "anthropic/haiku",
	});
}

const BlockParam = Type.Object(
	{
		game: Type.Union([Type.Literal("ultimatum"), Type.Literal("public-goods"), Type.Literal("dilemma")], { description: "The game of the block." }),
		rounds: Type.Integer({ minimum: 1, maximum: 50, description: "Rounds of the block." }),
	},
	{ description: "One game of the match with its rounds." },
);
/**
 * The params of the family: the variants an arm of an experiment or `--set` may choose. The seed and the tick count
 * are no params: the seed is the run's, and the tick count follows from the rounds.
 */
const Params = Type.Object(
	{
		blocks: Type.Array(BlockParam, { minItems: 1, default: DEFAULT_BLOCKS.map((block) => ({ ...block })), description: "The games of the match in order, each with its rounds." }),
		brain: Type.Boolean({ default: DEFAULTS.brain, description: "Each seat keeps a strategy brain; false: the same briefings, no brain, no retro (the control arm of the brain experiment)." }),
		showHorizon: Type.Boolean({ default: DEFAULTS.showHorizon, description: "Tell the seats how many rounds a game has." }),
		maxWords: Type.Integer({ minimum: 1, default: DEFAULTS.maxWords, description: "Words a brain may have." }),
		showResults: Type.Boolean({ default: DEFAULTS.showResults, description: "A later game shows the results of the earlier games; false: none, in the briefing and in viewTable, so the brain is the only memory (the arms of the brain-no-results experiment)." }),
	},
	{ description: "The variants of Econ Lab." },
);

/**
 * Econ Lab as a game family: the default params give the game of the old platform (the treatment arm of the brain
 * experiment), `{ brain: false }` its control arm.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: econLabFamily, params: { brain: false }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const econLabFamily = defineGameFamily(Params, (params) => econLabGame(params));

export default econLabFamily;
