/**
 * The `trick-play` mechanic: a trick-taking game with exact bidding on the `card-table`, played by
 * solo seats over a match of `games` games, each a list of `rounds` (cards dealt per round).
 * A round:
 * 1. deal (the dealer rotates by round and game); every seat bids, in order from the dealer's left,
 *    how many tricks it will take exactly; bids are public;
 * 2. with `trump: "lowestBidderNames"` the seat with the lowest bid (the earliest on a tie) names the
 *    trump suit after all bids are public (`"none"`: no trump);
 * 3. tricks: the first bidder leads, a follower must follow the suit led when it can, the highest
 *    trump or else the highest card of the suit led wins, the winner leads next. Right after a lead,
 *    the next seat may spend its veto token (`vetoTokens` per game) instead of playing: the lead card
 *    goes back and the leader must lead another suit;
 * 4. scoring: a hit (tricks taken equal the bid) is `hit + perTrick * taken`, a miss costs the square
 *    of the error (`scoring.miss`).
 * The engine enforces every rule and counts every trick; a seat that does nothing for `maxIdleMinutes`
 * whole minutes gets a random legal action from the seeded stream (flag `forfeit`). The match ends
 * the run through the referee limit `trick-play.match`. A strategy brain plugs in through
 * `BrainSourceApi` (it may hold the next game for a retro) and `StrategyBrainApi` (game start and end;
 * with `briefEveryRound` every round counts as a start, so each round begins from a fresh context).
 * Nothing here knows chat, memory or scoring against a reference.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { CardTableApi, deckOf, parseCard, renderHand, suitOf } from "@swarmtales/mechanic-card-table";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import { TrickPlayApi } from "./api.ts";
import { TrickPlayEvents } from "./events.ts";
import { legalCards, orderAfter, roundPoints, Scoring, trickWinner, TrickSlice, trumpNamer, type Trick, type TrickState } from "./model.ts";


const options = Type.Object({
	games: Type.Integer({ minimum: 1, default: 3, description: "Games in the match; the run ends after the last one." }),
	rounds: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, default: [1, 2, 3, 4, 5, 6, 7, 8], description: "Cards dealt to each seat, round by round; a game has one round per entry." }),
	trump: Type.Union([Type.Literal("lowestBidderNames"), Type.Literal("none")], { default: "lowestBidderNames", description: "lowestBidderNames: the lowest bidder names the trump suit once every bid is public; none: no trump." }),
	vetoTokens: Type.Integer({ minimum: 0, default: 1, description: "Veto tokens each seat gets per game (0: no veto)." }),
	scoring: Type.Object(Scoring.properties, { default: { hit: 10, perTrick: 3, miss: "square" }, description: "Points of a round: hit plus perTrick per trick on a hit; a miss costs the error squared (or 10 per trick off)." }),
	maxIdleMinutes: Type.Integer({ minimum: 1, default: 3, description: "Whole minutes a seat may leave its action open before the move timer acts for it." }),
	maxConsecutiveForfeits: Type.Integer({ minimum: 0, default: 0, description: "That many timer actions in a row end the match as invalid (0: off)." }),
	briefEveryRound: Type.Boolean({ default: false, description: "Tell a strategy brain of every round's start, not only the game's, so every round begins from a fresh context with the briefing." }),
});

const head = defineHead({
	id: "trick-play",
	summary: "A trick-taking game with exact bids, a trump named by the lowest bidder, follow-suit tricks, a lead veto and hit-or-miss scoring.",
	options,
	state: (): TrickState => ({
		seats: [],
		game: 0,
		round: 0,
		phase: "idle",
		dealer: "",
		order: [],
		actor: null,
		bids: {},
		trump: null,
		namer: null,
		tricks: [],
		won: {},
		totals: {},
		vetoes: {},
		rounds: [],
		results: [],
		finished: false,
		held: false,
		due: false,
		watch: "",
		idle: 0,
		forfeits: 0,
		debrief: [],
	}),
	events: TrickPlayEvents.events,
	provides: [TrickPlayApi, BrainSourceApi],
	requires: [CardTableApi],
	uses: [StrategyBrainApi],
	prompts: {
		"trick-play/tools/viewTable": [],
		"trick-play/tools/placeBid": [],
		"trick-play/tools/nameTrump": [],
		"trick-play/tools/playCard": [],
		"trick-play/tools/vetoLead": [],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const zeros = (seats: readonly string[]): Record<string, number> => Object.fromEntries(seats.map((seat) => [seat, 0]));
const cardsOf = (ctx: Ctx): number => ctx.options.rounds[ctx.state.round - 1] ?? 0;
const handOf = (ctx: Ctx, seat: string): string[] => ctx.call(CardTableApi, "hand", { resident: seat });
const suitNames = (ctx: Ctx): string[] => ctx.call(CardTableApi, "suits", {}).map((suit) => suit.name);
const currentTrick = (state: Readonly<TrickState>): Trick | undefined => state.tricks.at(-1);
const nextSeat = (seats: readonly string[], seat: string): string => seats[(seats.indexOf(seat) + 1) % seats.length] ?? "";

/** What the move timer watches: the same key at a minute's start and end means nothing happened in it. */
function actionKey(state: Readonly<TrickState>): string {
	return state.actor === null ? "" : `${String(state.game)}:${String(state.round)}:${state.phase}:${state.actor}:${String(state.tricks.length)}:${String(currentTrick(state)?.plays.length ?? 0)}`;
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.debrief = [];
	state.totals = zeros(state.seats);
	state.vetoes = Object.fromEntries(state.seats.map((seat) => [seat, ctx.options.vetoTokens]));
	state.rounds = [];
	const firstDealer = state.seats[(game - 1) % state.seats.length] ?? "";
	const first = orderAfter(state.seats, firstDealer)[0] ?? "";
	ctx.emit("game_started", { game, seats: [...state.seats], startingSide: first });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first });
	startRound(ctx, 1);
}

