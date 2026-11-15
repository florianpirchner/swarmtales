// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `liars-dice` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { defineHead, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { liarsDiceMetrics } from "./metrics.ts";
import { Bid, DiceSlice, Scored, SeatStats, type DiceState } from "./model.ts";

const Say = Type.Optional(Type.String({ maxLength: 160, description: "Optional table talk: a short remark every seat reads (true or not)." }));
const Reason = Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (never shown to the other players)." }));

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games in the match; a strategy brain is rewritten between games, and every game starts from a fresh context." }),
	dice: Type.Integer({ minimum: 1, maximum: 10, default: 4, description: "Dice every seat starts a game with." }),
	faces: Type.Integer({ minimum: 2, maximum: 12, default: 6, description: "Faces of a die." }),
	wildOnes: Type.Boolean({ default: true, description: "Ones count for every face and cannot be bid on." }),
	placePoints: Type.Array(Type.Number(), { maxItems: 10, default: [3, 2, 1, 0], description: "Points for the first, second, ... place of a game (the winner first, the first seat out last); missing places score 0." }),
	talk: Type.Boolean({ default: true, description: "A bid or a call may carry a short public remark (table talk)." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes the seat to act has before it calls liar, or opens with the lowest bid." }),
});

// The event schemas stand outside the head so that its metrics are typed by them.
const events = {
	dice_game_started: Type.Object({ game: Type.Integer(), seats: Type.Array(Type.String()), dice: Type.Integer() }),
	dice_rolled: Type.Object({ game: Type.Integer(), round: Type.Integer(), dice: Type.Record(Type.String(), Type.Array(Type.Integer())) }),
	dice_round_started: Type.Object({ game: Type.Integer(), round: Type.Integer(), starter: Type.String(), counts: Type.Record(Type.String(), Type.Integer()) }),
	dice_bid: Type.Object({ game: Type.Integer(), round: Type.Integer(), seat: Type.String(), quantity: Type.Integer(), face: Type.Integer(), say: Type.Optional(Type.String()), missed: Type.Optional(Type.Boolean()) }),
	dice_called: Type.Object({
		game: Type.Integer(),
		round: Type.Integer(),
		seat: Type.String(),
		bidder: Type.String(),
		bid: Bid,
		count: Type.Integer(),
		dice: Type.Record(Type.String(), Type.Array(Type.Integer())),
		loser: Type.String(),
		say: Type.Optional(Type.String()),
		missed: Type.Optional(Type.Boolean()),
	}),
	dice_seat_out: Type.Object({ game: Type.Integer(), seat: Type.String(), place: Type.Integer() }),
	dice_decision_scored: Type.Object({ ...Scored.properties, reason: Type.Optional(Type.String()) }),
	dice_game_ended: Type.Object({ game: Type.Integer(), places: Type.Record(Type.String(), Type.Integer()), points: Type.Record(Type.String(), Type.Number()), totals: Type.Record(Type.String(), Type.Number()) }),
	dice_game_scored: Type.Object({ game: Type.Integer(), stats: Type.Record(Type.String(), SeatStats) }),
	dice_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
};

/**
 * The event schemas of liar's dice, by event type: what its metrics are typed by.
 *
 * @internal
 */
export type LiarsDiceEvents = typeof events;

/**
 * The head of liar's dice: everything that can be read without running a handler.
 *
 * @public
 */
export const liarsDiceHead = defineHead({
	id: "liars-dice",
	package: "@swarmtales/mechanic-liars-dice",
	summary: "Liar's dice for solo seats: secret seeded rolls, escalating bids checked by the engine, liar calls that reveal every die, a probability baseline for the report.",
	options,
	state: DiceSlice,
	start: (setup): DiceState => {
		if (setup.residents.length < 2 || setup.residents.length > 8) throw new RangeError("liars-dice: a table seats 2 to 8 players");
		return {
			seats: [...setup.residents],
			game: 0,
			round: 0,
			counts: {},
			dice: {},
			bidder: "",
			toAct: "",
			out: [],
			log: [],
			seenLog: {},
			briefed: [],
			told: false,
			opened: 0,
			decisions: [],
			scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
			gameScores: {},
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	snapshot: { save: (state: DiceState) => structuredClone(state), load: (data): DiceState => structuredClone(data) },
	events,
	metrics: liarsDiceMetrics(events),
	// Every roll and every reason (a bluff's motive) is for the human and the reporter only.
	audiences: { dice_rolled: ["human"], dice_decision_scored: ["human"], dice_game_scored: ["human"] },
	provides: [BrainSourceService],
	uses: [StrategyBrainService],
	prompts: {
		"liars-dice/tools/viewTable": [],
		"liars-dice/tools/bid": [],
		"liars-dice/tools/liar": [],
		"liars-dice/rules": ["seats", "dice", "faces", "wild", "lowest", "places", "talk"],
		"liars-dice/game-head": ["game", "games"],
		"liars-dice/task": ["round", "dice", "total", "standing", "choices"],
	},
	tools: {
		viewTable: { description: "liars-dice/tools/viewTable", params: Type.Object({}), for: ["resident"] },
		bid: {
			description: "liars-dice/tools/bid",
			params: Type.Object({
				quantity: Type.Integer({ minimum: 1, maximum: 80, description: "How many dice on the whole table (at least) show the face." }),
				face: Type.Integer({ minimum: 1, maximum: 12, description: "The face." }),
				say: Say,
				reason: Reason,
			}),
			for: ["resident"],
		},
		liar: { description: "liars-dice/tools/liar", params: Type.Object({ say: Say, reason: Reason }), for: ["resident"] },
	},
});

/**
 * The context of liar's dice's hooks, jobs, services and tools.
 *
 * @public
 */
export type LiarsDiceCtx = CtxOf<typeof liarsDiceHead>;

/**
 * The read-only view of liar's dice's fact and run limit.
 *
 * @public
 */
export type LiarsDiceView = ViewOf<typeof liarsDiceHead>;
