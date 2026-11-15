// SPDX-License-Identifier: Apache-2.0
/** The head of the `trick-play` mechanic: its options, its state, its events, services, prompts and tools. */
import { Type } from "typebox";
import { defineHead, inSchemaOrder, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { CardTableService } from "@swarmtales/mechanic-card-table/contract";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { TrickPlayEvents } from "./events.ts";
import { trickPlayMetrics } from "./metrics.ts";
import { Scoring, TrickSlice, type TrickState } from "./model.ts";
import { TrickPlayService } from "./service.ts";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, default: 3, description: "Games in the match; the run ends after the last one." }),
	rounds: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, default: [1, 2, 3, 4, 5, 6, 7, 8], description: "Cards dealt to each seat, round by round; a game has one round per entry." }),
	trump: Type.Union([Type.Literal("lowestBidderNames"), Type.Literal("none")], { default: "lowestBidderNames", description: "lowestBidderNames: the lowest bidder names the trump suit once every bid is public; none: no trump." }),
	vetoTokens: Type.Integer({ minimum: 0, default: 1, description: "Veto tokens each seat gets per game (0: no veto)." }),
	scoring: Type.Object(Scoring.properties, { default: { hit: 10, perTrick: 3, miss: "square" }, description: "Points of a round: hit plus perTrick per trick on a hit; a miss costs missBase plus the error squared (or 10 per trick off)." }),
	maxIdleMinutes: Type.Integer({ minimum: 1, default: 3, description: "Whole minutes a seat may leave its action open before the move timer acts for it." }),
	maxConsecutiveForfeits: Type.Integer({ minimum: 0, default: 0, description: "That many timer actions in a row end the match as invalid (0: off)." }),
	briefEveryRound: Type.Boolean({ default: false, description: "Tell a strategy brain of every round's start, not only the game's, so every round begins from a fresh context with the briefing." }),
	bidSum: Type.Boolean({ default: false, description: "The table shows the sum of the bids placed so far against the tricks of the round." }),
	calibration: Type.Boolean({ default: false, description: "The end-of-game record tells each seat its own calibration: tricks bid against tricks taken, hits, zero bids." }),
	reference: Type.Union([Type.Literal("off"), Type.Literal("retro"), Type.Literal("bid")], { default: "off", description: "A Monte Carlo worth of each hand at bidding time (random unseen cards and trump, a simple play policy): retro adds the seat's own total to the calibration line, bid shows the seat its hand's worth while it bids." }),
	referenceSamples: Type.Integer({ minimum: 1, default: 200, description: "Random deals per hand for the reference worth." }),
	quietEnds: Type.Optional(Type.Boolean({ description: "true: a bid, trump, card or veto that leaves the seat off turn ends its turn (`endsTurn`), so its answer alone wakes no turn with nothing to do (P475). Absent or false: the answer wakes the seat, as on the old platform." })),
});

/**
 * The head of trick play: everything that can be read without running a handler.
 *
 * @public
 */
export const trickPlayHead = defineHead({
	id: "trick-play",
	package: "@swarmtales/mechanic-trick-play",
	summary: "A trick-taking game with exact bids, a trump named by the lowest bidder, follow-suit tricks, a lead veto and hit-or-miss scoring.",
	options,
	state: TrickSlice,
	// The seats come from the card table when the run starts.
	start: (): TrickState => ({
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
	// A snapshot file sorts the keys: the state comes back in the order of its schema (A43); the records keyed by seat are written in seat order where an event shows them.
	snapshot: { save: (state: TrickState) => structuredClone(state), load: (data): TrickState => inSchemaOrder(TrickSlice, data) },
	events: TrickPlayEvents.events,
	metrics: trickPlayMetrics(TrickPlayEvents.events),
	provides: [TrickPlayService, BrainSourceService],
	requires: [CardTableService],
	uses: [StrategyBrainService],
	prompts: {
		"trick-play/tools/viewTable": [],
		"trick-play/tools/placeBid": [],
		"trick-play/tools/nameTrump": [],
		"trick-play/tools/playCard": [],
		"trick-play/tools/vetoLead": [],
	},
	tools: {
		viewTable: { description: "trick-play/tools/viewTable", params: Type.Object({}), for: ["resident"], free: true },
		placeBid: { description: "trick-play/tools/placeBid", params: Type.Object({ tricks: Type.Integer({ minimum: 0, description: "The exact number of tricks you will take this round." }) }), for: ["resident"] },
		nameTrump: { description: "trick-play/tools/nameTrump", params: Type.Object({ suit: Type.String({ description: 'The suit\'s name, for example "Ember".' }) }), for: ["resident"] },
		playCard: { description: "trick-play/tools/playCard", params: Type.Object({ card: Type.String({ description: 'The card, suit and rank, for example "Ember 7".' }) }), for: ["resident"] },
		vetoLead: { description: "trick-play/tools/vetoLead", params: Type.Object({}), for: ["resident"] },
	},
});

/**
 * The context of trick play's hooks, jobs, services and tools.
 *
 * @public
 */
export type TrickPlayCtx = CtxOf<typeof trickPlayHead>;

/**
 * The read-only view of trick play's facts and run limit.
 *
 * @public
 */
export type TrickPlayView = ViewOf<typeof trickPlayHead>;