function startRound(ctx: Ctx, round: number): void {
	const state = ctx.state;
	state.round = round;
	state.dealer = state.seats[(state.game - 1 + round - 1) % state.seats.length] ?? "";
	state.order = orderAfter(state.seats, state.dealer);
	state.bids = {};
	state.trump = null;
	state.namer = null;
	state.tricks = [];
	state.won = zeros(state.seats);
	const cards = cardsOf(ctx);
	ctx.call(CardTableApi, "deal", { cards });
	state.phase = "bid";
	state.actor = state.order[0] ?? null;
	ctx.emit("round_started", { game: state.game, round, cards, dealer: state.dealer, order: [...state.order] });
	if (round > 1 && ctx.options.briefEveryRound) ctx.tryCall(StrategyBrainApi, "gameStarted", { game: state.game, first: state.actor ?? "" });
}

/** Starts the next game, or marks it due when another mechanic holds it back. */
function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.phase !== "idle") return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

function beginPlay(ctx: Ctx): void {
	const state = ctx.state;
	const leader = state.order[0] ?? "";
	state.phase = "play";
	state.tricks = [{ leader, plays: [] }];
	state.actor = leader;
}

function applyBid(ctx: Ctx, seat: string, bid: number, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	state.bids[seat] = bid;
	ctx.emit("bid_placed", { game: state.game, round: state.round, seat, bid, forfeit });
	const next = state.order[state.order.indexOf(seat) + 1];
	if (next !== undefined) {
		state.actor = next;
		return reply(`Bid ${String(bid)} placed. ${next} bids next.`);
	}
	if (ctx.options.trump === "none") {
		beginPlay(ctx);
		return reply(`Bid ${String(bid)} placed. Every bid is in; no trump this round. ${state.actor ?? ""} leads.`);
	}
	const namer = trumpNamer(state.order, state.bids);
	state.namer = namer;
	state.phase = "trump";
	state.actor = namer;
	return reply(`Bid ${String(bid)} placed. Every bid is in; ${namer} (lowest bid) names the trump.`);
}

function applyTrump(ctx: Ctx, seat: string, suit: string, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	state.trump = suit;
	ctx.emit("trump_named", { game: state.game, round: state.round, seat, suit, forfeit });
	beginPlay(ctx);
	return reply(`Trump is ${suit}. ${state.actor ?? ""} leads the first trick.`);
}

