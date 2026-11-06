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
 * last strike on costs that many points). The score is the number of cards lit, less any strike penalty. The engine keeps every seat's knowledge (what signals
 * told it, which cards it can still be) and shows it in the status, so a context reset loses nothing.
 * A seat that does nothing for `maxIdleMinutes` whole minutes gets the reference bot's action (flag
 * `forfeit`); every deal is also played by a crew of reference bots (event `game_scored`, audience
 * human). `quietTools` are locked for every seat while a game runs (table talk only between games).
 * A strategy brain plugs in through `BrainSourceApi` and `StrategyBrainApi`.
 */
import { Type, type Static } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { CardTableApi } from "@swarmtales/mechanic-card-table";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import { HintTowersEvents } from "./events.ts";
import {
	aboutText,
	type Action,
	botAction,
	botScore,
	candidates,
	CoreSlice,
	type Core,
	deckOf,
	discard,
	type Draw,
	EndReason,
	newGame,
	nextRank,
	parseAbout,
	penaltyStrikes,
	play,
	rankOf,
	type Rules,
	scoreOf,
	signal,
	signalProblem,
	type Slot,
	suitOf,
	surePlayable,
	topOf,
} from "./model.ts";


const options = Type.Object({
	games: Type.Integer({ minimum: 1, default: 3, description: "Games in the match; the run ends after the last one." }),
	handSize: Type.Integer({ minimum: 1, default: 4, description: "Cards each seat holds." }),
	signals: Type.Integer({ minimum: 1, default: 6, description: "Signal tokens: the crew starts with this many and never holds more." }),
	strikes: Type.Integer({ minimum: 1, default: 3, description: "Misfires that end a game (with soft strikes: the misfire from which each one costs points)." }),
	strikePenalty: Type.Integer({ minimum: 0, default: 0, description: "Soft strikes: 0 ends the game at the last strike; above 0 the strikes never end it, and every misfire from the last strike on costs this many points." }),
	debriefNote: Type.Optional(Type.String({ description: "A line added to the record every seat gets after a game (for example a question for the retro)." })),
	refillOnTower: Type.Boolean({ default: true, description: "A completed tower gives a signal back." }),
	recent: Type.Integer({ minimum: 0, default: 8, description: "Last actions of the game shown in the status." }),
	listCandidates: Type.Integer({ minimum: 0, default: 6, description: "A slot's possible cards are listed when there are at most this many (0: only the count)." }),
	maxIdleMinutes: Type.Integer({ minimum: 1, default: 2, description: "Whole minutes a seat may leave its turn open before the move timer acts for it." }),
	maxConsecutiveForfeits: Type.Integer({ minimum: 0, default: 0, description: "That many timer actions in a row end the match as invalid (0: off)." }),
	side: Type.Optional(Type.String({ description: "The side a strategy brain names as moving first (a crew's team name); default: the first seat." })),
	quietTools: Type.Array(Type.String(), { default: [], description: "Tools locked for every seat while a game runs and opened between games (for example a team chat)." }),
});

const GameRecord = Type.Object({ game: Type.Integer(), reason: EndReason, score: Type.Integer(), baseline: Type.Integer(), lost: Type.Integer(), misfires: Type.Integer(), signals: Type.Integer() });
type GameRecord = Static<typeof GameRecord>;

const HintSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	core: Type.Union([CoreSlice, Type.Null()]),
	baseline: Type.Integer(),
	signalsGiven: Type.Integer(),
	misfires: Type.Integer(),
	results: Type.Array(GameRecord),
	finished: Type.Boolean(),
	invalid: Type.Optional(Type.Boolean()),
	held: Type.Boolean(),
	due: Type.Boolean(),
	watch: Type.String(),
	idle: Type.Integer(),
	forfeits: Type.Integer(),
	debrief: Type.Array(Type.String()),
	/** Every card discarded in this game, with what it was still needed for (the debrief names them, P170). */
	discarded: Type.Array(Type.String()),
});
type HintState = Static<typeof HintSlice>;

