// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `ember-tricks` mechanic: a trick-taking game with exact bidding on the `card-table`, played by
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
 * 4. scoring: a hit (tricks taken equal the bid) is `hit + perTrick * taken`, a miss costs `missBase`
 *    plus the square of the error (`scoring.miss`).
 * With `reference` a Monte Carlo worth of every hand (`reference.ts`) goes into the round record and
 * either the calibration line (retro) or the bidder's action line (bid).
 * `viewTable` is free (no step) and answers a seat not on turn with one wait line; `bidSum` adds the
 * bids so far against the round's tricks to the table, `calibration` each seat's own bid-against-taken
 * line to the end-of-game record.
 * The mechanic enforces every rule and counts every trick; a seat that does nothing for `maxIdleMinutes`
 * whole ticks gets a random legal action from the seeded stream (flag `forfeit`). The match ends
 * the run through the limit `ember-tricks.match`. A strategy brain plugs in through
 * `BrainSourceService` (it may hold the next game for a retro) and `StrategyBrainService` (game start and end;
 * with `briefEveryRound` every round counts as a start, so each round begins from a fresh context).
 * Nothing here knows chat, memory or scoring against a reference.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { InputLine, ToolSuccess } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply, type ToolCtxOf } from "@swarmtales/sdk";
import { CardTableService, deckOf } from "@swarmtales/mechanic-card-table/contract";
import { bidProblem, playProblem, trumpProblem, vetoProblem } from "./checks.ts";
import { actionKey, applyBid, applyPlay, applyTrump, applyVeto, cardsOf, currentTrick, forfeit, handOf, inOrder, ledSuit, matchPoints, startNext, suitNames } from "./flow.ts";
import { trickPlayHead, type TrickPlayCtx, type TrickPlayView } from "./head.ts";
import { legalCards } from "./model.ts";
import { debriefText, tableText, tableView } from "./texts.ts";

export { TrickPlayEvents } from "./events.ts";
export { TrickPlayService } from "./service.ts";

type View = TrickPlayView;

// The place of the old status line among the lines of kind `status` (the old `STATUS_ORDER.minute`).
const STATUS_ORDER = 100;

// An accepted action of a seat ends a row of timer actions. With `quietEnds` an action that leaves the seat off turn
// ends its turn, so its answer alone wakes no turn that could only read "Not your turn" (P475).
const own = (ctx: TrickPlayCtx, seat: string, run: () => ToolSuccess): ToolSuccess => {
	ctx.state.forfeits = 0;
	const done = run();
	return ctx.options.quietEnds === true && ctx.state.actor !== seat ? reply(done.reply, { endsTurn: true }) : done;
};

// The seat on turn in `phase`, for the samples of the fake driver.
const onTurn = (ctx: ToolCtxOf<typeof trickPlayHead>, phase: "bid" | "trump" | "play"): string | undefined => (!ctx.state.finished && ctx.state.phase === phase && ctx.state.actor !== null && ctx.state.actor === ctx.resident ? ctx.resident : undefined);

/**
 * Trick play: exact bids, a trump named by the lowest bidder, follow-suit tricks, a lead veto and hit-or-miss scoring.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "tricks", residents: 4, mechanics: [cardTable({}), trickPlay({ games: 1, rounds: [1, 2, 3] })], end: { ticks: 60 }, win: { fact: "ember-tricks.totals" } });
 * ```
 *
 * @public
 */