function applyPlay(ctx: Ctx, seat: string, card: string, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	const trick = currentTrick(state);
	if (trick === undefined || !ctx.call(CardTableApi, "take", { resident: seat, card })) throw new Error(`trick-play: ${seat} cannot play ${card}`);
	trick.plays.push({ seat, card });
	const number = state.tricks.length;
	ctx.emit("card_played", { game: state.game, round: state.round, trick: number, seat, card, forfeit });
	if (trick.plays.length < state.seats.length) {
		state.actor = nextSeat(state.seats, seat);
		return reply(`You played ${card}. ${state.actor} plays next.`);
	}
	const winner = trickWinner(trick.plays, state.trump);
	trick.winner = winner;
	state.won[winner] = (state.won[winner] ?? 0) + 1;
	ctx.emit("trick_won", { game: state.game, round: state.round, trick: number, seat: winner, plays: trick.plays.map((play) => ({ ...play })) });
	if (number < cardsOf(ctx)) {
		state.tricks.push({ leader: winner, plays: [] });
		state.actor = winner;
		return reply(`You played ${card}. ${winner} wins trick ${String(number)} and leads the next.`);
	}
	scoreRound(ctx);
	return reply(`You played ${card}. ${winner} wins trick ${String(number)}; the round is over and scored.`);
}

function applyVeto(ctx: Ctx, seat: string): ToolSuccess {
	const state = ctx.state;
	const trick = currentTrick(state);
	const lead = trick?.plays[0];
	if (trick === undefined || lead === undefined) throw new Error("trick-play: no lead to veto");
	const suit = suitOf(lead.card);
	ctx.call(CardTableApi, "give", { resident: lead.seat, card: lead.card });
	trick.plays = [];
	trick.vetoed = suit;
	state.vetoes[seat] = (state.vetoes[seat] ?? 0) - 1;
	state.actor = lead.seat;
	ctx.emit("lead_vetoed", { game: state.game, round: state.round, trick: state.tricks.length, seat, leader: lead.seat, suit });
	return reply(`Veto spent: ${lead.seat} takes ${lead.card} back and must lead a suit other than ${suit}.`);
}

function scoreRound(ctx: Ctx): void {
	const state = ctx.state;
	const points = Object.fromEntries(state.seats.map((seat) => [seat, roundPoints(state.bids[seat] ?? 0, state.won[seat] ?? 0, ctx.options.scoring)]));
	for (const seat of state.seats) state.totals[seat] = (state.totals[seat] ?? 0) + (points[seat] ?? 0);
	state.rounds.push({ round: state.round, cards: cardsOf(ctx), dealer: state.dealer, trump: state.trump, namer: state.namer, bids: { ...state.bids }, tricks: { ...state.won }, points });
	ctx.emit("round_scored", { game: state.game, round: state.round, trump: state.trump, bids: { ...state.bids }, tricks: { ...state.won }, points, totals: { ...state.totals } });
	if (state.round < ctx.options.rounds.length) {
		startRound(ctx, state.round + 1);
		return;
	}
	endGame(ctx);
}

function leadersOf(totals: Readonly<Record<string, number>>, seats: readonly string[]): string {
	const best = Math.max(...seats.map((seat) => totals[seat] ?? 0));
	return seats.filter((seat) => (totals[seat] ?? 0) === best).join("+");
}

function matchPoints(state: Readonly<TrickState>): { wins: Record<string, number>; points: Record<string, number> } {
	const wins = zeros(state.seats);
	const points = zeros(state.seats);
	for (const record of state.results) {
		const winners = record.result.split("+");
		if (winners.length === 1 && winners[0] !== undefined) wins[winners[0]] = (wins[winners[0]] ?? 0) + 1;
		for (const seat of state.seats) points[seat] = (points[seat] ?? 0) + (record.totals[seat] ?? 0);
	}
	return { wins, points };
}

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	const result = leadersOf(state.totals, state.seats);
	state.results.push({ game: state.game, result, totals: { ...state.totals }, rounds: state.rounds.map((record) => ({ ...record })) });
	state.phase = "idle";
	state.actor = null;
	state.debrief = [...state.seats];
	ctx.emit("game_ended", { game: state.game, result, totals: { ...state.totals } });
	const others = state.seats.filter((seat) => !result.split("+").includes(seat)).map((seat) => `${seat} ${String(state.totals[seat] ?? 0)}`);
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: `${result} won with ${String(state.totals[result.split("+")[0] ?? ""] ?? 0)} (${others.join(", ")})` });
	if (state.game < ctx.options.games) {
		ctx.schedule.at(ctx.minute + 1, "nextGame");
		return;
	}
	state.finished = true;
	ctx.emit("match_ended", matchPoints(state));
}

