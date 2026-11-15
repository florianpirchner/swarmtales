// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The texts of the `morris` mechanic: the board as `viewBoard` shows it, and the summary of a finished game. */
import type { MorrisCtx } from "./head.ts";
import { captainOf, ENGINE, legalCodes, positionOf, type EndReason, type GameRecord, type MorrisState } from "./model.ts";
import { legalSteps, onBoard, other, renderBoard, stageOf, stepCode, stepText, type Cell, type Side, type Stage } from "./rules.ts";

const REASON_TEXT: Readonly<Record<EndReason, string>> = {
	pieces: "down to two pieces",
	blocked: "blocked, no legal move",
	repetition: "the same position came up again and again",
	quiet: "too many turns without a mill",
	turn_limit: "the turn limit",
};

/**
 * The public result of a finished game in one line.
 *
 * @param record - The finished game.
 * @returns The line, as the strategy brain's briefings show it.
 */
export function summaryOf(record: GameRecord): string {
	if (record.result === "draw") return `draw (${REASON_TEXT[record.reason]}) after ${String(record.turns)} turns`;
	return `${record.result} won (${other(record.result)} ${REASON_TEXT[record.reason]}) after ${String(record.turns)} turns`;
}

function sideText(state: Readonly<MorrisState>, side: Side, flying: boolean): string {
	const stage = stageOf(positionOf(state), side, flying);
	const word: Readonly<Record<Stage, string>> = { place: "placing", move: "moving", fly: "flying" };
	return `${side}: ${String(onBoard(state.board, side))} on the board, ${String(state.inHand[side])} in hand (${word[stage]}).`;
}

function piecesOf(board: readonly Cell[], cell: Cell): string {
	const points = board.flatMap((value, point) => (value === cell ? [String(point + 1)] : []));
	return points.length === 0 ? "none" : points.join(", ");
}

function legalText(state: Readonly<MorrisState>, flying: boolean): string {
	if (state.removing) return `${state.side} closed a mill and removes an ${other(state.side)} piece.\nLegal moves (the point of the piece to remove): ${legalCodes(state, flying).join(", ")}.`;
	const steps = legalSteps(positionOf(state), flying);
	if (stageOf(positionOf(state), state.side, flying) === "place") return `Legal moves (place on a free point; the move number is the point): ${steps.map(stepCode).join(", ")}.`;
	return `Legal moves (move number = from * 100 + to): ${steps.map((step) => `${String(stepCode(step))} (${stepText(step)})`).join(", ")}.`;
}

/**
 * The reply of `viewBoard`: the picture, the state of the game, the pieces as lists, the legal moves and the teams.
 *
 * @param ctx - The mechanic's context.
 * @returns The text.
 */
export function boardText(ctx: MorrisCtx): string {
	const state = ctx.state;
	const { flying, maxTurns, maxQuietTurns } = ctx.options;
	const lines = [renderBoard(state.board)];
	if (state.finished) lines.push("The match is over.");
	else if (!state.running) lines.push(`Game ${String(state.game)} is over; the next one starts soon.`);
	else {
		lines.push(`Game ${String(state.game)}. Turn ${String(state.turnNo)} of at most ${String(maxTurns)}. Side to move: ${state.side}. Captain of the turn: ${captainOf(state) ?? "nobody"}.`);
		lines.push(`${sideText(state, "X", flying)} ${sideText(state, "O", flying)}`);
		// The picture alone was misread in the first live run (P101): the points of each side as a list.
		lines.push(`X pieces on: ${piecesOf(state.board, "X")}. O pieces on: ${piecesOf(state.board, "O")}. Free: ${piecesOf(state.board, ".")}.`);
		if (state.inHand.X === 0 && state.inHand.O === 0) lines.push(`Turns without a mill: ${String(state.quiet)} (a draw at ${String(maxQuietTurns)}).`);
		lines.push(legalText(state, flying));
	}
	const members = (side: Side): string => (ctx.options.engine?.side === side ? `the ${ENGINE} (a computer program)` : state.teams[side].join(", "));
	lines.push(`X team: ${members("X")}. O team: ${members("O")}.`);
	return lines.join("\n");
}
