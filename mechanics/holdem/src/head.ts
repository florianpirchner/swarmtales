// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `holdem` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { defineHead, type CtxOf, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { holdemMetrics } from "./metrics.ts";
import { Done, HoldemSlice, Move, Result, Scored, SeatStats, Street, type HoldemState } from "./model.ts";

// The seats' points in the order of the seats, as they were built: a snapshot file sorts every object's keys, and
// `game_ended` and `match_ended` write the points as they are (A43).
function bySeat(points: Readonly<Record<string, number>>, seats: readonly string[]): Record<string, number> {
	const rank = (seat: string): number => (seats.includes(seat) ? seats.indexOf(seat) : seats.length);
	return Object.fromEntries(Object.entries(points).sort(([a], [b]) => rank(a) - rank(b)));
}

// The state as it is, the points by seat. No event writes another object of the state as it is (a hand's records
// are built anew when they are written), so the rest needs no order of its schema.
function loadState(data: HoldemState): HoldemState {
	const state = structuredClone(data);
	return { ...state, scores: bySeat(state.scores, state.seats), gameScores: bySeat(state.gameScores, state.seats) };
}

/** The tool a seat acts with; it is open only to the seat to act. */
export const ACT = "act";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 4, description: "Games in the match; a strategy brain is rewritten between games, and every game starts from a fresh context." }),
	hands: Type.Integer({ minimum: 1, maximum: 100, default: 8, description: "Hands per game; the button moves one seat per hand." }),
	smallBlind: Type.Integer({ minimum: 0, default: 1 }),
	bigBlind: Type.Integer({ minimum: 1, default: 2 }),
	smallBet: Type.Integer({ minimum: 1, default: 2, description: "The bet size before the flop and on the flop." }),
	bigBet: Type.Integer({ minimum: 1, default: 4, description: "The bet size on the turn and the river." }),
	cap: Type.Integer({ minimum: 1, maximum: 10, default: 4, description: "Bets per betting round, the opening bet (preflop: the big blind) included." }),
	duplicate: Type.Boolean({ default: true, description: "Every game replays the same deals with the seats moved one place (luck cancels over as many games as seats); false deals fresh cards in every game." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes the seat to act has before it checks, or folds when facing a bet." }),
	equitySamples: Type.Integer({ minimum: 1, maximum: 5000, default: 400, description: "Monte Carlo draws per scored decision." }),
	showBest: Type.Boolean({ default: true, description: "Tell a seat on its turn the best hand it holds now, in words (reading the board is not what the game measures)." }),
	aid: Type.Boolean({ default: false, description: "Decision-time aid: tell the seat to act its equity against the opponents' action-narrowed ranges and the pot odds it needs to call, the referee's own reference (P430)." }),
	aidSeats: Type.Optional(Type.Array(Type.String(), { description: "With `aid`: only these seats get the aid line (a mixed table); default every seat." })),
});

// The event schemas stand outside the head so that its metrics are typed by them.
const events = {
	game_started: Type.Object({ game: Type.Integer(), hands: Type.Integer(), seats: Type.Array(Type.String()) }),
	hand_started: Type.Object({ game: Type.Integer(), hand: Type.Integer(), button: Type.String(), seats: Type.Array(Type.String()) }),
	cards_dealt: Type.Object({ game: Type.Integer(), hand: Type.Integer(), holes: Type.Record(Type.String(), Type.Array(Type.String())), runout: Type.Array(Type.String()) }),
	action_taken: Type.Object({ game: Type.Integer(), hand: Type.Integer(), seat: Type.String(), done: Done, to: Type.Number(), street: Street, pot: Type.Number(), missed: Type.Optional(Type.Boolean()) }),
	board_dealt: Type.Object({ game: Type.Integer(), hand: Type.Integer(), street: Street, cards: Type.Array(Type.String()) }),
	decision_scored: Type.Object({ ...Scored.properties, reason: Type.Optional(Type.String()) }),
	hand_ended: Type.Object({ game: Type.Integer(), ...Result.properties }),
	game_ended: Type.Object({ game: Type.Integer(), scores: Type.Record(Type.String(), Type.Number()), totals: Type.Record(Type.String(), Type.Number()) }),
	game_scored: Type.Object({ game: Type.Integer(), stats: Type.Record(Type.String(), SeatStats) }),
	match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
};

/**
 * The event schemas of hold'em, by event type: what its metrics are typed by.
 *
 * @internal
 */
export type HoldemEvents = typeof events;

/**
 * The head of hold'em: everything that can be read without running a handler.
 *
 * @public
 */
export const holdemHead = defineHead({
	id: "holdem",
	package: "@swarmtales/mechanic-holdem",
	summary: "Fixed-limit Texas Hold'em for solo seats: seeded and duplicate deals, private hole cards, betting, showdown, an equity baseline for the report.",
	options,
	state: HoldemSlice,
	start: (setup): HoldemState => {
		if (setup.residents.length < 2 || setup.residents.length > 10) throw new RangeError("holdem: a table seats 2 to 10 players");
		return {
			seats: [...setup.residents],
			game: 0,
			opened: 0,
			briefed: [],
			seenHand: {},
			seenLog: {},
			seenResults: {},
			told: false,
			results: [],
			decisions: [],
			scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
			gameScores: {},
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	snapshot: { save: (state: HoldemState) => structuredClone(state), load: loadState },
	events,
	metrics: holdemMetrics(events),
	// Every hole card and every reason (a bluff's motive) is for the human and the reporter only.
	audiences: { cards_dealt: ["human"], decision_scored: ["human"], game_scored: ["human"] },
	provides: [BrainSourceService],
	uses: [StrategyBrainService],
	prompts: {
		"holdem/tools/viewTable": [],
		"holdem/tools/act": [],
		"holdem/rules": ["seats", "smallBlind", "bigBlind", "smallBet", "bigBet", "cap", "hands"],
		"holdem/game-head": ["game", "games"],
		"holdem/hand-head": ["hand", "hands", "seat", "position", "button", "cards"],
		"holdem/task": ["street", "board", "pot", "toCall", "choices"],
		"holdem/best": ["best"],
		"holdem/aid": ["equity", "need", "share"],
	},
	tools: {
		viewTable: { description: "holdem/tools/viewTable", params: Type.Object({}), for: ["resident"] },
		[ACT]: {
			description: "holdem/tools/act",
			params: Type.Object({ action: Move, reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (never shown to the other players)." })) }),
			for: ["resident"],
		},
	},
});

/**
 * The context of hold'em's hooks, jobs and services.
 *
 * @public
 */
export type HoldemCtx = CtxOf<typeof holdemHead>;

/**
 * The context of hold'em's tools.
 *
 * @public
 */
export type HoldemToolCtx = ToolCtxOf<typeof holdemHead>;

/**
 * The read-only view of hold'em's fact and run limit.
 *
 * @public
 */
export type HoldemView = ViewOf<typeof holdemHead>;