/** Why `seat` may not act in `phase` now, or undefined. */
function turnProblem(state: Readonly<TrickState>, seat: string | undefined, phase: "bid" | "trump" | "play"): Refusal | undefined {
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (state.phase === "idle") return refuse("NO_ROUND", "No round is running right now; wait for the next one.");
	if (state.phase !== phase) {
		const now = state.phase === "bid" ? "bidding (placeBid)" : state.phase === "trump" ? "naming the trump (nameTrump)" : "playing tricks (playCard)";
		return refuse("WRONG_PHASE", `The round is ${now} now.`);
	}
	if (seat === undefined || seat !== state.actor) return refuse("NOT_YOUR_TURN", `It is ${state.actor ?? "nobody"}'s turn.`);
	return undefined;
}

function bidProblem(ctx: Ctx, seat: string | undefined, bid: number): Refusal | undefined {
	const problem = turnProblem(ctx.state, seat, "bid");
	if (problem !== undefined) return problem;
	const cards = cardsOf(ctx);
	if (bid > cards) return refuse("BID_TOO_HIGH", `This round has ${String(cards)} card(s) each; bid 0 to ${String(cards)}.`);
	return undefined;
}

function trumpProblem(ctx: Ctx, seat: string | undefined, suit: string): { readonly refusal: Refusal } | { readonly suit: string } {
	const problem = turnProblem(ctx.state, seat, "trump");
	if (problem !== undefined) return { refusal: problem };
	const suits = suitNames(ctx);
	const found = suits.find((name) => name.toLowerCase() === suit.trim().toLowerCase());
	return found === undefined ? { refusal: refuse("UNKNOWN_SUIT", `Name one of: ${suits.join(", ")}.`) } : { suit: found };
}

function playProblem(ctx: Ctx, seat: string | undefined, text: string): { readonly refusal: Refusal } | { readonly card: string } {
	const problem = turnProblem(ctx.state, seat, "play");
	if (problem !== undefined || seat === undefined) return { refusal: problem ?? refuse("NOT_YOUR_TURN") };
	const card = parseCard(text, ctx.call(CardTableApi, "suits", {}));
	if (card === undefined) return { refusal: refuse("UNKNOWN_CARD", `"${text}" is no card of this deck; write it like "Ember 7".`) };
	const hand = handOf(ctx, seat);
	if (!hand.includes(card)) return { refusal: refuse("NOT_IN_HAND", `You do not hold ${card}. Your hand: ${renderHand(hand, ctx.call(CardTableApi, "suits", {}))}.`) };
	const trick = currentTrick(ctx.state);
	const led = trick?.plays[0] === undefined ? undefined : suitOf(trick.plays[0].card);
	const legal = legalCards(hand, led, trick?.vetoed);
	if (!legal.includes(card)) {
		return led === undefined
			? { refusal: refuse("VETOED_SUIT", `${trick?.vetoed ?? ""} was vetoed as lead for this trick; lead another suit: ${legal.join(", ")}.`) }
			: { refusal: refuse("MUST_FOLLOW", `You hold ${led}, so you must follow suit: ${legal.join(", ")}.`) };
	}
	return { card };
}

