// SPDX-License-Identifier: Apache-2.0
/** The texts a seat reads: a line of the public record, the rules, its task on its turn, the table, and the input lines of an activation. */
import { rulesOf } from "./flow.ts";
import type { LiarsDiceCtx } from "./head.ts";
import { bidText, diceText, lowestFace, nameFor, scoreLine, totalDice, type DiceState, type Entry } from "./model.ts";

type Ctx = LiarsDiceCtx;
type Move = Extract<Entry, { kind: "bid" | "liar" }>;

function countsLine(state: DiceState, viewer: string | undefined): string {
	return state.seats.map((seat) => `${nameFor(seat, viewer)} ${String(state.counts[seat] ?? 0)}`).join(", ");
}

// What follows a bid or a call in the record: that the seat did not act in time, and its remark.
const tailOf = (entry: Move): string => `${entry.missed === true ? " (no action in time)" : ""}${entry.say === undefined ? "" : ` ("${entry.say}")`}`;

function liarLine(ctx: Ctx, entry: Extract<Entry, { kind: "liar" }>, viewer: string | undefined): string {
	const shown = Object.entries(entry.dice).map(([seat, dice]) => `${nameFor(seat, viewer)} ${diceText(dice)}`).join("; ");
	const held = entry.loser === entry.seat;
	const wild = ctx.options.wildOnes ? " (ones wild)" : "";
	return `${nameFor(entry.seat, viewer)} calls liar on ${entry.bidder === viewer ? "your" : `${entry.bidder}'s`} ${bidText(entry.bid)}${tailOf(entry)}. Dice: ${shown}. ${String(entry.count)} count for ${String(entry.bid.face)}${wild}: the bid ${held ? "held" : "was a lie"}, ${nameFor(entry.loser, viewer)} loses a die`;
}

function entryLine(ctx: Ctx, entry: Entry, viewer: string | undefined): string {
	switch (entry.kind) {
		case "round":
			return `Round ${String(entry.round)}: new roll; dice per seat ${Object.entries(entry.counts).map(([seat, count]) => `${nameFor(seat, viewer)} ${String(count)}`).join(", ")}; ${nameFor(entry.starter, viewer)} opens`;
		case "bid":
			return `${nameFor(entry.seat, viewer)} bids ${bidText(entry.bid)}${tailOf(entry)}`;
		case "liar":
			return liarLine(ctx, entry, viewer);
		case "out":
			return `${nameFor(entry.seat, viewer)} has no dice left and is out (place ${String(entry.place)})`;
	}
}

function placesText(ctx: Ctx): string {
	const names = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
	return ctx.state.seats.map((_, index) => `${names[index] ?? String(index + 1)} ${String(ctx.options.placePoints[index] ?? 0)}`).join(", ");
}

function rulesText(ctx: Ctx): string {
	const { dice, faces, wildOnes, talk } = ctx.options;
	return ctx.prompt("liars-dice/rules", {
		seats: ctx.state.seats.length,
		dice,
		faces,
		wild: wildOnes ? "Ones are wild: a 1 counts for every face, and nobody may bid on ones." : "No face is wild.",
		lowest: lowestFace(rulesOf(ctx)),
		places: placesText(ctx),
		talk: talk ? "A bid or a call may carry a short remark (say) that the whole table reads; it may be true or not." : "There is no table talk.",
	});
}

function choicesOf(ctx: Ctx): string {
	const state = ctx.state;
	const total = totalDice(state);
	const rules = rulesOf(ctx);
	const standing = state.standing;
	if (standing === undefined) return `open the round with any bid (bid quantity and face, faces ${String(lowestFace(rules))}-${String(rules.faces)}, at most ${String(total)} dice)`;
	const parts: string[] = [];
	if (standing.face < rules.faces) parts.push(`${String(standing.quantity)} x ${String(standing.face + 1)} up to ${String(standing.quantity)} x ${String(rules.faces)}`);
	if (standing.quantity < total) parts.push(`${String(standing.quantity + 1)} or more dice of any face ${String(lowestFace(rules))}-${String(rules.faces)}, at most ${String(total)}`);
	const raise = parts.length === 0 ? "" : `bid higher (${parts.join("; or ")}) or `;
	return `${raise}call ${state.bidder}'s bid a lie (liar)`;
}

function taskText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	return ctx.prompt("liars-dice/task", {
		round: state.round,
		dice: diceText(state.dice[seat] ?? []),
		total: totalDice(state),
		standing: state.standing === undefined ? "none yet (you open)" : `${bidText(state.standing)} by ${state.bidder}`,
		choices: choicesOf(ctx),
	});
}

// The lines of the table that only a seat reads: this round's record, its own dice or task, and the points.
function seatLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	const roundStart = state.log.map((entry) => entry.kind).lastIndexOf("round");
	const lines = [`This round so far: ${state.log.slice(Math.max(0, roundStart)).map((entry) => entryLine(ctx, entry, resident)).join("; ")}.`];
	if ((state.counts[resident] ?? 0) === 0) lines.push("You are out of this game.");
	else if (state.toAct === resident) lines.push(taskText(ctx, resident));
	else lines.push(`Your dice: ${diceText(state.dice[resident] ?? [])}. ${state.toAct} is to act; wait for your turn.`);
	lines.push(`Points in the match before this game: ${scoreLine(state.scores, state.seats, resident)}.`);
	return lines;
}

/**
 * The table as `viewTable` shows it.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller; a caller without a seat reads the public part only.
 * @returns The text.
 *
 * @public
 */
export function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats, resident)}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon. Points: ${scoreLine(state.scores, state.seats, resident)}.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, round ${String(state.round)}.`, rulesText(ctx), `Dice per seat: ${countsLine(state, resident)} (${String(totalDice(state))} on the table).`];
	if (resident !== undefined && state.seats.includes(resident)) lines.push(...seatLines(ctx, resident));
	return lines.join("\n");
}

// The last input line: the task of the seat to act, once per turn; for another seat that reads something, that it is not on turn.
function cueLine(ctx: Ctx, resident: string, reads: boolean): string | undefined {
	const state = ctx.state;
	if (state.toAct === resident) {
		if (state.told) return undefined;
		state.told = true;
		return taskText(ctx, resident);
	}
	if (!reads) return undefined;
	// A seat woken to answer its last tool result reads the record as its cue and acts out of turn (P131, P283).
	return (state.counts[resident] ?? 0) === 0 ? "You are out of this game: nothing to do; end your turn." : `Not your turn: ${state.toAct} is to act. End your turn; you will be told when it is yours.`;
}

/**
 * The input lines of a seat's activation: the rules once per game, the record since its last look, and its task or
 * the notice that it is not on turn.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident that is activated.
 * @returns The lines; none outside a game and for a resident without a seat.
 *
 * @public
 */
export function inputLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	if (!state.running || !state.seats.includes(resident)) return [];
	const lines: string[] = [];
	if (!state.briefed.includes(resident)) {
		state.briefed.push(resident);
		lines.push(`${ctx.prompt("liars-dice/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`);
	}
	const from = state.seenLog[resident] ?? 0;
	if (from < state.log.length) {
		lines.push(`${state.log.slice(from).map((entry) => entryLine(ctx, entry, resident)).join(". ")}.`);
		state.seenLog[resident] = state.log.length;
	}
	const cue = cueLine(ctx, resident, lines.length > 0);
	if (cue !== undefined) lines.push(cue);
	return lines;
}