const head = defineHead({
	id: "hint-towers",
	summary: "A cooperative game of hidden hands: signals about suit or rank, towers lit in rank order, bridged losses.",
	options,
	state: (): HintState => ({ seats: [], game: 0, core: null, baseline: 0, signalsGiven: 0, misfires: 0, results: [], finished: false, held: false, due: false, watch: "", idle: 0, forfeits: 0, debrief: [], discarded: [] }),
	events: HintTowersEvents.events,
	audiences: { deal_revealed: ["human"], card_drawn: ["human"], game_scored: ["human"] },
	provides: [BrainSourceApi],
	requires: [CardTableApi],
	uses: [StrategyBrainApi],
	prompts: {
		"hint-towers/tools/viewTowers": [],
		"hint-towers/tools/giveSignal": [],
		"hint-towers/tools/playSlot": [],
		"hint-towers/tools/discardSlot": [],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const rulesOf = (ctx: Ctx): Rules => ({ handSize: ctx.options.handSize, maxSignals: ctx.options.signals, maxStrikes: ctx.options.strikes, refillOnTower: ctx.options.refillOnTower, strikePenalty: ctx.options.strikePenalty });
const plural = (count: number, word: string): string => `${String(count)} ${word}${count === 1 ? "" : "s"}`;

/** What the move timer watches: the same key at a minute's start and end means nothing happened in it. */
function actionKey(state: Readonly<HintState>): string {
	const core = state.core;
	return core?.over !== null ? "" : `${String(state.game)}:${String(core.turn)}:${core.actor}`;
}

/** The engine's draw: the card table moves its top card into the seat's hand. */
const drawFrom =
	(ctx: Ctx): Draw =>
	(seat) =>
		ctx.call(CardTableApi, "draw", { resident: seat }) ?? undefined;

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.signalsGiven = 0;
	state.misfires = 0;
	state.debrief = [];
	state.discarded = [];
	const first = state.seats[(game - 1) % state.seats.length] ?? "";
	const suits = ctx.call(CardTableApi, "suits", {});
	ctx.call(CardTableApi, "deal", { cards: 0 });
	const pile = ctx.call(CardTableApi, "stock", {});
	state.baseline = botScore(state.seats, suits, rulesOf(ctx), first, pile);
	state.core = newGame(state.seats, suits, rulesOf(ctx), first, pile.length, drawFrom(ctx));
	for (const resident of state.seats) for (const tool of ctx.options.quietTools) ctx.access.lock(resident, tool);
	const hands = Object.fromEntries(state.seats.map((seat) => [seat, (state.core?.hands[seat] ?? []).map((slot) => slot.card)]));
	ctx.emit("game_started", { game, seats: [...state.seats], first, deck: deckOf(suits).length });
	ctx.emit("deal_revealed", { game, hands, pile: ctx.call(CardTableApi, "stock", {}), baseline: state.baseline });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: ctx.options.side ?? first });
}

/** Starts the next game, or marks it due when another mechanic holds it back. */
function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || (state.core !== null && state.core.over === null)) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

/** The strike counter as the status shows it: the end at the last strike, or the soft-strike cost. */
function strikeText(ctx: Ctx, core: Readonly<Core>): string {
	const { strikes, strikePenalty } = ctx.options;
	if (strikePenalty === 0) return `Strikes ${String(core.strikes)} of ${String(strikes)} (the last one ends the game)`;
	const paid = penaltyStrikes(core, rulesOf(ctx));
	return `Strikes ${String(core.strikes)} (soft strikes: from strike ${String(strikes)} on, every misfire also costs ${String(strikePenalty)} points${paid > 0 ? `; ${String(paid * strikePenalty)} points so far` : ""})`;
}

const reasonText = (reason: EndReason): string => (reason === "complete" ? "every card is lit or lost" : reason === "strikes" ? "the strikes ran out" : "the harbour went dark");