function vetoProblem(ctx: Ctx, seat: string | undefined): Refusal | undefined {
	const problem = turnProblem(ctx.state, seat, "play");
	if (problem !== undefined || seat === undefined) return problem ?? refuse("NOT_YOUR_TURN");
	const trick = currentTrick(ctx.state);
	const lead = trick?.plays[0];
	if (ctx.options.vetoTokens === 0) return refuse("NO_VETO", "This game has no veto.");
	if (trick === undefined || lead === undefined || trick.plays.length !== 1) return refuse("NOT_AFTER_LEAD", "A veto is only possible right after the lead card, by the next seat.");
	if (trick.vetoed !== undefined) return refuse("ALREADY_VETOED", "This trick's lead was vetoed once already.");
	if ((ctx.state.vetoes[seat] ?? 0) <= 0) return refuse("NO_TOKEN", "You have no veto token left in this game.");
	const suit = suitOf(lead.card);
	if (handOf(ctx, lead.seat).every((card) => suitOf(card) === suit)) return refuse("LEADER_HAS_NO_OTHER_SUIT", `${lead.seat} holds no other suit to lead; the veto would change nothing.`);
	return undefined;
}

function trickText(trick: Trick, index: number): string {
	const plays = trick.plays.map((play) => `${play.seat} ${play.card}`).join(", ");
	return `${String(index + 1)}. ${plays}${trick.winner === undefined ? "" : ` -> ${trick.winner}`}`;
}

/** What a seat should do now, as one line. */
function actionHint(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	if (state.actor !== seat) return state.actor === null ? "Nothing to do right now." : `Waiting for ${state.actor}.`;
	if (state.phase === "bid") return `Your turn to bid: placeBid with 0 to ${String(cardsOf(ctx))}.`;
	if (state.phase === "trump") return `You have the lowest bid: name the trump with nameTrump (${suitNames(ctx).join(", ")}).`;
	const trick = currentTrick(state);
	const led = trick?.plays[0] === undefined ? undefined : suitOf(trick.plays[0].card);
	const legal = legalCards(handOf(ctx, seat), led, trick?.vetoed);
	const veto = vetoProblem(ctx, seat) === undefined ? " Or spend your veto token with vetoLead to send the lead back." : "";
	return `Your turn: playCard. Legal now: ${legal.join(", ")}.${veto}`;
}

