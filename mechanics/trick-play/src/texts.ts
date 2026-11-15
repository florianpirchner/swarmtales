// SPDX-License-Identifier: Apache-2.0
/** The texts of trick play: the table a seat reads, its action line with the levers, and the record after a game. */
import { CardTableService, renderHand } from "@swarmtales/mechanic-card-table/contract";
import { vetoProblem } from "./checks.ts";
import { cardsOf, currentTrick, handOf, ledSuit, suitNames } from "./flow.ts";
import type { TrickPlayCtx } from "./head.ts";
import { legalCards, type RoundRecord, type Trick } from "./model.ts";

type Ctx = TrickPlayCtx;

function trickText(trick: Trick, index: number): string {
	const plays = trick.plays.map((play) => `${play.seat} ${play.card}`).join(", ");
	return `${String(index + 1)}. ${plays}${trick.winner === undefined ? "" : ` -> ${trick.winner}`}`;
}

// What a seat should do now, as one line; with `reference: "bid"` the bidder also reads its hand's worth.
function actionHint(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	if (state.actor !== seat) return state.actor === null ? "Nothing to do right now." : `Waiting for ${state.actor}.`;
	if (state.phase === "bid") {
		const worth = ctx.options.reference === "bid" ? state.worth?.[seat] : undefined;
		const hint = worth === undefined ? "" : ` A simulation of random deals and trumps rates your hand at about ${worth.toFixed(1)} tricks from your seat.`;
		return `Your turn to bid: placeBid with 0 to ${String(cardsOf(ctx))}.${hint}`;
	}
	if (state.phase === "trump") return `You have the lowest bid: name the trump with nameTrump (${suitNames(ctx).join(", ")}).`;
	const legal = legalCards(handOf(ctx, seat), ledSuit(state), currentTrick(state)?.vetoed);
	const veto = vetoProblem(ctx, seat) === undefined ? " Or spend your veto token with vetoLead to send the lead back." : "";
	return `Your turn: playCard. Legal now: ${legal.join(", ")}.${veto}`;
}

// The lever `bidSum`: the bids placed so far against the tricks of the round, with the seats still to bid.
function bidSumText(ctx: Ctx): string {
	const state = ctx.state;
	const sum = Object.values(state.bids).reduce((total, bid) => total + bid, 0);
	const open = state.order.filter((name) => state.bids[name] === undefined).length;
	return `Tricks bid so far: ${String(sum)} of the round's ${String(cardsOf(ctx))}${open === 0 ? "" : ` (${String(open)} bid(s) still to come)`}.`;
}

// The lever `calibration`: one seat's bidding in a finished game, tricks bid against tricks taken, hits and zero bids; with `reference: "retro"` also the worth of its hands.
function calibrationText(rounds: readonly RoundRecord[], seat: string, withReference: boolean): string {
	const bid = rounds.reduce((total, round) => total + (round.bids[seat] ?? 0), 0);
	const taken = rounds.reduce((total, round) => total + (round.tricks[seat] ?? 0), 0);
	const hits = rounds.filter((round) => (round.bids[seat] ?? 0) === (round.tricks[seat] ?? 0)).length;
	const zeros = rounds.filter((round) => (round.bids[seat] ?? 0) === 0).length;
	const count = rounds.length;
	const gap = (taken - bid) / count;
	const verdict = Math.abs(gap) < 0.25 ? "your bids matched your tricks well" : gap > 0 ? `you took ${gap.toFixed(1)} more trick(s) per round than you bid: you underbid` : `you took ${(-gap).toFixed(1)} fewer trick(s) per round than you bid: you overbid`;
	const line = `Your calibration this game: you bid ${String(bid)} tricks in all and took ${String(taken)} over ${String(count)} rounds; ${String(hits)} of ${String(count)} bids hit; ${String(zeros)} of your bids were 0. In short, ${verdict}.`;
	if (!withReference || rounds.some((round) => round.worth?.[seat] === undefined)) return line;
	const worth = rounds.reduce((total, round) => total + (round.worth?.[seat] ?? 0), 0);
	const perRound = rounds.map((round) => `r${String(round.round)} bid ${String(round.bids[seat] ?? 0)}, worth ${(round.worth?.[seat] ?? 0).toFixed(1)}, took ${String(round.tricks[seat] ?? 0)}`);
	return `${line} A simulation of random deals and trumps rated your hands at ${worth.toFixed(1)} tricks in all (${(worth / count).toFixed(1)} per round), against your ${String(bid)} bid: ${perRound.join("; ")}.`;
}

