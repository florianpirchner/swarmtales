// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `clue-grid` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { defineHead, inSchemaOrder, type CtxOf, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { Card, ClueRecord, ClueSlice, copyState, GameResult, TeamName, TeamReference, type ClueState } from "./model.ts";
import { clueGridMetrics } from "./metrics.ts";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games in the match; the run ends after the last. The keeper rotates through each team's members, one game each." }),
	size: Type.Integer({ minimum: 8, maximum: 40, default: 20, description: "Words on the grid." }),
	columns: Type.Integer({ minimum: 2, maximum: 8, default: 5, description: "Words per row when the grid is shown." }),
	perTeam: Type.Integer({ minimum: 2, default: 6, description: "Words of the team with the first clue of a game." }),
	secondFewer: Type.Integer({ minimum: 0, default: 1, description: "Words fewer for the team without the first clue, to even out the first-move edge (P196)." }),
	shadows: Type.Integer({ minimum: 0, default: 2, description: "Shadow words; the rest is fog." }),
	maxNumber: Type.Integer({ minimum: 1, default: 4, description: "The highest number a clue may carry." }),
	maxClues: Type.Integer({ minimum: 1, default: 5, description: "Clues per team and game; the game ends when both teams used theirs (5 since P191: with 8, clues of 1 finished a game)." }),
	wordPoints: Type.Integer({ minimum: 0, default: 1, description: "Points per own word revealed, whoever reveals it." }),
	shadowPenalty: Type.Integer({ minimum: 0, default: 3, description: "Points a team loses per shadow it reveals." }),
	landedBonus: Type.Integer({ minimum: 0, default: 1, description: "Points per word beyond the first of a landed clue (number 2 or more, its first `number` guesses all own words): a landed 3 scores twice this (P191)." }),
	finishBonus: Type.Integer({ minimum: 0, default: 3, description: "Points for the team whose words are all revealed first (it ends the game)." }),
	extraGuess: Type.Boolean({ default: false, description: "A clue allows number + 1 guesses; off (since P191: nobody ever took the extra guess): exactly `number`." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a clue or the next guess stays open; a missing clue loses the turn, a missing guess ends it." }),
	teams: Type.Optional(
		Type.Object(
			{
				amber: Type.Array(Type.String(), { minItems: 2, description: "Resident ids of team amber, in the order the keeper role rotates." }),
				teal: Type.Array(Type.String(), { minItems: 2, description: "Resident ids of team teal, in the order the keeper role rotates." }),
			},
			{ description: "The two teams; without it the residents are split in half, the first half amber." },
		),
	),
});

// The event schemas stand outside the head so that the metrics of a later issue can be typed by them.
const events = {
	clue_game_started: Type.Object({
		game: Type.Integer(),
		startingTeam: TeamName,
		keepers: Type.Object({ amber: Type.String(), teal: Type.String() }),
		words: Type.Array(Type.String(), { description: "The grid, row by row." }),
	}),
	clue_key_dealt: Type.Object({ game: Type.Integer(), key: Type.Array(Card, { description: "Every word with its owner (sealed: audience human)." }) }),
	clue_given: Type.Object({ game: Type.Integer(), team: TeamName, keeper: Type.String(), caller: Type.String(), clueNo: Type.Integer(), word: Type.String(), number: Type.Integer() }),
	clue_intent: Type.Object({ game: Type.Integer(), team: TeamName, clueNo: Type.Integer(), targets: Type.Array(Type.String()), reason: Type.String() }),
	clue_word_revealed: Type.Object({ game: Type.Integer(), team: TeamName, by: Type.String(), clueNo: Type.Integer(), word: Type.String(), owner: Type.String(), target: Type.Boolean(), guessNo: Type.Integer() }),
	clue_closed: ClueRecord,
	clue_game_ended: Type.Object({
		game: Type.Integer(),
		result: GameResult,
		totals: Type.Record(Type.String(), Type.Number()),
		key: Type.Array(Card),
	}),
	clue_game_scored: Type.Object({ game: Type.Integer(), reference: Type.Object({ amber: TeamReference, teal: TeamReference }) }),
	clue_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()), results: Type.Array(GameResult) }),
};

/**
 * The event schemas of the clue grid, by event type: what its metrics are typed by.
 *
 * @internal
 */
export type ClueGridEvents = typeof events;

const wordParam = (description: string) => Type.String({ minLength: 1, maxLength: 40, description });

/**
 * The head of the clue grid: everything that can be read without running a handler.
 *
 * @public
 */