export const trickPlay = defineMechanic(trickPlayHead, {
	tools: {
		viewTable: {
			run: (_params, ctx) => reply(tableView(ctx, ctx.resident ?? "")),
			// A look now and then, so that a fake seat on turn also reaches its actions.
			sample: (_ctx, random) => (random.int(0, 3) === 0 ? {} : undefined),
		},
		placeBid: {
			run: (params, ctx) => {
				const refusal = bidProblem(ctx, ctx.resident, params.tricks);
				if (refusal !== undefined || ctx.resident === undefined) return refusal ?? refuse("NOT_YOUR_TURN");
				const seat = ctx.resident;
				return own(ctx, seat, () => applyBid(ctx, seat, params.tricks, false));
			},
			sample: (ctx, random) => (onTurn(ctx, "bid") === undefined ? undefined : { tricks: random.int(0, cardsOf(ctx)) }),
		},
		nameTrump: {
			run: (params, ctx) => {
				const checked = trumpProblem(ctx, ctx.resident, params.suit);
				if ("refusal" in checked || ctx.resident === undefined) return "refusal" in checked ? checked.refusal : refuse("NOT_YOUR_TURN");
				const seat = ctx.resident;
				return own(ctx, seat, () => applyTrump(ctx, seat, checked.suit, false));
			},
			sample: (ctx, random) => (onTurn(ctx, "trump") === undefined ? undefined : { suit: random.pick(suitNames(ctx)) }),
		},
		playCard: {
			run: (params, ctx) => {
				const checked = playProblem(ctx, ctx.resident, params.card);
				if ("refusal" in checked || ctx.resident === undefined) return "refusal" in checked ? checked.refusal : refuse("NOT_YOUR_TURN");
				const seat = ctx.resident;
				return own(ctx, seat, () => applyPlay(ctx, seat, checked.card, false));
			},
			// A legal card; one time in two it leaves the turn to the veto when the seat may veto.
			sample: (ctx, random) => {
				const seat = onTurn(ctx, "play");
				if (seat === undefined || (vetoProblem(ctx, seat) === undefined && random.int(0, 1) === 0)) return undefined;
				return { card: random.pick(legalCards(handOf(ctx, seat), ledSuit(ctx.state), currentTrick(ctx.state)?.vetoed)) };
			},
		},
		vetoLead: {
			run: (_params, ctx) => {
				const refusal = vetoProblem(ctx, ctx.resident);
				if (refusal !== undefined || ctx.resident === undefined) return refusal ?? refuse("NOT_YOUR_TURN");
				const seat = ctx.resident;
				return own(ctx, seat, () => applyVeto(ctx, seat));
			},
			sample: (ctx) => (vetoProblem(ctx, ctx.resident) === undefined ? {} : undefined),
		},
	},
	services: {
		"ember-tricks": {
			game: (_input, ctx) => ctx.state.game,
			round: (_input, ctx) => ctx.state.round,
			phase: (_input, ctx) => ctx.state.phase,
			actor: (_input, ctx) => ctx.state.actor,
			table: (_input, ctx) => ({ bids: inOrder(ctx.state.bids, ctx.state.order), trump: ctx.state.trump, trick: (currentTrick(ctx.state)?.plays ?? []).map((play) => ({ ...play })), won: inOrder(ctx.state.won, ctx.state.seats) }),
		},
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
				if (state.due && state.phase === "idle" && !state.finished) ctx.schedule.at(ctx.tick + 1, "nextGame");
				return null;
			},
		},
	},
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			after: ["strategy-brain"],
			run: (ctx) => {
				const seats = ctx.call(CardTableService, "seats", {});
				const most = Math.max(...ctx.options.rounds);
				const deck = deckOf(ctx.call(CardTableService, "suits", {})).length;
				if (seats.length < 2) throw new RangeError("ember-tricks: the card table needs at least two seats");
				if (most * seats.length > deck) throw new RangeError(`ember-tricks: a round of ${String(most)} cards for ${String(seats.length)} seats needs more than the deck's ${String(deck)} cards`);
				ctx.state.seats = seats;
				startNext(ctx);
			},
		},
		tickStarted: (ctx) => {
			ctx.state.watch = actionKey(ctx.state);
		},
		// The move timer: it may end a game, so the strategy brain, which loads later, closes its retro windows after it.
		tickEnded: (ctx) => {
			const state = ctx.state;
			const key = actionKey(state);
			state.idle = key !== "" && key === state.watch ? state.idle + 1 : 0;
			if (state.idle >= ctx.options.maxIdleMinutes) {
				state.idle = 0;
				forfeit(ctx);
			}
		},
		news: (resident, ctx) => ctx.state.actor === resident,
		turnInputs: (resident, ctx) => {
			const lines: InputLine[] = [];
			const index = ctx.state.debrief.indexOf(resident);
			if (index >= 0) {
				ctx.state.debrief.splice(index, 1);
				if (ctx.state.phase === "idle") lines.push({ kind: "status", text: debriefText(ctx, resident), order: STATUS_ORDER });
			}
			if (ctx.state.actor === resident) lines.push({ kind: "status", text: tableText(ctx, resident), order: STATUS_ORDER });
			return lines;
		},
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: View) => (view.state.invalid === true ? "the match is invalid" : view.state.finished ? "the match is over" : undefined) } },
	facts: {
		totals: { output: Type.Record(Type.String(), Type.Integer()), compute: (view) => inOrder(view.state.totals, view.state.seats) },
		wins: { output: Type.Record(Type.String(), Type.Integer()), compute: (view) => matchPoints(view.state).wins },
		actor: { output: Type.Union([Type.String(), Type.Null()]), compute: (view) => view.state.actor },
	},
});