// The lines of the trick on the table and of this round's tricks.
function playLines(ctx: Ctx, scores: (record: Readonly<Record<string, number>>) => string): string[] {
	const state = ctx.state;
	const lines: string[] = [];
	const done = state.tricks.filter((trick) => trick.winner !== undefined);
	if (done.length > 0) lines.push(`Tricks this round: ${done.map(trickText).join("; ")}.`);
	const trick = currentTrick(state);
	if (trick !== undefined) {
		const plays = trick.plays.length === 0 ? `nothing yet, ${trick.leader} leads` : trick.plays.map((play) => `${play.seat} ${play.card}`).join(", ");
		lines.push(`On the table (trick ${String(state.tricks.length)} of ${String(cardsOf(ctx))}): ${plays}${trick.vetoed === undefined ? "" : ` (${trick.vetoed} vetoed as lead)`}.`);
	}
	lines.push(`Tricks won this round: ${scores(state.won)}.`);
	return lines;
}

// The first lines of the table: the round, the reader's hand, the bids (with the lever `bidSum`) and the trump.
function headLines(ctx: Ctx, seat: string): string[] {
	const state = ctx.state;
	const suits = ctx.call(CardTableService, "suits", {});
	return [
		`Game ${String(state.game)} of ${String(ctx.options.games)}, round ${String(state.round)} of ${String(ctx.options.rounds.length)}: ${String(cardsOf(ctx))} card(s) each. Dealer ${state.dealer}. Seats in table order: ${state.seats.join(", ")}.`,
		state.seats.includes(seat) ? `Your hand: ${renderHand(handOf(ctx, seat), suits)}` : "You have no seat.",
		`Bids (bidding order): ${state.order.map((name) => `${name} ${state.bids[name] === undefined ? "-" : String(state.bids[name])}`).join(", ")}.`,
		...(ctx.options.bidSum ? [bidSumText(ctx)] : []),
		ctx.options.trump === "none" ? "No trump in this game." : state.trump === null ? "Trump: not named yet (the lowest bidder names it once every bid is in)." : `Trump: ${state.trump} (named by ${state.namer ?? "?"}).`,
	];
}

/**
 * The table as `seat` sees it: its own hand and everything public.
 *
 * @param ctx - The context.
 * @param seat - The reader.
 * @returns The text, one fact per line.
 *
 * @public
 */
export function tableText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	if (state.finished) return "The match is over.";
	if (state.phase === "idle") return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon.`;
	const scores = (record: Readonly<Record<string, number>>): string => state.seats.map((name) => `${name} ${String(record[name] ?? 0)}`).join(", ");
	const lines = headLines(ctx, seat);
	if (state.phase === "play") lines.push(...playLines(ctx, scores));
	lines.push(`Scores this game: ${scores(state.totals)}.`);
	const mine = state.rounds.map((record) => `r${String(record.round)} bid ${String(record.bids[seat] ?? 0)} took ${String(record.tricks[seat] ?? 0)} (${(record.points[seat] ?? 0) >= 0 ? "+" : ""}${String(record.points[seat] ?? 0)})`);
	if (mine.length > 0) lines.push(`Your rounds this game: ${mine.join("; ")}.`);
	if (ctx.options.vetoTokens > 0) lines.push(`Veto tokens left: ${scores(state.vetoes)}.`);
	lines.push(actionHint(ctx, seat));
	return lines.join("\n");
}

/**
 * What `viewTable` answers: the full table for the seat on turn, a short wait line for the others.
 *
 * @param ctx - The context.
 * @param seat - The caller.
 * @returns The answer.
 *
 * @public
 */
export function tableView(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	if (state.finished || state.phase === "idle" || state.actor === null || state.actor === seat) return tableText(ctx, seat);
	return `Not your turn: waiting for ${state.actor}. You get the full table in your input when it is your turn; do nothing until then.`;
}

/**
 * The public record of a finished game, round by round: what a seat needs to judge its own bidding.
 *
 * @param ctx - The context.
 * @param seat - The reader.
 * @returns The text; empty before the first game ended.
 *
 * @public
 */
export function debriefText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	const record = state.results.at(-1);
	if (record === undefined) return "";
	const scores = (values: Readonly<Record<string, number>>): string => state.seats.map((name) => `${name} ${String(values[name] ?? 0)}`).join(", ");
	const rounds = record.rounds.map((round) => {
		const seats = state.seats.map((name) => `${name} ${String(round.bids[name] ?? 0)}/${String(round.tricks[name] ?? 0)}`).join(", ");
		return `r${String(round.round)} (${String(round.cards)} card(s), trump ${round.trump ?? "none"}${round.namer === null ? "" : ` by ${round.namer}`}): ${seats}`;
	});
	const lines = [`Game ${String(record.game)} is over. Winner: ${record.result}. Final scores: ${scores(record.totals)}.`, `Bid/taken per round: ${rounds.join("; ")}.`];
	if (ctx.options.calibration && state.seats.includes(seat)) lines.push(calibrationText(record.rounds, seat, ctx.options.reference === "retro"));
	return lines.join("\n");
}
