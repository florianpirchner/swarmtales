// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Lanterns: two teams of three residents play a match of an original word-clue game on a grid of 20 words. Each game
 * one member of each team is its keeper (the role rotates game by game) and sees which words belong to whom; the two
 * others are seekers. On its turn the keeper gives one clue word and a number and names, sealed for the report, the
 * words it means; the seekers take turns calling the guesses while the other advises in the team chat. The rules are
 * in the `lanterns` mechanic. Every game starts from a fresh context; the only memory across games is the team's
 * strategy brain (`brain: false`: the same briefings, no brain), so the question is whether a team builds conventions
 * between keeper and seekers that survive a change of keeper. The mechanic scores how much of what the keeper meant
 * the seekers found, for the report only. A port of the old `stories/lanterns/story.ts`: the variants are options of
 * the factory, the id is always `lanterns`. The file exports the game family: the variants that an experiment or
 * `--set` may choose are its params, and its defaults give the game of the old platform.
 */
import { clueGrid } from "@swarmtales/mechanic-lanterns";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, defineGameFamily } from "@swarmtales/sdk";
import { Type } from "typebox";
import { briefings, RESIDENTS, TEAMS } from "./briefing.ts";

/**
 * The variants of Lanterns.
 *
 * @public
 */
export interface LanternsOptions {
	/** Games in the match (default 4: each team starts twice; the keeper role goes A01, A02, A03, A01). */
	readonly games?: number;
	/** Teams keep a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Clues per team and game. */
	readonly maxClues?: number;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** The seed of the run; 31 when absent. */
	readonly seed?: number;
	/** Run length in ticks; the default is an upper bound (the match ends the run earlier). */
	readonly minutes?: number;
}

/** Games in the match: 4 since P196, so each team has the first clue twice (with 3, amber started twice and won 8 of 12). */
const DEFAULT_GAMES = 4;
/** Clues per team and game (8 in the first run; 5 since P191, so a game of clues of 1 cannot finish). */
const DEFAULT_CLUES = 5;
/** Words a brain may have. */
const DEFAULT_WORDS = 200;
const DEADLINE = 2;
const RETRO_MINUTES = 3;
/** Output cap per call (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16_000;
/** What the retro asks the team to write (P195: without it the brains were lists of caution). */
const RETRO_FOCUS =
	"Each of you will be the keeper in turn, so write your team's conventions, the shared code between keeper and seekers: how a keeper picks and shapes a clue (kinds of links, how the number is meant) and how the seekers read it (which link first, what a number promises). Keep conventions that worked, change those that did not. Do not write general caution: the rules already punish wrong words.";

/** An upper bound of the ticks: every clue turn runs to its deadline and every guess too, every retro to its timeout. */
const minutesFor = (games: number, maxClues: number): number => games * 2 * maxClues * DEADLINE * 3 + (games + 1) * RETRO_MINUTES + 4;

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(lanternsGame({ brain: false }), { seed: 67 });
 * ```
 *
 * @public
 */
export function lanternsGame(options: LanternsOptions = {}) {
	const { games = DEFAULT_GAMES, brain = true, maxClues = DEFAULT_CLUES, maxWords = DEFAULT_WORDS, seed = 31 } = options;
	const teams = { amber: [...TEAMS.amber], teal: [...TEAMS.teal] };
	return defineGame({
		id: "lanterns",
		title: "Lanterns",
		seed,
		residents: [...RESIDENTS],
		mechanics: [
			clueGrid({ games, maxClues, deadline: DEADLINE, teams }),
			teamChannel({ teams, maxPostsPerMove: 3 }),
			strategyBrain({ enabled: brain, maxWords, teams, retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true, retroFocus: RETRO_FOCUS }),
		],
		grants: { resident: ["viewGrid", "giveClue", "guess", "endGuesses", "postTeam", "readTeam", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["giveClue", "guess", "endGuesses", ...(brain ? (["writeBrain"] as const) : [])],
		// Five passes a tick: a clue, the partner's advice and a few guesses fit in one tick; the reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "lanterns" }, { source: "team-channel" }] } },
		// A caller may view, read, post and make up to five guesses in one tick, and still write the brain if the game ends then.
		limits: { maxCallsPerTick: 12 },
		end: { ticks: options.minutes ?? minutesFor(games, maxClues) },
		win: { fact: "lanterns.scores" },
		briefing: briefings(brain),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
	});
}

/**
 * The params of the family: the variants an arm of an experiment or `--set` may choose. The seed and the tick count
 * are no params: the seed is the run's, and the tick count follows from the games and the clues.
 */
const Params = Type.Object(
	{
		games: Type.Integer({ minimum: 1, maximum: 20, default: DEFAULT_GAMES, description: "Games in the match; the keeper role rotates game by game." }),
		brain: Type.Boolean({ default: true, description: "Each team keeps a strategy brain; false: the same briefings, no brain, no retro (the control arm of the brain experiment)." }),
		maxClues: Type.Integer({ minimum: 1, default: DEFAULT_CLUES, description: "Clues per team and game." }),
		maxWords: Type.Integer({ minimum: 1, default: DEFAULT_WORDS, description: "Words a brain may have." }),
	},
	{ description: "The variants of Lanterns." },
);

/**
 * Lanterns as a game family: the default params give the registry default of the old platform (four games, a brain
 * per team: the treatment arm of the brain experiment), `{ brain: false }` its control arm.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: lanternsFamily, params: { brain: false }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const lanternsFamily = defineGameFamily(Params, (params) => lanternsGame(params));

export default lanternsFamily;