function endGame(ctx: Ctx, core: Core): void {
	const state = ctx.state;
	const reason = core.over ?? "dark";
	const deck = deckOf(core.suits).length;
	const record: GameRecord = { game: state.game, reason, score: scoreOf(core, rulesOf(ctx)), baseline: state.baseline, lost: core.lost.length, misfires: state.misfires, signals: state.signalsGiven };
	state.results.push(record);
	state.debrief = [...state.seats];
	for (const resident of state.seats) for (const tool of ctx.options.quietTools) ctx.access.unlock(resident, tool);
	ctx.emit("game_ended", { game: state.game, reason, score: record.score, deck, lost: record.lost, misfires: record.misfires, signals: record.signals });
	ctx.emit("game_scored", { game: state.game, score: record.score, baseline: record.baseline });
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: `the crew lit ${String(core.lit.length)} of ${String(deck)} cards${record.score === core.lit.length ? "" : `, score ${String(record.score)} after the strike penalty`} (${reasonText(reason)}; ${plural(record.misfires, "misfire")}, ${String(record.lost - record.misfires)} discarded)` });
	if (state.game < ctx.options.games) {
		ctx.schedule.at(ctx.minute + 1, "nextGame");
		return;
	}
	state.finished = true;
	ctx.emit("match_ended", { scores: state.results.map((entry) => entry.score), baselines: state.results.map((entry) => entry.baseline) });
}

/** Runs one action for the actor; `forfeit` marks a timer action. */
function act(ctx: Ctx, action: Action, forfeit: boolean): string {
	const state = ctx.state;
	const core = state.core;
	if (core === null) throw new Error("hint-towers: no game");
	const seat = core.actor;
	const game = state.game;
	const rules = rulesOf(ctx);
	let text: string;
	if (action.kind === "signal") {
		const slots = signal(core, action.to, action.about, rules).map((index) => index + 1);
		state.signalsGiven += 1;
		ctx.emit("signal_given", { game, turn: core.turn, seat, to: action.to, about: aboutText(action.about), slots, forfeit });
		text = `You signalled ${action.to} "${aboutText(action.about)}": slot${slots.length === 1 ? "" : "s"} ${slots.join(", ")}.`;
	} else {
		const card = core.hands[seat]?.[action.slot]?.card ?? "";
		if (action.kind === "discard") state.discarded.push(stillNeeded(core, card));
		if (!ctx.call(CardTableApi, "take", { resident: seat, card })) throw new Error(`hint-towers: ${seat} does not hold ${card}`);
		const outcome = action.kind === "play" ? play(core, action.slot, rules, drawFrom(ctx)) : discard(core, action.slot, rules, drawFrom(ctx));
		if (action.kind === "play") {
			if (!outcome.lit) state.misfires += 1;
			ctx.emit("card_played", { game, turn: core.turn, seat, slot: action.slot + 1, card: outcome.card, lit: outcome.lit, forfeit });
			text = outcome.lit ? `Slot ${String(action.slot + 1)} was ${outcome.card}: lit.${outcome.refilled ? " The tower is complete; a signal comes back." : ""}` : `Slot ${String(action.slot + 1)} was ${outcome.card}: a misfire. The card is lost; ${strikeText(ctx, core)}.`;
		} else {
			ctx.emit("card_discarded", { game, turn: core.turn, seat, slot: action.slot + 1, card: outcome.card, forfeit });
			text = `Slot ${String(action.slot + 1)} was ${outcome.card}: discarded (lost). Signals: ${String(core.signals)}.`;
		}
		if (outcome.drawn !== null) {
			ctx.emit("card_drawn", { game, turn: core.turn, seat, card: outcome.drawn });
			text += ` You drew a new card into slot ${String(core.hands[seat]?.length ?? 0)}.`;
		}
	}
	if (core.over !== null) {
		endGame(ctx, core);
		return `${text} The game is over: ${reasonText(core.over)}; the crew lit ${String(core.lit.length)} cards (score ${String(scoreOf(core, rules))}). End your turn.`;
	}
	return `${text} ${core.actor} is next. End your turn.`;
}

/** Why `seat` may not act now, or undefined. */
function turnProblem(state: Readonly<HintState>, seat: string | undefined): Refusal | undefined {
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	const core = state.core;
	if (core?.over !== null) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	if (seat === undefined || seat !== core.actor) return refuse("NOT_YOUR_TURN", `It is ${core.actor}'s turn.`);
	return undefined;
}

