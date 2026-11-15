// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `morris-referee` mechanic: a read-only listener that scores every whole turn of the morris game
 * (a step with its removal) against a depth-limited alpha-beta search and writes the score as
 * `move_scored`. It has no tools, writes no notice and no tool reply, and its events are for the human
 * and the reporter only (audience `human`), so no resident and no gamemaker learns how a move was
 * rated. It keeps its own copy of the position, replayed from the game's events. A turn with no
 * alternative is not scored.
 *
 * @packageDocumentation
 */
import { Type, type Static } from "typebox";
import { defineHead, defineMechanic } from "@swarmtales/sdk";
import { classify, MorrisEvents, scoreTurn } from "@swarmtales/mechanic-morris/contract";
import { applyRemove, applyStep, Cell, pass, Side, startPosition, type Position, type Step } from "@swarmtales/mechanic-morris/rules";
import { refereeEvents, refereeMetrics } from "./metrics.ts";

const Count = Type.Object({ X: Type.Integer(), O: Type.Integer() }, { description: "The pieces each side still has in hand." });
const Placed = { board: Type.Array(Cell, { description: "The 24 points of the board." }), side: Side, inHand: Count };

// The state, which is the snapshot slice of version 1 as the old platform saved it: the referee's own copy of the position.
const RefereeState = Type.Object(
	{
		game: Type.Integer({ description: "The number of the game being replayed; 0 before the first." }),
		flying: Type.Boolean({ description: "Whether a side with three pieces may fly, as the game announced." }),
		...Placed,
		pending: Type.Optional(
			Type.Object(
				{ ...Placed, from: Type.Optional(Type.Integer({ description: "The point the piece left; absent for a placement." })), to: Type.Integer({ description: "The point the piece went to." }) },
				{ description: "A step closed a mill: the position before it and the step, until the removal completes the turn." },
			),
		),
	},
	{ description: "The referee's copy of the morris position, replayed from the game's events." },
);
type RefereeState = Static<typeof RefereeState>;

const placed = (position: Position): Pick<RefereeState, "board" | "side" | "inHand"> => ({ board: [...position.board], side: position.side, inHand: { ...position.inHand } });

const head = defineHead({
	id: "morris-referee",
	package: "@swarmtales/mechanic-morris-referee",
	summary: "Scores every morris turn against a depth-limited alpha-beta search (best and played value, class); read-only, for the human and the reporter.",
	options: Type.Object({
		depth: Type.Integer({ minimum: 1, maximum: 6, default: 3, description: "Whole turns the search looks ahead at most." }),
		maxNodes: Type.Integer({ minimum: 1000, default: 200_000, description: "Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts." }),
	}),
	state: RefereeState,
	start: (): RefereeState => ({ game: 0, flying: true, ...placed(startPosition("X")) }),
	events: refereeEvents,
	metrics: refereeMetrics(refereeEvents),
	audiences: { move_scored: ["human"] },
});

/**
 * The morris referee: scores every whole turn of nine men's morris against the search, for the human and the reporter.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "scored", residents: 2, mechanics: [morris(), morrisReferee({ depth: 3 })], end: { ticks: 400 } });
 * ```
 *
 * @public
 */
export const morrisReferee = defineMechanic(head, {
	listeners: (kit) => [
		kit.listen(MorrisEvents, "game_started", (payload, ctx) => {
			Object.assign(ctx.state, { game: payload.game, flying: payload.flying }, placed(startPosition(payload.startingSide, payload.pieces)));
			delete ctx.state.pending;
		}),
		kit.listen(MorrisEvents, "move_played", (payload, ctx) => {
			const state = ctx.state;
			if (payload.game !== state.game) return;
			const score = (before: Position, turn: Step & { readonly remove?: number }): void => {
				const scored = scoreTurn(before, turn, state.flying, ctx.options.depth, ctx.options.maxNodes);
				if (scored === undefined) return;
				ctx.emit("move_scored", { game: payload.game, turnNo: payload.turnNo, side: payload.side, class: classify(scored), best: Math.round(scored.best), played: Math.round(scored.played), depth: scored.depth, alternatives: scored.alternatives, missedMill: scored.missedMill });
			};
			if (payload.kind === "remove") {
				const pending = state.pending;
				if (pending === undefined) return;
				const removed = payload.to - 1;
				score(pending, { ...(pending.from === undefined ? {} : { from: pending.from }), to: pending.to, remove: removed });
				Object.assign(state, placed(pass(applyRemove(state, removed))));
				delete state.pending;
				return;
			}
			const step: Step = payload.from === undefined ? { to: payload.to - 1 } : { from: payload.from - 1, to: payload.to - 1 };
			const before = placed(state);
			const after = applyStep(before, step).position;
			if (payload.mill) {
				state.pending = { ...before, ...step };
				Object.assign(state, placed(after));
				return;
			}
			score(before, step);
			Object.assign(state, placed(pass(after)));
		}),
	],
});
