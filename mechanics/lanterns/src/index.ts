// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `lanterns` mechanic: the word-clue game Lanterns (docs/ideas/game-roadmap.md §2.9) for two teams.
 * A grid of words is dealt; each word secretly belongs to team amber, team teal, the fog (nobody) or the
 * shadows (a penalty). Each game one member of a team is its keeper (the role rotates game by game) and
 * sees the key; the others are seekers and see only the words. Teams take turns: the keeper gives one
 * clue (`giveClue`: one word, a number, and the words it means, sealed for the report), then the caller
 * of the clue (the seekers take turns) reveals words one at a time (`guess`) while the other seeker
 * advises in the team chat. An own word lets the caller go on, up to `number` guesses (number + 1 with `extraGuess`); a fog word, an
 * opponent's word or a shadow ends the turn. Scoring (original, not a recreation of any published word
 * game): a point per own word revealed (whoever reveals it), minus a penalty per shadow a team reveals, a
 * bonus per word beyond the first of a landed clue (number of 2 or more, and its first `number` guesses were all own words), and a
 * bonus for the team whose words are all revealed first, which ends the game; otherwise the game ends
 * when both teams used their clues. A keeper may not post in the team chat during a game. The keeper's
 * targets make the report's measure (`clue_game_scored`, audience human): how much of what the keeper
 * meant the seekers found. A strategy brain plugs in through `BrainSourceService` and `StrategyBrainService`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { closeClue, clueRefusal, endGuesses, giveClue, guess, guessRefusal, isKeeper, keeper, newClue, startNext } from "./flow.ts";
import { clueGridHead, type ClueGridView } from "./head.ts";
import { GameResult, seekersOf } from "./model.ts";
import { sampleClue, sampleGuess, sampleStop, sampleView } from "./samples.ts";
import { gridView, inputLines } from "./texts.ts";

/** The team chat's post tool, which a keeper may not use while a game runs. */
const TEAM_POST = "postTeam";

type View = ClueGridView;

/**
 * The clue grid: two teams, a keeper who gives one-word clues and seekers who reveal words on a grid of hidden owners.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "clues", residents: 6, mechanics: [clueGrid({ games: 2 })], end: { ticks: 80 }, win: { fact: "lanterns.scores" } });
 * ```
 *
 * @public
 */
export const clueGrid = defineMechanic(clueGridHead, {
	tools: {
		viewGrid: { sample: sampleView, run: (_params, ctx) => reply(gridView(ctx, ctx.resident)) },
		giveClue: {
			check: (params, ctx) => clueRefusal(ctx, ctx.resident, params.word, params.number, params.targets),
			sample: sampleClue,
			run: (params, ctx) => giveClue(ctx, ctx.resident, params.word, params.number, params.targets, params.reason ?? ""),
		},
		guess: {
			check: (_params, ctx) => guessRefusal(ctx, ctx.resident),
			sample: sampleGuess,
			run: (params, ctx) => guess(ctx, ctx.resident, params.word),
		},
		endGuesses: {
			check: (_params, ctx) => guessRefusal(ctx, ctx.resident),
			sample: sampleStop,
			run: (_params, ctx) => endGuesses(ctx, ctx.resident),
		},
	},
	services: {
		"brain-source": {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.tick + 1, "nextGame");
				return null;
			},
		},
	},
	// A keeper says nothing in the team chat while a game runs; the clue is the only channel.
	pipeline: {
		lock: (call, ctx) => (call.tool === TEAM_POST && call.resident !== undefined && ctx.state.running && isKeeper(ctx.state, call.resident) ? refuse("KEEPER_SILENT", ctx.prompt("lanterns/keeper-silent", {})) : undefined),
	},
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			after: ["strategy-brain"],
			run: (ctx) => {
				startNext(ctx);
			},
		},
		// The clue and guess deadline. It may end a game and open a retro, so a game loads this mechanic before the strategy brain.
		tickEnded: (ctx) => {
			const state = ctx.state;
			if (!state.running || state.phase === "idle" || ctx.tick - state.opened + 1 < ctx.options.deadline) return;
			if (state.phase === "clue") {
				closeClue(ctx, newClue(state, "", 0, []), "no-clue", ctx.tick + 1);
				return;
			}
			if (state.clue !== null) closeClue(ctx, state.clue, "timeout", ctx.tick + 1);
		},
		news: (resident, ctx) => {
			const state = ctx.state;
			if (!state.running) return false;
			if (state.phase === "clue") return resident === keeper(state, state.team);
			const clue = state.clue;
			if (clue === null) return false;
			if (resident === clue.caller) return true;
			return seekersOf(state.teams[clue.team], state.game).includes(resident) && !state.told.includes(resident);
		},
		turnInputs: (resident, ctx) => inputLines(ctx, resident),
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: View) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
		results: { output: Type.Array(GameResult), compute: (view) => structuredClone(view.state.results) },
	},
});