function slotProblem(state: Readonly<HintState>, seat: string | undefined, slot: number): { readonly refusal: Refusal } | { readonly index: number } {
	const problem = turnProblem(state, seat);
	if (problem !== undefined || seat === undefined) return { refusal: problem ?? refuse("NOT_YOUR_TURN") };
	const size = state.core?.hands[seat]?.length ?? 0;
	if (!Number.isInteger(slot) || slot < 1 || slot > size) return { refusal: refuse("NO_SUCH_SLOT", `You hold slots 1 to ${String(size)}.`) };
	return { index: slot - 1 };
}

const SIGNAL_REFUSALS: Readonly<Record<string, string>> = {
	NO_SIGNALS: "No signal is left; play or discard a slot instead.",
	SELF_SIGNAL: "You cannot signal yourself; you cannot see your own cards.",
	UNKNOWN_SEAT: "Signal one of the other seats.",
	TOUCHES_NOTHING: "A signal must touch at least one card of that seat.",
};

function signalCheck(ctx: Ctx, seat: string | undefined, to: string, text: string): { readonly refusal: Refusal } | { readonly action: Action } {
	const problem = turnProblem(ctx.state, seat);
	const core = ctx.state.core;
	if (problem !== undefined || core === null) return { refusal: problem ?? refuse("NO_GAME") };
	const about = parseAbout(core, text);
	if (about === undefined) return { refusal: refuse("UNKNOWN_SIGNAL", `Name one suit (${core.suits.map((suit) => suit.name).join(", ")}) or one rank (1 to ${String(Math.max(...core.suits.map((suit) => suit.ranks)))}).`) };
	const target = core.seats.find((name) => name.toLowerCase() === to.trim().toLowerCase()) ?? to.trim();
	const code = signalProblem(core, target, about);
	if (code !== undefined) return { refusal: refuse(code, SIGNAL_REFUSALS[code] ?? code) };
	return { action: { kind: "signal", to: target, about } };
}

function knowText(slot: Slot): string {
	const parts = [slot.know.suit, slot.know.rank === null ? null : String(slot.know.rank)].filter((part) => part !== null);
	const nots = [...slot.know.notSuits, ...slot.know.notRanks.map(String)];
	if (parts.length === 0) return nots.length === 0 ? "nothing" : `not ${nots.join(", ")}`;
	return nots.length === 0 ? parts.join(" ") : `${parts.join(" ")}; not ${nots.join(", ")}`;
}

/** One line per own slot: what the seat knows, what the card may be, whether it is surely playable. */
function ownSlots(ctx: Ctx, core: Readonly<Core>, seat: string): string[] {
	return (core.hands[seat] ?? []).map((slot, index) => {
		const options = candidates(core, seat, index);
		const listed = options.length <= ctx.options.listCandidates ? `could be ${options.join(", ")}` : `${String(options.length)} possible cards`;
		const focus = slot.focus > 0 ? `, the newest card of the signal at turn ${String(slot.focus)}` : "";
		const sure = surePlayable(core, seat, index) ? " SURELY PLAYABLE NOW." : "";
		return `  slot ${String(index + 1)}${index === 0 ? " (oldest)" : ""}: you know ${knowText(slot)}${focus}; ${listed}.${sure}`;
	});
}

function otherHand(core: Readonly<Core>, seat: string): string {
	const slots = (core.hands[seat] ?? []).map((slot, index) => `${String(index + 1)} ${slot.card}${slot.focus > 0 ? "*" : ""} [knows ${knowText(slot)}]`);
	return `  ${seat}: ${slots.length === 0 ? "(no cards)" : slots.join(" · ")}`;
}

