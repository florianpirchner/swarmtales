// SPDX-License-Identifier: Apache-2.0
/**
 * The `hint-towers` mechanic: a cooperative game of hidden hands on the `card-table`, for a crew of
 * seats over a match of `games` games. Every seat holds `handSize` cards it cannot see; it sees every
 * other seat's cards and what each of them knows. On its turn a seat does one thing:
 * - `giveSignal`: spends a signal to tell a teammate every card of one suit, or of one rank, in its
 *   hand (it must touch a card); the cards not touched learn "not that suit / rank";
 * - `playSlot`: plays a slot to its suit's tower, lit when it is the tower's next rank, else a misfire
 *   (the card is lost, a strike counts);
 * - `discardSlot`: below the signal cap, drops a slot (lost) and gets a signal back.
 * Every card of the deck is unique; a lost rank is bridged (the next rank above it becomes playable),
 * so a loss costs exactly one point. A completed tower gives a signal back. Once the draw pile is
 * empty the game goes on until a whole round of seats lights no card and gives no signal (P171); the strikes running out also
 * end it, unless `strikePenalty` is above 0 (soft strikes: the game goes on, and every misfire from the
 * last strike on costs that many points). The score is the number of cards lit, less any strike penalty. The mechanic keeps every seat's knowledge (what signals
 * told it, which cards it can still be) and shows it in the status, so a context reset loses nothing.
 * A seat that does nothing for `maxIdleMinutes` whole ticks gets the reference bot's action (flag
 * `forfeit`); every deal is also played by a crew of reference bots (event `game_scored`, audience
 * human). `quietTools` are locked for every seat while a game runs (table talk only between games).
 * A strategy brain plugs in through `BrainSourceService` and `StrategyBrainService`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { InputLine, ToolSuccess } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { CardTableService, deckOf, rankOf, suitOf } from "@swarmtales/mechanic-card-table/contract";
import { act, actionKey, forfeit, signalCheck, slotProblem, startNext } from "./flow.ts";
import { hintTowersHead, type HintState, type HintTowersCtx, type HintTowersView } from "./head.ts";
import { debriefText, tableText } from "./texts.ts";

export { HintTowersEvents } from "./events.ts";

type View = HintTowersView;

// The place of the old status line among the lines of kind `status` (the old `STATUS_ORDER.minute`).
const STATUS_ORDER = 100;

// An accepted action ends a row of timer actions.
const done = (ctx: HintTowersCtx, text: string): ToolSuccess => {
	ctx.state.forfeits = 0;
	return reply(text);
};

// The running game when `seat` is on turn, for the samples of the fake driver.
const onTurn = (state: Readonly<HintState>, seat: string | undefined) => (state.core?.over === null && !state.finished && state.core.actor === seat ? state.core : undefined);

/**
 * The hint towers: hidden hands, signals about a suit or a rank, towers lit in rank order.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "towers", residents: 4, mechanics: [cardTable({ suits: [{ name: "Amber", ranks: 7 }, { name: "Moss", ranks: 7 }] }), hintTowers({ games: 1 })], end: { ticks: 40 }, win: { fact: "hint-towers.scores" } });
 * ```
 *
 * @public
 */
export const hintTowers = defineMechanic(hintTowersHead, {
	tools: {
		viewTowers: {
			run: (_params, ctx) => reply(tableText(ctx, ctx.resident ?? "")),
			// A look now and then, so that a fake seat on turn also reaches its three actions.
			sample: (_ctx, random) => (random.int(0, 3) === 0 ? {} : undefined),
		},
		giveSignal: {
			run: (params, ctx) => {
				const checked = signalCheck(ctx, ctx.resident, params.to, params.about);
				if ("refusal" in checked) return checked.refusal;
				return done(ctx, act(ctx, checked.action, false));
			},
			// One time in three: a suit or a rank of a card that another seat holds, so the signal touches it.
			sample: (ctx, random) => {
				const core = onTurn(ctx.state, ctx.resident);
				const others = core?.seats.filter((seat) => seat !== core.actor && (core.hands[seat] ?? []).length > 0) ?? [];
				if (core === undefined || core.signals <= 0 || others.length === 0 || random.int(0, 2) !== 0) return undefined;
				const to = random.pick(others);
				const card = random.pick(core.hands[to] ?? []).card;
				return { to, about: random.pick([suitOf(card), String(rankOf(card))]) };
			},
		},
		playSlot: {
			run: (params, ctx) => {
				const checked = slotProblem(ctx.state, ctx.resident, params.slot);
				if ("refusal" in checked) return checked.refusal;
				return done(ctx, act(ctx, { kind: "play", slot: checked.index }, false));
			},
			// A blind play: always when no discard is allowed, else one time in two.
			sample: (ctx, random) => {
				const core = onTurn(ctx.state, ctx.resident);
				if (core === undefined || (core.signals < ctx.options.signals && random.int(0, 1) !== 0)) return undefined;
				return { slot: random.int(1, core.hands[core.actor]?.length ?? 1) };
			},
		},
		discardSlot: {
			run: (params, ctx) => {
				const checked = slotProblem(ctx.state, ctx.resident, params.slot);
				if ("refusal" in checked) return checked.refusal;
				if ((ctx.state.core?.signals ?? 0) >= ctx.options.signals) return refuse("SIGNALS_FULL", `The crew holds all ${String(ctx.options.signals)} signals; play a slot or give a signal instead.`);
				return done(ctx, act(ctx, { kind: "discard", slot: checked.index }, false));
			},
			sample: (ctx, random) => {
				const core = onTurn(ctx.state, ctx.resident);
				return core === undefined || core.signals >= ctx.options.signals ? undefined : { slot: random.int(1, core.hands[core.actor]?.length ?? 1) };
			},
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
				if (state.due && !state.finished) ctx.schedule.at(ctx.tick + 1, "nextGame");
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
				const deck = deckOf(ctx.call(CardTableService, "suits", {})).length;
				if (seats.length < 2) throw new RangeError("hint-towers: the card table needs at least two seats");
				if (seats.length * ctx.options.handSize >= deck) throw new RangeError(`hint-towers: ${String(seats.length)} hands of ${String(ctx.options.handSize)} need more than the deck's ${String(deck)} cards`);
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
		news: (resident, ctx) => (ctx.state.core?.over === null && ctx.state.core.actor === resident) || ctx.state.debrief.includes(resident),
		turnInputs: (resident, ctx) => {
			const lines: InputLine[] = [];
			const index = ctx.state.debrief.indexOf(resident);
			if (index >= 0) {
				ctx.state.debrief.splice(index, 1);
				lines.push({ kind: "status", text: debriefText(ctx), order: STATUS_ORDER });
			}
			const core = ctx.state.core;
			if (core !== null && core.over === null && core.actor === resident) lines.push({ kind: "status", text: tableText(ctx, resident), order: STATUS_ORDER });
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
		scores: { output: Type.Array(Type.Integer()), compute: (view) => view.state.results.map((entry) => entry.score) },
		baselines: { output: Type.Array(Type.Integer()), compute: (view) => view.state.results.map((entry) => entry.baseline) },
		actor: { output: Type.Union([Type.String(), Type.Null()]), compute: (view) => (view.state.core?.over === null ? view.state.core.actor : null) },
	},
});
