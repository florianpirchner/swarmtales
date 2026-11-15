// SPDX-License-Identifier: Apache-2.0
/**
 * The `morris` mechanic: nine men's morris (rules in `rules.ts`) between two teams over a match of
 * `games` games. The mechanic owns the board, the pieces in hand, the side to move, mills and
 * removals, the end of a game (a side down to two pieces or blocked; a draw by repetition, by too many
 * turns without a mill, or by the turn limit), the game counter and the swap of the starting side.
 *
 * A move is one integer (`rules.ts`): a placement is the point, a move is `from * 100 + to`. A step
 * that closes a mill leaves the same side on move, with the same captain, for a second move that
 * names the opposing piece to remove; so the consensus gate decides each part on its own, and a
 * forfeit removal is a random removable piece. `playMove` is a locked tool, open for the captain of
 * the turn only (the captain rotates move by move unless `fixedCaptain`), and `consensus` gates it
 * further. A strategy brain plugs in through `BrainSourceService` and `StrategyBrainService`. The match ends
 * the run through the run limit `morris.match` once the last game is over. With the `engine`
 * option one side has no residents: the search (`search.ts`) plays its whole turn, step and removal,
 * the moment it comes on move, so that side is never on move between two calls and the consensus
 * gate never sees it. Nothing here scores moves (that is the morris-referee) or knows about team chat
 * beyond opening its rounds.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { ConsensusAgreedService } from "@swarmtales/mechanic-consensus/contract";
import { defineMechanic, reply } from "@swarmtales/sdk";
import { applyMove, PLAY_MOVE, problemWith, refreshLocks, startNext } from "./flow.ts";
import { morrisHead, type MorrisView } from "./head.ts";
import { captainOf, legalCodes, tallyOf, type MorrisState } from "./model.ts";
import { boardText } from "./texts.ts";

export { MorrisEvents } from "./events.ts";
export { morrisHead, type MorrisCtx, type MorrisView } from "./head.ts";
export { ENGINE, GameRecord, MorrisSlice, type EndReason, type MorrisState } from "./model.ts";
export * from "./rules.ts";
export { classify, scoreTurn, type MoveClass, type TurnScore } from "./search.ts";

/** The share of the times the fake driver (`--fake`) is asked in which a member that is not the captain looks at the board. */
const FAKE_RATE = 0.125;

// Whether `resident` is of the team on move without being its captain.
const looksOn = (state: Readonly<MorrisState>, resident: string | undefined): boolean => resident !== undefined && state.running && resident !== captainOf(state) && state.teams[state.side].includes(resident);

/**
 * Nine men's morris: a match of games between two teams, or between a team and the built-in search.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "morris", residents: 2, mechanics: [morris({ games: 1 })], locked: ["playMove"], scheduler: { id: "turns", options: { passes: 5, activation: "onNews" } }, end: { ticks: 170 }, win: { fact: "morris.tally" } });
 * ```
 *
 * @public
 */
export const morris = defineMechanic(morrisHead, {
	tools: {
		// A look now and then by a member of the team on move that is not its captain: a captain's draws stay those of its move.
		viewBoard: { sample: (ctx, random) => (looksOn(ctx.state, ctx.resident) && random.next() < FAKE_RATE ? {} : undefined), run: (_params, ctx) => reply(boardText(ctx)) },
		[PLAY_MOVE]: {
			check: (params, ctx) => problemWith(ctx.state, ctx.resident, params.move, ctx.options.flying),
			run: (params, ctx) => {
				const refusal = problemWith(ctx.state, ctx.resident, params.move, ctx.options.flying);
				if (refusal !== undefined) return refusal;
				return applyMove(ctx, params.move, false);
			},
			// A random legal move number for the captain of the turn; nobody else has a legal move. Behind a consensus gate only the agreed number is legal: none (null) until the team agreed.
			sample: (ctx, random) => {
				if (ctx.resident === undefined || ctx.resident !== captainOf(ctx.state)) return undefined;
				const agreed = ctx.tryCall(ConsensusAgreedService, "agreed", { team: ctx.state.side });
				return agreed === null ? undefined : { move: agreed ?? random.pick(legalCodes(ctx.state, ctx.options.flying)) };
			},
		},
	},
	services: {
		"consensus-source": {
			team: (_input, ctx) => (ctx.state.running ? ctx.state.side : ""),
			captain: (_input, ctx) => captainOf(ctx.state) ?? "",
			legalCells: (_input, ctx) => [...legalCodes(ctx.state, ctx.options.flying)],
			playForfeit: ({ cell }, ctx) => {
				if (problemWith(ctx.state, captainOf(ctx.state) ?? undefined, cell, ctx.options.flying) !== undefined) return false;
				applyMove(ctx, cell, true);
				return true;
			},
			invalidate: (_input, ctx) => {
				const state = ctx.state;
				if (state.finished) return false;
				state.running = false;
				state.finished = true;
				state.invalid = true;
				refreshLocks(ctx);
				ctx.emit("match_ended", { tally: tallyOf(state.results), invalid: true });
				return true;
			},
		},
		"brain-source": {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished || ctx.state.game >= ctx.options.games) return false;
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
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			after: ["strategy-brain"],
			run: (ctx) => {
				startNext(ctx);
			},
		},
		// The captain on move is told so once per turn and minute: a resident that ended its turn on a stale board ("still X's turn") gets no new input otherwise, so the runner never asks its model again and the move forfeits (P104).
		turnInputs: {
			after: ["strategy-brain"],
			run: (resident, ctx) => {
				const state = ctx.state;
				if (!state.running || captainOf(state) !== resident) return [];
				const key = `${String(state.game)}:${String(state.turnNo)}:${String(state.removing)}:${String(ctx.tick)}`;
				if (state.told === key) return [];
				state.told = key;
				const task = state.removing ? "your side closed a mill and must name the opposing piece to remove" : `turn ${String(state.turnNo + 1)}`;
				return [`Side ${state.side} is on move (${task}); you are its captain. viewBoard shows the board and the legal moves.`];
			},
		},
		news: (resident, ctx) => (ctx.options.wakeTeam && ctx.state.running ? ctx.state.teams[ctx.state.side].includes(resident) : captainOf(ctx.state) === resident),
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: MorrisView) => (view.state.invalid === true ? "the match is invalid" : view.state.finished ? "the match is over" : undefined) } },
	facts: {
		tally: { output: Type.Object({ X: Type.Integer(), O: Type.Integer(), draw: Type.Integer() }), compute: (view) => tallyOf(view.state.results) },
		captain: { output: Type.Union([Type.String(), Type.Null()]), compute: (view) => captainOf(view.state) },
	},
});