/** The game as `seat` sees it: the towers, the counters, every other hand, its own knowledge and the last actions. */
function tableText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	if (state.finished) return "The match is over.";
	const core = state.core;
	if (core?.over !== null) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon.`;
	const deck = deckOf(core.suits).length;
	const towers = core.suits.map((suit) => {
		const next = nextRank(core, suit.name);
		return `${suit.name} ${String(topOf(core, suit.name))}${next === null ? " (done)" : ` (next ${String(next)})`}`;
	});
	const lines = [
		`Game ${String(state.game)} of ${String(ctx.options.games)}, turn ${String(core.turn + 1)}. Turn order: ${core.seats.join(", ")}. You are ${seat}.`,
		`Towers (top lit rank, next playable rank): ${towers.join(" · ")}.`,
		`Lit ${String(core.lit.length)} of ${String(deck)}. Lost: ${core.lost.length === 0 ? "none" : core.lost.join(", ")}. Signals ${String(core.signals)} of ${String(ctx.options.signals)}. ${strikeText(ctx, core)}. Draw pile: ${core.dark === null ? plural(core.pile, "card") : `empty; turns in a row with no card lit and no signal given to a teammate (a discard does not count): ${String(Math.max(0, core.dark))} (the game ends at ${String(core.seats.length)})`}.`,
	];
	if (core.seats.includes(seat)) lines.push(`Your hand (you cannot see it; slot 1 is your oldest card, a new card goes last):`, ...ownSlots(ctx, core, seat));
	lines.push("The others' hands (* the newest card of a signal; in brackets what that seat knows):", ...core.seats.filter((other) => other !== seat).map((other) => otherHand(core, other)));
	const recent = ctx.options.recent === 0 ? [] : core.log.slice(-ctx.options.recent);
	if (recent.length > 0) lines.push(`Last actions: ${recent.map((line) => `t${String(line.turn)} ${line.seat} ${line.text}`).join(" | ")}.`);
	if (core.actor !== seat) lines.push(`Waiting for ${core.actor}.`);
	else {
		const choices = [`playSlot (slot 1 to ${String(core.hands[seat]?.length ?? 0)})`];
		if (core.signals < ctx.options.signals) choices.push("discardSlot (a signal back)");
		if (core.signals > 0) choices.push(`giveSignal (a seat and one suit or one rank; ${plural(core.signals, "signal")} left)`);
		lines.push(`Your turn: one action, ${choices.join(", or ")}.`);
	}
	return lines.join("\n");
}

/** What a discarded card was still needed for, told before it is lost: every card is needed until lit (P170). */
function stillNeeded(core: Readonly<Core>, card: string): string {
	const suit = suitOf(card);
	const top = topOf(core, suit);
	if (nextRank(core, suit) === rankOf(card)) return `${card} (playable right then)`;
	return `${card} (${suit} stood at ${top === 0 ? "nothing lit" : String(top)}; it would have been playable once the ranks below it were lit or lost)`;
}

function debriefText(ctx: Ctx): string {
	const record = ctx.state.results.at(-1);
	const core = ctx.state.core;
	if (record === undefined || core === null) return "";
	return [
		`Game ${String(record.game)} is over: ${reasonText(record.reason)}. The crew lit ${String(core.lit.length)} of ${String(deckOf(core.suits).length)} cards${record.score === core.lit.length ? "" : `, score ${String(record.score)} after the strike penalty`}.`,
		`Lost: ${String(record.lost)} (${String(record.lost - record.misfires)} discarded, ${plural(record.misfires, "misfire")}: ${core.lost.join(", ") || "none"}). Signals given: ${String(record.signals)}.`,
		...(ctx.state.discarded.length === 0 ? [] : [`Discarded, each still needed and each one point lost (no card is ever dead): ${ctx.state.discarded.join(", ")}.`]),
		`Scores so far: ${ctx.state.results.map((entry) => `game ${String(entry.game)} ${String(entry.score)}`).join(", ")}.`,
		...(ctx.options.debriefNote === undefined ? [] : [ctx.options.debriefNote]),
	].join("\n");
}

/** The move timer acts for the seat on turn with the reference bot's action. */
function forfeit(ctx: Ctx): void {
	const state = ctx.state;
	const core = state.core;
	if (core?.over !== null) return;
	state.forfeits += 1;
	act(ctx, botAction(core, rulesOf(ctx)), true);
	const limit = ctx.options.maxConsecutiveForfeits;
	if (limit > 0 && state.forfeits >= limit && !state.finished) {
		state.finished = true;
		state.invalid = true;
		ctx.emit("match_ended", { scores: state.results.map((entry) => entry.score), baselines: state.results.map((entry) => entry.baseline), invalid: true });
	}
}

const done = (ctx: ToolCtx, text: string): ToolSuccess => {
	ctx.state.forfeits = 0;
	return reply(text);
};

export const hintTowers = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewTowers",
			description: "hint-towers/tools/viewTowers",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(tableText(ctx, ctx.resident ?? "")),
		}),
		kit.tool({
			name: "giveSignal",
			description: "hint-towers/tools/giveSignal",
			parameters: Type.Object({
				to: Type.String({ description: "The seat you signal, for example \"A03\"." }),
				about: Type.String({ description: "One suit name (for example \"Moss\") or one rank (for example \"3\")." }),
			}),
			suggest: ["resident"],
			execute: (params, ctx: ToolCtx) => {
				const checked = signalCheck(ctx, ctx.resident, params.to, params.about);
				if ("refusal" in checked) return checked.refusal;
				return done(ctx, act(ctx, checked.action, false));
			},
		}),
		kit.tool({
			name: "playSlot",
			description: "hint-towers/tools/playSlot",
			parameters: Type.Object({ slot: Type.Integer({ minimum: 1, description: "Your slot, from 1 (your oldest card)." }) }),
			suggest: ["resident"],
			execute: (params, ctx: ToolCtx) => {
				const checked = slotProblem(ctx.state, ctx.resident, params.slot);
				if ("refusal" in checked) return checked.refusal;
				return done(ctx, act(ctx, { kind: "play", slot: checked.index }, false));
			},
		}),
		kit.tool({
			name: "discardSlot",
			description: "hint-towers/tools/discardSlot",
			parameters: Type.Object({ slot: Type.Integer({ minimum: 1, description: "Your slot, from 1 (your oldest card)." }) }),
			suggest: ["resident"],
			execute: (params, ctx: ToolCtx) => {
				const checked = slotProblem(ctx.state, ctx.resident, params.slot);
				if ("refusal" in checked) return checked.refusal;
				if ((ctx.state.core?.signals ?? 0) >= ctx.options.signals) return refuse("SIGNALS_FULL", `The crew holds all ${String(ctx.options.signals)} signals; play a slot or give a signal instead.`);
				return done(ctx, act(ctx, { kind: "discard", slot: checked.index }, false));
			},
		}),
	],
	services: [
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
				if (state.due && !state.finished) ctx.schedule.at(ctx.minute + 1, "nextGame");
				return null;
			},
		}),
	],
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.hintTowers,
			run: (ctx) => {
				const seats = ctx.call(CardTableApi, "seats", {});
				const deck = deckOf(ctx.call(CardTableApi, "suits", {})).length;
				if (seats.length < 2) throw new Error("hint-towers: the card table needs at least two seats");
				if (seats.length * ctx.options.handSize >= deck) throw new Error(`hint-towers: ${String(seats.length)} hands of ${String(ctx.options.handSize)} need more than the deck's ${String(deck)} cards`);
				ctx.state.seats = seats;
				startNext(ctx);
			},
		},
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.hintTowers,
			run: (ctx) => {
				ctx.state.watch = actionKey(ctx.state);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.hintTowers,
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
		news: (resident, ctx) => (ctx.state.core?.over === null && ctx.state.core.actor === resident) || ctx.state.debrief.includes(resident),
		turnInputs: {
			order: HOOK_ORDER.turnInputs.hintTowers,
			run: (resident, ctx) => {
				const lines: { readonly kind: string; readonly text: string; readonly order: number }[] = [];
				const index = ctx.state.debrief.indexOf(resident);
				if (index >= 0) {
					ctx.state.debrief.splice(index, 1);
					lines.push({ kind: "status", text: debriefText(ctx), order: STATUS_ORDER.minute });
				}
				const core = ctx.state.core;
				if (core !== null && core.over === null && core.actor === resident) lines.push({ kind: "status", text: tableText(ctx, resident), order: STATUS_ORDER.minute });
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
		scores: kit.fact(Type.Array(Type.Integer()), (view) => view.state.results.map((entry) => entry.score)),
		baselines: kit.fact(Type.Array(Type.Integer()), (view) => view.state.results.map((entry) => entry.baseline)),
		actor: kit.fact(Type.Union([Type.String(), Type.Null()]), (view) => (view.state.core?.over === null ? view.state.core.actor : null)),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: HintSlice,
		save: (state) => structuredClone(state),
		load: (data) => structuredClone(data),
	}),
}));
