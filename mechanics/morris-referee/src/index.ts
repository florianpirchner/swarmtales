/**
 * The `morris-referee` mechanic: a read-only listener that scores every whole turn of the morris game
 * (a step with its removal) against a depth-limited alpha-beta search and writes the score as
 * `move_scored`. It has no tools, writes no notice and no tool reply, and its events are for the human
 * and the reporter only (audience `human`), so no resident and no gamemaker learns how a move was
 * rated. It keeps its own copy of the position, replayed from the game's events. A turn with no
 * alternative is not scored.
 */
import { Type } from "typebox";
import { defineHead, defineMechanic } from "@swarmtales/kernel";
import { applyRemove, applyStep, Cell, classify, MorrisEvents, pass, scoreTurn, Side, startPosition, type Position, type Step } from "@swarmtales/mechanic-morris";

const MOVE_SCORED = Type.Object({
	game: Type.Integer(),
	turnNo: Type.Integer({ description: "The scored turn's number in its game, as in move_played." }),
	side: Side,
	class: Type.Union([Type.Literal("best"), Type.Literal("inaccuracy"), Type.Literal("blunder"), Type.Literal("missed_win")]),
	best: Type.Integer({ description: "The search value of the best turn, for the side that moved (100 = one piece)." }),
	played: Type.Integer({ description: "The search value of the played turn." }),
	depth: Type.Integer({ description: "Whole turns searched." }),
	alternatives: Type.Integer({ description: "Legal turns in the position." }),
	missedMill: Type.Boolean({ description: "A turn that closes a mill was legal and the played turn closed none." }),
});

const Count = Type.Object({ X: Type.Integer(), O: Type.Integer() });
const Saved = Type.Object({
	game: Type.Integer(),
	flying: Type.Boolean(),
	board: Type.Array(Cell),
	side: Side,
	inHand: Count,
	pending: Type.Optional(Type.Object({ board: Type.Array(Cell), side: Side, inHand: Count, from: Type.Optional(Type.Integer()), to: Type.Integer() })),
});

interface RefereeState {
	game: number;
	flying: boolean;
	position: Position;
	/** A step closed a mill: the position before it and the step, until the removal completes the turn. */
	pending: { readonly before: Position; readonly step: Step } | undefined;
}

const head = defineHead({
	id: "morris-referee",
	summary: "Scores every morris turn against a depth-limited alpha-beta search (best and played value, class); read-only, for the human and the reporter.",
	options: Type.Object({
		depth: Type.Integer({ minimum: 1, maximum: 6, default: 3, description: "Whole turns the search looks ahead at most." }),
		maxNodes: Type.Integer({ minimum: 1000, default: 200_000, description: "Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts." }),
	}),
	state: (): RefereeState => ({ game: 0, flying: true, position: startPosition("X"), pending: undefined }),
	events: { move_scored: MOVE_SCORED },
	audiences: { move_scored: ["human"] },
});

export const morrisReferee = defineMechanic(head, (kit) => ({
	listeners: [
		kit.listen(MorrisEvents, "game_started", (payload, ctx) => {
			ctx.state.game = payload.game;
			ctx.state.flying = payload.flying;
			ctx.state.position = startPosition(payload.startingSide, payload.pieces);
			ctx.state.pending = undefined;
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
				score(pending.before, { ...pending.step, remove: removed });
				state.position = pass(applyRemove(state.position, removed));
				state.pending = undefined;
				return;
			}
			const step: Step = payload.from === undefined ? { to: payload.to - 1 } : { from: payload.from - 1, to: payload.to - 1 };
			const before = state.position;
			const after = applyStep(before, step).position;
			if (payload.mill) {
				state.pending = { before, step };
				state.position = after;
				return;
			}
			score(before, step);
			state.position = pass(after);
		}),
	],
	snapshot: kit.snapshot({
		version: 1,
		schema: Saved,
		save: (state) => ({
			game: state.game,
			flying: state.flying,
			board: [...state.position.board],
			side: state.position.side,
			inHand: { ...state.position.inHand },
			...(state.pending === undefined
				? {}
				: { pending: { board: [...state.pending.before.board], side: state.pending.before.side, inHand: { ...state.pending.before.inHand }, ...(state.pending.step.from === undefined ? {} : { from: state.pending.step.from }), to: state.pending.step.to } }),
		}),
		load: (data) => ({
			game: data.game,
			flying: data.flying,
			position: { board: [...data.board], side: data.side, inHand: { ...data.inHand } },
			pending: data.pending === undefined ? undefined : { before: { board: [...data.pending.board], side: data.pending.side, inHand: { ...data.pending.inHand } }, step: data.pending.from === undefined ? { to: data.pending.to } : { from: data.pending.from, to: data.pending.to } },
		}),
	}),
}));