/** The table as `seat` sees it: its own hand and everything public. */
function tableText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	if (state.finished) return "The match is over.";
	if (state.phase === "idle") return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon.`;
	const suits = ctx.call(CardTableApi, "suits", {});
	const scores = (record: Readonly<Record<string, number>>): string => state.seats.map((name) => `${name} ${String(record[name] ?? 0)}`).join(", ");
	const lines = [
		`Game ${String(state.game)} of ${String(ctx.options.games)}, round ${String(state.round)} of ${String(ctx.options.rounds.length)}: ${String(cardsOf(ctx))} card(s) each. Dealer ${state.dealer}. Seats in table order: ${state.seats.join(", ")}.`,
		state.seats.includes(seat) ? `Your hand: ${renderHand(handOf(ctx, seat), suits)}` : "You have no seat.",
		`Bids (bidding order): ${state.order.map((name) => `${name} ${state.bids[name] === undefined ? "-" : String(state.bids[name])}`).join(", ")}.`,
		ctx.options.trump === "none" ? "No trump in this game." : state.trump === null ? "Trump: not named yet (the lowest bidder names it once every bid is in)." : `Trump: ${state.trump} (named by ${state.namer ?? "?"}).`,
	];
	if (state.phase === "play") {
		const done = state.tricks.filter((trick) => trick.winner !== undefined);
		if (done.length > 0) lines.push(`Tricks this round: ${done.map(trickText).join("; ")}.`);
		const trick = currentTrick(state);
		if (trick !== undefined) {
			const plays = trick.plays.length === 0 ? `nothing yet, ${trick.leader} leads` : trick.plays.map((play) => `${play.seat} ${play.card}`).join(", ");
			lines.push(`On the table (trick ${String(state.tricks.length)} of ${String(cardsOf(ctx))}): ${plays}${trick.vetoed === undefined ? "" : ` (${trick.vetoed} vetoed as lead)`}.`);
		}
		lines.push(`Tricks won this round: ${scores(state.won)}.`);
	}
	lines.push(`Scores this game: ${scores(state.totals)}.`);
	const mine = state.rounds.map((record) => `r${String(record.round)} bid ${String(record.bids[seat] ?? 0)} took ${String(record.tricks[seat] ?? 0)} (${(record.points[seat] ?? 0) >= 0 ? "+" : ""}${String(record.points[seat] ?? 0)})`);
	if (mine.length > 0) lines.push(`Your rounds this game: ${mine.join("; ")}.`);
	if (ctx.options.vetoTokens > 0) lines.push(`Veto tokens left: ${scores(state.vetoes)}.`);
	lines.push(actionHint(ctx, seat));
	return lines.join("\n");
}

/** The public record of a finished game, round by round: what a seat needs to judge its own bidding. */
function debriefText(ctx: Ctx): string {
	const state = ctx.state;
	const record = state.results.at(-1);
	if (record === undefined) return "";
	const scores = (values: Readonly<Record<string, number>>): string => state.seats.map((name) => `${name} ${String(values[name] ?? 0)}`).join(", ");
	const rounds = record.rounds.map((round) => {
		const seats = state.seats.map((name) => `${name} ${String(round.bids[name] ?? 0)}/${String(round.tricks[name] ?? 0)}`).join(", ");
		return `r${String(round.round)} (${String(round.cards)} card(s), trump ${round.trump ?? "none"}${round.namer === null ? "" : ` by ${round.namer}`}): ${seats}`;
	});
	return [`Game ${String(record.game)} is over. Winner: ${record.result}. Final scores: ${scores(record.totals)}.`, `Bid/taken per round: ${rounds.join("; ")}.`].join("\n");
}

/** The move timer acts for the seat on turn: a random legal bid, suit or card from the seeded stream. */
function forfeit(ctx: Ctx): void {
	const state = ctx.state;
	const seat = state.actor;
	if (seat === null) return;
	const rng = ctx.rng("trick-play", "forfeit", actionKey(state));
	state.forfeits += 1;
	if (state.phase === "bid") applyBid(ctx, seat, rng.int(0, cardsOf(ctx)), true);
	else if (state.phase === "trump") applyTrump(ctx, seat, rng.pick(suitNames(ctx)), true);
	else if (state.phase === "play") {
		const trick = currentTrick(state);
		const led = trick?.plays[0] === undefined ? undefined : suitOf(trick.plays[0].card);
		applyPlay(ctx, seat, rng.pick(legalCards(handOf(ctx, seat), led, trick?.vetoed)), true);
	}
	const limit = ctx.options.maxConsecutiveForfeits;
	if (limit > 0 && state.forfeits >= limit && !state.finished) {
		state.finished = true;
		state.invalid = true;
		state.phase = "idle";
		state.actor = null;
		ctx.emit("match_ended", { ...matchPoints(state), invalid: true });
	}
}

export const trickPlay = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewTable",
			description: "trick-play/tools/viewTable",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(tableText(ctx, ctx.resident ?? "")),
		}),
		kit.tool({
			name: "placeBid",
			description: "trick-play/tools/placeBid",
			parameters: Type.Object({ tricks: Type.Integer({ minimum: 0, description: "The exact number of tricks you will take this round." }) }),
			suggest: ["resident"],
			execute: (params, ctx: ToolCtx) => {
				const refusal = bidProblem(ctx, ctx.resident, params.tricks);
				if (refusal !== undefined || ctx.resident === undefined) return refusal ?? refuse("NOT_YOUR_TURN");
				ctx.state.forfeits = 0;
				return applyBid(ctx, ctx.resident, params.tricks, false);
			},
		}),
		kit.tool({
			name: "nameTrump",
			description: "trick-play/tools/nameTrump",
			parameters: Type.Object({ suit: Type.String({ description: "The suit's name, for example \"Ember\"." }) }),
			suggest: ["resident"],
			execute: (params, ctx: ToolCtx) => {
				const checked = trumpProblem(ctx, ctx.resident, params.suit);
				if ("refusal" in checked || ctx.resident === undefined) return "refusal" in checked ? checked.refusal : refuse("NOT_YOUR_TURN");
				ctx.state.forfeits = 0;
				return applyTrump(ctx, ctx.resident, checked.suit, false);
			},
		}),
		kit.tool({
			name: "playCard",
			description: "trick-play/tools/playCard",
			parameters: Type.Object({ card: Type.String({ description: "The card, suit and rank, for example \"Ember 7\"." }) }),
			suggest: ["resident"],
			execute: (params, ctx: ToolCtx) => {
				const checked = playProblem(ctx, ctx.resident, params.card);
				if ("refusal" in checked || ctx.resident === undefined) return "refusal" in checked ? checked.refusal : refuse("NOT_YOUR_TURN");
				ctx.state.forfeits = 0;
				return applyPlay(ctx, ctx.resident, checked.card, false);
			},
		}),
		kit.tool({
			name: "vetoLead",
			description: "trick-play/tools/vetoLead",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => {
				const refusal = vetoProblem(ctx, ctx.resident);
				if (refusal !== undefined || ctx.resident === undefined) return refusal ?? refuse("NOT_YOUR_TURN");
				ctx.state.forfeits = 0;
				return applyVeto(ctx, ctx.resident);
			},
		}),
	],
	services: [
		kit.provide(TrickPlayApi, {
			game: (_input, ctx) => ctx.state.game,
			round: (_input, ctx) => ctx.state.round,
			phase: (_input, ctx) => ctx.state.phase,
			actor: (_input, ctx) => ctx.state.actor,
			table: (_input, ctx) => ({ bids: { ...ctx.state.bids }, trump: ctx.state.trump, trick: (currentTrick(ctx.state)?.plays ?? []).map((play) => ({ ...play })), won: { ...ctx.state.won } }),
		}),
		kit.provide(BrainSourceApi, {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && state.phase === "idle" && !state.finished) ctx.schedule.at(ctx.minute + 1, "nextGame");
				return null;
			},
		}),
	],
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.trickPlay,
			run: (ctx) => {
				const seats = ctx.call(CardTableApi, "seats", {});
				const most = Math.max(...ctx.options.rounds);
				const deck = deckOf(ctx.call(CardTableApi, "suits", {})).length;
				if (seats.length < 2) throw new Error("trick-play: the card table needs at least two seats");
				if (most * seats.length > deck) throw new Error(`trick-play: a round of ${String(most)} cards for ${String(seats.length)} seats needs more than the deck's ${String(deck)} cards`);
				ctx.state.seats = seats;
				startNext(ctx);
			},
		},
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.trickPlay,
			run: (ctx) => {
				ctx.state.watch = actionKey(ctx.state);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.trickPlay,
			run: (ctx) => {
				const state = ctx.state;
				const key = actionKey(state);
				state.idle = key !== "" && key === state.watch ? state.idle + 1 : 0;
				if (state.idle >= ctx.options.maxIdleMinutes) {
					state.idle = 0;
					forfeit(ctx);
				}
			},
		},
		news: (resident, ctx) => ctx.state.actor === resident,
		turnInputs: {
			order: HOOK_ORDER.turnInputs.trickPlay,
			run: (resident, ctx) => {
				const lines: { readonly kind: string; readonly text: string; readonly order: number }[] = [];
				const index = ctx.state.debrief.indexOf(resident);
				if (index >= 0) {
					ctx.state.debrief.splice(index, 1);
					if (ctx.state.phase === "idle") lines.push({ kind: "status", text: debriefText(ctx), order: STATUS_ORDER.minute });
				}
				if (ctx.state.actor === resident) lines.push({ kind: "status", text: tableText(ctx, resident), order: STATUS_ORDER.minute });
				return lines;
			},
		},
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: [kit.limit("match", "Breaches once the last game of the match is over.", (view: View) => (view.state.invalid === true ? "the match is invalid" : view.state.finished ? "the match is over" : undefined))],
	facts: {
		totals: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => ({ ...view.state.totals })),
		wins: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => matchPoints(view.state).wins),
		actor: kit.fact(Type.Union([Type.String(), Type.Null()]), (view) => view.state.actor),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: TrickSlice,
		save: (state) => structuredClone(state),
		load: (data) => structuredClone(data),
	}),
}));