export const clueGridHead = defineHead({
	id: "clue-grid",
	package: "@swarmtales/mechanic-clue-grid",
	summary: "The word-clue game Lanterns for two teams: a keeper gives one-word clues, the seekers reveal words on a grid of hidden owners.",
	options,
	state: ClueSlice,
	start: (setup): ClueState => {
		const half = Math.ceil(setup.residents.length / 2);
		const chosen = setup.options.teams ?? { amber: setup.residents.slice(0, half), teal: setup.residents.slice(half) };
		const members = [...chosen.amber, ...chosen.teal];
		if (chosen.amber.length < 2 || chosen.teal.length < 2) throw new RangeError("clue-grid: each team needs a keeper and at least one seeker");
		if (new Set(members).size !== members.length) throw new RangeError("clue-grid: a resident may play in one team only");
		const unknown = members.find((id) => !setup.residents.includes(id));
		if (unknown !== undefined) throw new RangeError(`clue-grid: ${unknown} is not a resident of the run`);
		const { size, perTeam, shadows, secondFewer } = setup.options;
		if (perTeam - secondFewer < 1) throw new RangeError(`clue-grid: the second team needs at least one word (perTeam ${String(perTeam)}, secondFewer ${String(secondFewer)})`);
		if (2 * perTeam + shadows > size) throw new RangeError(`clue-grid: ${String(size)} words do not hold ${String(perTeam)} per team and ${String(shadows)} shadows`);
		return {
			teams: { amber: [...chosen.amber], teal: [...chosen.teal] },
			game: 0,
			grid: [],
			startingTeam: "amber",
			team: "amber",
			phase: "idle",
			clue: null,
			clues: [],
			opened: 0,
			log: [],
			seen: {},
			told: [],
			briefed: [],
			scores: { amber: 0, teal: 0 },
			results: [],
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	snapshot: {
		save: (state: ClueState) => copyState(state),
		// A snapshot file sorts the keys: the state comes back in the order of its schema, so the events written from it equal the straight run's (A43).
		load: (data): ClueState => inSchemaOrder(ClueSlice, data),
	},
	events,
	// Sealed: the key, the keeper's targets and reasons, the full clue records (they carry the targets) and the reference.
	audiences: { clue_key_dealt: ["human"], clue_intent: ["human"], clue_closed: ["human"], clue_game_scored: ["human"] },
	provides: [BrainSourceService],
	uses: [StrategyBrainService, TeamChannelService],
	metrics: clueGridMetrics(events),
	prompts: {
		"clue-grid/tools/viewGrid": [],
		"clue-grid/tools/giveClue": [],
		"clue-grid/tools/guess": [],
		"clue-grid/tools/endGuesses": [],
		"clue-grid/rules": ["size", "perTeam", "secondWords", "fog", "shadows", "maxNumber", "maxClues", "wordPoints", "shadowPenalty", "landedBonus", "finishBonus", "deadline", "guessLimit"],
		"clue-grid/game-head": ["game", "games", "starting", "role"],
		"clue-grid/task-clue": ["team", "clueNo", "maxClues", "grid", "own", "opponent", "shadows", "maxNumber", "pace"],
		"clue-grid/task-caller": ["team", "word", "number", "keeper", "partner", "grid", "left"],
		"clue-grid/task-partner": ["team", "word", "number", "keeper", "caller", "grid"],
		"clue-grid/keeper-silent": [],
	},
	tools: {
		viewGrid: { description: "clue-grid/tools/viewGrid", params: Type.Object({}), for: ["resident"] },
		giveClue: {
			description: "clue-grid/tools/giveClue",
			params: Type.Object({
				word: wordParam("The clue: one word, not on the grid and not part of a grid word."),
				number: Type.Integer({ minimum: 1, description: "How many of your team's words the clue points to." }),
				targets: Type.Array(Type.String({ maxLength: 40 }), { maxItems: 10, description: "Exactly `number` of your team's hidden words you mean. Secret: only the record sees them." }),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record only." })),
			}),
			for: ["resident"],
		},
		guess: {
			description: "clue-grid/tools/guess",
			params: Type.Object({
				word: wordParam("A hidden word of the grid to reveal."),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." })),
			}),
			for: ["resident"],
		},
		endGuesses: { description: "clue-grid/tools/endGuesses", params: Type.Object({}), for: ["resident"] },
	},
});

/**
 * The context of the clue grid's hooks, jobs, services and pipeline handlers.
 *
 * @public
 */
export type ClueGridCtx = CtxOf<typeof clueGridHead>;

/**
 * The context of the clue grid's tools: the mechanic's context and the caller.
 *
 * @public
 */
export type ClueGridToolCtx = ToolCtxOf<typeof clueGridHead>;

/**
 * The read-only view of the clue grid's facts and run limit.
 *
 * @public
 */
export type ClueGridView = ViewOf<typeof clueGridHead>;
